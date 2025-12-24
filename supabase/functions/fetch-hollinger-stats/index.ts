import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateAuth, checkCooldown } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

interface PlayerData {
  rank: number;
  player_name: string;
  team: string;
  per: number | null;
  ts_pct: number | null;
  ws: number | null;
  efficiency_index: number | null;
  is_featured_athlete: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authorization
    const authResult = await validateAuth(req);
    if (!authResult.authorized) {
      console.error(`Unauthorized: ${authResult.reason}`);
      return new Response(JSON.stringify({ error: 'Unauthorized', reason: authResult.reason }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log(`Authorized via: ${authResult.reason}`);

    // Check cooldown (30 minutes for Hollinger stats)
    const cooldownResult = await checkCooldown('hollinger_stats', 1800);
    if (!cooldownResult.canRun) {
      console.log(`Cooldown active, skipping. Wait ${cooldownResult.waitSeconds}s`);
      return new Response(JSON.stringify({
        success: true,
        skipped: true,
        reason: 'cooldown',
        waitSeconds: cooldownResult.waitSeconds,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!FIRECRAWL_API_KEY) {
      throw new Error('FIRECRAWL_API_KEY is not configured');
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials not configured');
    }

    console.log('Fetching ESPN Hollinger stats via Firecrawl API...');

    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'http://insider.espn.com/nba/hollinger/statistics',
        formats: ['markdown'],
      }),
    });

    if (!scrapeResponse.ok) {
      const errorText = await scrapeResponse.text();
      console.error('Firecrawl API error:', scrapeResponse.status, errorText);
      throw new Error(`Firecrawl API error: ${scrapeResponse.status}`);
    }

    const scrapeResult = await scrapeResponse.json();
    
    if (!scrapeResult.success || !scrapeResult.data?.markdown) {
      console.error('Scrape failed:', scrapeResult);
      throw new Error('Failed to scrape ESPN Hollinger page');
    }

    console.log('Scrape successful, parsing players...');

    const markdown = scrapeResult.data.markdown;
    const lines = markdown.split('\n');
    
    const players: PlayerData[] = [];
    let sengunData: PlayerData | null = null;

    for (const line of lines) {
      if (!line.includes('|') || line.includes('RK') || line.includes('---')) continue;
      
      const parts = line.split('|').map((p: string) => p.trim()).filter((p: string) => p.length > 0);
      
      if (parts.length >= 10) {
        const rank = parseInt(parts[0]);
        if (isNaN(rank)) continue;
        
        let playerName = parts[1] || '';
        let team = '';
        
        const nameTeamMatch = playerName.match(/([^,]+),?\s*([A-Z]{2,3})?/);
        if (nameTeamMatch) {
          playerName = nameTeamMatch[1].trim();
          team = nameTeamMatch[2] || '';
        }
        
        const per = parseFloat(parts[parts.length - 3]) || null;
        const tsPercent = parseFloat(parts[4]?.replace(/^\./, '0.')) || null;
        
        const efficiencyIndex = per && tsPercent ? parseFloat(((per * tsPercent) / 100).toFixed(2)) : null;
        
        const isSengun = playerName.toLowerCase().includes('sengun') || 
                         playerName.toLowerCase().includes('şengün') ||
                         playerName.toLowerCase().includes('alperen');
        
        const playerData: PlayerData = {
          rank,
          player_name: playerName,
          team,
          per,
          ts_pct: tsPercent,
          ws: null,
          efficiency_index: efficiencyIndex,
          is_featured_athlete: isSengun,
        };
        
        if (rank <= 5) {
          players.push(playerData);
          console.log(`Found #${rank}: ${playerName} (PER: ${per})`);
        }
        
        if (isSengun) {
          sengunData = playerData;
          console.log(`Found Şengün at rank #${rank}: PER ${per}`);
        }
      }
    }

    if (sengunData && !players.find(p => p.is_featured_athlete)) {
      players.push(sengunData);
    }

    if (players.length === 0) {
      console.log('Could not parse players. Markdown preview:', markdown.substring(0, 2000));
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Could not parse any players from Hollinger stats',
        preview: markdown.substring(0, 2000)
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Parsed ${players.length} players, upserting to database...`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: athlete, error: athleteError } = await supabase
      .from('athlete_profiles')
      .select('id')
      .eq('slug', 'alperen-sengun')
      .single();

    if (athleteError) {
      console.error('Could not find Şengün profile:', athleteError);
      throw new Error('Athlete profile not found');
    }

    const athleteId = athlete.id;
    const currentMonth = new Date().toISOString().slice(0, 7) + '-01';

    const { error: deleteError } = await supabase
      .from('athlete_efficiency_rankings')
      .delete()
      .eq('athlete_id', athleteId)
      .eq('month', currentMonth);

    if (deleteError) {
      console.error('Failed to clear old rankings:', deleteError);
    }

    const rankingsToInsert = players.map(p => ({
      athlete_id: athleteId,
      player_name: p.player_name,
      team: p.team,
      per: p.per,
      ts_pct: p.ts_pct,
      ws: p.ws,
      efficiency_index: p.efficiency_index,
      is_featured_athlete: p.is_featured_athlete,
      month: currentMonth,
    }));

    const { error: insertError } = await supabase
      .from('athlete_efficiency_rankings')
      .insert(rankingsToInsert);

    if (insertError) {
      console.error('Failed to insert rankings:', insertError);
      throw new Error(`Database insert failed: ${insertError.message}`);
    }

    await supabase
      .from('sync_logs')
      .insert({
        sync_type: 'hollinger_stats',
        status: 'success',
        details: {
          players_synced: players.length,
          month: currentMonth,
          sengun_rank: sengunData?.rank || null,
          auth_method: authResult.reason,
        },
      });

    console.log(`Successfully synced ${players.length} players to efficiency rankings`);

    return new Response(JSON.stringify({ 
      success: true, 
      data: {
        players_synced: players.length,
        month: currentMonth,
        players: players.map(p => ({ name: p.player_name, rank: p.rank, per: p.per })),
      },
      message: 'Hollinger stats fetched and synced successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching Hollinger stats:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    try {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase.from('sync_logs').insert({
          sync_type: 'hollinger_stats',
          status: 'error',
          details: { error: errorMessage },
        });
      }
    } catch (logError) {
      console.error('Failed to log sync error:', logError);
    }
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

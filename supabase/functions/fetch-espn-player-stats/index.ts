import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateAuth, checkCooldown } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

interface ESPNSplits {
  label: string;
  gp: number | null;
  min: number | null;
  pts: number | null;
  reb: number | null;
  ast: number | null;
  stl: number | null;
  blk: number | null;
  fg_pct: number | null;
  ft_pct: number | null;
  three_pct: number | null;
}

interface ESPNPlayerStats {
  previousGame: {
    date: string | null;
    opponent: string | null;
    result: string | null;
    pts: number | null;
    reb: number | null;
    ast: number | null;
    plusMinus: number | null;
    isWin: boolean | null;
  } | null;
  splits: ESPNSplits[];
  fantasyInsight: string | null;
  positionRank: number | null;
  rosterPct: number | null;
}

function parseNumber(str: string | undefined): number | null {
  if (!str) return null;
  const cleaned = str.replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseSplitsFromMarkdown(markdown: string): ESPNSplits[] {
  const splits: ESPNSplits[] = [];
  const splitsLabels = ['This Game', 'Last 10', 'L10', '2024-25', 'Season', 'Road', 'Home', 'vs'];
  
  const lines = markdown.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    for (const label of splitsLabels) {
      if (line.includes(label)) {
        const statsMatch = line.match(/(\d+(?:\.\d+)?)\s*\|\s*(\d+(?:\.\d+)?)\s*\|\s*(\d+(?:\.\d+)?)\s*\|\s*(\d+(?:\.\d+)?)\s*\|\s*(\d+(?:\.\d+)?)/);
        
        if (statsMatch) {
          const parts = line.split('|').map(p => p.trim());
          const labelMatch = line.match(/(This Game|Last 10|L10|2024-25|Season|Road|Home|vs\s+\w+)/i);
          const splitLabel = labelMatch ? labelMatch[1] : label;
          
          splits.push({
            label: splitLabel,
            gp: parseNumber(parts[1]),
            min: parseNumber(parts[2]),
            pts: parseNumber(parts[3]),
            reb: parseNumber(parts[4]),
            ast: parseNumber(parts[5]),
            stl: parseNumber(parts[6]),
            blk: parseNumber(parts[7]),
            fg_pct: parseNumber(parts[8]),
            three_pct: parseNumber(parts[9]),
            ft_pct: parseNumber(parts[10]),
          });
          break;
        }
      }
    }
  }
  
  return splits;
}

function parseFantasyInsight(markdown: string): string | null {
  const spinMatch = markdown.match(/Spin\s*[:\-]?\s*([^#\n]{50,500})/i);
  if (spinMatch) {
    return spinMatch[1].trim();
  }
  
  const fantasyMatch = markdown.match(/fantasy[^.]*\.\s*([^#\n]{50,300})/i);
  if (fantasyMatch) {
    return fantasyMatch[1].trim();
  }
  
  return null;
}

function parsePreviousGame(markdown: string): ESPNPlayerStats['previousGame'] {
  const gameMatch = markdown.match(/([WL])\s*(\d+)[–-](\d+)\s*(vs|@)\s*(\w+)/i);
  
  if (!gameMatch) return null;
  
  const isWin = gameMatch[1].toUpperCase() === 'W';
  const score1 = parseInt(gameMatch[2]);
  const score2 = parseInt(gameMatch[3]);
  const homeAway = gameMatch[4];
  const opponent = gameMatch[5];
  
  const statsSection = markdown.substring(markdown.indexOf(gameMatch[0]), markdown.indexOf(gameMatch[0]) + 500);
  
  const ptsMatch = statsSection.match(/(\d+)\s*PTS/i) || statsSection.match(/PTS\s*(\d+)/i);
  const rebMatch = statsSection.match(/(\d+)\s*REB/i) || statsSection.match(/REB\s*(\d+)/i);
  const astMatch = statsSection.match(/(\d+)\s*AST/i) || statsSection.match(/AST\s*(\d+)/i);
  const plusMinusMatch = statsSection.match(/([+-]\d+)/);
  
  return {
    date: null,
    opponent: `${homeAway.toLowerCase() === 'vs' ? '' : '@'}${opponent}`,
    result: `${isWin ? 'W' : 'L'} ${score1}-${score2}`,
    pts: ptsMatch ? parseInt(ptsMatch[1]) : null,
    reb: rebMatch ? parseInt(rebMatch[1]) : null,
    ast: astMatch ? parseInt(astMatch[1]) : null,
    plusMinus: plusMinusMatch ? parseInt(plusMinusMatch[1]) : null,
    isWin,
  };
}

function parsePositionRank(markdown: string): number | null {
  const rankMatch = markdown.match(/Position Rank[:\s]*#?(\d+)/i) || 
                    markdown.match(/#(\d+)\s*C\b/i) ||
                    markdown.match(/C\s*#(\d+)/i);
  return rankMatch ? parseInt(rankMatch[1]) : null;
}

function parseRosterPct(markdown: string): number | null {
  const pctMatch = markdown.match(/(\d+(?:\.\d+)?)\s*%\s*(?:Roster|Rostered)/i) ||
                   markdown.match(/Roster[^%]*(\d+(?:\.\d+)?)\s*%/i);
  return pctMatch ? parseFloat(pctMatch[1]) : null;
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

    // Check cooldown (30 minutes for ESPN stats)
    const cooldownResult = await checkCooldown('espn_player_stats', 1800);
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

    let espnId = 4871144; // Default: Alperen Sengun
    let athleteSlug = 'alperen-sengun';
    
    try {
      const body = await req.json();
      if (body.espn_id) espnId = body.espn_id;
      if (body.athlete_slug) athleteSlug = body.athlete_slug;
    } catch {
      // Use defaults
    }

    const espnUrl = `https://www.espn.com/nba/player/_/id/${espnId}`;
    console.log(`Fetching ESPN player stats from: ${espnUrl}`);

    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: espnUrl,
        formats: ['markdown'],
        onlyMainContent: true,
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
      throw new Error('Failed to scrape ESPN player page');
    }

    console.log('ESPN page scraped successfully');
    const markdown = scrapeResult.data.markdown;
    
    console.log('Markdown preview:', markdown.substring(0, 3000));

    const stats: ESPNPlayerStats = {
      previousGame: parsePreviousGame(markdown),
      splits: parseSplitsFromMarkdown(markdown),
      fantasyInsight: parseFantasyInsight(markdown),
      positionRank: parsePositionRank(markdown),
      rosterPct: parseRosterPct(markdown),
    };

    console.log('Parsed ESPN stats:', JSON.stringify(stats, null, 2));

    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const { data: athlete, error: athleteError } = await supabase
        .from('athlete_profiles')
        .select('id')
        .eq('slug', athleteSlug)
        .single();

      if (athlete && !athleteError) {
        const currentSeason = '2024-25';
        
        const { error: updateError } = await supabase
          .from('athlete_season_stats')
          .update({
            espn_splits: stats.splits,
            espn_fantasy_insight: stats.fantasyInsight,
            espn_position_rank: stats.positionRank,
            espn_roster_pct: stats.rosterPct,
            updated_at: new Date().toISOString(),
          })
          .eq('athlete_id', athlete.id)
          .eq('competition', 'NBA')
          .eq('season', currentSeason);

        if (updateError) {
          console.error('Failed to update ESPN stats:', updateError);
        } else {
          console.log('Successfully updated ESPN player stats in database');
        }

        await supabase.from('sync_logs').insert({
          sync_type: 'espn_player_stats',
          status: 'success',
          details: {
            athlete_id: athlete.id,
            espn_id: espnId,
            splits_count: stats.splits.length,
            has_fantasy_insight: !!stats.fantasyInsight,
            auth_method: authResult.reason,
          },
        });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      data: stats,
      message: 'ESPN player stats fetched successfully',
      raw_preview: markdown.substring(0, 1000),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching ESPN player stats:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

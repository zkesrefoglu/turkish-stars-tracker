import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateAuth, checkCooldown } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

interface Athlete {
  id: string;
  name: string;
  team: string;
  sport: string;
}

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  pagemap?: {
    cse_image?: { src: string }[];
    metatags?: { 'og:image'?: string }[];
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let athletesProcessed = 0;
  let articlesAdded = 0;
  const errors: string[] = [];

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

    // Check cooldown (30 minutes for news)
    const cooldownResult = await checkCooldown('news', 1800);
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

    const googleApiKey = Deno.env.get('GOOGLE_CSE_API_KEY');
    const googleCx = Deno.env.get('GOOGLE_CSE_CX');

    if (!googleApiKey || !googleCx) {
      throw new Error('Missing Google CSE configuration');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all athletes
    const { data: athletes, error: athleteError } = await supabase
      .from('athlete_profiles')
      .select('id, name, team, sport');

    if (athleteError) throw athleteError;
    if (!athletes || athletes.length === 0) {
      throw new Error('No athletes found');
    }

    console.log(`Processing ${athletes.length} athletes for news`);

    // Get existing source URLs to avoid duplicates
    const { data: existingNews } = await supabase
      .from('athlete_news')
      .select('source_url');
    
    const existingUrls = new Set((existingNews || []).map(n => n.source_url));

    // Process each athlete
    for (const athlete of athletes as Athlete[]) {
      try {
        const sportContext = athlete.sport === 'basketball' 
          ? 'NBA basketball' 
          : 'football soccer';
        
        const query = `"${athlete.name}" ${athlete.team} ${sportContext} news`;
        
        console.log(`Searching for: ${query}`);

        const searchUrl = new URL('https://www.googleapis.com/customsearch/v1');
        searchUrl.searchParams.set('key', googleApiKey);
        searchUrl.searchParams.set('cx', googleCx);
        searchUrl.searchParams.set('q', query);
        searchUrl.searchParams.set('num', '5');
        searchUrl.searchParams.set('sort', 'date');

        const response = await fetch(searchUrl.toString());
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Google API error for ${athlete.name}: ${errorText}`);
          errors.push(`${athlete.name}: API error ${response.status}`);
          continue;
        }

        const data = await response.json();
        const items: SearchResult[] = data.items || [];

        console.log(`Found ${items.length} results for ${athlete.name}`);

        for (const item of items) {
          if (existingUrls.has(item.link)) {
            console.log(`Skipping duplicate: ${item.link}`);
            continue;
          }

          let imageUrl: string | null = null;
          if (item.pagemap?.cse_image?.[0]?.src) {
            imageUrl = item.pagemap.cse_image[0].src;
          } else if (item.pagemap?.metatags?.[0]?.['og:image']) {
            imageUrl = item.pagemap.metatags[0]['og:image'];
          }

          const urlObj = new URL(item.link);
          const sourceName = urlObj.hostname.replace('www.', '');

          const { error: insertError } = await supabase
            .from('athlete_news')
            .insert({
              athlete_id: athlete.id,
              title: item.title,
              source_url: item.link,
              summary: item.snippet,
              source_name: sourceName,
              image_url: imageUrl,
              is_auto_crawled: true,
              published_at: new Date().toISOString(),
            });

          if (insertError) {
            console.error(`Insert error for ${item.link}: ${insertError.message}`);
            errors.push(`Insert: ${insertError.message}`);
          } else {
            articlesAdded++;
            existingUrls.add(item.link);
          }
        }

        athletesProcessed++;

        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (athleteErr) {
        const errMsg = athleteErr instanceof Error ? athleteErr.message : 'Unknown error';
        console.error(`Error processing ${athlete.name}:`, athleteErr);
        errors.push(`${athlete.name}: ${errMsg}`);
      }
    }

    const duration = Date.now() - startTime;

    await supabase.from('sync_logs').insert({
      sync_type: 'news',
      status: errors.length > 0 ? 'partial' : 'success',
      details: {
        athletes_processed: athletesProcessed,
        articles_added: articlesAdded,
        errors: errors.slice(0, 10),
        duration_ms: duration,
        auth_method: authResult.reason,
      },
    });

    console.log(`News sync completed: ${athletesProcessed} athletes, ${articlesAdded} articles added, ${errors.length} errors`);

    return new Response(JSON.stringify({
      success: true,
      athletes_processed: athletesProcessed,
      articles_added: articlesAdded,
      errors: errors.length,
      duration_ms: duration,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('News fetch error:', error);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      await supabase.from('sync_logs').insert({
        sync_type: 'news',
        status: 'error',
        details: { error: errMsg },
      });
    }

    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

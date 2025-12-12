import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

interface AthleteProfile {
  id: string;
  name: string;
  slug: string;
  transfermarkt_id: number | null;
  transfermarkt_slug: string | null;
  sport: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authorization
    const webhookSecret = req.headers.get('x-webhook-secret');
    const authHeader = req.headers.get('Authorization');
    const expectedSecret = Deno.env.get('STATS_WEBHOOK_SECRET');
    
    const isWebhookAuth = webhookSecret && webhookSecret === expectedSecret;
    const isBearerAuth = authHeader && authHeader.startsWith('Bearer ');
    
    if (!isWebhookAuth && !isBearerAuth) {
      console.error('Unauthorized: missing or invalid authentication');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'Firecrawl API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all football athletes with transfermarkt data
    const { data: athletes, error: athletesError } = await supabase
      .from('athlete_profiles')
      .select('id, name, slug, transfermarkt_id, transfermarkt_slug, sport')
      .eq('sport', 'football')
      .not('transfermarkt_id', 'is', null);

    if (athletesError) {
      console.error('Error fetching athletes:', athletesError);
      throw athletesError;
    }

    console.log(`Found ${athletes?.length || 0} football athletes with Transfermarkt IDs`);

    const results: { athlete: string; transfers: number; injuries: number; marketValues: number; errors: string[] }[] = [];

    for (const athlete of athletes || []) {
      console.log(`\nProcessing ${athlete.name}...`);
      const athleteResult = { athlete: athlete.name, transfers: 0, injuries: 0, marketValues: 0, errors: [] as string[] };

      try {
        // Scrape transfer history
        const transfersResult = await scrapeTransferHistory(firecrawlApiKey, athlete, supabase);
        athleteResult.transfers = transfersResult.count;
        if (transfersResult.error) athleteResult.errors.push(transfersResult.error);

        // Scrape injury history
        const injuriesResult = await scrapeInjuryHistory(firecrawlApiKey, athlete, supabase);
        athleteResult.injuries = injuriesResult.count;
        if (injuriesResult.error) athleteResult.errors.push(injuriesResult.error);

        // Scrape market value history
        const marketValueResult = await scrapeMarketValueHistory(firecrawlApiKey, athlete, supabase);
        athleteResult.marketValues = marketValueResult.count;
        if (marketValueResult.error) athleteResult.errors.push(marketValueResult.error);

      } catch (error) {
        console.error(`Error processing ${athlete.name}:`, error);
        athleteResult.errors.push(error instanceof Error ? error.message : 'Unknown error');
      }

      results.push(athleteResult);
      
      // Rate limiting - wait between athletes
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('\nTransfermarkt data fetch complete:', results);

    return new Response(JSON.stringify({ 
      success: true, 
      results,
      summary: {
        athletesProcessed: results.length,
        totalTransfers: results.reduce((sum, r) => sum + r.transfers, 0),
        totalInjuries: results.reduce((sum, r) => sum + r.injuries, 0),
        totalMarketValues: results.reduce((sum, r) => sum + r.marketValues, 0),
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in fetch-transfermarkt-data:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function scrapeWithFirecrawl(apiKey: string, url: string): Promise<string | null> {
  console.log(`Scraping: ${url}`);
  
  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Firecrawl error:', data);
      return null;
    }

    return data.data?.markdown || data.markdown || null;
  } catch (error) {
    console.error('Scrape error:', error);
    return null;
  }
}

async function scrapeTransferHistory(
  apiKey: string, 
  athlete: AthleteProfile, 
  supabase: any
): Promise<{ count: number; error?: string }> {
  const url = `https://www.transfermarkt.com/${athlete.transfermarkt_slug}/transfers/spieler/${athlete.transfermarkt_id}`;
  const markdown = await scrapeWithFirecrawl(apiKey, url);
  
  if (!markdown) {
    return { count: 0, error: 'Failed to scrape transfer history' };
  }

  try {
    const transfers = parseTransferHistory(markdown, athlete.id);
    console.log(`Parsed ${transfers.length} transfers for ${athlete.name}`);
    
    if (transfers.length > 0) {
      // Upsert transfers (using transfer_date + athlete_id as unique identifier)
      for (const transfer of transfers) {
        const { error } = await supabase
          .from('athlete_transfer_history')
          .upsert(transfer, { 
            onConflict: 'athlete_id,transfer_date,from_club,to_club',
            ignoreDuplicates: true 
          });
        
        if (error) {
          console.error('Error upserting transfer:', error);
        }
      }
    }

    return { count: transfers.length };
  } catch (error) {
    console.error('Error parsing transfers:', error);
    return { count: 0, error: 'Failed to parse transfer history' };
  }
}

async function scrapeInjuryHistory(
  apiKey: string, 
  athlete: AthleteProfile, 
  supabase: any
): Promise<{ count: number; error?: string }> {
  const url = `https://www.transfermarkt.com/${athlete.transfermarkt_slug}/verletzungen/spieler/${athlete.transfermarkt_id}`;
  const markdown = await scrapeWithFirecrawl(apiKey, url);
  
  if (!markdown) {
    return { count: 0, error: 'Failed to scrape injury history' };
  }

  try {
    const injuries = parseInjuryHistory(markdown, athlete.id);
    console.log(`Parsed ${injuries.length} injuries for ${athlete.name}`);
    
    if (injuries.length > 0) {
      for (const injury of injuries) {
        const { error } = await supabase
          .from('athlete_injury_history')
          .upsert(injury, { 
            onConflict: 'athlete_id,injury_type,start_date',
            ignoreDuplicates: true 
          });
        
        if (error) {
          console.error('Error upserting injury:', error);
        }
      }
    }

    return { count: injuries.length };
  } catch (error) {
    console.error('Error parsing injuries:', error);
    return { count: 0, error: 'Failed to parse injury history' };
  }
}

async function scrapeMarketValueHistory(
  apiKey: string, 
  athlete: AthleteProfile, 
  supabase: any
): Promise<{ count: number; error?: string }> {
  const url = `https://www.transfermarkt.com/${athlete.transfermarkt_slug}/marktwertverlauf/spieler/${athlete.transfermarkt_id}`;
  const markdown = await scrapeWithFirecrawl(apiKey, url);
  
  if (!markdown) {
    return { count: 0, error: 'Failed to scrape market value history' };
  }

  try {
    const marketValues = parseMarketValueHistory(markdown, athlete.id);
    console.log(`Parsed ${marketValues.length} market values for ${athlete.name}`);
    
    if (marketValues.length > 0) {
      // Get existing market values to calculate changes
      const { data: existingValues } = await supabase
        .from('athlete_market_values')
        .select('recorded_date, market_value')
        .eq('athlete_id', athlete.id)
        .order('recorded_date', { ascending: false });

      for (const mv of marketValues) {
        // Calculate value change if we have previous data
        if (existingValues && existingValues.length > 0) {
          const prevValue = existingValues.find((v: any) => 
            new Date(v.recorded_date) < new Date(mv.recorded_date)
          );
          if (prevValue) {
            mv.value_change = mv.market_value - prevValue.market_value;
            mv.value_change_percentage = ((mv.market_value - prevValue.market_value) / prevValue.market_value) * 100;
          }
        }

        const { error } = await supabase
          .from('athlete_market_values')
          .upsert(mv, { 
            onConflict: 'athlete_id,recorded_date',
            ignoreDuplicates: true 
          });
        
        if (error) {
          console.error('Error upserting market value:', error);
        }
      }

      // Update current market value in athlete_profiles
      const latestValue = marketValues.sort((a, b) => 
        new Date(b.recorded_date).getTime() - new Date(a.recorded_date).getTime()
      )[0];
      
      if (latestValue) {
        await supabase
          .from('athlete_profiles')
          .update({ current_market_value: latestValue.market_value })
          .eq('id', athlete.id);
      }
    }

    return { count: marketValues.length };
  } catch (error) {
    console.error('Error parsing market values:', error);
    return { count: 0, error: 'Failed to parse market value history' };
  }
}

function parseTransferHistory(markdown: string, athleteId: string): any[] {
  const transfers: any[] = [];
  
  // Look for transfer table patterns in markdown
  // Transfermarkt typically shows: Season | Date | Left | Joined | MV | Fee
  const lines = markdown.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for date patterns like "Jan 1, 2024" or "01.01.2024"
    const dateMatch = line.match(/(\d{1,2}[\.\/]\d{1,2}[\.\/]\d{2,4})|([A-Z][a-z]{2}\s+\d{1,2},?\s+\d{4})/);
    if (!dateMatch) continue;
    
    // Look for fee patterns like "€50m" or "€50.00m" or "Free transfer" or "Loan"
    const feeMatch = line.match(/€([\d,.]+)\s*(m|k)?|free\s*transfer|loan/i);
    
    // Look for club names (typically capitalized words)
    const clubMatches = line.match(/([A-Z][a-zA-Z\s&.]+(?:FC|CF|SC|AC|AS|SS|CD|UD|SD|Real|United|City|Athletic|Sporting)?)/g);
    
    if (clubMatches && clubMatches.length >= 2) {
      let transferDate = dateMatch[0];
      // Normalize date format
      try {
        const parsedDate = new Date(transferDate.replace(/(\d{2})\.(\d{2})\.(\d{4})/, '$3-$2-$1'));
        if (!isNaN(parsedDate.getTime())) {
          transferDate = parsedDate.toISOString().split('T')[0];
        }
      } catch (e) {
        // Keep original date string if parsing fails
      }

      let transferFee: number | null = null;
      let transferType = 'transfer';
      
      if (feeMatch) {
        if (/free\s*transfer/i.test(feeMatch[0])) {
          transferFee = 0;
          transferType = 'free';
        } else if (/loan/i.test(feeMatch[0])) {
          transferType = 'loan';
        } else {
          const amount = parseFloat(feeMatch[1]?.replace(/,/g, '') || '0');
          const multiplier = feeMatch[2]?.toLowerCase() === 'm' ? 1000000 : 
                            feeMatch[2]?.toLowerCase() === 'k' ? 1000 : 1;
          transferFee = amount * multiplier;
        }
      }

      transfers.push({
        athlete_id: athleteId,
        transfer_date: transferDate,
        from_club: clubMatches[0].trim(),
        to_club: clubMatches[1].trim(),
        transfer_fee: transferFee,
        transfer_type: transferType,
        source_url: `https://www.transfermarkt.com`,
      });
    }
  }

  return transfers;
}

function parseInjuryHistory(markdown: string, athleteId: string): any[] {
  const injuries: any[] = [];
  const lines = markdown.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for injury type patterns
    const injuryTypes = [
      'muscle', 'knee', 'ankle', 'hamstring', 'groin', 'back', 'shoulder',
      'calf', 'thigh', 'foot', 'hip', 'achilles', 'ligament', 'cruciate',
      'meniscus', 'fracture', 'bruise', 'strain', 'sprain', 'tear',
      'illness', 'flu', 'covid', 'corona', 'infection'
    ];
    
    const lowerLine = line.toLowerCase();
    let injuryType: string | null = null;
    let injuryZone: string | null = null;
    
    for (const type of injuryTypes) {
      if (lowerLine.includes(type)) {
        injuryType = type.charAt(0).toUpperCase() + type.slice(1);
        // Try to determine zone
        if (['knee', 'ankle', 'hamstring', 'calf', 'thigh', 'foot', 'achilles', 'groin', 'hip'].includes(type)) {
          injuryZone = 'Lower Body';
        } else if (['shoulder', 'back'].includes(type)) {
          injuryZone = 'Upper Body';
        } else if (['muscle', 'ligament', 'cruciate', 'meniscus'].includes(type)) {
          injuryZone = 'General';
        }
        break;
      }
    }
    
    if (!injuryType) continue;
    
    // Look for date patterns
    const dateMatch = line.match(/(\d{1,2}[\.\/]\d{1,2}[\.\/]\d{2,4})|([A-Z][a-z]{2}\s+\d{1,2},?\s+\d{4})/);
    if (!dateMatch) continue;
    
    // Look for duration patterns like "14 days" or "2 weeks" or "1 month"
    const durationMatch = line.match(/(\d+)\s*(days?|weeks?|months?)/i);
    let daysMissed: number | null = null;
    if (durationMatch) {
      const amount = parseInt(durationMatch[1]);
      const unit = durationMatch[2].toLowerCase();
      if (unit.startsWith('week')) {
        daysMissed = amount * 7;
      } else if (unit.startsWith('month')) {
        daysMissed = amount * 30;
      } else {
        daysMissed = amount;
      }
    }
    
    // Look for games missed
    const gamesMatch = line.match(/(\d+)\s*games?\s*missed/i);
    const gamesMissed = gamesMatch ? parseInt(gamesMatch[1]) : null;

    let startDate = dateMatch[0];
    try {
      const parsedDate = new Date(startDate.replace(/(\d{2})\.(\d{2})\.(\d{4})/, '$3-$2-$1'));
      if (!isNaN(parsedDate.getTime())) {
        startDate = parsedDate.toISOString().split('T')[0];
      }
    } catch (e) {}

    injuries.push({
      athlete_id: athleteId,
      injury_type: injuryType,
      injury_zone: injuryZone,
      start_date: startDate,
      days_missed: daysMissed,
      games_missed: gamesMissed,
      is_current: false,
      source_url: `https://www.transfermarkt.com`,
    });
  }

  return injuries;
}

function parseMarketValueHistory(markdown: string, athleteId: string): any[] {
  const marketValues: any[] = [];
  
  // Look for market value patterns like "€50.00m" with dates
  const valuePattern = /€([\d,.]+)\s*(m|k)?/gi;
  const datePattern = /([A-Z][a-z]{2}\s+\d{1,2},?\s+\d{4})|(\d{1,2}[\.\/]\d{1,2}[\.\/]\d{2,4})/g;
  
  const lines = markdown.split('\n');
  
  for (const line of lines) {
    const valueMatch = line.match(/€([\d,.]+)\s*(m|k)?/i);
    const dateMatch = line.match(/([A-Z][a-z]{2}\s+\d{1,2},?\s+\d{4})|(\d{1,2}[\.\/]\d{1,2}[\.\/]\d{2,4})/);
    
    if (valueMatch && dateMatch) {
      const amount = parseFloat(valueMatch[1].replace(/,/g, ''));
      const multiplier = valueMatch[2]?.toLowerCase() === 'm' ? 1000000 : 
                        valueMatch[2]?.toLowerCase() === 'k' ? 1000 : 1;
      const marketValue = amount * multiplier;
      
      let recordedDate = dateMatch[0];
      try {
        const parsedDate = new Date(recordedDate.replace(/(\d{2})\.(\d{2})\.(\d{4})/, '$3-$2-$1'));
        if (!isNaN(parsedDate.getTime())) {
          recordedDate = parsedDate.toISOString().split('T')[0];
        }
      } catch (e) {}

      // Avoid duplicates
      if (!marketValues.some(mv => mv.recorded_date === recordedDate)) {
        marketValues.push({
          athlete_id: athleteId,
          market_value: marketValue,
          recorded_date: recordedDate,
          currency: 'EUR',
          source: 'transfermarkt',
        });
      }
    }
  }

  return marketValues;
}

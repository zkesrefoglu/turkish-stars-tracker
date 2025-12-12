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
        onlyMainContent: false, // Get full page content for tables
        waitFor: 5000,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Firecrawl error:', data);
      return null;
    }

    const markdown = data.data?.markdown || data.markdown || null;
    
    // Log first 500 chars of markdown for debugging
    if (markdown) {
      console.log(`Markdown preview (first 500 chars): ${markdown.substring(0, 500)}`);
    }
    
    return markdown;
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
            onConflict: 'athlete_id,start_date,injury_type',
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
      const { data: existingValues } = await supabase
        .from('athlete_market_values')
        .select('recorded_date, market_value')
        .eq('athlete_id', athlete.id)
        .order('recorded_date', { ascending: false });

      for (const mv of marketValues) {
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
  const lines = markdown.split('\n');
  
  console.log(`Parsing transfers from ${lines.length} lines of markdown`);
  
  // Method 1: Look for table rows with transfer data
  // Transfermarkt tables often have patterns like: | Season | Date | Left | Joined | MV | Fee |
  // Or markdown tables: | 24/25 | Jul 1, 2024 | Club A | Club B | €10m | €15m |
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines and headers
    if (!line || line.startsWith('#') || line === '---' || line === '|---|') continue;
    
    // Look for table row patterns with pipe separators
    if (line.includes('|')) {
      const cells = line.split('|').map(c => c.trim()).filter(c => c);
      
      // Need at least 4 cells for a valid transfer row
      if (cells.length >= 4) {
        // Try to find date, clubs, and fee in cells
        let transferDate: string | null = null;
        let fromClub: string | null = null;
        let toClub: string | null = null;
        let fee: number | null = null;
        let transferType = 'transfer';
        
        for (const cell of cells) {
          // Date patterns
          if (!transferDate) {
            const dateMatch = cell.match(/(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})|([A-Z][a-z]{2}\s+\d{1,2},?\s+\d{4})|(\d{4})/);
            if (dateMatch) {
              transferDate = normalizeDate(dateMatch[0]);
            }
          }
          
          // Fee patterns - €50m, €50.00m, €500k, free, loan
          if (cell.match(/€|free|loan|end of loan/i)) {
            const feeMatch = cell.match(/€\s*([\d,.]+)\s*(m|mio|k)?/i);
            if (feeMatch) {
              const amount = parseFloat(feeMatch[1].replace(/,/g, '.'));
              const unit = feeMatch[2]?.toLowerCase();
              if (unit === 'm' || unit === 'mio') {
                fee = amount * 1000000;
              } else if (unit === 'k') {
                fee = amount * 1000;
              } else {
                fee = amount >= 1000 ? amount : amount * 1000000; // Assume millions if no unit
              }
            } else if (cell.match(/free/i)) {
              fee = 0;
              transferType = 'free';
            } else if (cell.match(/loan|end of loan/i)) {
              transferType = 'loan';
            }
          }
          
          // Club names - look for cells with team-like names (not dates, not fees)
          if (!cell.match(/€|\d{4}|free|loan|---|^\d+$/i) && cell.length > 2) {
            if (!fromClub) {
              fromClub = cell;
            } else if (!toClub && cell !== fromClub) {
              toClub = cell;
            }
          }
        }
        
        // If we found valid data, add the transfer
        if (transferDate && fromClub && toClub) {
          transfers.push({
            athlete_id: athleteId,
            transfer_date: transferDate,
            from_club: fromClub.substring(0, 100),
            to_club: toClub.substring(0, 100),
            transfer_fee: fee,
            transfer_type: transferType,
            source_url: 'https://www.transfermarkt.com',
          });
        }
      }
    }
    
    // Method 2: Look for inline transfer mentions
    // Pattern: "joined X from Y" or "moved to X" or "signed by X"
    const joinMatch = line.match(/(?:joined|signed by|moved to)\s+([A-Za-z\s&.]+?)(?:\s+from\s+([A-Za-z\s&.]+))?(?:\s+(?:for|fee:?)\s*€?([\d,.]+)\s*(m|k)?)?/i);
    if (joinMatch) {
      const toClub = joinMatch[1]?.trim();
      const fromClub = joinMatch[2]?.trim() || 'Unknown';
      
      let fee: number | null = null;
      if (joinMatch[3]) {
        const amount = parseFloat(joinMatch[3].replace(/,/g, '.'));
        const unit = joinMatch[4]?.toLowerCase();
        fee = unit === 'm' ? amount * 1000000 : unit === 'k' ? amount * 1000 : amount;
      }
      
      // Look for date in same line or nearby
      const dateMatch = line.match(/(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})|([A-Z][a-z]{2}\s+\d{1,2},?\s+\d{4})/);
      if (dateMatch && toClub) {
        transfers.push({
          athlete_id: athleteId,
          transfer_date: normalizeDate(dateMatch[0]),
          from_club: fromClub.substring(0, 100),
          to_club: toClub.substring(0, 100),
          transfer_fee: fee,
          transfer_type: 'transfer',
          source_url: 'https://www.transfermarkt.com',
        });
      }
    }
  }
  
  // Remove duplicates based on date and clubs
  const seen = new Set<string>();
  return transfers.filter(t => {
    const key = `${t.transfer_date}-${t.from_club}-${t.to_club}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseInjuryHistory(markdown: string, athleteId: string): any[] {
  const injuries: any[] = [];
  const lines = markdown.split('\n');
  
  console.log(`Parsing injuries from ${lines.length} lines of markdown`);
  
  // Injury keywords with zones
  const injuryKeywords: { [key: string]: { type: string; zone: string } } = {
    'muscle': { type: 'Muscle injury', zone: 'General' },
    'muscular': { type: 'Muscle injury', zone: 'General' },
    'knee': { type: 'Knee injury', zone: 'Lower Body' },
    'ankle': { type: 'Ankle injury', zone: 'Lower Body' },
    'hamstring': { type: 'Hamstring injury', zone: 'Lower Body' },
    'groin': { type: 'Groin injury', zone: 'Lower Body' },
    'back': { type: 'Back injury', zone: 'Upper Body' },
    'shoulder': { type: 'Shoulder injury', zone: 'Upper Body' },
    'calf': { type: 'Calf injury', zone: 'Lower Body' },
    'thigh': { type: 'Thigh injury', zone: 'Lower Body' },
    'foot': { type: 'Foot injury', zone: 'Lower Body' },
    'hip': { type: 'Hip injury', zone: 'Lower Body' },
    'achilles': { type: 'Achilles tendon injury', zone: 'Lower Body' },
    'ligament': { type: 'Ligament injury', zone: 'General' },
    'cruciate': { type: 'Cruciate ligament injury', zone: 'Lower Body' },
    'meniscus': { type: 'Meniscus injury', zone: 'Lower Body' },
    'fracture': { type: 'Fracture', zone: 'General' },
    'bruise': { type: 'Bruise', zone: 'General' },
    'strain': { type: 'Strain', zone: 'General' },
    'sprain': { type: 'Sprain', zone: 'General' },
    'tear': { type: 'Muscle tear', zone: 'General' },
    'illness': { type: 'Illness', zone: 'General' },
    'flu': { type: 'Flu', zone: 'General' },
    'covid': { type: 'COVID-19', zone: 'General' },
    'corona': { type: 'COVID-19', zone: 'General' },
    'infection': { type: 'Infection', zone: 'General' },
    'adductor': { type: 'Adductor problems', zone: 'Lower Body' },
    'knock': { type: 'Knock', zone: 'General' },
    'concussion': { type: 'Concussion', zone: 'Head' },
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const lowerLine = line.toLowerCase();
    
    // Check for injury keywords
    let foundInjury: { type: string; zone: string } | null = null;
    for (const [keyword, info] of Object.entries(injuryKeywords)) {
      if (lowerLine.includes(keyword)) {
        foundInjury = info;
        break;
      }
    }
    
    if (!foundInjury) continue;
    
    // Look for dates - multiple formats
    const datePatterns = [
      /(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})/,  // DD/MM/YYYY or DD.MM.YYYY
      /([A-Z][a-z]{2})\s+(\d{1,2}),?\s+(\d{4})/,   // Jan 1, 2024
      /(\d{4})-(\d{2})-(\d{2})/,                    // YYYY-MM-DD
    ];
    
    let startDate: string | null = null;
    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) {
        startDate = normalizeDate(match[0]);
        break;
      }
    }
    
    if (!startDate) continue;
    
    // Look for duration
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
    
    // Look for games missed - also check table cells
    const gamesMatch = line.match(/(\d+)\s*(?:games?|matches?)/i);
    const gamesMissed = gamesMatch ? parseInt(gamesMatch[1]) : null;

    injuries.push({
      athlete_id: athleteId,
      injury_type: foundInjury.type,
      injury_zone: foundInjury.zone,
      start_date: startDate,
      days_missed: daysMissed,
      games_missed: gamesMissed,
      is_current: false,
      source_url: 'https://www.transfermarkt.com',
    });
  }
  
  // Remove duplicates
  const seen = new Set<string>();
  return injuries.filter(inj => {
    const key = `${inj.start_date}-${inj.injury_type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseMarketValueHistory(markdown: string, athleteId: string): any[] {
  const marketValues: any[] = [];
  const lines = markdown.split('\n');
  
  console.log(`Parsing market values from ${lines.length} lines of markdown`);
  
  // Market value patterns - multiple formats
  // €50.00m, €50m, €50 Mio, €500k, €500,000
  const valuePatterns = [
    /€\s*([\d,.]+)\s*(m|mio\.?|million)/i,
    /€\s*([\d,.]+)\s*k/i,
    /€\s*([\d,.]+)/,
    /([\d,.]+)\s*(m|mio\.?|million)?\s*€/i,
  ];
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    // Check for market value
    let marketValue: number | null = null;
    
    for (const pattern of valuePatterns) {
      const match = line.match(pattern);
      if (match) {
        const amount = parseFloat(match[1].replace(/,/g, '.'));
        const unit = match[2]?.toLowerCase();
        
        if (unit && (unit.startsWith('m') || unit === 'million')) {
          marketValue = amount * 1000000;
        } else if (unit === 'k') {
          marketValue = amount * 1000;
        } else if (amount > 10000) {
          // Already in full value
          marketValue = amount;
        } else {
          // Assume millions for small numbers with € symbol
          marketValue = amount * 1000000;
        }
        break;
      }
    }
    
    if (!marketValue || marketValue < 100000) continue; // Skip unrealistic values
    
    // Look for date
    const datePatterns = [
      /(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})/,
      /([A-Z][a-z]{2})\s+(\d{1,2}),?\s+(\d{4})/,
      /(\d{4})-(\d{2})-(\d{2})/,
      /([A-Z][a-z]+)\s+(\d{4})/,  // "January 2024"
    ];
    
    let recordedDate: string | null = null;
    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) {
        recordedDate = normalizeDate(match[0]);
        break;
      }
    }
    
    if (!recordedDate) continue;
    
    // Check for duplicates
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
  
  return marketValues;
}

function normalizeDate(dateStr: string): string {
  // Try to parse and normalize various date formats to YYYY-MM-DD
  const str = dateStr.trim();
  
  // DD/MM/YYYY or DD.MM.YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})/);
  if (dmyMatch) {
    let day = dmyMatch[1].padStart(2, '0');
    let month = dmyMatch[2].padStart(2, '0');
    let year = dmyMatch[3];
    if (year.length === 2) {
      year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
    }
    // If day > 12, assume DD/MM format, otherwise could be either
    if (parseInt(day) > 12) {
      return `${year}-${month}-${day}`;
    }
    // European format: DD.MM.YYYY
    return `${year}-${month}-${day}`;
  }
  
  // YYYY-MM-DD (already correct)
  const ymdMatch = str.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    return str;
  }
  
  // Month Day, Year (Jan 1, 2024)
  const monthDayYear = str.match(/([A-Z][a-z]{2,})\s+(\d{1,2}),?\s+(\d{4})/);
  if (monthDayYear) {
    const months: { [key: string]: string } = {
      'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
      'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
      'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12',
      'january': '01', 'february': '02', 'march': '03', 'april': '04',
      'june': '06', 'july': '07', 'august': '08', 'september': '09',
      'october': '10', 'november': '11', 'december': '12'
    };
    const monthNum = months[monthDayYear[1].toLowerCase()] || '01';
    const day = monthDayYear[2].padStart(2, '0');
    return `${monthDayYear[3]}-${monthNum}-${day}`;
  }
  
  // Month Year (January 2024)
  const monthYear = str.match(/([A-Z][a-z]+)\s+(\d{4})/);
  if (monthYear) {
    const months: { [key: string]: string } = {
      'january': '01', 'february': '02', 'march': '03', 'april': '04',
      'may': '05', 'june': '06', 'july': '07', 'august': '08',
      'september': '09', 'october': '10', 'november': '11', 'december': '12'
    };
    const monthNum = months[monthYear[1].toLowerCase()] || '01';
    return `${monthYear[2]}-${monthNum}-01`;
  }
  
  // Just year
  const yearOnly = str.match(/^(\d{4})$/);
  if (yearOnly) {
    return `${yearOnly[1]}-01-01`;
  }
  
  // Return as-is if we can't parse (will likely fail validation later)
  return str;
}

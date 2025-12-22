import express from 'express';
import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

// Configuration
const PORT = process.env.PORT || 8080;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Turkish football players with Transfermarkt IDs
const PLAYERS = [
  { name: 'Altay Bayındır', tmId: 336077, slug: 'altay-bayindir' },
  { name: 'Arda Güler', tmId: 861410, slug: 'arda-guler' },
  { name: 'Atakan Karazor', tmId: 232320, slug: 'atakan-karazor' },
  { name: 'Berke Özer', tmId: 481886, slug: 'berke-ozer' },
  { name: 'Can Uzun', tmId: 886655, slug: 'can-uzun' },
  { name: 'Deniz Gül', tmId: 1063292, slug: 'deniz-gul' },
  { name: 'Enes Ünal', tmId: 251106, slug: 'enes-unal' },
  { name: 'Ferdi Kadıoğlu', tmId: 346498, slug: 'ferdi-kadioglu' },
  { name: 'Hakan Çalhanoğlu', tmId: 35251, slug: 'hakan-calhanoglu' },
  { name: 'İsak Vural', tmId: 989621, slug: 'isak-vural' },
  { name: 'Kenan Yıldız', tmId: 798650, slug: 'kenan-yildiz' },
  { name: 'Merih Demiral', tmId: 340879, slug: 'merih-demiral' },
  { name: 'Salih Özcan', tmId: 244940, slug: 'salih-ozcan' },
  { name: 'Semih Kılıçsoy', tmId: 875334, slug: 'semih-kilicsoy' },
  { name: 'Yusuf Akçiçek', tmId: 1100642, slug: 'yusuf-akcicek' },
  { name: 'Zeki Çelik', tmId: 251075, slug: 'zeki-celik' },
];

// Delay helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Random delay between 3-7 seconds to appear human
const humanDelay = () => delay(3000 + Math.random() * 4000);

// Parse market value string to number (e.g., "€45.00m" -> 45000000)
function parseMarketValue(valueStr) {
  if (!valueStr || valueStr === '-' || valueStr === 'N/A') return null;
  
  const cleaned = valueStr.replace(/[€£$]/g, '').trim().toLowerCase();
  
  let multiplier = 1;
  let numStr = cleaned;
  
  if (cleaned.includes('m')) {
    multiplier = 1000000;
    numStr = cleaned.replace('m', '');
  } else if (cleaned.includes('k') || cleaned.includes('th')) {
    multiplier = 1000;
    numStr = cleaned.replace(/k|th\.?/g, '');
  }
  
  const num = parseFloat(numStr);
  return isNaN(num) ? null : num * multiplier;
}

// Parse date string to ISO format
function parseDate(dateStr) {
  if (!dateStr || dateStr === '-') return null;
  
  // Handle formats like "Jan 1, 2024" or "01/01/2024" or "2024-01-01"
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;
  
  return date.toISOString().split('T')[0];
}

// Parse fee string
function parseFee(feeStr) {
  if (!feeStr || feeStr === '-' || feeStr.toLowerCase().includes('free') || feeStr.toLowerCase().includes('loan')) {
    return { fee: null, type: feeStr?.toLowerCase().includes('loan') ? 'loan' : 'free' };
  }
  return { fee: parseMarketValue(feeStr), type: 'transfer' };
}

// Launch browser with stealth settings
async function launchBrowser() {
  return puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080',
    ],
  });
}

// Get a new page with human-like settings
async function getStealthPage(browser) {
  const page = await browser.newPage();
  
  // Set realistic viewport
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Set realistic user agent
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );
  
  // Set extra headers
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  });
  
  return page;
}

// Scrape transfer history for a player
async function scrapeTransfers(page, player) {
  const url = `https://www.transfermarkt.com/${player.slug}/transfers/spieler/${player.tmId}`;
  console.log(`Scraping transfers: ${url}`);
  
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2000);
    
    // Wait for transfers table
    await page.waitForSelector('.grid-view', { timeout: 10000 }).catch(() => null);
    
    const transfers = await page.evaluate(() => {
      const rows = document.querySelectorAll('.grid-view .odd, .grid-view .even');
      const results = [];
      
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 5) return;
        
        // Extract data from each row
        const seasonEl = cells[0];
        const dateEl = cells[1];
        const fromClubEl = cells[2]?.querySelector('a');
        const toClubEl = cells[3]?.querySelector('a');
        const feeEl = cells[4];
        
        const fromClubImg = cells[2]?.querySelector('img');
        const toClubImg = cells[3]?.querySelector('img');
        
        results.push({
          season: seasonEl?.textContent?.trim(),
          date: dateEl?.textContent?.trim(),
          fromClub: fromClubEl?.textContent?.trim() || cells[2]?.textContent?.trim(),
          fromClubLogo: fromClubImg?.src || null,
          toClub: toClubEl?.textContent?.trim() || cells[3]?.textContent?.trim(),
          toClubLogo: toClubImg?.src || null,
          fee: feeEl?.textContent?.trim(),
        });
      });
      
      return results;
    });
    
    console.log(`Found ${transfers.length} transfers for ${player.name}`);
    return transfers;
  } catch (error) {
    console.error(`Error scraping transfers for ${player.name}:`, error.message);
    return [];
  }
}

// Scrape injury history for a player
async function scrapeInjuries(page, player) {
  const url = `https://www.transfermarkt.com/${player.slug}/verletzungen/spieler/${player.tmId}`;
  console.log(`Scraping injuries: ${url}`);
  
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2000);
    
    // Wait for injuries table
    await page.waitForSelector('.grid-view', { timeout: 10000 }).catch(() => null);
    
    const injuries = await page.evaluate(() => {
      const rows = document.querySelectorAll('.grid-view .odd, .grid-view .even');
      const results = [];
      
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 5) return;
        
        results.push({
          season: cells[0]?.textContent?.trim(),
          injury: cells[1]?.textContent?.trim(),
          from: cells[2]?.textContent?.trim(),
          until: cells[3]?.textContent?.trim(),
          days: cells[4]?.textContent?.trim(),
          gamesMissed: cells[5]?.textContent?.trim(),
        });
      });
      
      return results;
    });
    
    console.log(`Found ${injuries.length} injuries for ${player.name}`);
    return injuries;
  } catch (error) {
    console.error(`Error scraping injuries for ${player.name}:`, error.message);
    return [];
  }
}

// Scrape market value history for a player
async function scrapeMarketValues(page, player) {
  const url = `https://www.transfermarkt.com/${player.slug}/marktwertverlauf/spieler/${player.tmId}`;
  console.log(`Scraping market values: ${url}`);
  
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2000);
    
    // Market values are in a JavaScript variable or chart data
    const marketValues = await page.evaluate(() => {
      // Try to get from the highcharts data
      const scriptTags = document.querySelectorAll('script');
      let chartData = [];
      
      scriptTags.forEach(script => {
        const content = script.textContent || '';
        if (content.includes("'data':")) {
          // Extract data points from chart
          const dataMatch = content.match(/'data':\s*\[([\s\S]*?)\]/);
          if (dataMatch) {
            try {
              // Parse the data array
              const dataStr = '[' + dataMatch[1] + ']';
              // This is complex JSON, try to extract x,y pairs
            } catch (e) {}
          }
        }
      });
      
      // Fallback: get from the table if exists
      const rows = document.querySelectorAll('.grid-view .odd, .grid-view .even');
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 2) {
          chartData.push({
            date: cells[0]?.textContent?.trim(),
            value: cells[1]?.textContent?.trim(),
            club: cells[2]?.textContent?.trim(),
          });
        }
      });
      
      // Also try to get current market value from page
      const currentValueEl = document.querySelector('.tm-player-market-value-development__current-value');
      const currentValue = currentValueEl?.textContent?.trim();
      
      return { history: chartData, currentValue };
    });
    
    console.log(`Found ${marketValues.history?.length || 0} market value records for ${player.name}`);
    return marketValues;
  } catch (error) {
    console.error(`Error scraping market values for ${player.name}:`, error.message);
    return { history: [], currentValue: null };
  }
}

// Get athlete ID from Supabase by slug
async function getAthleteId(slug) {
  const { data, error } = await supabase
    .from('athlete_profiles')
    .select('id')
    .eq('slug', slug)
    .single();
  
  if (error) {
    console.error(`Error getting athlete ID for ${slug}:`, error.message);
    return null;
  }
  return data?.id;
}

// Save transfers to Supabase
async function saveTransfers(athleteId, transfers, playerName) {
  if (!athleteId || !transfers.length) return;
  
  const records = transfers.map(t => {
    const { fee, type } = parseFee(t.fee);
    return {
      athlete_id: athleteId,
      transfer_date: parseDate(t.date),
      from_club: t.fromClub,
      from_club_logo_url: t.fromClubLogo,
      to_club: t.toClub,
      to_club_logo_url: t.toClubLogo,
      transfer_fee: fee,
      fee_currency: 'EUR',
      transfer_type: type,
      season: t.season,
    };
  }).filter(r => r.transfer_date); // Only records with valid dates
  
  if (!records.length) return;
  
  const { error } = await supabase
    .from('athlete_transfer_history')
    .upsert(records, { 
      onConflict: 'athlete_id,transfer_date,from_club,to_club',
      ignoreDuplicates: true 
    });
  
  if (error) {
    console.error(`Error saving transfers for ${playerName}:`, error.message);
  } else {
    console.log(`Saved ${records.length} transfers for ${playerName}`);
  }
}

// Save injuries to Supabase
async function saveInjuries(athleteId, injuries, playerName) {
  if (!athleteId || !injuries.length) return;
  
  const records = injuries.map(i => ({
    athlete_id: athleteId,
    injury_type: i.injury,
    start_date: parseDate(i.from),
    end_date: parseDate(i.until),
    days_out: parseInt(i.days) || null,
    games_missed: parseInt(i.gamesMissed) || null,
    season: i.season,
    is_current: !i.until || i.until === '-',
    source: 'transfermarkt',
  })).filter(r => r.start_date); // Only records with valid dates
  
  if (!records.length) return;
  
  const { error } = await supabase
    .from('athlete_injury_history')
    .upsert(records, { 
      onConflict: 'athlete_id,injury_type,start_date',
      ignoreDuplicates: true 
    });
  
  if (error) {
    console.error(`Error saving injuries for ${playerName}:`, error.message);
  } else {
    console.log(`Saved ${records.length} injuries for ${playerName}`);
  }
}

// Save market values to Supabase
async function saveMarketValues(athleteId, marketData, playerName) {
  if (!athleteId) return;
  
  // Update current market value in athlete_profiles
  if (marketData.currentValue) {
    const currentValue = parseMarketValue(marketData.currentValue);
    if (currentValue) {
      await supabase
        .from('athlete_profiles')
        .update({ 
          current_market_value: currentValue,
          market_value_currency: 'EUR'
        })
        .eq('id', athleteId);
      console.log(`Updated current market value for ${playerName}: €${currentValue.toLocaleString()}`);
    }
  }
  
  // Save historical values
  if (marketData.history?.length) {
    const records = marketData.history.map(mv => ({
      athlete_id: athleteId,
      value_date: parseDate(mv.date),
      market_value: parseMarketValue(mv.value),
      currency: 'EUR',
      club_at_time: mv.club,
      source: 'transfermarkt',
    })).filter(r => r.value_date && r.market_value);
    
    if (records.length) {
      const { error } = await supabase
        .from('athlete_market_values')
        .upsert(records, { 
          onConflict: 'athlete_id,value_date',
          ignoreDuplicates: true 
        });
      
      if (error) {
        console.error(`Error saving market values for ${playerName}:`, error.message);
      } else {
        console.log(`Saved ${records.length} market value records for ${playerName}`);
      }
    }
  }
}

// Log sync status
async function logSync(status, details) {
  await supabase.from('sync_logs').insert({
    sync_type: 'transfermarkt',
    status,
    details,
    synced_at: new Date().toISOString(),
  });
}

// Main scraping function
async function scrapeAllPlayers() {
  console.log('Starting Transfermarkt scrape...');
  const startTime = Date.now();
  const results = { success: 0, failed: 0, errors: [] };
  
  let browser;
  try {
    browser = await launchBrowser();
    const page = await getStealthPage(browser);
    
    for (const player of PLAYERS) {
      console.log(`\n--- Processing ${player.name} ---`);
      
      try {
        // Get athlete ID from database
        const athleteId = await getAthleteId(player.slug);
        if (!athleteId) {
          console.error(`No athlete found with slug: ${player.slug}`);
          results.failed++;
          results.errors.push(`${player.name}: Not found in database`);
          continue;
        }
        
        // Scrape transfers
        await humanDelay();
        const transfers = await scrapeTransfers(page, player);
        await saveTransfers(athleteId, transfers, player.name);
        
        // Scrape injuries
        await humanDelay();
        const injuries = await scrapeInjuries(page, player);
        await saveInjuries(athleteId, injuries, player.name);
        
        // Scrape market values
        await humanDelay();
        const marketValues = await scrapeMarketValues(page, player);
        await saveMarketValues(athleteId, marketValues, player.name);
        
        results.success++;
        console.log(`✓ Completed ${player.name}`);
        
      } catch (error) {
        console.error(`Error processing ${player.name}:`, error.message);
        results.failed++;
        results.errors.push(`${player.name}: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('Browser error:', error.message);
    results.errors.push(`Browser error: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n=== Scrape completed in ${duration}s ===`);
  console.log(`Success: ${results.success}, Failed: ${results.failed}`);
  
  // Log to Supabase
  await logSync(
    results.failed === 0 ? 'success' : 'partial',
    { ...results, duration_seconds: parseFloat(duration) }
  );
  
  return results;
}

// Express app for Cloud Run
const app = express();

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'healthy', service: 'transfermarkt-scraper' });
});

// Trigger scrape endpoint (called by Cloud Scheduler)
app.post('/scrape', async (req, res) => {
  // Verify authorization (optional - add your own secret)
  const authHeader = req.headers['authorization'];
  const expectedToken = process.env.SCRAPER_SECRET;
  
  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const results = await scrapeAllPlayers();
    res.json({ success: true, results });
  } catch (error) {
    console.error('Scrape error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Manual trigger for testing
app.get('/scrape', async (req, res) => {
  // Only allow in development or with secret
  const secret = req.query.secret;
  const expectedSecret = process.env.SCRAPER_SECRET;
  
  if (expectedSecret && secret !== expectedSecret) {
    return res.status(401).json({ error: 'Unauthorized - add ?secret=YOUR_SECRET' });
  }
  
  try {
    const results = await scrapeAllPlayers();
    res.json({ success: true, results });
  } catch (error) {
    console.error('Scrape error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Transfermarkt scraper running on port ${PORT}`);
});

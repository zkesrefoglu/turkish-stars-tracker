import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================================
// CORS HEADERS
// ============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================================
// PLAYER CONFIGURATION - ALL TURKISH STARS
// ============================================================================

interface PlayerConfig {
  name: string;
  slug: string;
  fbref_id: string;
  team: string;
  league: string;
  position: string;
  transfermarkt_id?: number;
  fotmob_id?: number;
}

const TURKISH_STARS: PlayerConfig[] = [
  {
    name: "Arda Güler",
    slug: "arda-guler",
    fbref_id: "3741ca58",
    team: "Real Madrid",
    league: "La Liga",
    position: "AM",
    transfermarkt_id: 861410,
    fotmob_id: 1316257
  },
  {
    name: "Kenan Yıldız",
    slug: "kenan-yildiz",
    fbref_id: "d8cda243",
    team: "Juventus",
    league: "Serie A",
    position: "LW",
    transfermarkt_id: 798650,
    fotmob_id: 1183977
  },
  {
    name: "Hakan Çalhanoğlu",
    slug: "hakan-calhanoglu",
    fbref_id: "cd0fa27b",
    team: "Inter",
    league: "Serie A",
    position: "DM",
    transfermarkt_id: 126414,
    fotmob_id: 275008
  },
  {
    name: "Ferdi Kadıoğlu",
    slug: "ferdi-kadioglu",
    fbref_id: "66c52a77",
    team: "Brighton",
    league: "Premier League",
    position: "LB",
    transfermarkt_id: 346498,
    fotmob_id: 869509
  },
  {
    name: "Can Uzun",
    slug: "can-uzun",
    fbref_id: "1d0b134a",
    team: "Eintracht Frankfurt",
    league: "Bundesliga",
    position: "AM",
    transfermarkt_id: 886655,
    fotmob_id: 1241857
  },
  {
    name: "Berke Özer",
    slug: "berke-ozer",
    fbref_id: "0743d0ec",
    team: "Lille",
    league: "Ligue 1",
    position: "GK",
    transfermarkt_id: 481886,
    fotmob_id: 1002847
  },
  {
    name: "Altay Bayındır",
    slug: "altay-bayindir",
    fbref_id: "072e68ed",
    team: "Manchester United",
    league: "Premier League",
    position: "GK",
    transfermarkt_id: 410519,
    fotmob_id: 802498
  },
  {
    name: "Enes Ünal",
    slug: "enes-unal",
    fbref_id: "8a559e2a",
    team: "Bournemouth",
    league: "Premier League",
    position: "ST",
    transfermarkt_id: 282181,
    fotmob_id: 574609
  },
  {
    name: "Merih Demiral",
    slug: "merih-demiral",
    fbref_id: "b6260402",
    team: "Al-Ahli",
    league: "Saudi Pro League",
    position: "CB",
    transfermarkt_id: 262498,
    fotmob_id: 619618
  },
  {
    name: "Orkun Kökçü",
    slug: "orkun-kokcu",
    fbref_id: "68f7de41",
    team: "Benfica",
    league: "Primeira Liga",
    position: "CM",
    transfermarkt_id: 435208,
    fotmob_id: 848572
  },
  {
    name: "Kerem Aktürkoğlu",
    slug: "kerem-akturkoglu",
    fbref_id: "51b22e7a",
    team: "Benfica",
    league: "Primeira Liga",
    position: "LW",
    transfermarkt_id: 612240,
    fotmob_id: 1039891
  },
  {
    name: "Semih Kılıçsoy",
    slug: "semih-kilicsoy",
    fbref_id: "12b6abf6",
    team: "Beşiktaş",
    league: "Süper Lig",
    position: "ST",
    transfermarkt_id: 954498,
    fotmob_id: 1421673
  },
  {
    name: "Yusuf Akçiçek",
    slug: "yusuf-akcicek",
    fbref_id: "4c7f9a82",
    team: "Bayern Munich",
    league: "Bundesliga",
    position: "CB",
    transfermarkt_id: 676158,
    fotmob_id: 1103482
  },
  {
    name: "Atakan Karazor",
    slug: "atakan-karazor",
    fbref_id: "e6a8a1a0",
    team: "Stuttgart",
    league: "Bundesliga",
    position: "DM",
    transfermarkt_id: 268742,
    fotmob_id: 605911
  },
  {
    name: "Barış Alper Yılmaz",
    slug: "baris-alper-yilmaz",
    fbref_id: "3e2bb7f0",
    team: "Galatasaray",
    league: "Süper Lig",
    position: "RW",
    transfermarkt_id: 596814,
    fotmob_id: 1155108
  },
  {
    name: "Yunus Akgün",
    slug: "yunus-akgun",
    fbref_id: "a15e4b2c",
    team: "Galatasaray",
    league: "Süper Lig",
    position: "LW",
    transfermarkt_id: 469448,
    fotmob_id: 909712
  },
  {
    name: "Deniz Gül",
    slug: "deniz-gul",
    fbref_id: "6f59f35b",
    team: "Galatasaray",
    league: "Süper Lig",
    position: "ST",
    transfermarkt_id: 800589,
    fotmob_id: 1205988
  }
];

// ============================================================================
// MANUAL DATA ENTRY ENDPOINT
// ============================================================================

interface ManualStatsInput {
  athlete_slug: string;
  season: string;
  competition: string;
  stats: Record<string, unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function upsertManualStats(
  supabase: any,
  input: ManualStatsInput
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get athlete ID from slug
    const { data: athlete, error: athleteError } = await supabase
      .from("athlete_profiles")
      .select("id")
      .eq("slug", input.athlete_slug)
      .single();

    if (athleteError || !athlete) {
      return { success: false, error: `Athlete not found: ${input.athlete_slug}` };
    }

    // Upsert stats
    const { error: upsertError } = await supabase
      .from("athlete_advanced_stats")
      .upsert({
        athlete_id: athlete.id,
        season: input.season,
        competition: input.competition,
        ...input.stats,
        last_updated: new Date().toISOString()
      }, {
        onConflict: "athlete_id,season,competition"
      });

    if (upsertError) {
      return { success: false, error: upsertError.message };
    }

    return { success: true };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return { success: false, error: message };
  }
}

// ============================================================================
// BULK IMPORT FROM CSV/JSON
// ============================================================================

interface BulkImportData {
  players: {
    slug: string;
    season: string;
    competition: string;
    [key: string]: unknown;
  }[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any

async function bulkImportStats(
  supabase: any,
  data: BulkImportData
): Promise<{ imported: number; errors: string[] }> {
  const results = { imported: 0, errors: [] as string[] };

  for (const player of data.players) {
    const result = await upsertManualStats(supabase, {
      athlete_slug: player.slug,
      season: player.season,
      competition: player.competition,
      stats: player
    });

    if (result.success) {
      results.imported++;
      console.log(`[SUCCESS] Imported stats for ${player.slug}`);
    } else {
      results.errors.push(`${player.slug}: ${result.error}`);
      console.log(`[ERROR] Failed to import ${player.slug}: ${result.error}`);
    }
  }

  return results;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "status";

    console.log(`[fetch-fbref-stats] Action: ${action}`);

    // ========================================
    // ACTION: STATUS
    // ========================================
    if (action === "status") {
      // Get count of advanced stats
      const { count: statsCount } = await supabase
        .from("athlete_advanced_stats")
        .select("*", { count: "exact", head: true });

      const { count: percentileCount } = await supabase
        .from("athlete_percentile_rankings")
        .select("*", { count: "exact", head: true });

      return new Response(
        JSON.stringify({
          status: "ok",
          players_configured: TURKISH_STARS.length,
          advanced_stats_records: statsCount || 0,
          percentile_records: percentileCount || 0,
          message: "Use action=import with POST to bulk import stats"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========================================
    // ACTION: LIST PLAYERS
    // ========================================
    if (action === "players") {
      return new Response(
        JSON.stringify({
          players: TURKISH_STARS.map(p => ({
            name: p.name,
            slug: p.slug,
            fbref_id: p.fbref_id,
            team: p.team,
            league: p.league,
            fbref_url: `https://fbref.com/en/players/${p.fbref_id}/${p.name.replace(/\s/g, '-')}`
          }))
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========================================
    // ACTION: IMPORT (POST)
    // ========================================
    if (action === "import" && req.method === "POST") {
      const body = await req.json() as BulkImportData;
      
      if (!body.players || !Array.isArray(body.players)) {
        return new Response(
          JSON.stringify({ error: "Missing 'players' array in request body" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[fetch-fbref-stats] Importing ${body.players.length} players...`);
      const results = await bulkImportStats(supabase, body);

      return new Response(
        JSON.stringify({
          success: true,
          imported: results.imported,
          errors: results.errors
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========================================
    // ACTION: UPSERT SINGLE (POST)
    // ========================================
    if (action === "upsert" && req.method === "POST") {
      const body = await req.json() as ManualStatsInput;
      
      if (!body.athlete_slug || !body.season || !body.competition) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: athlete_slug, season, competition" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await upsertManualStats(supabase, body);

      return new Response(
        JSON.stringify(result),
        { 
          status: result.success ? 200 : 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // ========================================
    // ACTION: SYNC FBREF IDS
    // ========================================
    if (action === "sync-ids") {
      const results = { updated: 0, errors: [] as string[] };

      for (const player of TURKISH_STARS) {
        const { error } = await supabase
          .from("athlete_profiles")
          .update({
            fbref_id: player.fbref_id,
            fbref_url: `https://fbref.com/en/players/${player.fbref_id}/${player.name.replace(/\s/g, '-')}`
          })
          .eq("slug", player.slug);

        if (error) {
          results.errors.push(`${player.slug}: ${error.message}`);
        } else {
          results.updated++;
        }
      }

      console.log(`[fetch-fbref-stats] Synced ${results.updated} FBref IDs`);

      return new Response(
        JSON.stringify(results),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Unknown action
    return new Response(
      JSON.stringify({ 
        error: "Unknown action",
        available_actions: ["status", "players", "import", "upsert", "sync-ids"]
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[fetch-fbref-stats] Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

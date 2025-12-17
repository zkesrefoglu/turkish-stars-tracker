import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookSecret = req.headers.get("x-webhook-secret");
    const expectedSecret = Deno.env.get("STATS_WEBHOOK_SECRET");

    if (!webhookSecret || webhookSecret !== expectedSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { type, athlete_slug, data } = body;

    const { data: athlete, error: athleteError } = await supabase
      .from("athlete_profiles")
      .select("id, name")
      .eq("slug", athlete_slug)
      .single();

    if (athleteError || !athlete) {
      return new Response(JSON.stringify({ error: `Athlete not found: ${athlete_slug}` }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result = { inserted: 0, errors: [] as string[] };

    if (type === "transfers" && Array.isArray(data)) {
      for (const transfer of data) {
        const { error } = await supabase.from("athlete_transfer_history").upsert(
          {
            athlete_id: athlete.id,
            transfer_date: transfer.transfer_date,
            from_club: transfer.from_club,
            to_club: transfer.to_club,
            transfer_fee: transfer.transfer_fee,
            transfer_type: transfer.transfer_type || "transfer",
            season: transfer.season,
          },
          { onConflict: "athlete_id,transfer_date,from_club,to_club" },
        );
        if (error) result.errors.push(error.message);
        else result.inserted++;
      }
    }

    if (type === "injuries" && Array.isArray(data)) {
      for (const injury of data) {
        const { error } = await supabase.from("athlete_injury_history").upsert(
          {
            athlete_id: athlete.id,
            injury_type: injury.injury_type,
            start_date: injury.start_date,
            end_date: injury.end_date,
            days_missed: injury.days_out,
            games_missed: injury.games_missed,
            season: injury.season,
            is_current: injury.is_current || false,
          },
          { onConflict: "athlete_id,start_date,injury_type" },
        );
        if (error) result.errors.push(error.message);
        else result.inserted++;
      }
    }

    if (type === "market_values" && Array.isArray(data)) {
      for (const mv of data) {
        const { error } = await supabase.from("athlete_market_values").upsert(
          {
            athlete_id: athlete.id,
            recorded_date: mv.value_date,
            market_value: mv.market_value,
            currency: "EUR",
          },
          { onConflict: "athlete_id,recorded_date" },
        );
        if (error) result.errors.push(error.message);
        else result.inserted++;
      }

      if (data.length > 0) {
        const latest = data.sort(
          (a: any, b: any) => new Date(b.value_date).getTime() - new Date(a.value_date).getTime(),
        )[0];
        await supabase
          .from("athlete_profiles")
          .update({ current_market_value: latest.market_value })
          .eq("id", athlete.id);
      }
    }

    return new Response(JSON.stringify({ success: true, athlete: athlete.name, type, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

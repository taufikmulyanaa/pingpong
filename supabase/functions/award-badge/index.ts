// Supabase Edge Function: award-badge
// Checks badge eligibility and awards badges to a user

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
    user_id: string;
}

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { user_id }: RequestBody = await req.json();

        if (!user_id) {
            return new Response(
                JSON.stringify({ error: "user_id is required" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Call the database function to check and award badges
        const { data, error } = await supabase.rpc("check_and_award_badges", {
            p_user_id: user_id,
        });

        if (error) {
            console.error("Error awarding badges:", error);
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Get badge details for the awarded badge IDs
        let awardedBadges: any[] = [];
        if (data && data.length > 0) {
            const { data: badges, error: badgeError } = await supabase
                .from("badges")
                .select("*")
                .in("id", data);

            if (!badgeError && badges) {
                awardedBadges = badges;
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                awarded_badge_ids: data || [],
                awarded_badges: awardedBadges,
            }),
            {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    } catch (err) {
        console.error("Unexpected error:", err);
        return new Response(JSON.stringify({ error: "Internal server error" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});

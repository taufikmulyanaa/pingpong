// Supabase Edge Function: match-making
// Quick match algorithm to find suitable opponents based on rating and location

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
    user_id: string;
    rating_range?: number; // ± rating tolerance (default: 100)
    max_distance_km?: number; // max distance in km (default: 10)
    match_type?: "RANKED" | "FRIENDLY";
    auto_create_challenge?: boolean;
}

interface Profile {
    id: string;
    name: string;
    username: string | null;
    avatar_url: string | null;
    rating_mr: number;
    level: number;
    city: string | null;
    latitude: number | null;
    longitude: number | null;
    is_online: boolean;
    total_matches: number;
    wins: number;
}

// Haversine formula to calculate distance between two coordinates
function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Calculate match score (higher is better)
function calculateMatchScore(
    player: Profile,
    opponent: Profile,
    ratingRange: number
): number {
    let score = 100;

    // Rating difference scoring (closer = better)
    const ratingDiff = Math.abs(player.rating_mr - opponent.rating_mr);
    score -= (ratingDiff / ratingRange) * 30;

    // Online bonus
    if (opponent.is_online) {
        score += 20;
    }

    // Similar level bonus
    const levelDiff = Math.abs(player.level - opponent.level);
    score -= levelDiff * 2;

    // Activity bonus (more matches = more active)
    if (opponent.total_matches > 10) {
        score += 10;
    }

    return Math.max(0, score);
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

        const {
            user_id,
            rating_range = 100,
            max_distance_km = 10,
            match_type = "RANKED",
            auto_create_challenge = false,
        }: RequestBody = await req.json();

        if (!user_id) {
            return new Response(JSON.stringify({ error: "user_id is required" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Get the requesting player's profile
        const { data: player, error: playerError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user_id)
            .single();

        if (playerError || !player) {
            return new Response(JSON.stringify({ error: "Player not found" }), {
                status: 404,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Find potential opponents within rating range
        const minRating = player.rating_mr - rating_range;
        const maxRating = player.rating_mr + rating_range;

        const { data: candidates, error: candidatesError } = await supabase
            .from("profiles")
            .select(
                "id, name, username, avatar_url, rating_mr, level, city, latitude, longitude, is_online, total_matches, wins"
            )
            .neq("id", user_id)
            .gte("rating_mr", minRating)
            .lte("rating_mr", maxRating)
            .limit(50);

        if (candidatesError) {
            console.error("Error fetching candidates:", candidatesError);
            return new Response(
                JSON.stringify({ error: "Failed to find opponents" }),
                {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Filter by distance if player has location
        let filteredCandidates = candidates || [];

        if (
            player.latitude &&
            player.longitude &&
            max_distance_km > 0
        ) {
            filteredCandidates = filteredCandidates.filter((candidate) => {
                if (!candidate.latitude || !candidate.longitude) return true; // Include if no location
                const distance = calculateDistance(
                    player.latitude,
                    player.longitude,
                    candidate.latitude,
                    candidate.longitude
                );
                return distance <= max_distance_km;
            });
        }

        // Score and sort candidates
        const scoredCandidates = filteredCandidates.map((candidate) => ({
            ...candidate,
            match_score: calculateMatchScore(player, candidate, rating_range),
            distance_km:
                player.latitude && player.longitude && candidate.latitude && candidate.longitude
                    ? Math.round(
                        calculateDistance(
                            player.latitude,
                            player.longitude,
                            candidate.latitude,
                            candidate.longitude
                        ) * 10
                    ) / 10
                    : null,
        }));

        scoredCandidates.sort((a, b) => b.match_score - a.match_score);

        // Take top 10 matches
        const topOpponents = scoredCandidates.slice(0, 10);

        let challenge = null;

        // Auto-create challenge with the best match if requested
        if (auto_create_challenge && topOpponents.length > 0) {
            const bestMatch = topOpponents[0];

            // Check if there's already a pending challenge
            const { data: existingChallenge } = await supabase
                .from("challenges")
                .select("id")
                .eq("challenger_id", user_id)
                .eq("challenged_id", bestMatch.id)
                .eq("status", "PENDING")
                .single();

            if (!existingChallenge) {
                const { data: newChallenge, error: challengeError } = await supabase
                    .from("challenges")
                    .insert({
                        challenger_id: user_id,
                        challenged_id: bestMatch.id,
                        match_type,
                        best_of: 3,
                        message: "Quick match challenge dari matchmaking!",
                        status: "PENDING",
                        expires_at: new Date(
                            Date.now() + 24 * 60 * 60 * 1000
                        ).toISOString(), // 24 hours
                    })
                    .select()
                    .single();

                if (!challengeError && newChallenge) {
                    challenge = newChallenge;
                }
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                player_rating: player.rating_mr,
                search_params: {
                    rating_range,
                    max_distance_km,
                    match_type,
                },
                opponents: topOpponents,
                challenge_created: challenge,
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

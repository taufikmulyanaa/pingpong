import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { Match, Challenge, Profile } from "../types/database";

interface MatchState {
    matches: Match[];
    currentMatch: Match | null;
    challenges: Challenge[];
    pendingChallenges: Challenge[];
    isLoading: boolean;

    // Actions
    fetchMatches: (userId: string) => Promise<void>;
    fetchMatch: (matchId: string) => Promise<void>;
    fetchChallenges: (userId: string) => Promise<void>;
    createChallenge: (data: {
        challenged_id: string;
        match_type: "RANKED" | "FRIENDLY";
        best_of: number;
        message?: string;
    }) => Promise<{ error: Error | null; challenge?: Challenge }>;
    respondToChallenge: (challengeId: string, accept: boolean) => Promise<{ error: Error | null }>;
    updateMatchScore: (matchId: string, setNumber: number, player1Score: number, player2Score: number) => Promise<{ error: Error | null }>;
    completeMatch: (matchId: string, winnerId: string) => Promise<{ error: Error | null }>;
}

export const useMatchStore = create<MatchState>((set, get) => ({
    matches: [],
    currentMatch: null,
    challenges: [],
    pendingChallenges: [],
    isLoading: false,

    fetchMatches: async (userId) => {
        set({ isLoading: true });

        try {
            const { data, error } = await supabase
                .from("matches")
                .select(`
          *,
          player1:profiles!player1_id(*),
          player2:profiles!player2_id(*),
          winner:profiles!winner_id(*),
          sets:match_sets(*)
        `)
                .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
                .order("created_at", { ascending: false })
                .limit(50);

            if (error) throw error;

            set({ matches: (data || []) as Match[] });
        } catch (error) {
            console.error("Error fetching matches:", error);
        } finally {
            set({ isLoading: false });
        }
    },

    fetchMatch: async (matchId) => {
        set({ isLoading: true });

        try {
            const { data, error } = await supabase
                .from("matches")
                .select(`
          *,
          player1:profiles!player1_id(*),
          player2:profiles!player2_id(*),
          winner:profiles!winner_id(*),
          sets:match_sets(*)
        `)
                .eq("id", matchId)
                .single();

            if (error) throw error;

            set({ currentMatch: data as Match });
        } catch (error) {
            console.error("Error fetching match:", error);
        } finally {
            set({ isLoading: false });
        }
    },

    fetchChallenges: async (userId) => {
        set({ isLoading: true });

        try {
            console.log("Fetching challenges for userId:", userId);

            const { data, error } = await supabase
                .from("challenges")
                .select(`
          *,
          challenger:profiles!challenger_id(*),
          challenged:profiles!challenged_id(*)
        `)
                .or(`challenger_id.eq.${userId},challenged_id.eq.${userId}`)
                .order("created_at", { ascending: false });

            console.log("Challenges query result:", { data, error });

            if (error) throw error;

            const challenges = (data || []) as Challenge[];
            const pending = challenges.filter(
                (c) => c.status === "PENDING" && c.challenged_id === userId
            );

            console.log("Pending challenges:", pending);

            set({ challenges, pendingChallenges: pending });
        } catch (error) {
            console.error("Error fetching challenges:", error);
        } finally {
            set({ isLoading: false });
        }
    },


    createChallenge: async (data) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // Get challenger name for notification
            const { data: challengerProfile } = await supabase
                .from("profiles")
                .select("name")
                .eq("id", user.id)
                .single();

            const challengeData = {
                challenger_id: user.id,
                challenged_id: data.challenged_id,
                match_type: data.match_type,
                best_of: data.best_of,
                message: data.message,
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            };

            const { data: challenge, error } = await (supabase.from("challenges") as any)
                .insert(challengeData)
                .select()
                .single();

            if (error) throw error;

            // Create notification for challenged user
            await (supabase.from("notifications") as any).insert({
                user_id: data.challenged_id,
                type: "CHALLENGE",
                title: "Tantangan Baru!",
                body: `${(challengerProfile as any)?.name || "Seseorang"} menantangmu untuk ${data.match_type === "RANKED" ? "Ranked" : "Friendly"} Match!`,
                data: { challengeId: challenge.id },
                is_read: false,
            });

            return { error: null, challenge: challenge as Challenge };
        } catch (error) {
            return { error: error as Error };
        }
    },

    respondToChallenge: async (challengeId, accept) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            const { error: updateError } = await (supabase.from("challenges") as any)
                .update({
                    status: accept ? "ACCEPTED" : "DECLINED",
                    responded_at: new Date().toISOString(),
                })
                .eq("id", challengeId);

            if (updateError) throw updateError;

            // Fetch challenge data for notification
            const { data: challengeData } = await supabase
                .from("challenges")
                .select("*, challenged:profiles!challenged_id(name)")
                .eq("id", challengeId)
                .single();

            if (challengeData) {
                const challenge = challengeData as Challenge & { challenged: { name: string } };

                // Notify the challenger about the response
                await (supabase.from("notifications") as any).insert({
                    user_id: challenge.challenger_id,
                    type: "CHALLENGE",
                    title: accept ? "Tantangan Diterima!" : "Tantangan Ditolak",
                    body: accept
                        ? `${(challenge as any).challenged?.name || "Lawan"} menerima tantanganmu! Match siap dimulai.`
                        : `${(challenge as any).challenged?.name || "Lawan"} menolak tantanganmu.`,
                    data: { challengeId: challenge.id },
                    is_read: false,
                });

                // If accepted, create a match
                if (accept) {
                    // Get current ratings
                    const { data: players } = await supabase
                        .from("profiles")
                        .select("id, rating_mr")
                        .in("id", [challenge.challenger_id, challenge.challenged_id]);

                    const player1 = (players as any[])?.find((p: any) => p.id === challenge.challenger_id);
                    const player2 = (players as any[])?.find((p: any) => p.id === challenge.challenged_id);

                    const matchData = {
                        player1_id: challenge.challenger_id,
                        player2_id: challenge.challenged_id,
                        type: challenge.match_type,
                        best_of: challenge.best_of,
                        status: "IN_PROGRESS",
                        player1_rating_before: player1?.rating_mr || 1000,
                        player2_rating_before: player2?.rating_mr || 1000,
                        started_at: new Date().toISOString(),
                    };

                    const { error: matchError } = await (supabase.from("matches") as any)
                        .insert(matchData);

                    if (matchError) throw matchError;
                }
            }

            return { error: null };
        } catch (error) {
            return { error: error as Error };
        }
    },

    updateMatchScore: async (matchId, setNumber, player1Score, player2Score) => {
        try {
            const setData = {
                match_id: matchId,
                set_number: setNumber,
                player1_score: player1Score,
                player2_score: player2Score,
            };

            const { error } = await (supabase.from("match_sets") as any)
                .upsert(setData, {
                    onConflict: "match_id,set_number",
                });

            if (error) throw error;

            // Refresh current match
            await get().fetchMatch(matchId);

            return { error: null };
        } catch (error) {
            return { error: error as Error };
        }
    },

    completeMatch: async (matchId, winnerId) => {
        try {
            const { currentMatch } = get();
            if (!currentMatch) throw new Error("No current match");

            // Calculate rating changes (simplified ELO)
            const K = 32;
            const p1Rating = currentMatch.player1_rating_before || 1000;
            const p2Rating = currentMatch.player2_rating_before || 1000;

            const expected1 = 1 / (1 + Math.pow(10, (p2Rating - p1Rating) / 400));
            const expected2 = 1 - expected1;

            const actual1 = winnerId === currentMatch.player1_id ? 1 : 0;
            const actual2 = 1 - actual1;

            const change1 = Math.round(K * (actual1 - expected1));
            const change2 = Math.round(K * (actual2 - expected2));

            // Update match
            const { error: matchError } = await (supabase.from("matches") as any)
                .update({
                    status: "COMPLETED",
                    winner_id: winnerId,
                    player1_rating_change: change1,
                    player2_rating_change: change2,
                    completed_at: new Date().toISOString(),
                })
                .eq("id", matchId);

            if (matchError) throw matchError;

            // Update player stats - simplified version without RPC
            // In production, use the database function
            const { error: p1Error } = await (supabase.from("profiles") as any)
                .update({
                    rating_mr: p1Rating + change1,
                    total_matches: (currentMatch.player1 as any)?.total_matches + 1 || 1,
                })
                .eq("id", currentMatch.player1_id);

            const { error: p2Error } = await (supabase.from("profiles") as any)
                .update({
                    rating_mr: p2Rating + change2,
                    total_matches: (currentMatch.player2 as any)?.total_matches + 1 || 1,
                })
                .eq("id", currentMatch.player2_id);

            if (p1Error) console.error("Error updating player 1:", p1Error);
            if (p2Error) console.error("Error updating player 2:", p2Error);

            return { error: null };
        } catch (error) {
            return { error: error as Error };
        }
    },
}));

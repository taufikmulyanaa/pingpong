// Real-time Match Hook
// Subscribes to match and match_sets tables for live score updates

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { Match, MatchSet } from "../types/database";

interface UseRealtimeMatchReturn {
    match: Match | null;
    sets: MatchSet[];
    loading: boolean;
    error: string | null;
    updateSet: (
        setNumber: number,
        player1Score: number,
        player2Score: number
    ) => Promise<void>;
    completeMatch: (winnerId: string) => Promise<void>;
}

export function useRealtimeMatch(matchId: string): UseRealtimeMatchReturn {
    const [match, setMatch] = useState<Match | null>(null);
    const [sets, setSets] = useState<MatchSet[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch initial match data
    useEffect(() => {
        if (!matchId) return;

        const fetchMatch = async () => {
            setLoading(true);
            try {
                // Fetch match
                const { data: matchData, error: matchError } = await supabase
                    .from("matches")
                    .select(
                        `
            *,
            player1:profiles!player1_id(id, name, username, avatar_url, rating_mr),
            player2:profiles!player2_id(id, name, username, avatar_url, rating_mr)
          `
                    )
                    .eq("id", matchId)
                    .single();

                if (matchError) throw matchError;
                setMatch(matchData as Match);

                // Fetch sets
                const { data: setsData, error: setsError } = await supabase
                    .from("match_sets")
                    .select("*")
                    .eq("match_id", matchId)
                    .order("set_number", { ascending: true });

                if (setsError) throw setsError;
                setSets(setsData || []);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchMatch();
    }, [matchId]);

    // Subscribe to real-time updates
    useEffect(() => {
        if (!matchId) return;

        const channel = supabase
            .channel(`match:${matchId}`)
            // Match status updates
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "matches",
                    filter: `id=eq.${matchId}`,
                },
                (payload) => {
                    setMatch((prev) =>
                        prev ? { ...prev, ...(payload.new as Match) } : null
                    );
                }
            )
            // New set inserted
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "match_sets",
                    filter: `match_id=eq.${matchId}`,
                },
                (payload) => {
                    setSets((prev) => {
                        const exists = prev.some((s) => s.id === payload.new.id);
                        if (exists) return prev;
                        return [...prev, payload.new as MatchSet].sort(
                            (a, b) => a.set_number - b.set_number
                        );
                    });
                }
            )
            // Set score updated
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "match_sets",
                    filter: `match_id=eq.${matchId}`,
                },
                (payload) => {
                    setSets((prev) =>
                        prev.map((s) =>
                            s.id === payload.new.id ? (payload.new as MatchSet) : s
                        )
                    );
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [matchId]);

    const updateSet = useCallback(
        async (setNumber: number, player1Score: number, player2Score: number) => {
            const existingSet = sets.find((s) => s.set_number === setNumber);

            if (existingSet) {
                // Update existing set
                const { error: updateError } = await supabase
                    .from("match_sets")
                    .update({ player1_score: player1Score, player2_score: player2Score })
                    .eq("id", existingSet.id);

                if (updateError) {
                    setError(updateError.message);
                }
            } else {
                // Insert new set
                const { error: insertError } = await supabase.from("match_sets").insert({
                    match_id: matchId,
                    set_number: setNumber,
                    player1_score: player1Score,
                    player2_score: player2Score,
                });

                if (insertError) {
                    setError(insertError.message);
                }
            }
        },
        [matchId, sets]
    );

    const completeMatch = useCallback(
        async (winnerId: string) => {
            // Call the Edge Function to calculate ELO
            const { error: rpcError } = await supabase.functions.invoke(
                "calculate-elo",
                {
                    body: { match_id: matchId, winner_id: winnerId },
                }
            );

            if (rpcError) {
                setError(rpcError.message);
            }
        },
        [matchId]
    );

    return { match, sets, loading, error, updateSet, completeMatch };
}

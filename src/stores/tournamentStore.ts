import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { Tournament } from "../types/database";

// Extended types for tournament store
interface TournamentWithVenue extends Tournament {
    venues?: { name: string; city: string } | null;
    organizer?: { name: string } | null;
}

interface TournamentParticipant {
    id: string;
    user_id: string;
    seed: number | null;
    status: string;
    registered_at: string;
    profiles: {
        id: string;
        name: string;
        avatar_url: string | null;
        rating_mr: number;
    };
}

interface TournamentMatch {
    id: string;
    tournament_id: string;
    round: number;
    match_number: number;
    bracket_position: number | null;
    player1_id: string | null;
    player2_id: string | null;
    winner_id: string | null;
    player1_score: number;
    player2_score: number;
    status: string;
    next_match_id: string | null;
    next_match_slot: number | null;
    is_bye: boolean;
    is_third_place: boolean;
    player1?: { id: string; name: string; avatar_url: string | null; rating_mr: number } | null;
    player2?: { id: string; name: string; avatar_url: string | null; rating_mr: number } | null;
}

interface TournamentState {
    // State
    tournaments: TournamentWithVenue[];
    currentTournament: TournamentWithVenue | null;
    participants: TournamentParticipant[];
    matches: TournamentMatch[];
    isLoading: boolean;
    error: string | null;

    // Actions - Tournaments
    fetchTournaments: (filter?: "upcoming" | "ongoing" | "past") => Promise<void>;
    fetchTournament: (id: string) => Promise<void>;
    createTournament: (data: Partial<Tournament>) => Promise<{ data: Tournament | null; error: Error | null }>;
    updateTournament: (id: string, data: Partial<Tournament>) => Promise<{ error: Error | null }>;

    // Actions - Participants
    fetchParticipants: (tournamentId: string) => Promise<void>;
    register: (tournamentId: string, userId: string) => Promise<{ error: Error | null }>;
    unregister: (tournamentId: string, userId: string) => Promise<{ error: Error | null }>;
    checkRegistration: (tournamentId: string, userId: string) => Promise<boolean>;

    // Actions - Bracket/Matches
    fetchMatches: (tournamentId: string) => Promise<void>;
    saveBracket: (tournamentId: string, matches: Omit<TournamentMatch, "id">[]) => Promise<{ error: Error | null }>;
    updateMatchResult: (matchId: string, player1Score: number, player2Score: number, winnerId: string) => Promise<{ error: Error | null }>;
    clearBracket: (tournamentId: string) => Promise<{ error: Error | null }>;

    // Utility
    clearError: () => void;
    reset: () => void;
}

export const useTournamentStore = create<TournamentState>((set, get) => ({
    // Initial state
    tournaments: [],
    currentTournament: null,
    participants: [],
    matches: [],
    isLoading: false,
    error: null,

    // Fetch all tournaments
    fetchTournaments: async (filter) => {
        set({ isLoading: true, error: null });
        try {
            let query = supabase
                .from("tournaments")
                .select(`*, venues (name, city)`)
                .order("start_date", { ascending: true });

            // Apply filter
            if (filter === "upcoming") {
                query = query.in("status", ["DRAFT", "REGISTRATION_OPEN"]);
            } else if (filter === "ongoing") {
                query = query.in("status", ["REGISTRATION_CLOSED", "IN_PROGRESS"]);
            } else if (filter === "past") {
                query = query.in("status", ["COMPLETED", "CANCELLED"]);
            }

            const { data, error } = await query;

            if (error) throw error;
            set({ tournaments: (data || []) as TournamentWithVenue[] });
        } catch (err: any) {
            set({ error: err.message });
        } finally {
            set({ isLoading: false });
        }
    },

    // Fetch single tournament
    fetchTournament: async (id) => {
        set({ isLoading: true, error: null });
        try {
            const { data, error } = await supabase
                .from("tournaments")
                .select(`
                    *,
                    venues (name, city),
                    organizer:profiles!tournaments_organizer_id_fkey (name)
                `)
                .eq("id", id)
                .single();

            if (error) throw error;
            set({ currentTournament: data as TournamentWithVenue });
        } catch (err: any) {
            set({ error: err.message, currentTournament: null });
        } finally {
            set({ isLoading: false });
        }
    },

    // Create tournament
    createTournament: async (data) => {
        try {
            const { data: result, error } = await supabase
                .from("tournaments")
                .insert([data] as any)
                .select()
                .single();

            if (error) throw error;
            return { data: result as Tournament, error: null };
        } catch (err: any) {
            return { data: null, error: err };
        }
    },

    // Update tournament
    updateTournament: async (id, data) => {
        try {
            const { error } = await supabase
                .from("tournaments")
                .update(data as any)
                .eq("id", id);

            if (error) throw error;

            // Refresh current tournament
            await get().fetchTournament(id);
            return { error: null };
        } catch (err: any) {
            return { error: err };
        }
    },

    // Fetch participants
    fetchParticipants: async (tournamentId) => {
        try {
            const { data, error } = await supabase
                .from("tournament_participants")
                .select(`
                    id, user_id, seed, status, registered_at,
                    profiles (id, name, avatar_url, rating_mr)
                `)
                .eq("tournament_id", tournamentId)
                .order("seed", { ascending: true, nullsFirst: false });

            if (error) throw error;
            set({ participants: (data || []) as TournamentParticipant[] });
        } catch (err: any) {
            console.error("Error fetching participants:", err);
        }
    },

    // Register for tournament
    register: async (tournamentId, userId) => {
        try {
            const { error } = await supabase
                .from("tournament_participants")
                .insert({
                    tournament_id: tournamentId,
                    user_id: userId,
                    status: "REGISTERED",
                } as any);

            if (error) {
                if (error.code === "23505") {
                    return { error: new Error("Anda sudah terdaftar") };
                }
                throw error;
            }

            // Refresh participants
            await get().fetchParticipants(tournamentId);
            return { error: null };
        } catch (err: any) {
            return { error: err };
        }
    },

    // Unregister from tournament
    unregister: async (tournamentId, userId) => {
        try {
            const { error } = await supabase
                .from("tournament_participants")
                .delete()
                .eq("tournament_id", tournamentId)
                .eq("user_id", userId);

            if (error) throw error;

            // Refresh participants
            await get().fetchParticipants(tournamentId);
            return { error: null };
        } catch (err: any) {
            return { error: err };
        }
    },

    // Check if user is registered
    checkRegistration: async (tournamentId, userId) => {
        try {
            const { data } = await supabase
                .from("tournament_participants")
                .select("id")
                .eq("tournament_id", tournamentId)
                .eq("user_id", userId)
                .maybeSingle();

            return !!data;
        } catch {
            return false;
        }
    },

    // Fetch bracket matches
    fetchMatches: async (tournamentId) => {
        try {
            const { data, error } = await supabase
                .from("tournament_matches")
                .select(`
                    *,
                    player1:profiles!tournament_matches_player1_id_fkey (id, name, avatar_url, rating_mr),
                    player2:profiles!tournament_matches_player2_id_fkey (id, name, avatar_url, rating_mr)
                `)
                .eq("tournament_id", tournamentId)
                .order("round", { ascending: true })
                .order("match_number", { ascending: true });

            if (error) throw error;
            set({ matches: (data || []) as TournamentMatch[] });
        } catch (err: any) {
            console.error("Error fetching matches:", err);
            set({ matches: [] });
        }
    },

    // Save generated bracket
    saveBracket: async (tournamentId, matches) => {
        try {
            // First, clear existing bracket
            await supabase
                .from("tournament_matches")
                .delete()
                .eq("tournament_id", tournamentId);

            // Insert all matches
            const matchData = matches.map((m, index) => ({
                tournament_id: tournamentId,
                round: m.round,
                match_number: m.match_number,
                bracket_position: index,
                player1_id: m.player1_id,
                player2_id: m.player2_id,
                status: m.is_bye ? "BYE" : "PENDING",
                is_bye: m.is_bye,
                is_third_place: m.is_third_place,
                next_match_id: m.next_match_id,
                next_match_slot: m.next_match_slot,
            }));

            const { error } = await supabase
                .from("tournament_matches")
                .insert(matchData as any);

            if (error) throw error;

            // Refresh matches
            await get().fetchMatches(tournamentId);
            return { error: null };
        } catch (err: any) {
            return { error: err };
        }
    },

    // Update match result
    updateMatchResult: async (matchId, player1Score, player2Score, winnerId) => {
        try {
            const { error } = await supabase
                .from("tournament_matches")
                .update({
                    player1_score: player1Score,
                    player2_score: player2Score,
                    winner_id: winnerId,
                    status: "COMPLETED",
                    completed_at: new Date().toISOString(),
                } as any)
                .eq("id", matchId);

            if (error) throw error;
            return { error: null };
        } catch (err: any) {
            return { error: err };
        }
    },

    // Clear all bracket matches
    clearBracket: async (tournamentId) => {
        try {
            const { error } = await supabase
                .from("tournament_matches")
                .delete()
                .eq("tournament_id", tournamentId);

            if (error) throw error;
            set({ matches: [] });
            return { error: null };
        } catch (err: any) {
            return { error: err };
        }
    },

    // Utility functions
    clearError: () => set({ error: null }),
    reset: () => set({
        tournaments: [],
        currentTournament: null,
        participants: [],
        matches: [],
        isLoading: false,
        error: null,
    }),
}));

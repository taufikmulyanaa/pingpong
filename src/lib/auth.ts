// Authentication Context & Provider
// Handles session management, refresh tokens, and auth state

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "./supabase";
import { Session, User } from "@supabase/supabase-js";
import { Profile } from "../types/database";

interface AuthContextType {
    session: Session | null;
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
    signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
    refreshSession: () => Promise<void>;
    updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session refresh interval (50 minutes - before 1 hour expiry)
const REFRESH_INTERVAL = 50 * 60 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    // Fetch user profile
    const fetchProfile = useCallback(async (userId: string) => {
        const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();

        if (!error && data) {
            setProfile(data as Profile);
        }
    }, []);

    // Handle session refresh
    const refreshSession = useCallback(async () => {
        const { data, error } = await supabase.auth.refreshSession();
        if (!error && data.session) {
            setSession(data.session);
            setUser(data.session.user);
        }
    }, []);

    // Initialize auth state
    useEffect(() => {
        const initAuth = async () => {
            try {
                const { data: { session: currentSession } } = await supabase.auth.getSession();

                if (currentSession) {
                    setSession(currentSession);
                    setUser(currentSession.user);
                    await fetchProfile(currentSession.user.id);
                }
            } catch (error) {
                console.error("Auth init error:", error);
            } finally {
                setLoading(false);
            }
        };

        initAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, newSession) => {
                setSession(newSession);
                setUser(newSession?.user || null);

                if (event === "SIGNED_IN" && newSession) {
                    await fetchProfile(newSession.user.id);
                } else if (event === "SIGNED_OUT") {
                    setProfile(null);
                } else if (event === "TOKEN_REFRESHED" && newSession) {
                    console.log("Token refreshed successfully");
                }
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, [fetchProfile]);

    // Auto-refresh session before expiry
    useEffect(() => {
        if (!session) return;

        const refreshTimer = setInterval(() => {
            refreshSession();
        }, REFRESH_INTERVAL);

        return () => clearInterval(refreshTimer);
    }, [session, refreshSession]);

    // Sign in
    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { error };
    };

    // Sign up
    const signUp = async (email: string, password: string, name: string) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { name },
            },
        });
        return { error };
    };

    // Sign out
    const signOut = async () => {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setProfile(null);
    };

    // Update profile
    const updateProfile = async (updates: Partial<Profile>) => {
        if (!user) return { error: new Error("Not authenticated") };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("profiles") as any)
            .update(updates)
            .eq("id", user.id);

        if (!error) {
            setProfile((prev) => (prev ? { ...prev, ...updates } : null));
        }

        return { error };
    };

    const value: AuthContextType = {
        session,
        user,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        refreshSession,
        updateProfile,
    };

    return React.createElement(
        AuthContext.Provider,
        { value },
        children
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

// Hook to protect routes
export function useRequireAuth() {
    const { user, loading } = useAuth();

    return {
        isAuthenticated: !!user,
        isLoading: loading,
        user,
    };
}

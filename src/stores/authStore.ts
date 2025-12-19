import { create } from "zustand";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { Profile } from "../types/database";

interface AuthState {
    session: Session | null;
    user: User | null;
    profile: Profile | null;
    isLoading: boolean;
    isInitialized: boolean;

    // Actions
    initialize: () => Promise<void>;
    setSession: (session: Session | null) => void;
    setProfile: (profile: Profile | null) => void;
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
    signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
    signInWithGoogle: () => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
    fetchProfile: () => Promise<void>;
    updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    session: null,
    user: null,
    profile: null,
    isLoading: true,
    isInitialized: false,

    initialize: async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();

            set({
                session,
                user: session?.user ?? null,
                isInitialized: true,
            });

            if (session?.user) {
                await get().fetchProfile();
            }
        } catch (error) {
            console.error("Error initializing auth:", error);
        } finally {
            set({ isLoading: false });
        }

        // Listen for auth changes
        supabase.auth.onAuthStateChange(async (event, session) => {
            set({ session, user: session?.user ?? null });

            if (event === "SIGNED_IN" && session?.user) {
                await get().fetchProfile();
            } else if (event === "SIGNED_OUT") {
                set({ profile: null });
            }
        });
    },

    setSession: (session) => {
        set({ session, user: session?.user ?? null });
    },

    setProfile: (profile) => {
        set({ profile });
    },

    signIn: async (email, password) => {
        set({ isLoading: true });

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            return { error: null };
        } catch (error) {
            return { error: error as Error };
        } finally {
            set({ isLoading: false });
        }
    },

    signUp: async (email, password, name) => {
        set({ isLoading: true });

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { name },
                },
            });

            if (error) throw error;

            // Create profile after signup
            if (error) throw error;

            // Profile is created automatically by database trigger


            return { error: null };
        } catch (error) {
            return { error: error as Error };
        } finally {
            set({ isLoading: false });
        }
    },

    signInWithGoogle: async () => {
        set({ isLoading: true });

        try {
            const { Platform } = require('react-native');

            // For web, redirect back to the current origin after OAuth
            // For native, use the app scheme
            let redirectUrl: string;

            if (Platform.OS === 'web') {
                // On web, redirect back to the current origin
                // Supabase will append the auth tokens to the URL hash
                redirectUrl = typeof window !== 'undefined'
                    ? window.location.origin
                    : 'http://localhost:8081';
            } else {
                // On native, use the app deep link scheme
                redirectUrl = 'pingponghub://';
            }

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl,
                    skipBrowserRedirect: Platform.OS !== 'web',
                },
            });

            if (error) throw error;

            // For native, we need to manually open the browser
            if (Platform.OS !== 'web' && data?.url) {
                const WebBrowser = require('expo-web-browser');
                const result = await WebBrowser.openAuthSessionAsync(
                    data.url,
                    redirectUrl
                );

                // Handle the result from WebBrowser
                if (result.type === 'success' && result.url) {
                    // Extract tokens from URL and set session
                    const url = new URL(result.url);
                    const accessToken = url.searchParams.get('access_token');
                    const refreshToken = url.searchParams.get('refresh_token');

                    if (accessToken && refreshToken) {
                        await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken,
                        });
                    }
                }
            }

            return { error: null };
        } catch (error) {
            console.error('Google Sign In Error:', error);
            return { error: error as Error };
        } finally {
            set({ isLoading: false });
        }
    },



    signOut: async () => {
        set({ isLoading: true });

        try {
            await supabase.auth.signOut();
            set({ session: null, user: null, profile: null });
        } catch (error) {
            console.error("Error signing out:", error);
        } finally {
            set({ isLoading: false });
        }
    },

    fetchProfile: async () => {
        const { user } = get();
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single();

            if (error) throw error;

            set({ profile: data as Profile });
        } catch (error) {
            console.error("Error fetching profile:", error);
        }
    },

    updateProfile: async (updates) => {
        const { user } = get();
        if (!user) return { error: new Error("Not authenticated") };

        try {
            const { error } = await (supabase.from("profiles") as any)
                .update(updates)
                .eq("id", user.id);

            if (error) throw error;

            // Refresh profile
            await get().fetchProfile();

            return { error: null };
        } catch (error) {
            return { error: error as Error };
        }
    },
}));

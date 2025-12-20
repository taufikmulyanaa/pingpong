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

        // Listen for profile changes (Realtime)
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            supabase
                .channel('profile-changes')
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'profiles',
                        filter: `id=eq.${user.id}`,
                    },
                    (payload) => {
                        console.log('Profile updated via Realtime:', payload.new);
                        set({ profile: payload.new as Profile });
                    }
                )
                .subscribe();
        }
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
            const { makeRedirectUri } = require('expo-auth-session');

            // Generate robust redirect URL for all platforms/environments
            const redirectUrl = makeRedirectUri({
                scheme: 'pingponghub',
                path: 'auth/callback', // Optional: adds path for clarity
            });

            console.log("OAuth Redirect URL:", redirectUrl);

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl,
                    skipBrowserRedirect: Platform.OS !== 'web',
                },
            });

            if (error) throw error;

            // For native, handle browser session
            if (Platform.OS !== 'web' && data?.url) {
                const WebBrowser = require('expo-web-browser');
                const result = await WebBrowser.openAuthSessionAsync(
                    data.url,
                    redirectUrl
                );

                console.log('OAuth result:', result);

                if (result.type === 'success' && result.url) {
                    console.log('OAuth callback URL:', result.url);

                    // Parse URL - tokens can be in query params OR hash fragment
                    const url = new URL(result.url);

                    // Check query params first
                    let accessToken = url.searchParams.get('access_token');
                    let refreshToken = url.searchParams.get('refresh_token');

                    // If not in query params, check hash fragment
                    if (!accessToken && url.hash) {
                        const hashParams = new URLSearchParams(url.hash.substring(1));
                        accessToken = hashParams.get('access_token');
                        refreshToken = hashParams.get('refresh_token');
                    }

                    console.log('Tokens found:', { hasAccess: !!accessToken, hasRefresh: !!refreshToken });

                    if (accessToken && refreshToken) {
                        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken,
                        });

                        if (sessionError) {
                            console.error('Session error:', sessionError);
                            throw sessionError;
                        }

                        console.log('Session set:', sessionData?.user?.id);

                        // Fetch profile immediately after setting session
                        if (sessionData?.user) {
                            set({ user: sessionData.user, session: sessionData.session });

                            // Add small delay to ensure database trigger has completed
                            await new Promise(resolve => setTimeout(resolve, 500));

                            // Fetch profile from database
                            const { data: profileData, error: profileError } = await supabase
                                .from("profiles")
                                .select("*")
                                .eq("id", sessionData.user.id)
                                .single();

                            console.log('Profile fetch result:', {
                                profileData: profileData?.name,
                                profileError
                            });

                            if (profileData) {
                                set({ profile: profileData as Profile });
                                console.log("Profile loaded after Google login:", (profileData as Profile).name);
                            } else if (profileError) {
                                console.error('Profile fetch error:', profileError);
                            }
                        }
                    } else {
                        console.error('No tokens found in callback URL');
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
            console.log("Fetching profile for user:", user.id);

            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single();

            if (error) throw error;

            console.log("Profile fetched from DB:", data);
            console.log("DB rating_mr:", (data as any)?.rating_mr);

            set({ profile: data as Profile });

            console.log("Profile state set. New state rating_mr:", get().profile?.rating_mr);
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

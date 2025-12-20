import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams, useSegments } from 'expo-router';
import { useURL } from 'expo-linking';
import { supabase } from '../src/lib/supabase';
import { useAuthStore } from '../src/stores/authStore';

/**
 * Catch-all route to handle deep links that don't match any route
 * This is particularly useful for OAuth callbacks
 */
export default function UnmatchedRoute() {
    const router = useRouter();
    const url = useURL();
    const segments = useSegments();
    const { fetchProfile } = useAuthStore();

    useEffect(() => {
        let isMounted = true;

        const handleDeepLink = async () => {
            console.log("Unmatched route caught:", { url, segments });

            // Try to extract tokens from URL (OAuth callback)
            if (url) {
                try {
                    const parsedUrl = new URL(url);

                    // Check for tokens in query params
                    let accessToken = parsedUrl.searchParams.get('access_token');
                    let refreshToken = parsedUrl.searchParams.get('refresh_token');

                    // If not in query params, check hash fragment
                    if (!accessToken && parsedUrl.hash) {
                        const hashParams = new URLSearchParams(parsedUrl.hash.substring(1));
                        accessToken = hashParams.get('access_token');
                        refreshToken = hashParams.get('refresh_token');
                    }

                    if (accessToken && refreshToken) {
                        console.log("OAuth tokens found in unmatched route!");

                        const { data, error } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken,
                        });

                        if (!error && data?.user) {
                            console.log("Session set from unmatched route");

                            // Wait for database trigger
                            await new Promise(resolve => setTimeout(resolve, 1000));

                            // Fetch profile
                            await fetchProfile();
                        }
                    }
                } catch (e) {
                    console.error("Error parsing URL in unmatched route:", e);
                }
            }

            // Always redirect to home after a short delay
            if (isMounted) {
                setTimeout(() => {
                    if (isMounted) {
                        router.replace('/(tabs)');
                    }
                }, 500);
            }
        };

        handleDeepLink();

        // Safety timeout
        const timeout = setTimeout(() => {
            if (isMounted) {
                router.replace('/(tabs)');
            }
        }, 3000);

        return () => {
            isMounted = false;
            clearTimeout(timeout);
        };
    }, [url]);

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color="#CF0F0F" />
            <Text style={styles.text}>Memproses...</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#121212',
    },
    text: {
        color: 'white',
        marginTop: 16,
        fontSize: 16,
    },
});

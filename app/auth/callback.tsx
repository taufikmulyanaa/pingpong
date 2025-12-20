import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useURL } from 'expo-linking';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';

export default function AuthCallback() {
    const url = useURL();
    const router = useRouter();

    useEffect(() => {
        let isMounted = true;

        const handleCallback = async () => {
            // If no URL yet on mount, still attempt to get session
            // This handles the case where deep link was already processed
            if (!url) {
                console.log("No URL yet, checking existing session...");
                const { data: { session } } = await supabase.auth.getSession();
                if (session && isMounted) {
                    console.log("Existing session found, redirecting...");
                    router.replace('/(tabs)');
                    return;
                }
                return;
            }

            console.log("Callback URL received:", url);

            try {
                // Extract params from URL hash (implicit grant)
                const parsedUrl = new URL(url);
                let accessToken = parsedUrl.searchParams.get('access_token');
                let refreshToken = parsedUrl.searchParams.get('refresh_token');

                // If not in search params, check hash
                if (!accessToken && parsedUrl.hash) {
                    const hashParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ''));
                    accessToken = hashParams.get('access_token');
                    refreshToken = hashParams.get('refresh_token');
                }

                if (accessToken && refreshToken) {
                    console.log("Tokens found, setting session...");
                    const { error } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });

                    if (error) {
                        console.error("Error setting session:", error);
                    } else {
                        console.log("Session set successfully via deep link!");
                    }
                } else {
                    const errorDescription = parsedUrl.searchParams.get('error_description');
                    if (errorDescription) {
                        console.error("Auth Error:", errorDescription);
                    } else {
                        console.warn("No tokens found in URL");
                    }
                }
            } catch (e) {
                console.error("Error parsing callback URL:", e);
            } finally {
                if (isMounted) {
                    // Always navigate back to home
                    router.replace('/(tabs)');
                }
            }
        };

        // Safety timeout: If nothing happens in 4 seconds, force redirect
        const timer = setTimeout(() => {
            if (isMounted) {
                console.log("Auth callback timed out, forcing redirect...");
                router.replace('/(tabs)');
            }
        }, 4000);

        handleCallback();

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [url]);

    // Show a loading screen using React Native components
    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color="#CF0F0F" />
            <Text style={styles.title}>Memproses login...</Text>
            <Text style={styles.subtitle}>Mohon tunggu sebentar</Text>
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
    title: {
        color: 'white',
        fontSize: 18,
        marginTop: 16,
        fontFamily: 'Outfit-Medium',
    },
    subtitle: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        marginTop: 8,
        fontFamily: 'Inter-Regular',
    },
});

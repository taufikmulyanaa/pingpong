import { useFonts } from "expo-font";
import { MaterialIcons } from "@expo/vector-icons";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme, Platform } from "react-native";
import { useAuthStore } from "@/stores/authStore";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { usePresence } from "@/hooks/usePresence";
import {
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold
} from '@expo-google-fonts/outfit';
import {
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold
} from '@expo-google-fonts/inter';

const Colors = {
    primary: "#009688",
    background: {
        light: "#F8FAFC",
        dark: "#0f172a",
    },
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const initialize = useAuthStore((state) => state.initialize);
    const user = useAuthStore((state) => state.user);

    // Initialize push notifications (hook handles platform check internally)
    const pushNotifications = usePushNotifications();
    const expoPushToken = pushNotifications?.expoPushToken;

    // Track online presence - updates is_online in database
    usePresence(user?.id || "");

    const isWeb = Platform.OS === "web";



    // Only load fonts via expo-font on native, use CDN on web
    const [fontsLoaded, fontError] = useFonts({
        ...(isWeb ? {} : MaterialIcons.font),
        'Outfit-Regular': Outfit_400Regular,
        'Outfit-Medium': Outfit_500Medium,
        'Outfit-SemiBold': Outfit_600SemiBold,
        'Outfit-Bold': Outfit_700Bold,
        'Inter-Regular': Inter_400Regular,
        'Inter-Medium': Inter_500Medium,
        'Inter-SemiBold': Inter_600SemiBold,
    });

    const loaded = isWeb ? true : fontsLoaded;

    useEffect(() => {
        if (fontError) throw fontError;
    }, [fontError]);

    useEffect(() => {
        if (loaded) {
            SplashScreen.hideAsync();
        }
    }, [loaded]);

    useEffect(() => {
        initialize();
    }, []);

    if (!loaded) {
        return null;
    }


    return (
        <>
            <StatusBar style={isDark ? "light" : "dark"} />
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: {
                        backgroundColor: isDark ? Colors.background.dark : Colors.background.light,
                    },
                }}
            >
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen
                    name="match/[id]"
                    options={{
                        headerShown: true,
                        title: "Pertandingan",
                        presentation: "modal",
                    }}
                />
                <Stack.Screen
                    name="challenge/new"
                    options={{
                        headerShown: true,
                        title: "Tantang Bermain",
                        presentation: "modal",
                    }}
                />
                <Stack.Screen
                    name="player/[id]"
                    options={{
                        headerShown: true,
                        title: "Profil Pemain",
                    }}
                />
            </Stack>
        </>
    );
}

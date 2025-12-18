import { Tabs } from "expo-router";
import { View, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// New color palette (light mode only)
const Colors = {
    primary: "#001064",       // Medium Blue
    secondary: "#001064",     // Dark Navy
    accent: "#FFEB00",        // Bright Yellow
    blueLight: "#7B9BD4",     // Light Blue
    muted: "#9CA3AF",
    background: "#FFFFFF",
};

export default function TabLayout() {
    const insets = useSafeAreaInsets();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: Colors.background,
                    borderTopWidth: 1,
                    borderTopColor: "#F3F4F6", // Softer border
                    paddingTop: 12, // More top padding for centering
                    height: 60 + insets.bottom, // Slightly taller
                    elevation: 0,
                    shadowColor: "transparent",
                },
                tabBarActiveTintColor: Colors.secondary, // Dark Navy for active
                tabBarInactiveTintColor: "#9CA3AF", // Gray for inactive
                tabBarShowLabel: false, // No labels as requested
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Beranda",
                    tabBarIcon: ({ color }) => (
                        <MaterialIcons name="home-filled" size={26} color={color} /> // Simple home icon
                    ),
                }}
            />
            <Tabs.Screen
                name="cari"
                options={{
                    title: "Cari",
                    tabBarIcon: ({ color }) => (
                        <MaterialIcons name="search" size={26} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="chat"
                options={{
                    title: "Chat",
                    tabBarIcon: ({ color }) => (
                        <MaterialIcons name="chat-bubble" size={24} color={color} /> // Simple chat icon
                    ),
                }}
            />
            <Tabs.Screen
                name="profil"
                options={{
                    title: "Profil",
                    tabBarIcon: ({ color }) => (
                        <MaterialIcons name="person" size={26} color={color} /> // Simple person icon
                    ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    centerButton: {
        width: 44,
        height: 44,
        borderRadius: 12, // Rounded square (not full circle)
        backgroundColor: "#FFEB00",  // Bright Yellow
        justifyContent: "center",
        alignItems: "center",
        // Flat styling (no shadow as requested for "simple")
    },
});

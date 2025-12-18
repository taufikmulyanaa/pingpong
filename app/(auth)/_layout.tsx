import { Stack } from "expo-router";
import { useColorScheme } from "react-native";

const Colors = {
    background: {
        light: "#F8FAFC",
        dark: "#0f172a",
    },
};

export default function AuthLayout() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: {
                    backgroundColor: isDark ? Colors.background.dark : Colors.background.light,
                },
            }}
        >
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
        </Stack>
    );
}

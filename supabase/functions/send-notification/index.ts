// Supabase Edge Function: send-notification
// Sends push notifications via Expo Push API

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface RequestBody {
    user_id: string;
    title: string;
    body: string;
    data?: Record<string, any>;
}

interface ExpoPushMessage {
    to: string;
    title: string;
    body: string;
    data?: Record<string, any>;
    sound?: "default" | null;
    badge?: number;
    channelId?: string;
}

async function sendExpoPushNotification(
    messages: ExpoPushMessage[]
): Promise<any> {
    const response = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Accept-Encoding": "gzip, deflate",
            "Content-Type": "application/json",
        },
        body: JSON.stringify(messages),
    });

    return response.json();
}

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { user_id, title, body, data }: RequestBody = await req.json();

        if (!user_id || !title || !body) {
            return new Response(
                JSON.stringify({ error: "user_id, title, and body are required" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Get the user's push token from profiles
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("push_token, name")
            .eq("id", user_id)
            .single();

        if (profileError) {
            console.error("Error fetching profile:", profileError);
            return new Response(JSON.stringify({ error: "User not found" }), {
                status: 404,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        if (!profile.push_token) {
            // Still save to notifications table even if no push token
            await supabase.from("notifications").insert({
                user_id,
                type: "SYSTEM",
                title,
                body,
                data: data || {},
            });

            return new Response(
                JSON.stringify({
                    success: true,
                    pushed: false,
                    message: "Notification saved but no push token available",
                }),
                {
                    status: 200,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Send push notification via Expo
        const pushMessage: ExpoPushMessage = {
            to: profile.push_token,
            title,
            body,
            data: data || {},
            sound: "default",
        };

        const pushResult = await sendExpoPushNotification([pushMessage]);

        // Also save to notifications table
        await supabase.from("notifications").insert({
            user_id,
            type: "SYSTEM",
            title,
            body,
            data: data || {},
        });

        return new Response(
            JSON.stringify({
                success: true,
                pushed: true,
                push_result: pushResult,
            }),
            {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    } catch (err) {
        console.error("Unexpected error:", err);
        return new Response(JSON.stringify({ error: "Internal server error" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});

// Admin Utilities
// User management, moderation, and admin functions

import { supabase } from "./supabase";
import { Profile } from "../types/database";

// Admin roles
export type AdminRole = "ADMIN" | "MODERATOR" | "SUPPORT";

interface AdminAction {
    type: string;
    targetId: string;
    adminId: string;
    reason?: string;
    timestamp: string;
}

/**
 * Check if user is admin
 */
export async function isAdmin(userId: string): Promise<boolean> {
    const { data, error } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", userId)
        .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return !error && (data as any)?.is_admin === true;
}

/**
 * Ban a user
 */
export async function banUser(
    adminId: string,
    targetUserId: string,
    reason: string,
    durationDays?: number
): Promise<{ success: boolean; error?: string }> {
    // Verify admin
    if (!(await isAdmin(adminId))) {
        return { success: false, error: "Unauthorized" };
    }

    const banUntil = durationDays
        ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("profiles") as any)
        .update({
            is_banned: true,
            ban_reason: reason,
            ban_until: banUntil,
            banned_by: adminId,
            banned_at: new Date().toISOString(),
        })
        .eq("id", targetUserId);

    if (error) {
        return { success: false, error: error.message };
    }

    await logAdminAction({
        type: "BAN_USER",
        targetId: targetUserId,
        adminId,
        reason,
        timestamp: new Date().toISOString(),
    });

    return { success: true };
}

/**
 * Unban a user
 */
export async function unbanUser(
    adminId: string,
    targetUserId: string
): Promise<{ success: boolean; error?: string }> {
    if (!(await isAdmin(adminId))) {
        return { success: false, error: "Unauthorized" };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("profiles") as any)
        .update({
            is_banned: false,
            ban_reason: null,
            ban_until: null,
        })
        .eq("id", targetUserId);

    if (error) {
        return { success: false, error: error.message };
    }

    await logAdminAction({
        type: "UNBAN_USER",
        targetId: targetUserId,
        adminId,
        timestamp: new Date().toISOString(),
    });

    return { success: true };
}

/**
 * Verify a venue
 */
export async function verifyVenue(
    adminId: string,
    venueId: string,
    approved: boolean,
    notes?: string
): Promise<{ success: boolean; error?: string }> {
    if (!(await isAdmin(adminId))) {
        return { success: false, error: "Unauthorized" };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("venues") as any)
        .update({
            is_verified: approved,
            verified_at: approved ? new Date().toISOString() : null,
            verified_by: approved ? adminId : null,
            verification_notes: notes,
        })
        .eq("id", venueId);

    if (error) {
        return { success: false, error: error.message };
    }

    await logAdminAction({
        type: approved ? "VERIFY_VENUE" : "REJECT_VENUE",
        targetId: venueId,
        adminId,
        reason: notes,
        timestamp: new Date().toISOString(),
    });

    return { success: true };
}

/**
 * Send system announcement
 */
export async function sendAnnouncement(
    adminId: string,
    title: string,
    body: string,
    targetUserIds?: string[]
): Promise<{ success: boolean; error?: string; count?: number }> {
    if (!(await isAdmin(adminId))) {
        return { success: false, error: "Unauthorized" };
    }

    let userIds: string[] = [];

    if (targetUserIds) {
        userIds = targetUserIds;
    } else {
        const { data: users, error } = await supabase
            .from("profiles")
            .select("id")
            .eq("is_banned", false);

        if (error) return { success: false, error: error.message };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        userIds = ((users || []) as any[]).map((u) => u.id);
    }

    const notifications = userIds.map((userId) => ({
        user_id: userId,
        type: "SYSTEM",
        title,
        body,
        data: { from: "admin", adminId },
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("notifications") as any).insert(notifications);

    if (error) {
        return { success: false, error: error.message };
    }

    await logAdminAction({
        type: "SEND_ANNOUNCEMENT",
        targetId: "all",
        adminId,
        reason: `${title}: ${body}`,
        timestamp: new Date().toISOString(),
    });

    return { success: true, count: userIds.length };
}

/**
 * Get admin dashboard summary
 */
export async function getAdminSummary(): Promise<{
    totalUsers: number;
    activeToday: number;
    totalMatches: number;
    pendingVenues: number;
    bannedUsers: number;
    reportsToday: number;
}> {
    const [users, active, matches, venues, banned] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .gte("last_active_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        supabase.from("matches").select("id", { count: "exact", head: true }),
        supabase
            .from("venues")
            .select("id", { count: "exact", head: true })
            .eq("is_verified", false),
        supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("is_banned", true),
    ]);

    return {
        totalUsers: users.count || 0,
        activeToday: active.count || 0,
        totalMatches: matches.count || 0,
        pendingVenues: venues.count || 0,
        bannedUsers: banned.count || 0,
        reportsToday: 0,
    };
}

/**
 * Get users for management
 */
export async function getUsers(
    page: number = 1,
    limit: number = 20,
    filters?: {
        search?: string;
        isBanned?: boolean;
        isVerified?: boolean;
    }
): Promise<{ users: Profile[]; total: number }> {
    let query = supabase
        .from("profiles")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

    if (filters?.search) {
        query = query.or(
            `name.ilike.%${filters.search}%,username.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
        );
    }

    if (filters?.isBanned !== undefined) {
        query = query.eq("is_banned", filters.isBanned);
    }

    const { data, count, error } = await query;

    if (error) {
        console.error("Error fetching users:", error);
        return { users: [], total: 0 };
    }

    return { users: (data || []) as Profile[], total: count || 0 };
}

/**
 * Log admin action for audit
 */
async function logAdminAction(action: AdminAction): Promise<void> {
    console.log("[Admin Action]", action);
}

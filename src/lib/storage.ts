// Storage Helper Utilities
// Upload, download, and manage files in Supabase Storage

import { supabase } from "./supabase";

// Bucket names
export const BUCKETS = {
    AVATARS: "avatars",
    VENUE_IMAGES: "venue-images",
    MATCH_PHOTOS: "match-photos",
    TOURNAMENT_BANNERS: "tournament-banners",
} as const;

type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

interface UploadResult {
    path: string | null;
    url: string | null;
    error: Error | null;
}

/**
 * Generate a unique filename with timestamp
 */
function generateFilename(originalName: string): string {
    const ext = originalName.split(".").pop() || "jpg";
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return `${timestamp}_${random}.${ext}`;
}

/**
 * Upload avatar image for a user
 */
export async function uploadAvatar(
    userId: string,
    file: Blob | File,
    filename?: string
): Promise<UploadResult> {
    const name = filename || generateFilename("avatar.jpg");
    const path = `${userId}/${name}`;

    const { data, error } = await supabase.storage
        .from(BUCKETS.AVATARS)
        .upload(path, file, {
            cacheControl: "3600",
            upsert: true,
        });

    if (error) {
        return { path: null, url: null, error };
    }

    const { data: urlData } = supabase.storage.from(BUCKETS.AVATARS).getPublicUrl(data.path);

    // Update profile with new avatar URL
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("profiles") as any)
        .update({ avatar_url: urlData.publicUrl })
        .eq("id", userId);

    return { path: data.path, url: urlData.publicUrl, error: null };
}

/**
 * Upload venue image
 */
export async function uploadVenueImage(
    venueId: string,
    file: Blob | File,
    filename?: string
): Promise<UploadResult> {
    const name = filename || generateFilename("venue.jpg");
    const path = `${venueId}/${name}`;

    const { data, error } = await supabase.storage
        .from(BUCKETS.VENUE_IMAGES)
        .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
        });

    if (error) {
        return { path: null, url: null, error };
    }

    const { data: urlData } = supabase.storage.from(BUCKETS.VENUE_IMAGES).getPublicUrl(data.path);

    return { path: data.path, url: urlData.publicUrl, error: null };
}

/**
 * Upload match photo
 */
export async function uploadMatchPhoto(
    matchId: string,
    file: Blob | File,
    filename?: string
): Promise<UploadResult> {
    const name = filename || generateFilename("match.jpg");
    const path = `${matchId}/${name}`;

    const { data, error } = await supabase.storage
        .from(BUCKETS.MATCH_PHOTOS)
        .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
        });

    if (error) {
        return { path: null, url: null, error };
    }

    // Match photos are private, need signed URL
    const { data: signedData } = await supabase.storage
        .from(BUCKETS.MATCH_PHOTOS)
        .createSignedUrl(data.path, 3600); // 1 hour expiry

    return {
        path: data.path,
        url: signedData?.signedUrl || null,
        error: null,
    };
}

/**
 * Upload tournament banner
 */
export async function uploadTournamentBanner(
    tournamentId: string,
    file: Blob | File,
    filename?: string
): Promise<UploadResult> {
    const name = filename || generateFilename("banner.jpg");
    const path = `${tournamentId}/${name}`;

    const { data, error } = await supabase.storage
        .from(BUCKETS.TOURNAMENT_BANNERS)
        .upload(path, file, {
            cacheControl: "3600",
            upsert: true, // Allow banner replacement
        });

    if (error) {
        return { path: null, url: null, error };
    }

    const { data: urlData } = supabase.storage.from(BUCKETS.TOURNAMENT_BANNERS).getPublicUrl(data.path);

    // Update tournament with new banner URL
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("tournaments") as any)
        .update({ banner_url: urlData.publicUrl })
        .eq("id", tournamentId);

    return { path: data.path, url: urlData.publicUrl, error: null };
}

/**
 * Delete a file from storage
 */
export async function deleteFile(
    bucket: BucketName,
    path: string
): Promise<{ success: boolean; error: Error | null }> {
    const { error } = await supabase.storage.from(bucket).remove([path]);

    return { success: !error, error };
}

/**
 * List files in a folder
 */
export async function listFiles(
    bucket: BucketName,
    folder: string
): Promise<{ files: string[]; error: Error | null }> {
    const { data, error } = await supabase.storage.from(bucket).list(folder);

    if (error) {
        return { files: [], error };
    }

    return {
        files: data.map((file) => `${folder}/${file.name}`),
        error: null,
    };
}

/**
 * Get public URL for a file
 */
export function getPublicUrl(bucket: BucketName, path: string): string {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
}

/**
 * Get signed URL for private files
 */
export async function getSignedUrl(
    bucket: BucketName,
    path: string,
    expiresIn: number = 3600
): Promise<string | null> {
    const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

    return error ? null : data.signedUrl;
}

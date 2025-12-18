// Zod Validation Schemas
// Comprehensive input validation for all forms

import { z } from "zod";

// ============================================================
// COMMON VALIDATORS
// ============================================================

const uuid = z.string().uuid("ID tidak valid");

const sanitizeString = (str: string) => {
    // Basic XSS prevention - strip HTML tags
    return str.replace(/<[^>]*>/g, "").trim();
};

// ============================================================
// PROFILE SCHEMAS
// ============================================================

export const profileUpdateSchema = z.object({
    name: z
        .string()
        .min(2, "Nama minimal 2 karakter")
        .max(50, "Nama maksimal 50 karakter")
        .transform(sanitizeString),
    username: z
        .string()
        .min(3, "Username minimal 3 karakter")
        .max(20, "Username maksimal 20 karakter")
        .regex(
            /^[a-z0-9_]+$/,
            "Username hanya boleh huruf kecil, angka, dan underscore"
        )
        .optional()
        .nullable(),
    bio: z
        .string()
        .max(200, "Bio maksimal 200 karakter")
        .transform(sanitizeString)
        .optional()
        .nullable(),
    city: z
        .string()
        .max(50, "Nama kota maksimal 50 karakter")
        .optional()
        .nullable(),
    province: z.string().max(50, "Nama provinsi maksimal 50 karakter").optional().nullable(),
    grip_style: z.enum(["SHAKEHAND", "PENHOLD", "SEEMILLER"]).optional(),
    play_style: z.enum(["OFFENSIVE", "DEFENSIVE", "ALLROUND"]).optional(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

// ============================================================
// CHALLENGE SCHEMAS
// ============================================================

export const challengeSchema = z.object({
    challenged_id: uuid,
    match_type: z.enum(["RANKED", "FRIENDLY"]),
    best_of: z
        .number()
        .int()
        .refine((n) => [1, 3, 5, 7].includes(n), {
            message: "Best of harus 1, 3, 5, atau 7",
        }),
    message: z
        .string()
        .max(200, "Pesan maksimal 200 karakter")
        .transform(sanitizeString)
        .optional()
        .nullable(),
});

export type ChallengeInput = z.infer<typeof challengeSchema>;

// ============================================================
// MESSAGE SCHEMAS
// ============================================================

export const messageSchema = z.object({
    receiver_id: uuid,
    content: z
        .string()
        .min(1, "Pesan tidak boleh kosong")
        .max(2000, "Pesan maksimal 2000 karakter")
        .transform(sanitizeString),
});

export type MessageInput = z.infer<typeof messageSchema>;

// ============================================================
// VENUE SCHEMAS
// ============================================================

export const venueSchema = z.object({
    name: z
        .string()
        .min(3, "Nama venue minimal 3 karakter")
        .max(100, "Nama venue maksimal 100 karakter")
        .transform(sanitizeString),
    description: z
        .string()
        .max(1000, "Deskripsi maksimal 1000 karakter")
        .transform(sanitizeString)
        .optional()
        .nullable(),
    address: z.string().min(10, "Alamat minimal 10 karakter").max(200, "Alamat maksimal 200 karakter"),
    city: z.string().min(2, "Nama kota minimal 2 karakter").max(50, "Nama kota maksimal 50 karakter"),
    province: z.string().max(50, "Nama provinsi maksimal 50 karakter").optional().nullable(),
    latitude: z.number().min(-90).max(90, "Latitude tidak valid"),
    longitude: z.number().min(-180).max(180, "Longitude tidak valid"),
    phone: z
        .string()
        .regex(/^(\+62|62|0)[0-9]{9,13}$/, "Nomor telepon tidak valid")
        .optional()
        .nullable(),
    table_count: z.number().int().min(1, "Minimal 1 meja").max(100, "Maksimal 100 meja"),
    price_per_hour: z.number().min(0, "Harga tidak boleh negatif").optional().nullable(),
    facilities: z.array(z.string().max(50)).max(20, "Maksimal 20 fasilitas").optional(),
});

export type VenueInput = z.infer<typeof venueSchema>;

// ============================================================
// VENUE REVIEW SCHEMAS
// ============================================================

export const venueReviewSchema = z.object({
    venue_id: uuid,
    rating: z
        .number()
        .int()
        .min(1, "Rating minimal 1")
        .max(5, "Rating maksimal 5"),
    comment: z
        .string()
        .max(500, "Ulasan maksimal 500 karakter")
        .transform(sanitizeString)
        .optional()
        .nullable(),
});

export type VenueReviewInput = z.infer<typeof venueReviewSchema>;

// ============================================================
// MATCH SCHEMAS
// ============================================================

export const createMatchSchema = z.object({
    player2_id: uuid,
    type: z.enum(["RANKED", "FRIENDLY", "TOURNAMENT"]),
    best_of: z
        .number()
        .int()
        .refine((n) => [1, 3, 5, 7].includes(n), {
            message: "Best of harus 1, 3, 5, atau 7",
        }),
    venue_id: uuid.optional().nullable(),
});

export type CreateMatchInput = z.infer<typeof createMatchSchema>;

export const updateSetScoreSchema = z.object({
    match_id: uuid,
    set_number: z.number().int().min(1).max(7),
    player1_score: z.number().int().min(0).max(99),
    player2_score: z.number().int().min(0).max(99),
});

export type UpdateSetScoreInput = z.infer<typeof updateSetScoreSchema>;

// ============================================================
// TOURNAMENT SCHEMAS
// ============================================================

export const tournamentSchema = z.object({
    name: z
        .string()
        .min(5, "Nama turnamen minimal 5 karakter")
        .max(100, "Nama turnamen maksimal 100 karakter")
        .transform(sanitizeString),
    description: z
        .string()
        .max(2000, "Deskripsi maksimal 2000 karakter")
        .transform(sanitizeString)
        .optional()
        .nullable(),
    rules: z
        .string()
        .max(5000, "Rules maksimal 5000 karakter")
        .optional()
        .nullable(),
    format: z.enum([
        "SINGLE_ELIMINATION",
        "DOUBLE_ELIMINATION",
        "ROUND_ROBIN",
        "GROUP_STAGE",
    ]),
    category: z.enum([
        "OPEN",
        "MALE",
        "FEMALE",
        "DOUBLES",
        "U17",
        "U21",
        "VETERAN_40",
        "VETERAN_50",
    ]),
    max_participants: z
        .number()
        .int()
        .min(4, "Minimal 4 peserta")
        .max(256, "Maksimal 256 peserta"),
    registration_fee: z.number().min(0).optional().nullable(),
    prize_pool: z.number().min(0).optional().nullable(),
    registration_start: z.string().datetime("Format tanggal tidak valid"),
    registration_end: z.string().datetime("Format tanggal tidak valid"),
    start_date: z.string().datetime("Format tanggal tidak valid"),
    end_date: z.string().datetime("Format tanggal tidak valid").optional().nullable(),
    venue_id: uuid.optional().nullable(),
    is_ranked: z.boolean().default(true),
    has_third_place: z.boolean().default(true),
});

export type TournamentInput = z.infer<typeof tournamentSchema>;

// ============================================================
// AUTH SCHEMAS
// ============================================================

export const loginSchema = z.object({
    email: z.string().email("Email tidak valid"),
    password: z.string().min(6, "Password minimal 6 karakter"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
    .object({
        email: z.string().email("Email tidak valid"),
        password: z
            .string()
            .min(6, "Password minimal 6 karakter")
            .max(72, "Password maksimal 72 karakter")
            .regex(
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                "Password harus mengandung huruf besar, huruf kecil, dan angka"
            ),
        confirmPassword: z.string(),
        name: z.string().min(2, "Nama minimal 2 karakter").max(50, "Nama maksimal 50 karakter"),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Password tidak sama",
        path: ["confirmPassword"],
    });

export type RegisterInput = z.infer<typeof registerSchema>;

// ============================================================
// SEARCH & FILTER SCHEMAS
// ============================================================

export const playerSearchSchema = z.object({
    query: z.string().max(50).optional(),
    city: z.string().max(50).optional(),
    minRating: z.number().int().min(0).max(3000).optional(),
    maxRating: z.number().int().min(0).max(3000).optional(),
    gripStyle: z.enum(["SHAKEHAND", "PENHOLD", "SEEMILLER"]).optional(),
    playStyle: z.enum(["OFFENSIVE", "DEFENSIVE", "ALLROUND"]).optional(),
    isOnline: z.boolean().optional(),
});

export type PlayerSearchInput = z.infer<typeof playerSearchSchema>;

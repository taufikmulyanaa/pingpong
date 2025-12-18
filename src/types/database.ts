export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export type GripStyle = "SHAKEHAND" | "PENHOLD" | "SEEMILLER";
export type PlayStyle = "OFFENSIVE" | "DEFENSIVE" | "ALLROUND";
export type MatchType = "RANKED" | "FRIENDLY" | "TOURNAMENT";
export type MatchStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "DISPUTED";
export type ChallengeStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "CANCELLED";
export type FriendshipStatus = "PENDING" | "ACCEPTED" | "BLOCKED";
export type NotificationType =
    | "CHALLENGE_RECEIVED"
    | "CHALLENGE_ACCEPTED"
    | "CHALLENGE_DECLINED"
    | "MATCH_REMINDER"
    | "MATCH_RESULT"
    | "FRIEND_REQUEST"
    | "FRIEND_ACCEPTED"
    | "TOURNAMENT_REMINDER"
    | "LEVEL_UP"
    | "BADGE_EARNED"
    | "SYSTEM";

export interface Profile {
    id: string;
    email: string | null;
    name: string;
    username: string | null;
    avatar_url: string | null;
    bio: string | null;
    city: string | null;
    province: string | null;
    latitude: number | null;
    longitude: number | null;
    grip_style: GripStyle;
    play_style: PlayStyle;
    rating_mr: number;
    level: number;
    xp: number;
    total_matches: number;
    wins: number;
    losses: number;
    current_streak: number;
    best_streak: number;
    is_premium: boolean;
    is_online: boolean;
    last_active_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface Match {
    id: string;
    player1_id: string;
    player2_id: string;
    winner_id: string | null;
    type: MatchType;
    status: MatchStatus;
    best_of: number;
    player1_rating_before: number | null;
    player2_rating_before: number | null;
    player1_rating_change: number | null;
    player2_rating_change: number | null;
    venue_id: string | null;
    tournament_id: string | null;
    started_at: string | null;
    completed_at: string | null;
    created_at: string;

    // Relations
    player1?: Profile;
    player2?: Profile;
    winner?: Profile;
    sets?: MatchSet[];
    venue?: Venue;
}

export interface MatchSet {
    id: string;
    match_id: string;
    set_number: number;
    player1_score: number;
    player2_score: number;
}

export interface Challenge {
    id: string;
    challenger_id: string;
    challenged_id: string;
    match_type: MatchType;
    best_of: number;
    message: string | null;
    status: ChallengeStatus;
    expires_at: string;
    responded_at: string | null;
    created_at: string;

    // Relations
    challenger?: Profile;
    challenged?: Profile;
}

export interface Venue {
    id: string;
    owner_id: string | null;
    name: string;
    slug: string;
    description: string | null;
    address: string;
    city: string;
    province: string | null;
    latitude: number;
    longitude: number;
    phone: string | null;
    table_count: number;
    price_per_hour: number | null;
    facilities: string[];
    opening_hours: Json;
    images: string[];
    is_verified: boolean;
    is_active: boolean;
    rating: number;
    review_count: number;
    created_at: string;
    updated_at: string;
}

export interface VenueReview {
    id: string;
    venue_id: string;
    user_id: string;
    rating: number;
    comment: string | null;
    images: string[];
    created_at: string;

    // Relations
    user?: Profile;
}

export interface Message {
    id: string;
    sender_id: string;
    receiver_id: string;
    content: string;
    is_read: boolean;
    read_at: string | null;
    created_at: string;

    // Relations
    sender?: Profile;
    receiver?: Profile;
}

export interface Friendship {
    id: string;
    user_id: string;
    friend_id: string;
    status: FriendshipStatus;
    created_at: string;
    accepted_at: string | null;

    // Relations
    user?: Profile;
    friend?: Profile;
}

export interface Badge {
    id: string;
    code: string;
    name: string;
    description: string | null;
    icon_url: string | null;
    category: "COMPETITION" | "PERFORMANCE" | "SOCIAL" | "SPECIAL";
    requirement: Json;
    xp_reward: number;
}

export interface UserBadge {
    id: string;
    user_id: string;
    badge_id: string;
    earned_at: string;

    // Relations
    badge?: Badge;
}

export interface Notification {
    id: string;
    user_id: string;
    type: NotificationType;
    title: string;
    body: string | null;
    data: Json;
    is_read: boolean;
    read_at: string | null;
    created_at: string;
}

export interface Tournament {
    id: string;
    organizer_id: string;
    venue_id: string | null;
    name: string;
    slug: string;
    description: string | null;
    rules: string | null;
    banner_url: string | null;
    format: "SINGLE_ELIMINATION" | "DOUBLE_ELIMINATION" | "ROUND_ROBIN" | "GROUP_STAGE";
    category: "OPEN" | "MALE" | "FEMALE" | "DOUBLES" | "U17" | "U21" | "VETERAN_40" | "VETERAN_50";
    max_participants: number;
    current_participants: number;
    registration_fee: number | null;
    prize_pool: number | null;
    registration_start: string;
    registration_end: string;
    start_date: string;
    end_date: string | null;
    status: "DRAFT" | "REGISTRATION_OPEN" | "REGISTRATION_CLOSED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
    is_ranked: boolean;
    has_third_place: boolean;
    created_at: string;
    updated_at: string;

    // Relations
    venue?: Venue;
}

// Simplified Database type for Supabase client
// Simplified Database type for Supabase client
export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: Profile;
                Insert: Partial<Profile>;
                Update: Partial<Profile>;
            };
            matches: {
                Row: Match;
                Insert: Partial<Match>;
                Update: Partial<Match>;
            };
            match_sets: {
                Row: MatchSet;
                Insert: Partial<MatchSet>;
                Update: Partial<MatchSet>;
            };
            challenges: {
                Row: Challenge;
                Insert: Partial<Challenge>;
                Update: Partial<Challenge>;
            };
            venues: {
                Row: Venue;
                Insert: Partial<Venue>;
                Update: Partial<Venue>;
            };
            venue_reviews: {
                Row: VenueReview;
                Insert: Partial<VenueReview>;
                Update: Partial<VenueReview>;
            };
            messages: {
                Row: Message;
                Insert: Partial<Message>;
                Update: Partial<Message>;
            };
            friendships: {
                Row: Friendship;
                Insert: Partial<Friendship>;
                Update: Partial<Friendship>;
            };
            badges: {
                Row: Badge;
                Insert: Partial<Badge>;
                Update: Partial<Badge>;
            };
            user_badges: {
                Row: UserBadge;
                Insert: Partial<UserBadge>;
                Update: Partial<UserBadge>;
            };
            notifications: {
                Row: Notification;
                Insert: Partial<Notification>;
                Update: Partial<Notification>;
            };
            tournaments: {
                Row: Tournament;
                Insert: Partial<Tournament>;
                Update: Partial<Tournament>;
            };
        };
    };
}

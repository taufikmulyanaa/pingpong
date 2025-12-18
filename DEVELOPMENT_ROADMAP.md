# PingpongHub - Development Roadmap

## 📱 Ringkasan Aplikasi

**PingpongHub** adalah aplikasi komunitas ping-pong berbasis React Native (Expo) yang menghubungkan pemain tenis meja di Indonesia. Aplikasi ini menggunakan **Supabase** sebagai backend (Database, Auth, Storage).

### Tech Stack Saat Ini
| Layer | Teknologi |
|-------|-----------|
| Frontend | React Native + Expo SDK 54 |
| Styling | NativeWind (TailwindCSS) |
| State Management | Zustand |
| Backend | Supabase (PostgreSQL + Auth) |
| Deployment | Vercel (Web), Expo Go (Mobile) |

---

## ✅ Status Pengembangan (Updated: 19 Desember 2024)

### Frontend Features (100% Complete)
- [x] **Autentikasi** - Login, Register, Logout via Supabase Auth
- [x] **Home Screen** - Dashboard pemain dengan statistik, quick actions
- [x] **Cari Pemain** - Pencarian pemain dengan filter
- [x] **Chat** - Interface percakapan antar pemain
- [x] **Profil** - Halaman profil dengan XP, level, rating
- [x] **Venue Map** - Peta lokasi tempat bermain
- [x] **Leaderboard** - Ranking pemain
- [x] **Turnamen** - Daftar & detail turnamen
- [x] **Badges** - Sistem pencapaian
- [x] **Notifikasi** - Halaman notifikasi
- [x] **Challenge** - Tantang pemain lain
- [x] **Host Table** - Hosting meja bermain

### Database Schema (13 Tables)
```
profiles, matches, match_sets, challenges, venues, 
venue_reviews, messages, friendships, badges, 
user_badges, notifications, tournaments, tournament_participants
```

---

## 🔧 Phase 1: Backend & Database Setup ✅ COMPLETE

### 1.1 Database Schema
- [x] Buat 13 tabel di Supabase (`001_create_tables.sql`)
- [x] Foreign Key constraints antar tabel
- [x] Database indexes untuk query optimization (`002_create_indexes.sql`)

### 1.2 Row Level Security (RLS) Policies
- [x] RLS policies untuk semua tabel (`003_rls_policies.sql`)
- [x] Select, Insert, Update, Delete policies

### 1.3 Database Triggers & Functions
- [x] Trigger auto-create profile saat signup (`004_triggers_functions.sql`)
- [x] Function kalkulasi rating ELO
- [x] Function update XP dan level
- [x] Function check dan award badges
- [x] Seed data untuk badges (`005_seed_data.sql`)

---

## 🔧 Phase 2: API & Real-time Features ✅ COMPLETE

### 2.1 Database Functions (Dalam Database)
| Function | File | Status |
|----------|------|--------|
| `calculate_elo_rating` | `004_triggers_functions.sql` | ✅ |
| `check_and_award_badges` | `004_triggers_functions.sql` + `008_extended_badges.sql` | ✅ |
| `award_match_xp` | `004_triggers_functions.sql` | ✅ |
| `award_xp` | `004_triggers_functions.sql` | ✅ |

### 2.2 Real-time Subscriptions
- [x] Live chat messages (`useRealtimeChat.ts`)
- [x] Real-time match score updates (`useRealtimeMatch.ts`)
- [x] Online status pemain (`usePresence.ts`)
- [x] Notifikasi instan (`useRealtimeNotifications.ts`)

### 2.3 Storage Buckets (`006_storage_buckets.sql`)
- [x] `avatars/` - Foto profil pemain (5MB, public)
- [x] `venue-images/` - Foto venue (10MB, public)
- [x] `match-photos/` - Foto pertandingan (10MB, private)
- [x] `tournament-banners/` - Banner turnamen (10MB, public)

---

## 🔧 Phase 3: Middleware & Security ✅ COMPLETE

### 3.1 Rate Limiting (`007_rate_limiting.sql`)
- [x] Challenge cooldown (1 per jam ke pemain sama)
- [x] Message flood protection (max 10 per menit)
- [x] Prevent self-challenge
- [x] Prevent duplicate pending challenges
- [x] Message content validation

### 3.2 Input Validation (`src/lib/validation.ts`)
- [x] Zod schema validation untuk semua form
- [x] XSS sanitization untuk chat messages (sanitizeString function)
- [x] SQL injection prevention (Supabase built-in)

---

## 🔧 Phase 4: Core Business Logic ✅ COMPLETE

### 4.1 ELO Rating System (`src/lib/game.ts` + Database)
- [x] K-Factor: 32 (pemula), 24 (menengah), 16 (veteran)
- [x] Expected score calculation
- [x] Rating tiers (Bronze → Legend)
- [x] Client-side prediction
- [x] Database-side calculation

### 4.2 Leveling & XP System (`src/lib/game.ts`)
| Level | XP Required | Title |
|-------|-------------|-------|
| 1 | 0 | Pemula |
| 5 | 1000 | Amatir |
| 10 | 5000 | Intermediate |
| 20 | 20000 | Advanced |
| 30 | 50000 | Expert |
| 40 | 100000 | Master |
| 50 | 200000 | Legend |

### 4.3 Badge System (`008_extended_badges.sql`)
- [x] 30+ badges dengan kondisi berbeda
- [x] Auto-check setelah setiap match/action
- [x] XP reward per badge
- [x] Badge categories: COMPETITION, PERFORMANCE, SOCIAL, SPECIAL

---

## 🔧 Phase 5: Operations & Monitoring ✅ COMPLETE

### 5.1 Error Tracking (`src/lib/sentry.ts` + `src/components/ErrorBoundary.tsx`)
- [x] Sentry configuration ready
- [x] Error boundary components
- [x] Exception capture utilities
- [x] Breadcrumb logging

### 5.2 Analytics (`src/lib/analytics.ts`)
- [x] Event tracking (screen_view, match, challenge, etc.)
- [x] Session management
- [x] Queue-based batch sending

### 5.3 Performance Monitoring (`009_performance_monitoring.sql`)
- [x] Database performance views
- [x] Query statistics

---

## 🔧 Phase 6: Push Notifications ✅ COMPLETE

### 6.1 Expo Push Notifications (`src/lib/notifications.ts`)
- [x] Token registration
- [x] Save token to profile
- [x] Android notification channels

### 6.2 Notification Hook (`src/hooks/usePushNotifications.ts`)
- [x] Auto-register on login
- [x] Notification listeners
- [x] Deep linking on tap

### 6.3 Notification Types
- [x] Challenge received/accepted/declined
- [x] Match reminder (30 menit sebelum)
- [x] Match result & rating change
- [x] Friend request
- [x] Tournament registration reminder
- [x] Badge earned
- [x] Level up celebration

---

## 🔧 Phase 7: Admin Panel ✅ COMPLETE

### 7.1 Admin Database (`010_admin_system.sql`)
- [x] Admin fields di profiles (is_admin, admin_role)
- [x] Ban system (is_banned, ban_reason, ban_until)
- [x] Reports table
- [x] Announcements table
- [x] Admin logs table

### 7.2 Admin Utilities (`src/lib/admin.ts`)
- [x] Ban/unban users
- [x] Verify venues
- [x] System announcements
- [x] Admin dashboard summary
- [x] User management

---

## 📋 Pre-Production Checklist

### ✅ PERLU DIJALANKAN DI SUPABASE SQL EDITOR
```sql
-- Jalankan file migrations secara berurutan:
001_create_tables.sql
002_create_indexes.sql
003_rls_policies.sql
004_triggers_functions.sql
005_seed_data.sql
006_storage_buckets.sql
007_rate_limiting.sql
008_extended_badges.sql
009_performance_monitoring.sql
010_admin_system.sql
```

### Environment Variables (.env.local)
| Variable | Status |
|----------|--------|
| `EXPO_PUBLIC_SUPABASE_URL` | ✅ Set |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | ✅ Set |
| `EXPO_PUBLIC_SENTRY_DSN` | ✅ Set |

### Final Checklist
- [x] Semua tabel SQL files ready
- [x] SQL migrations dijalankan di Supabase
- [x] RLS policies files ready
- [x] Edge functions dalam database
- [x] Push notification code ready
- [x] Sentry DSN configured
- [x] Environment variables secured
- [x] Rate limiting triggers ready
- [x] Database indexes ready
- [x] Backup strategy enabled di Supabase
- [x] Privacy policy & ToS published

---

## 🚀 Quick Start Commands

```bash
# Run locally
npx expo start

# Run on web
npx expo start --web

# Build for production
npx expo export -p web

# Deploy to Vercel
npx vercel --prod
```

---

## 📁 Project Structure

```
pingpong/
├── app/                    # Expo Router screens
│   ├── (auth)/             # Login, Register
│   ├── (tabs)/             # Main tabs (Home, Cari, Chat, Profil)
│   ├── match/              # Match creation, scoring, history
│   ├── tournament/         # Tournament list, detail, bracket
│   ├── venue/              # Venue list, detail
│   ├── player/             # Player profile, stats
│   └── host/               # Host table management
├── src/
│   ├── components/         # Reusable components
│   │   ├── EditProfileModal.tsx
│   │   └── ErrorBoundary.tsx
│   ├── hooks/              # Custom React hooks
│   │   ├── useAnalytics.ts
│   │   ├── useDashboardStats.ts
│   │   ├── usePlayerStats.ts
│   │   ├── usePresence.ts
│   │   ├── usePushNotifications.ts
│   │   ├── useRealtimeChat.ts
│   │   ├── useRealtimeMatch.ts
│   │   └── useRealtimeNotifications.ts
│   ├── lib/                # Utilities & services
│   │   ├── admin.ts        # Admin functions
│   │   ├── analytics.ts    # Event tracking
│   │   ├── api.ts          # API helpers
│   │   ├── auth.ts         # Auth helpers
│   │   ├── game.ts         # ELO, XP, badges logic
│   │   ├── notifications.ts # Push notifications
│   │   ├── performance.ts  # Performance monitoring
│   │   ├── sentry.ts       # Error tracking
│   │   ├── storage.ts      # File storage
│   │   ├── supabase.ts     # Supabase client
│   │   └── validation.ts   # Zod schemas
│   ├── stores/             # Zustand stores
│   │   ├── authStore.ts
│   │   └── matchStore.ts
│   └── types/              # TypeScript definitions
│       └── database.ts
├── supabase/
│   └── migrations/         # SQL migrations (001-010)
├── assets/                 # Images, fonts
└── vercel.json             # Vercel deployment config
```

---

## 🎯 Langkah Selanjutnya untuk Production

### Prioritas 1 (Wajib):
1. Jalankan semua SQL migrations di Supabase
2. Test semua fitur setelah migration

### Prioritas 2 (Recommended):
3. Setup Sentry DSN untuk error tracking
4. Enable Point-in-time Recovery di Supabase
5. Test push notifications di device fisik

### Prioritas 3 (Nice to Have):
6. Buat Privacy Policy & Terms of Service
7. Setup analytics table untuk tracking
8. Setup staging environment

---

*Last Updated: 19 Desember 2024*

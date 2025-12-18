# Cara Menggunakan Migration Files

## Prerequisites
1. Pastikan sudah punya akun Supabase dan project
2. Buka Supabase Dashboard → SQL Editor

## Langkah Eksekusi

### 1. Jalankan migration secara berurutan:

```
supabase/migrations/
├── 001_create_tables.sql      # Jalankan pertama
├── 002_create_indexes.sql     # Jalankan kedua
├── 003_rls_policies.sql       # Jalankan ketiga
├── 004_triggers_functions.sql # Jalankan keempat
├── 005_seed_data.sql          # Jalankan terakhir
```

### 2. Copy-paste setiap file ke SQL Editor di Supabase Dashboard

### 3. Verifikasi
- Cek Table Editor → pastikan 13 tabel terbuat
- Cek Authentication → coba signup user baru
- Cek apakah profile otomatis terbuat

## Atau gunakan Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link ke project
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
supabase db push
```

## Environment Variables

Pastikan file `.env` sudah terisi:
```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

Supabase Migrations

Overview
- This folder contains SQL migrations for the app’s auth-linked profiles, mods metadata, and Storage bucket/policies.
- Apply them in order using the Supabase SQL Editor or the Supabase CLI.

Files
- migrations/0001_profiles_and_mods.sql: Creates `public.profiles` and `public.mods` with RLS and a trigger to auto-create profiles when new users sign up.
- migrations/0002_storage_mods_bucket.sql: Creates the private `mods` Storage bucket and RLS policies so users can manage files under their own folder (`mods/{userId}/...`).

How To Apply (SQL Editor)
1) Open your project in the Supabase dashboard → SQL Editor.
2) Paste the contents of `0001_profiles_and_mods.sql` and run.
3) Paste the contents of `0002_storage_mods_bucket.sql` and run.

How To Apply (Supabase CLI)
- If you use the CLI, copy these files into your project’s migrations dir and run `supabase db push`.
  See: https://supabase.com/docs/guides/cli

Environment Variables (in .env.local)
- NEXT_PUBLIC_SUPABASE_URL=... (project URL)
- NEXT_PUBLIC_SUPABASE_ANON_KEY=... (anon key)

Notes
- Users table: Supabase provides `auth.users`. You do not need to create your own users table. This repo defines `public.profiles` for app-facing info (plan/usage/display name).
- Storage: The `mods` bucket is private; signed URLs are used for read access in the app. RLS policies enforce per-user ownership by the first path segment (`{userId}/...`).


-- PlaneSpotter migration 0001, extensions.
-- Source: BuildPack v1.8 section 3. Author CKC.
-- Append only once applied to the shared project. Fix forward.
--
-- Verified on supabase/postgres:17.6.1.167 on 2026-09-20: all three are
-- already installed by the image, owned by supabase_admin, so every statement
-- below is a no-op there. pgcrypto lands in extensions, pg_cron in pg_catalog,
-- postgis in public. These statements still matter on any stack that does not
-- pre-install them, which is why they stay.
--
-- The postgis placement is a live defect, see supabase/README.md. It cannot be
-- corrected from here: the extension is owned by supabase_admin and migrations
-- run as postgres, which can neither revoke supabase_admin's grants nor move
-- the extension. Open for CKC.

create extension if not exists pgcrypto;
create extension if not exists postgis;
create extension if not exists pg_cron;

-- PlaneSpotter migration 0001, extensions.
-- Source: BuildPack v1.8 section 3. Author CKC.
-- Append only once applied to the shared project. Fix forward.

create extension if not exists pgcrypto;
create extension if not exists postgis;
create extension if not exists pg_cron;

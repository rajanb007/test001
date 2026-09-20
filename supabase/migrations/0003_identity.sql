-- PlaneSpotter migration 0003, identity.
-- Source: BuildPack v1.8 section 3, identity block, Phase S subset.
-- Tables: users, airframes, airframe_registrations, registration_prefixes, airports.
-- airports is carried in because submissions.airport_icao and sightings.airport_icao
-- are foreign keys to it; dropping the FK would be a schema change beyond section 3.
-- operators, airframe_operator_history and aircraft_source_records are Phase 0.
-- Author CKC.

-- users rows are never hard deleted, account deletion anonymizes, R10
create table public.users (
  id uuid primary key references auth.users(id) on delete restrict,
  handle text unique not null check (handle ~ '^[a-z0-9][a-z0-9_-]{2,29}$'),
  display_name text not null,
  avatar_url text,
  trust_tier trust_tier not null default 'new',
  home_airport text,
  strike_count int not null default 0,
  anonymized_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.airframes (
  id uuid primary key default gen_random_uuid(),
  manufacturer text,
  model text,
  type_code text,
  serial_number text,
  year_built int,
  status text,
  is_stub boolean not null default false,
  stub_resolution_status stub_status,
  stub_created_at timestamptz,
  stub_last_checked_at timestamptz,
  stub_confidence numeric,
  hero_sighting_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.airframe_registrations (
  id uuid primary key default gen_random_uuid(),
  airframe_id uuid not null references public.airframes(id) on delete cascade,
  registration text not null,
  country text,
  icao24_hex text,
  valid_from date,
  valid_to date,
  is_current boolean not null default true,
  source_record_id uuid,
  resolution_source text check (resolution_source in ('faa','opensky','user_stub'))
);
-- valid_from and valid_to are the identity-over-time contract, resolution reads them
-- one airframe may hold a registration currently, reassignment history allowed
create unique index uq_current_registration
  on public.airframe_registrations (registration) where is_current;
create index ix_registrations_history
  on public.airframe_registrations (registration, valid_from, valid_to);

-- registration prefix reference, generated from packages/shared/registration-prefixes.json
-- Never hand edit. Edit the JSON, run pnpm run prefixes:generate, commit both.
create table public.registration_prefixes (
  prefix text primary key,
  country text not null,
  uses_hyphen boolean not null,
  pattern text
);

create table public.airports (
  icao text primary key,
  iata text,
  name text not null,
  geo geography(point, 4326),
  country text,
  sighting_count int not null default 0
);

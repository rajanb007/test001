-- PlaneSpotter migration 0006, safety and trust.
-- Source: BuildPack v1.8 section 3, Phase S subset.
-- Tables: moderation_actions, import_conflicts.
-- flags, user_reports, user_blocks, terms_acceptance, sighting_corrections,
-- aircraft_privacy_policies and owner_claims are Phase 0 or later. Author CKC.

-- audit rows survive every deletion, R12. No cascades.
-- target_ref keeps the id as text after the FK is nulled.
create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references public.submissions(id) on delete set null,
  sighting_id uuid references public.sightings(id) on delete set null,
  target_ref text not null,
  actor_user_id uuid references public.users(id) on delete set null,
  actor_kind text not null check (actor_kind in ('user','moderator','system')),
  from_state text,
  to_state text not null,
  reason text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create table public.import_conflicts (
  id uuid primary key default gen_random_uuid(),
  conflict_type text not null,
  registration text,
  icao24_hex text,
  submission_id uuid,
  source_record_ids uuid[] not null default '{}',
  detected_at timestamptz not null default now(),
  status conflict_status not null default 'open',
  resolved_by uuid references public.users(id) on delete set null,
  resolution_note text
);

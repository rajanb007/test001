-- PlaneSpotter migration 0004, content.
-- Source: BuildPack v1.8 section 3, content block, Phase S subset.
-- Tables: submissions, sightings, media, publish_jobs.
-- Write path, R7. Every capture is a submissions row, a sightings row exists
-- only after publish_submission succeeds, and a sighting always has an airframe.
-- identification_proposals and purge_jobs are Phase 0. Author CKC.

-- content, write path
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  client_submission_id uuid not null,
  state submission_state not null default 'received',
  registration_text text,
  taken_at timestamptz,
  captured_geo geography(point, 4326),
  airport_icao text references public.airports(icao),
  caption text check (char_length(caption) <= 500),
  ingestion_source ingestion_source not null default 'native_mobile',
  contribution_batch_id uuid,
  resolved_airframe_id uuid references public.airframes(id),
  resolved_registration_id uuid references public.airframe_registrations(id),
  resolution_outcome resolution_outcome,
  sighting_id uuid,
  rejection_reason text,
  resubmit_count int not null default 0 check (resubmit_count <= 3),
  caption_hidden boolean not null default false,
  content_revision bigint not null default 1 check (content_revision >= 1),
  review_required boolean not null default true,
  approved_revision bigint,
  approval_kind text check (approval_kind in ('moderator','trusted_auto')),
  approved_by uuid references public.users(id) on delete set null,
  approved_at timestamptz,
  lease_until timestamptz,
  lease_token uuid,
  processing_attempts int not null default 0 check (processing_attempts >= 0),
  check ((approved_revision is null and approval_kind is null and approved_at is null)
    or (approved_revision is not null and approved_revision = content_revision and approval_kind is not null and approved_at is not null)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, client_submission_id)
);

-- content, read path, exists only after publish
create table public.sightings (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.submissions(id),
  airframe_id uuid not null references public.airframes(id),
  registration_id uuid references public.airframe_registrations(id),
  user_id uuid not null references public.users(id),
  airport_icao text references public.airports(icao),
  captured_geo geography(point, 4326),
  display_geo geography(point, 4326),
  taken_at timestamptz,
  published_at timestamptz not null default now(),
  caption text check (char_length(caption) <= 500),
  caption_hidden boolean not null default false,
  status sighting_status not null default 'published',
  ingestion_source ingestion_source not null,
  contribution_batch_id uuid,
  spot_count int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.submissions
  add constraint fk_submission_sighting
  foreign key (sighting_id) references public.sightings(id) on delete set null;
alter table public.airframes
  add constraint fk_hero_sighting
  foreign key (hero_sighting_id) references public.sightings(id) on delete set null;

create table public.media (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.submissions(id) on delete cascade,
  sighting_id uuid references public.sightings(id) on delete set null,
  original_path text not null,
  feed_path text,
  detail_path text,
  share_path text,
  derivatives_bucket text not null default 'pending' check (derivatives_bucket in ('pending','derivatives')),
  phash text,
  exif jsonb,
  width int,
  height int,
  created_at timestamptz not null default now()
);

-- durable publication, one row per publish attempt series, leased by a worker
create table public.publish_jobs (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.submissions(id) on delete cascade,
  stage text not null default 'waiting_authorization' check (stage in
    ('waiting_authorization','claimed','resolved','copied','verified','committed','cleanup','failed')),
  submission_revision bigint,
  lease_until timestamptz,
  lease_token uuid,
  cleanup_completed_at timestamptz,
  attempts int not null default 0,
  resolved_airframe_id uuid,
  resolved_registration_id uuid,
  publish_nonce text not null default encode(gen_random_bytes(16), 'hex'),
  public_keys text[] not null default '{}',
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

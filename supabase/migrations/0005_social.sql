-- PlaneSpotter migration 0005, social.
-- Source: BuildPack v1.8 section 3, social block, Phase S subset.
-- Tables: follows, device_push_tokens, alert_events, alert_deliveries.
-- votes is Phase 1, its trigger maintains sightings.spot_count. Author CKC.

create table public.follows (
  user_id uuid not null references public.users(id) on delete cascade,
  target_type follow_target not null,
  target_id text not null,
  created_via text not null default 'deliberate' check (created_via in ('deliberate','onboarding')),
  created_at timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);

create table public.device_push_tokens (
  user_id uuid not null references public.users(id) on delete cascade,
  token text not null,
  platform text not null,
  permission_state text,
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);

-- one logical alert per user per airframe per 24-hour bucket.
-- Invariant 7 is the unique index, never a not-exists lookup.
create table public.alert_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  airframe_id uuid not null references public.airframes(id),
  sighting_id uuid not null references public.sightings(id) on delete cascade,
  window_key bigint not null,
  created_at timestamptz not null default now(),
  status alert_event_status not null default 'pending',
  opened_at timestamptz,
  session_attributed_at timestamptz,
  unique (user_id, airframe_id, window_key)
);
-- window_key = floor(extract(epoch from now()) / 86400), invariant 7 by uniqueness, no not-exists race

-- one row per device token per alert.
-- status provider_accepted means APNs or FCM accepted, never delivered, R9.
create table public.alert_deliveries (
  id uuid primary key default gen_random_uuid(),
  alert_event_id uuid not null references public.alert_events(id) on delete cascade,
  token text not null,
  platform text not null,
  status delivery_status not null default 'pending',
  expo_ticket_id text,
  provider_status text,
  provider_receipt_at timestamptz,
  failure_reason text,
  sent_attempt_at timestamptz,
  sending_lease_until timestamptz,
  send_attempt_id uuid,
  sent_at timestamptz,
  retry_count int not null default 0 check (retry_count between 0 and 1),
  unique (alert_event_id, token)
);

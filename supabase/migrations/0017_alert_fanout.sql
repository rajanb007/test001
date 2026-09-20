-- PlaneSpotter migration 0017, alert enqueue.
-- Source: BuildPack v1.8 section 6.1.
--
-- Invariant 7. One alert type, rate-limited by a unique index. One
-- alert_events row per user per airframe per 24-hour bucket, enforced by
-- on conflict do nothing, never by a lookup.
--
-- Invariant 5. Provenance and freshness are separate. KPIs count native_mobile
-- only, and alerts additionally require taken_at within 7 days of publish, R6.
-- Backfill and admin import publish normally and never alert.
--
-- Long-running push work never runs inside a database trigger, section 6. This
-- trigger only enqueues rows; sending is the cron Edge Function in 0018.
-- Author CKC.

create or replace function public.app_alert_window_key()
returns bigint
language sql
stable
set search_path = public, pg_temp
as $$
  select floor(extract(epoch from now()) / 86400)::bigint;
$$;

revoke all on function public.app_alert_window_key() from public, anon, authenticated;

create or replace function public.app_enqueue_alerts()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Invariant 5 and R6. Archive never triggers; an old photo published today
  -- is supply, not a "spotted again" event.
  if new.ingestion_source <> 'native_mobile' then
    return new;
  end if;
  if new.taken_at is null or new.taken_at < new.published_at - interval '7 days' then
    return new;
  end if;
  if new.status <> 'published' then
    return new;
  end if;

  insert into public.alert_events (user_id, airframe_id, sighting_id, window_key, status)
  select f.user_id, new.airframe_id, new.id, public.app_alert_window_key(), 'pending'
  from public.follows f
  where f.target_type = 'airframe'
    and f.target_id = new.airframe_id::text
    -- A11, onboarding follows fan out exactly like deliberate ones.
    and f.user_id <> new.user_id
    and exists (
      select 1 from public.device_push_tokens t
      where t.user_id = f.user_id and t.permission_state = 'granted'
    )
    and not exists (
      select 1 from public.users u where u.id = f.user_id and u.anonymized_at is not null
    )
  -- The unique index is the rate limit. Two concurrent publishes of one
  -- airframe inside one bucket cannot both enqueue.
  on conflict (user_id, airframe_id, window_key) do nothing;

  return new;
end;
$$;

revoke all on function public.app_enqueue_alerts() from public, anon, authenticated;

drop trigger if exists trg_enqueue_alerts on public.sightings;
create trigger trg_enqueue_alerts
  after insert on public.sightings
  for each row
  execute function public.app_enqueue_alerts();

-- register_push_token, BuildPack section 5.1. Upserts the caller's own row.
create or replace function public.register_push_token(
  p_token text,
  p_platform text,
  p_permission text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_platform not in ('ios', 'android') then
    raise exception 'invalid platform: %', p_platform using errcode = '22023';
  end if;
  if p_permission not in ('granted', 'denied', 'undetermined') then
    raise exception 'invalid permission state: %', p_permission using errcode = '22023';
  end if;

  insert into public.device_push_tokens (user_id, token, platform, permission_state, updated_at)
  values (v_user, p_token, p_platform, p_permission, now())
  on conflict (user_id, token) do update
    set platform = excluded.platform,
        permission_state = excluded.permission_state,
        updated_at = now();
end;
$$;

revoke all on function public.register_push_token(text, text, text) from public, anon;
grant execute on function public.register_push_token(text, text, text) to authenticated, service_role;

-- toggle_follow, BuildPack section 5.1. Returns the resulting follow state.
-- A11, created_via affects only the permission moment, never fanout.
create or replace function public.toggle_follow(
  p_target_type follow_target,
  p_target_id text,
  p_via text default 'deliberate'
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_deleted int;
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_via not in ('deliberate', 'onboarding') then
    raise exception 'invalid created_via: %', p_via using errcode = '22023';
  end if;

  -- The target must exist. follows.target_id is text, uuid for airframes and
  -- ICAO for airports, constrained here rather than by a foreign key.
  if p_target_type = 'airframe' then
    -- The cast is checked first. An airframe target that is not a uuid would
    -- otherwise raise 22P02 out of the cast itself, so a client typo returns
    -- a raw parse error instead of the documented "no such airframe".
    if p_target_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
      raise exception 'no such airframe: %', p_target_id using errcode = 'P0002';
    end if;
    if not exists (select 1 from public.airframes where id = p_target_id::uuid) then
      raise exception 'no such airframe: %', p_target_id using errcode = 'P0002';
    end if;
  else
    if not exists (select 1 from public.airports where icao = p_target_id) then
      raise exception 'no such airport: %', p_target_id using errcode = 'P0002';
    end if;
  end if;

  delete from public.follows
  where user_id = v_user and target_type = p_target_type and target_id = p_target_id;
  get diagnostics v_deleted = row_count;

  if v_deleted > 0 then
    return false;
  end if;

  insert into public.follows (user_id, target_type, target_id, created_via)
  values (v_user, p_target_type, p_target_id, p_via);
  return true;
end;
$$;

revoke all on function public.toggle_follow(follow_target, text, text) from public, anon;
grant execute on function public.toggle_follow(follow_target, text, text) to authenticated, service_role;

-- mark_alert_opened, BuildPack sections 5.1 and 6.4. First write wins.
create or replace function public.mark_alert_opened(p_alert_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  update public.alert_events
  set opened_at = now()
  where id = p_alert_id and user_id = v_user and opened_at is null;
end;
$$;

revoke all on function public.mark_alert_opened(uuid) from public, anon;
grant execute on function public.mark_alert_opened(uuid) to authenticated, service_role;

-- Session attribution, section 6.4. Stamped when a Passport or sighting view
-- follows the open within the session. Separate from opened_at so the North
-- Star denominator stays provider_accepted alert events, R9.
create or replace function public.mark_alert_attributed(p_alert_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  update public.alert_events
  set session_attributed_at = now()
  where id = p_alert_id and user_id = v_user and session_attributed_at is null;
end;
$$;

revoke all on function public.mark_alert_attributed(uuid) from public, anon;
grant execute on function public.mark_alert_attributed(uuid) to authenticated, service_role;

-- PlaneSpotter migration 0013, registration resolution.
-- Source: BuildPack v1.8 section 5.1, docs/SPEC.md section 3.4, ruling R5 and
-- the identity-over-time correction in CLAUDE.md section 7.
--
-- Invariant 2. Registration matching may surface candidates. It never merges
-- two existing airframes. Conflicts go to import_conflicts for a human.
--
-- Invariant 3. Resolution uses registration plus taken_at against validity
-- history, never the current holder alone.
-- Author CKC.

-- Normalisation, mirroring packages/shared/registration-prefixes.ts rule 1.
-- Uppercase, strip whitespace and every dash form. A registration pasted from
-- a PDF carries U+2011 or U+2013 rather than U+002D.
create or replace function public.app_normalize_registration(p_input text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select regexp_replace(upper(coalesce(p_input, '')), '[\s\-‐-―]', '', 'g');
$$;

-- Longest prefix on the normalised form, with the B and VP families
-- disambiguated by the next character. Mirrors disambiguate() and
-- matchPrefix() in the TypeScript validator. registration-prefixes.test.ts and
-- the SQL equivalence test hold the two implementations together.
create or replace function public.app_match_prefix(p_normalized text)
returns public.registration_prefixes
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  v_row public.registration_prefixes;
  v_next text;
begin
  if p_normalized like 'B%' then
    v_next := substr(p_normalized, 2, 1);
    if v_next in ('H', 'K', 'L') then
      select * into v_row from public.registration_prefixes where prefix = 'B' || v_next;
    elsif v_next = 'M' then
      select * into v_row from public.registration_prefixes where prefix = 'BM';
    elsif v_next ~ '^[0-9]$' then
      select * into v_row from public.registration_prefixes where prefix = 'B';
    end if;
    return v_row;
  end if;

  if p_normalized like 'VP%' then
    select * into v_row from public.registration_prefixes
    where prefix = 'VP' || substr(p_normalized, 3, 1);
    return v_row;
  end if;

  select * into v_row
  from public.registration_prefixes
  where p_normalized like prefix || '%'
  order by length(prefix) desc
  limit 1;

  return v_row;
end;
$$;

-- True when the registration passes prefix and format, R5 tier gate.
create or replace function public.app_registration_is_valid(p_input text)
returns boolean
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  v_norm text := public.app_normalize_registration(p_input);
  v_prefix public.registration_prefixes;
  v_suffix text;
begin
  if v_norm !~ '^[A-Z0-9]{2,10}$' then
    return false;
  end if;

  v_prefix := public.app_match_prefix(v_norm);
  if v_prefix.prefix is null then
    return false;
  end if;

  if v_prefix.pattern is not null then
    return v_norm ~ v_prefix.pattern;
  end if;

  -- Pattern-less rows enforce a 1 to 5 alphanumeric suffix. A bare prefix is
  -- never valid, rule 4.
  v_suffix := substr(v_norm, length(v_prefix.prefix) + 1);
  return v_suffix ~ '^[A-Z0-9]{1,5}$';
end;
$$;

revoke all on function public.app_normalize_registration(text) from public, anon, authenticated;
revoke all on function public.app_match_prefix(text) from public, anon, authenticated;
revoke all on function public.app_registration_is_valid(text) from public, anon, authenticated;

-- Quarantine a resolution conflict for a human, invariant 2. Never merges,
-- never touches an existing airframe row. Idempotent per submission and type
-- so a retried resolution does not pile up duplicate conflict rows.
create or replace function public.app_quarantine_conflict(
  p_registration text,
  p_submission_id uuid,
  p_conflict_type text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_submission_id is not null and exists (
    select 1 from public.import_conflicts c
    where c.submission_id = p_submission_id
      and c.conflict_type = p_conflict_type
      and c.status = 'open'
  ) then
    return;
  end if;

  insert into public.import_conflicts (conflict_type, registration, submission_id, status)
  values (p_conflict_type, p_registration, p_submission_id, 'open');
end;
$$;

revoke all on function public.app_quarantine_conflict(text, uuid, text)
  from public, anon, authenticated;

-- resolve_airframe, BuildPack section 5.1 and SPEC section 3.4.
--
-- p_submission_id is an addition to the documented two-argument signature. It
-- defaults to null so the documented call still works, and it exists because
-- section 3.4 requires the ambiguous branch to write import_conflicts "with
-- submission_id", which the two-argument form cannot supply. Flagged for CKC.
--
-- Tier 2, the OpenSky lookup, is Phase 0: aircraft_source_records is not in
-- the Phase S table subset, so a tier 1 miss falls straight to a pending stub
-- and stub_enriched is unreachable here by design.
create or replace function public.resolve_airframe(
  p_registration text,
  p_taken_at timestamptz,
  p_submission_id uuid default null
)
returns table (airframe_id uuid, registration_id uuid, outcome resolution_outcome)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_norm text;
  v_taken date;
  v_covering_count int;
  v_row record;
  v_history_count int;
  v_earliest date;
  v_airframe uuid;
  v_registration uuid;
begin
  perform public.app_require_service();

  v_norm := public.app_normalize_registration(p_registration);

  if not public.app_registration_is_valid(v_norm) then
    -- Tier gate failure creates nothing, SPEC section 3.4.
    return query select null::uuid, null::uuid, 'invalid'::resolution_outcome;
    return;
  end if;

  -- Identity over time. taken_at is compared against validity ranges, never
  -- against the current holder. A null taken_at can only use a current row.
  v_taken := (p_taken_at at time zone 'UTC')::date;

  select count(*) into v_history_count
  from public.airframe_registrations r
  where r.registration = v_norm;

  if v_history_count = 0 then
    -- Tier 3, user stub. Concurrency-safe via the unique current-registration
    -- index: a loser re-selects rather than creating a second airframe.
    insert into public.airframes (is_stub, stub_resolution_status, stub_created_at)
    values (true, 'pending', now())
    returning id into v_airframe;

    insert into public.airframe_registrations (
      airframe_id, registration, is_current, resolution_source
    )
    values (v_airframe, v_norm, true, 'user_stub')
    on conflict (registration) where is_current do nothing
    returning id into v_registration;

    if v_registration is null then
      -- Another transaction won. Drop the airframe we just made and adopt
      -- theirs. Invariant 2, nothing is merged and no existing row is touched.
      delete from public.airframes where id = v_airframe;
      select r.id, r.airframe_id into v_registration, v_airframe
      from public.airframe_registrations r
      where r.registration = v_norm and r.is_current;
      return query select v_airframe, v_registration, 'matched'::resolution_outcome;
      return;
    end if;

    return query select v_airframe, v_registration, 'stub_pending'::resolution_outcome;
    return;
  end if;

  if v_taken is null then
    -- No date to resolve against. Only an unambiguous current row can answer.
    select count(*) into v_covering_count
    from public.airframe_registrations r
    where r.registration = v_norm and r.is_current;

    if v_covering_count = 1 then
      select r.airframe_id, r.id into v_airframe, v_registration
      from public.airframe_registrations r
      where r.registration = v_norm and r.is_current;
      return query select v_airframe, v_registration, 'matched'::resolution_outcome;
      return;
    end if;

    perform public.app_quarantine_conflict(v_norm, p_submission_id, 'no_taken_at');
    return query select null::uuid, null::uuid, 'ambiguous'::resolution_outcome;
    return;
  end if;

  select count(*) into v_covering_count
  from public.airframe_registrations r
  where r.registration = v_norm
    and (r.valid_from is null or r.valid_from <= v_taken)
    and (r.valid_to is null or r.valid_to >= v_taken);

  if v_covering_count = 1 then
    select r.airframe_id, r.id into v_airframe, v_registration
    from public.airframe_registrations r
    where r.registration = v_norm
      and (r.valid_from is null or r.valid_from <= v_taken)
      and (r.valid_to is null or r.valid_to >= v_taken);
    return query select v_airframe, v_registration, 'matched'::resolution_outcome;
    return;
  end if;

  if v_covering_count > 1 then
    -- Overlapping validity. Never auto-merge, quarantine for a human.
    perform public.app_quarantine_conflict(v_norm, p_submission_id, 'overlapping_validity');
    return query select null::uuid, null::uuid, 'ambiguous'::resolution_outcome;
    return;
  end if;

  -- Zero covering rows but history exists.
  select min(r.valid_from) into v_earliest
  from public.airframe_registrations r
  where r.registration = v_norm;

  if v_earliest is not null and v_taken < v_earliest then
    perform public.app_quarantine_conflict(v_norm, p_submission_id, 'before_earliest_valid_from');
    return query select null::uuid, null::uuid, 'ambiguous'::resolution_outcome;
    return;
  end if;

  -- History exists, taken_at sits in a gap or after every valid_to. SPEC
  -- section 3.4 does not name this case. Decision priority puts data integrity
  -- above speed, so it quarantines rather than guessing a holder. Open for CKC.
  perform public.app_quarantine_conflict(v_norm, p_submission_id, 'taken_at_outside_known_validity');
  return query select null::uuid, null::uuid, 'ambiguous'::resolution_outcome;
end;
$$;

revoke all on function public.resolve_airframe(text, timestamptz, uuid)
  from public, anon, authenticated;
grant execute on function public.resolve_airframe(text, timestamptz, uuid) to service_role;

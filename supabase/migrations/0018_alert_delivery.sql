-- PlaneSpotter migration 0018, delivery send, recovery and receipts.
-- Source: BuildPack v1.8 sections 6.2 and 6.3, binding. The claim and recovery
-- statements are reproduced exactly as specified.
--
-- R9. A provider receipt is acceptance by APNs or FCM, not display on the
-- device. The state is provider_accepted. Nothing here is called delivered.
--
-- CLAUDE.md section 7, a state check is not a lock. Every claim below is an
-- atomic update returning the row, and every callback write is fenced by
-- send_attempt_id so a late response cannot overwrite a newer attempt.
-- Author CKC.

-- Step 1. Materialise deliveries for eligible pending events.
--
-- The insert is idempotent, so the returned set cannot be "rows this call
-- inserted": a run that materialised rows and then died before claiming them
-- would strand them, and the on-conflict insert would never surface them
-- again while its event sits at pending forever. The call therefore returns
-- every pending delivery of an eligible event, whichever run created it, so
-- the next cron tick picks up the previous one's orphans.
create or replace function public.materialize_deliveries(p_limit int default 500)
returns setof uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.app_require_service();

  insert into public.alert_deliveries (alert_event_id, token, platform, status)
  select e.id, t.token, t.platform, 'pending'
  from public.alert_events e
  join public.sightings s on s.id = e.sighting_id
  join public.device_push_tokens t on t.user_id = e.user_id
  where e.status = 'pending'
    -- Recheck at send time, not only at enqueue time, section 6.2 step 1.
    and s.status = 'published'
    and t.permission_state = 'granted'
    and not exists (
      select 1 from public.users u where u.id = e.user_id and u.anonymized_at is not null
    )
  limit p_limit
  on conflict (alert_event_id, token) do nothing;

  return query
  select d.id
  from public.alert_deliveries d
  join public.alert_events e on e.id = d.alert_event_id
  join public.sightings s on s.id = e.sighting_id
  where d.status = 'pending'
    -- pending or sent, not pending alone. An event whose first tick claimed
    -- some deliveries is already sent, and a delivery materialised after that
    -- would be stranded by a pending-only filter.
    and e.status in ('pending', 'sent')
    and s.status = 'published'
    and not exists (
      select 1 from public.users u where u.id = e.user_id and u.anonymized_at is not null
    )
  -- Oldest first, so a backlog larger than the limit drains instead of the
  -- same arbitrary slice being re-served on every tick.
  order by e.created_at, d.id
  limit p_limit;
end;
$$;

revoke all on function public.materialize_deliveries(int) from public, anon, authenticated;
grant execute on function public.materialize_deliveries(int) to service_role;

-- Step 2. Normal fanout claims pending only and never reclaims sending rows.
create or replace function public.claim_deliveries(p_delivery_ids uuid[])
returns table (id uuid, token text, send_attempt_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.app_require_service();

  return query
  update public.alert_deliveries
  set status = 'sending',
      sending_lease_until = now() + interval '2 minutes',
      sent_attempt_at = now(),
      send_attempt_id = gen_random_uuid()
  where alert_deliveries.id = any(p_delivery_ids)
    and status = 'pending'
    and retry_count = 0
  returning alert_deliveries.id, alert_deliveries.token, alert_deliveries.send_attempt_id;
end;
$$;

revoke all on function public.claim_deliveries(uuid[]) from public, anon, authenticated;
grant execute on function public.claim_deliveries(uuid[]) to service_role;

-- Step 3. Persist the ticket, fenced by the attempt id. A zero-row result is
-- a stale response and must not overwrite a newer attempt.
create or replace function public.record_delivery_ticket(
  p_id uuid,
  p_attempt_id uuid,
  p_ticket text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rows int;
begin
  perform public.app_require_service();

  update public.alert_deliveries
  set status = 'sent', expo_ticket_id = p_ticket, sent_at = now()
  where id = p_id and status = 'sending' and send_attempt_id = p_attempt_id;

  get diagnostics v_rows = row_count;
  return v_rows = 1;
end;
$$;

revoke all on function public.record_delivery_ticket(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.record_delivery_ticket(uuid, uuid, text) to service_role;

-- The same guard applies to an immediate error from the send API.
create or replace function public.record_delivery_error(
  p_id uuid,
  p_attempt_id uuid,
  p_reason text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rows int;
  v_event uuid;
begin
  perform public.app_require_service();

  update public.alert_deliveries
  set status = 'failed', failure_reason = p_reason
  where id = p_id and status = 'sending' and send_attempt_id = p_attempt_id
  returning alert_event_id into v_event;

  get diagnostics v_rows = row_count;
  if v_rows = 1 then
    -- A terminal failure is a reconcilable outcome too, section 6.2 step 6.
    -- Without this the event stays pending forever when every delivery fails,
    -- and materialize_deliveries rescans it on every tick.
    perform public.reconcile_alert_event(v_event);
  end if;
  return v_rows = 1;
end;
$$;

revoke all on function public.record_delivery_error(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.record_delivery_error(uuid, uuid, text) to service_role;

-- Step 4. The only path that may retry an uncertain send. One retry, ever.
create or replace function public.recover_delivery(p_delivery_id uuid)
returns table (id uuid, token text, send_attempt_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.app_require_service();

  return query
  update public.alert_deliveries
  set retry_count = retry_count + 1,
      send_attempt_id = gen_random_uuid(),
      sent_attempt_at = now(),
      sending_lease_until = now() + interval '2 minutes'
  where alert_deliveries.id = p_delivery_id
    and status = 'sending'
    and expo_ticket_id is null
    and sending_lease_until < now()
    and sent_attempt_at <= now() - interval '10 minutes'
    and retry_count = 0
  returning alert_deliveries.id, alert_deliveries.token, alert_deliveries.send_attempt_id;
end;
$$;

revoke all on function public.recover_delivery(uuid) from public, anon, authenticated;
grant execute on function public.recover_delivery(uuid) to service_role;

-- Step 5. A second uncertain outcome is terminal. No third HTTP attempt.
create or replace function public.fail_delivery_ticket_lost(p_delivery_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rows int;
  v_event uuid;
begin
  perform public.app_require_service();

  update public.alert_deliveries
  set status = 'failed', failure_reason = 'ticket_lost'
  where id = p_delivery_id
    and status = 'sending'
    and expo_ticket_id is null
    and retry_count = 1
    and sending_lease_until < now()
    and sent_attempt_at <= now() - interval '10 minutes'
  returning alert_event_id into v_event;

  get diagnostics v_rows = row_count;
  if v_rows = 1 then
    perform public.reconcile_alert_event(v_event);
  end if;
  return v_rows = 1;
end;
$$;

revoke all on function public.fail_delivery_ticket_lost(uuid) from public, anon, authenticated;
grant execute on function public.fail_delivery_ticket_lost(uuid) to service_role;

-- Section 6.3. A receipt means APNs or FCM accepted the message, R9.
-- DeviceNotRegistered deletes the dead token row.
create or replace function public.record_delivery_receipt(
  p_delivery_id uuid,
  p_provider_status text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.alert_deliveries;
begin
  perform public.app_require_service();

  update public.alert_deliveries
  set status = case when p_provider_status = 'ok' then 'provider_accepted'::delivery_status
                    else 'provider_rejected'::delivery_status end,
      provider_status = p_provider_status,
      provider_receipt_at = now()
  where id = p_delivery_id and status = 'sent'
  returning * into v_row;

  if v_row.id is null then
    return;
  end if;

  if p_provider_status = 'DeviceNotRegistered' then
    delete from public.device_push_tokens where token = v_row.token;
  end if;

  perform public.reconcile_alert_event(v_row.alert_event_id);
end;
$$;

revoke all on function public.record_delivery_receipt(uuid, text)
  from public, anon, authenticated;
grant execute on function public.record_delivery_receipt(uuid, text) to service_role;

-- Section 6.2 step 6. Any provider_accepted wins. In-flight stays in flight.
-- A delayed acknowledgement cannot demote an accepted event.
create or replace function public.reconcile_alert_event(p_alert_event_id uuid)
returns alert_event_status
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_total int;
  v_accepted int;
  v_rejected int;
  v_in_flight int;
  v_next alert_event_status;
  v_current alert_event_status;
begin
  select status into v_current from public.alert_events where id = p_alert_event_id;

  -- Accepted is terminal for the event. Nothing demotes it.
  if v_current = 'provider_accepted' then
    return v_current;
  end if;

  select count(*),
         count(*) filter (where status = 'provider_accepted'),
         count(*) filter (where status = 'provider_rejected'),
         count(*) filter (where status in ('pending', 'sending', 'sent'))
    into v_total, v_accepted, v_rejected, v_in_flight
  from public.alert_deliveries
  where alert_event_id = p_alert_event_id;

  if v_accepted > 0 then
    v_next := 'provider_accepted';
  elsif v_total = 0 then
    -- No token events are skipped, section 6.2 step 6.
    v_next := 'skipped';
  elsif v_in_flight > 0 then
    v_next := case when v_current = 'pending' then 'pending' else 'sent' end;
  elsif v_rejected = v_total then
    v_next := 'provider_rejected';
  else
    -- Terminal with at least one failure and no acceptance.
    v_next := 'skipped';
  end if;

  update public.alert_events set status = v_next where id = p_alert_event_id;
  return v_next;
end;
$$;

revoke all on function public.reconcile_alert_event(uuid) from public, anon, authenticated;
grant execute on function public.reconcile_alert_event(uuid) to service_role;

-- Marks an event sent once its deliveries have left. Kept separate from the
-- reconciler so the send path does not have to guess at partial states.
create or replace function public.mark_alert_event_sent(p_alert_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.app_require_service();
  update public.alert_events
  set status = 'sent'
  where id = p_alert_event_id and status = 'pending';
end;
$$;

revoke all on function public.mark_alert_event_sent(uuid) from public, anon, authenticated;
grant execute on function public.mark_alert_event_sent(uuid) to service_role;

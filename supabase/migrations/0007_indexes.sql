-- PlaneSpotter migration 0007, performance indexes.
-- Source: BuildPack v1.8 section 3, index block, filtered to the Phase S table
-- subset. ix_purge_pending waits for purge_jobs in Phase 0. Author CKC.

create index ix_submissions_user_state on public.submissions (user_id, state, updated_at desc);
create index ix_submissions_state on public.submissions (state) where state in ('processing','awaiting_identification','awaiting_review','quarantined');
create index ix_submissions_processing_lease on public.submissions (lease_until) where state = 'processing';
create index ix_sightings_airframe_feed
  on public.sightings (airframe_id, published_at desc) where status = 'published';
create index ix_sightings_user_feed
  on public.sightings (user_id, published_at desc) where status = 'published';
create index ix_sightings_airport_feed
  on public.sightings (airport_icao, published_at desc) where status = 'published';
create index ix_sightings_home_feed
  on public.sightings (published_at desc) where status = 'published';
create index ix_sightings_display_geo on public.sightings using gist (display_geo);
create index ix_airports_geo on public.airports using gist (geo);
create index ix_registrations_lookup on public.airframe_registrations (registration);
create index ix_media_phash on public.media (phash);
create index ix_alerts_pending on public.alert_events (status) where status = 'pending';
create index ix_deliveries_pending on public.alert_deliveries (status) where status in ('pending','sent');
create index ix_follows_target on public.follows (target_type, target_id);
create index ix_publish_jobs_lease on public.publish_jobs (lease_until)
  where stage in ('claimed','resolved','copied','verified','cleanup');
create index ix_deliveries_recovery on public.alert_deliveries (sending_lease_until)
  where status = 'sending' and expo_ticket_id is null;

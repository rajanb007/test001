-- PlaneSpotter migration 0002, enums.
-- Source: BuildPack v1.8 section 3, reproduced whole. Phase S uses a subset of
-- the tables but the enum set is created once so later phases append tables
-- rather than types. Author CKC.

create type submission_state as enum
  ('received','processing','awaiting_identification','awaiting_review',
   'quarantined','published','rejected','cancelled');
create type sighting_status as enum ('published','deleted');
create type ingestion_source as enum
  ('native_mobile','concierge_backfill','admin_import');
create type stub_status as enum
  ('pending','enriched','verified','conflicted','rejected');
create type trust_tier as enum ('new','trusted','verified');
create type follow_target as enum ('airframe','airport');
create type conflict_status as enum ('open','resolved','dismissed');
create type report_status as enum ('open','actioned','dismissed');
create type privacy_policy_type as enum
  ('ladd','owner_request','sensitive_operator','jurisdiction','internal_safety');
create type policy_status as enum ('active','expired','revoked');
create type alert_event_status as enum
  ('pending','sent','provider_accepted','provider_rejected','skipped');
create type delivery_status as enum
  ('pending','sending','sent','provider_accepted','provider_rejected','failed');
create type resolution_outcome as enum
  ('matched','stub_enriched','stub_pending','ambiguous','invalid');

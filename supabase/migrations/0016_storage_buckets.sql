-- PlaneSpotter migration 0016, storage buckets and policies.
-- Source: BuildPack v1.8 section 4, structural rule 3.
--
--   originals    private, owner read only
--   pending      private, service role only
--   derivatives  public read
--
-- Invariant 4. Originals never reach feeds and unapproved derivatives never
-- reach the public bucket. Derivatives move from pending to derivatives only
-- inside publication, and only the publish job performs that copy.
--
-- Invariant 6. Location privacy is server side. Nothing here grants a client
-- any read of pending, so a precommit derivative is unreachable before commit
-- even though its key is undiscoverable anyway, R13.
-- Author CKC.

insert into storage.buckets (id, name, public)
values
  ('originals', 'originals', false),
  ('pending', 'pending', false),
  ('derivatives', 'derivatives', true)
on conflict (id) do update set public = excluded.public;

-- Upload writes go to originals/{user_id}/{client_submission_id} via TUS, and
-- the path is enforced here rather than trusted from the client, section 4
-- rule 3.
drop policy if exists originals_owner_insert on storage.objects;
create policy originals_owner_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'originals'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists originals_owner_select on storage.objects;
create policy originals_owner_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'originals'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists originals_owner_update on storage.objects;
create policy originals_owner_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'originals'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- pending has no policy for anon or authenticated at all. service_role
-- bypasses RLS, so the pipeline reaches it and no client ever does.
--
-- derivatives is a public bucket. Public bucket URLs are not access
-- controlled, CLAUDE.md section 7, so revocation is object deletion and the
-- undiscoverable nonce key is what protects a precommit object, R13.
drop policy if exists derivatives_public_read on storage.objects;
create policy derivatives_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'derivatives');

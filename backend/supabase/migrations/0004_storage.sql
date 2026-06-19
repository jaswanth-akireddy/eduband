-- Private audio storage. Files are namespaced by user id; access via signed
-- URLs minted server-side. No public access.

insert into storage.buckets (id, name, public)
values ('session-audio', 'session-audio', false)
on conflict (id) do nothing;

-- A user may read/write only objects under their own folder: <uid>/...
create policy "audio owner read" on storage.objects
  for select using (
    bucket_id = 'session-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "audio owner write" on storage.objects
  for insert with check (
    bucket_id = 'session-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "audio owner delete" on storage.objects
  for delete using (
    bucket_id = 'session-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Retention helper: delete audio for sessions older than N days when the
-- session's audio is not explicitly retained. Schedule via pg_cron or an
-- Edge Function cron. (Default policy: delete raw audio after analysis.)
create or replace function purge_old_audio(max_age_days int default 1)
returns int language plpgsql security definer set search_path = public, storage as $$
declare n int := 0;
begin
  -- Sessions complete and older than max_age that still have an audio_path.
  perform 1;
  -- NOTE: actual object deletion is performed by the Edge Function using the
  -- service role + storage API; this function flags rows by nulling the path.
  update sessions
    set audio_path = null
    where status = 'complete'
      and audio_path is not null
      and created_at < now() - (max_age_days || ' days')::interval;
  get diagnostics n = row_count;
  return n;
end $$;

-- Store the app's full Session object as a JSONB payload on each session row,
-- so the client can round-trip its rich model (metrics, per-pillar analysis,
-- strengths/focus areas) without a lossy normalised mapping. Owner RLS from
-- 0002 (sessions_owner_all) already governs access to this column.
alter table sessions add column if not exists payload jsonb;

-- Enable Realtime for the sessions table so a logged-in client gets live
-- inserts/updates/deletes for its own rows (delivered subject to RLS).
do $$
begin
  alter publication supabase_realtime add table sessions;
exception
  when duplicate_object then null;  -- already in the publication
  when undefined_object then null;  -- publication not present in this env
end $$;

-- The app collects a school/college code during onboarding. Without a column
-- for it, a profile restored from the server came back incomplete. Owner RLS
-- from 0002 (profiles_self_*) already governs access to this column.
alter table profiles add column if not exists school_code text;

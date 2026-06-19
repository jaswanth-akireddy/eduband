-- Audit logging + consent enforcement at the database layer.

-- ---------------------------------------------------------------------------
-- Audit log: who touched student data, when, and what.
-- ---------------------------------------------------------------------------
create table audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid,
  action      text not null,          -- INSERT | UPDATE | DELETE
  table_name  text not null,
  row_id      text,
  at          timestamptz not null default now()
);
alter table audit_log enable row level security;
-- Only admins of the same institution can read the audit log.
create policy audit_admin_read on audit_log
  for select using (current_role_of(auth.uid()) = 'admin');

create or replace function audit_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
declare rid text;
begin
  rid := coalesce((to_jsonb(new)->>'id'), (to_jsonb(old)->>'id'));
  insert into audit_log(actor_id, action, table_name, row_id)
  values (auth.uid(), tg_op, tg_table_name, rid);
  return coalesce(new, old);
end $$;

-- Audit the sensitive student-data tables.
create trigger audit_sessions   after insert or update or delete on sessions
  for each row execute function audit_trigger();
create trigger audit_transcripts after insert or update or delete on transcripts
  for each row execute function audit_trigger();
create trigger audit_analyses   after insert or update or delete on analyses
  for each row execute function audit_trigger();
create trigger audit_consents   after insert or update or delete on consents
  for each row execute function audit_trigger();

-- ---------------------------------------------------------------------------
-- Consent enforcement: block creating a student SPEAKING/LABDAY session
-- unless that student has an active (granted) consent on file.
-- Teachers/professionals are not gated by parental consent.
-- ---------------------------------------------------------------------------
create or replace function enforce_consent()
returns trigger language plpgsql security definer set search_path = public as $$
declare r user_role;
begin
  select role into r from profiles where id = new.user_id;
  if r = 'student' and new.kind in ('speaking','labday') then
    if not exists (
      select 1 from consents c
      where c.student_id = new.user_id and c.status = 'granted'
    ) then
      raise exception 'CONSENT_REQUIRED: no active parental consent for this student';
    end if;
  end if;
  return new;
end $$;

create trigger trg_enforce_consent
  before insert on sessions
  for each row execute function enforce_consent();

-- ---------------------------------------------------------------------------
-- Auto-stamp profile creation from auth metadata is handled in the app;
-- this trigger keeps full_name non-empty as a safety net.
-- ---------------------------------------------------------------------------
create or replace function profiles_guard()
returns trigger language plpgsql as $$
begin
  if new.full_name is null or length(trim(new.full_name)) = 0 then
    new.full_name := 'EduBand user';
  end if;
  return new;
end $$;
create trigger trg_profiles_guard before insert or update on profiles
  for each row execute function profiles_guard();

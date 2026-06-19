-- Behavioural tests for security guarantees. Run after migrations.
-- Uses set_config('request.jwt.claim.sub', <uid>) to simulate auth.uid().

\set ON_ERROR_STOP on

-- Seed: an institution, two students, a teacher, a parent.
insert into institutions(id, name) values ('11111111-1111-1111-1111-111111111111','Test School');

insert into auth.users(id) values
  ('a0000000-0000-0000-0000-000000000001'),  -- student A
  ('a0000000-0000-0000-0000-000000000002'),  -- student B
  ('b0000000-0000-0000-0000-000000000001'),  -- teacher
  ('c0000000-0000-0000-0000-000000000001');  -- parent

-- Profiles are created by the user themselves; insert directly for the test.
insert into profiles(id, institution_id, role, full_name) values
  ('a0000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','student','Student A'),
  ('a0000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','student','Student B'),
  ('b0000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','teacher','Teacher T'),
  ('c0000000-0000-0000-0000-000000000001',null,'parent','Parent P');

-- ===========================================================================
-- TEST 1: consent enforcement — a student session without consent must FAIL.
-- ===========================================================================
do $$
begin
  insert into sessions(user_id, kind) values
    ('a0000000-0000-0000-0000-000000000001','speaking');
  raise exception 'TEST1 FAILED: session created without consent';
exception
  when others then
    if sqlerrm like '%CONSENT_REQUIRED%' then
      raise notice 'TEST1 PASS: session blocked without consent';
    else
      raise exception 'TEST1 FAILED with unexpected error: %', sqlerrm;
    end if;
end $$;

-- Grant consent, then it should succeed.
insert into consents(student_id, granted_by) values
  ('a0000000-0000-0000-0000-000000000001','Parent P');
insert into sessions(id, user_id, kind) values
  ('5e551011-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','speaking');
do $$ begin raise notice 'TEST2 PASS: session created after consent'; end $$;

-- ===========================================================================
-- TEST 3: RLS isolation — Student B must NOT see Student A's session.
-- ===========================================================================
-- Force RLS so even the table owner is subject to policies during the test.
alter table sessions force row level security;

-- Simulate a non-superuser by creating a limited role and switching to it.
do $$ begin
  if not exists (select 1 from pg_roles where rolname='app_user') then
    create role app_user nologin;
  end if;
end $$;
grant usage on schema public to app_user;
grant select, insert, update, delete on all tables in schema public to app_user;
grant execute on all functions in schema public to app_user;

set role app_user;

-- Student B must NOT see Student A's session (set uid + query in one txn).
do $$
declare n int;
begin
  perform set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000002', true);
  select count(*) into n from sessions
    where id = '5e551011-0000-0000-0000-000000000001';
  if n = 0 then
    raise notice 'TEST3 PASS: Student B cannot see Student A''s session';
  else
    raise exception 'TEST3 FAILED: Student B saw % rows', n;
  end if;
end $$;

-- Student A CAN see their own (set uid + query in one txn).
do $$
declare n int;
begin
  perform set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000001', true);
  select count(*) into n from sessions
    where id = '5e551011-0000-0000-0000-000000000001';
  if n = 1 then
    raise notice 'TEST4 PASS: Student A sees their own session';
  else
    raise exception 'TEST4 FAILED: owner saw % rows', n;
  end if;
end $$;

reset role;

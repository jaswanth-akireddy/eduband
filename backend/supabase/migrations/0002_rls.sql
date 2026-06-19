-- Row-Level Security: deny-by-default, role-scoped access.
-- Enabling RLS with no policy = no access. We then grant the minimum needed.

alter table institutions       enable row level security;
alter table classes            enable row level security;
alter table profiles           enable row level security;
alter table enrollments        enable row level security;
alter table parent_links       enable row level security;
alter table consents           enable row level security;
alter table sessions           enable row level security;
alter table transcripts        enable row level security;
alter table analyses           enable row level security;
alter table teaching_materials enable row level security;
alter table teaching_coverage  enable row level security;
alter table devices            enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
-- A user can read & update their own profile.
create policy profiles_self_select on profiles
  for select using (id = auth.uid());
create policy profiles_self_update on profiles
  for update using (id = auth.uid());
create policy profiles_self_insert on profiles
  for insert with check (id = auth.uid());

-- Teachers/admins can read profiles within their own institution.
create policy profiles_inst_select on profiles
  for select using (
    current_role_of(auth.uid()) in ('teacher','admin')
    and institution_id = current_institution_of(auth.uid())
  );

-- Parents can read the profile of a linked, consented child.
create policy profiles_parent_select on profiles
  for select using (
    exists (
      select 1 from parent_links pl
      where pl.parent_id = auth.uid()
        and pl.student_id = profiles.id
        and pl.status = 'granted'
    )
  );

-- ---------------------------------------------------------------------------
-- institutions & classes (read within own institution)
-- ---------------------------------------------------------------------------
create policy institutions_member_select on institutions
  for select using (id = current_institution_of(auth.uid()));

create policy classes_member_select on classes
  for select using (institution_id = current_institution_of(auth.uid()));

-- Teachers/admins manage classes in their institution.
create policy classes_staff_write on classes
  for all using (
    current_role_of(auth.uid()) in ('teacher','admin')
    and institution_id = current_institution_of(auth.uid())
  ) with check (
    current_role_of(auth.uid()) in ('teacher','admin')
    and institution_id = current_institution_of(auth.uid())
  );

-- ---------------------------------------------------------------------------
-- enrollments
-- ---------------------------------------------------------------------------
create policy enrollments_student_select on enrollments
  for select using (student_id = auth.uid());
create policy enrollments_staff_all on enrollments
  for all using (
    current_role_of(auth.uid()) in ('teacher','admin')
    and exists (
      select 1 from classes c
      where c.id = enrollments.class_id
        and c.institution_id = current_institution_of(auth.uid())
    )
  ) with check (
    current_role_of(auth.uid()) in ('teacher','admin')
  );

-- ---------------------------------------------------------------------------
-- parent_links
-- ---------------------------------------------------------------------------
create policy parent_links_self on parent_links
  for select using (parent_id = auth.uid() or student_id = auth.uid());
create policy parent_links_admin on parent_links
  for all using (current_role_of(auth.uid()) = 'admin')
  with check (current_role_of(auth.uid()) = 'admin');

-- ---------------------------------------------------------------------------
-- consents
-- ---------------------------------------------------------------------------
-- Student (or their linked parent) can see their consent; parent/admin can write.
create policy consents_view on consents
  for select using (
    student_id = auth.uid()
    or exists (
      select 1 from parent_links pl
      where pl.parent_id = auth.uid() and pl.student_id = consents.student_id
    )
    or current_role_of(auth.uid()) = 'admin'
  );
create policy consents_write on consents
  for insert with check (
    exists (
      select 1 from parent_links pl
      where pl.parent_id = auth.uid() and pl.student_id = consents.student_id
    )
    or current_role_of(auth.uid()) = 'admin'
  );
create policy consents_revoke on consents
  for update using (
    exists (
      select 1 from parent_links pl
      where pl.parent_id = auth.uid() and pl.student_id = consents.student_id
    )
    or current_role_of(auth.uid()) = 'admin'
  );

-- ---------------------------------------------------------------------------
-- sessions  (owner full access; staff read within institution; parent read child)
-- ---------------------------------------------------------------------------
create policy sessions_owner_all on sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy sessions_staff_select on sessions
  for select using (
    current_role_of(auth.uid()) in ('teacher','admin')
    and exists (
      select 1 from profiles p
      where p.id = sessions.user_id
        and p.institution_id = current_institution_of(auth.uid())
    )
  );

create policy sessions_parent_select on sessions
  for select using (
    exists (
      select 1 from parent_links pl
      where pl.parent_id = auth.uid()
        and pl.student_id = sessions.user_id
        and pl.status = 'granted'
    )
  );

-- ---------------------------------------------------------------------------
-- transcripts / analyses / teaching_* — inherit access from their session
-- ---------------------------------------------------------------------------
create or replace function can_read_session(sid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from sessions s where s.id = sid and (
      s.user_id = auth.uid()
      or (current_role_of(auth.uid()) in ('teacher','admin')
          and exists (select 1 from profiles p where p.id = s.user_id
                      and p.institution_id = current_institution_of(auth.uid())))
      or exists (select 1 from parent_links pl where pl.parent_id = auth.uid()
                 and pl.student_id = s.user_id and pl.status = 'granted')
    )
  )
$$;

create or replace function owns_session(sid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from sessions s where s.id = sid and s.user_id = auth.uid())
$$;

create policy transcripts_read on transcripts for select using (can_read_session(session_id));
create policy transcripts_write on transcripts for all using (owns_session(session_id)) with check (owns_session(session_id));

create policy analyses_read on analyses for select using (can_read_session(session_id));
create policy analyses_write on analyses for all using (owns_session(session_id)) with check (owns_session(session_id));

create policy tmaterials_read on teaching_materials for select using (can_read_session(session_id));
create policy tmaterials_write on teaching_materials for all using (owns_session(session_id)) with check (owns_session(session_id));

create policy tcoverage_read on teaching_coverage for select using (can_read_session(session_id));
create policy tcoverage_write on teaching_coverage for all using (owns_session(session_id)) with check (owns_session(session_id));

-- ---------------------------------------------------------------------------
-- devices (owner only)
-- ---------------------------------------------------------------------------
create policy devices_owner_all on devices
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

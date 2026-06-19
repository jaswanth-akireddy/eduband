-- EduBand schema — core tables, types, indexes.
-- All timestamps are UTC. All ids are uuid. Money/PII minimised by design.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type user_role     as enum ('student','teacher','parent','professional','admin');
create type level_band    as enum ('middle','high','college','professional');
create type session_kind  as enum ('speaking','teaching','labday','professional');
create type session_status as enum ('uploaded','processing','complete','failed');
create type consent_status as enum ('granted','revoked','pending');

-- ---------------------------------------------------------------------------
-- Institutions & classes
-- ---------------------------------------------------------------------------
create table institutions (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  type          text not null default 'school',     -- school | college | org
  region        text not null default 'IN',
  data_residency text not null default 'IN',
  created_at    timestamptz not null default now()
);

create table classes (
  id             uuid primary key default gen_random_uuid(),
  institution_id uuid not null references institutions(id) on delete cascade,
  name           text not null,
  level          level_band not null default 'high',
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Users (profile rows linked to auth.users)
-- ---------------------------------------------------------------------------
create table profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  institution_id uuid references institutions(id) on delete set null,
  role           user_role not null,
  full_name      text not null,
  level          level_band not null default 'high',
  language       text not null default 'English',
  created_at     timestamptz not null default now()
);

-- student <-> class enrolments
create table enrollments (
  student_id uuid not null references profiles(id) on delete cascade,
  class_id   uuid not null references classes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (student_id, class_id)
);

-- parent <-> child links (consent-gated)
create table parent_links (
  parent_id     uuid not null references profiles(id) on delete cascade,
  student_id    uuid not null references profiles(id) on delete cascade,
  relationship  text not null default 'parent',
  status        consent_status not null default 'pending',
  created_at    timestamptz not null default now(),
  primary key (parent_id, student_id)
);

-- ---------------------------------------------------------------------------
-- Consent (recording of a student is blocked without an active record)
-- ---------------------------------------------------------------------------
create table consents (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references profiles(id) on delete cascade,
  granted_by  text not null,                 -- guardian name
  relationship text not null default 'parent',
  status      consent_status not null default 'granted',
  granted_at  timestamptz not null default now(),
  revoked_at  timestamptz
);
create index on consents (student_id, status);

-- ---------------------------------------------------------------------------
-- Sessions, transcripts, analyses
-- ---------------------------------------------------------------------------
create table sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  kind         session_kind not null default 'speaking',
  task_id      text,
  task_prompt  text,
  audio_path   text,                          -- storage path; null if not retained
  duration_sec numeric not null default 0,
  status       session_status not null default 'uploaded',
  created_at   timestamptz not null default now()
);
create index on sessions (user_id, created_at desc);

create table transcripts (
  session_id   uuid primary key references sessions(id) on delete cascade,
  text         text not null default '',
  words_json   jsonb not null default '[]',
  diarization_json jsonb,
  created_at   timestamptz not null default now()
);

create table analyses (
  session_id        uuid primary key references sessions(id) on delete cascade,
  ci_score          int not null,
  pillar_scores_json jsonb not null,
  tips_json         jsonb not null default '[]',
  evidence_json     jsonb not null default '[]',
  model_version     text not null,
  framework_version text not null,
  created_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Teaching analysis (content/pedagogy on top of delivery)
-- ---------------------------------------------------------------------------
create table teaching_materials (
  id                  uuid primary key default gen_random_uuid(),
  session_id          uuid not null references sessions(id) on delete cascade,
  name                text not null,
  file_path           text,
  planned_topics_json jsonb not null default '[]',
  created_at          timestamptz not null default now()
);

create table teaching_coverage (
  session_id        uuid primary key references sessions(id) on delete cascade,
  covered_json      jsonb not null default '[]',
  missed_json       jsonb not null default '[]',
  rushed_json       jsonb not null default '[]',
  next_plan_json    jsonb not null default '[]',
  coverage_pct      int not null default 0,
  created_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Wearable devices (Language Lab band — shared by students & teachers)
-- ---------------------------------------------------------------------------
create table devices (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid references profiles(id) on delete set null,
  type        text not null default 'wearable',
  paired_at   timestamptz,
  last_sync   timestamptz,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helper: current user's role / institution (used by RLS)
-- ---------------------------------------------------------------------------
create or replace function current_role_of(uid uuid)
returns user_role language sql stable security definer set search_path = public as $$
  select role from profiles where id = uid
$$;

create or replace function current_institution_of(uid uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select institution_id from profiles where id = uid
$$;

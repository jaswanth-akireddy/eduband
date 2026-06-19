-- Local-only stubs to emulate the Supabase-managed schemas so we can validate
-- our migrations against a plain Postgres. NOT part of the real deployment
-- (Supabase provides auth.*, storage.*, and auth.uid() in production).

create schema if not exists auth;
create schema if not exists storage;

-- auth.users (minimal)
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text
);

-- auth.uid() returns the current request's user; stubbed to a GUC we can set.
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

-- storage.buckets / storage.objects (minimal)
create table if not exists storage.buckets (
  id text primary key, name text, public boolean default false
);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text
);
-- storage.foldername(name) -> text[] of path segments (Supabase helper)
create or replace function storage.foldername(name text)
returns text[] language sql immutable as $$
  select string_to_array(name, '/')
$$;

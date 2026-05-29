-- Crypto Signal Dashboard SaaS: Supabase Postgres + Row-Level Security
-- Phase 1: Auth module schema

create type user_tier as enum ('free', 'pro', 'pro_plus');

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  picture text,
  tier user_tier not null default 'free',
  disclaimer_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists users_email_idx on users(email);

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_users_updated on users;
create trigger trg_users_updated
before update on users
for each row execute function set_updated_at();

-- RLS policies
alter table users enable row level security;

drop policy if exists users_self_select on users;
create policy users_self_select on users
  for select using (auth.uid() = id);

drop policy if exists users_self_update on users;
create policy users_self_update on users
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Audit log table (PIPA 3년 보관)
create table if not exists auth_audit_log (
  id bigserial primary key,
  user_id uuid references users(id) on delete set null,
  event text not null,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_user_idx on auth_audit_log(user_id, created_at desc);
create index if not exists audit_log_retention_idx on auth_audit_log(created_at);

-- PIPA 3년 보관 자동 정리 (cron job 또는 Supabase Edge Function 호출용)
create or replace function purge_old_audit_logs() returns void
language sql as $$
  delete from auth_audit_log where created_at < now() - interval '3 years';
$$;

alter table auth_audit_log enable row level security;

drop policy if exists audit_self_select on auth_audit_log;
create policy audit_self_select on auth_audit_log
  for select using (auth.uid() = user_id);

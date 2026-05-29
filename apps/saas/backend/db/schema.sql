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

-- Subscription module schema (Phase 1, 2026-05-29)

create type subscription_status as enum (
  'trialing', 'active', 'past_due', 'canceled', 'expired'
);

create type payment_provider as enum ('toss', 'stripe');

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  provider payment_provider not null,
  provider_subscription_id text not null,
  tier user_tier not null,
  status subscription_status not null default 'trialing',
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_subscription_id)
);

create index if not exists subscriptions_user_idx
  on subscriptions(user_id, status);

drop trigger if exists trg_subscriptions_updated on subscriptions;
create trigger trg_subscriptions_updated
before update on subscriptions
for each row execute function set_updated_at();

alter table subscriptions enable row level security;

drop policy if exists subscriptions_self_select on subscriptions;
create policy subscriptions_self_select on subscriptions
  for select using (auth.uid() = user_id);

-- Payment webhook events (Toss·Stripe 멱등성 보장)
create table if not exists payment_events (
  id uuid primary key default gen_random_uuid(),
  provider payment_provider not null,
  provider_event_id text not null,
  event_type text not null,
  user_id uuid references users(id) on delete set null,
  subscription_id uuid references subscriptions(id) on delete set null,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create index if not exists payment_events_user_idx
  on payment_events(user_id, created_at desc);
create index if not exists payment_events_unprocessed_idx
  on payment_events(processed_at) where processed_at is null;

alter table payment_events enable row level security;

drop policy if exists payment_events_self_select on payment_events;
create policy payment_events_self_select on payment_events
  for select using (auth.uid() = user_id);

-- Signal module schema (Phase 1 placeholder, Phase 2에서 채움)
create type signal_kind as enum ('buy', 'sell', 'hold');

create table if not exists signals (
  id uuid primary key default gen_random_uuid(),
  coin text not null,
  signal_type signal_kind not null,
  rsi_daily numeric,
  rsi_weekly numeric,
  ma_50 numeric,
  ma_200 numeric,
  source_lag_days integer not null default 0,
  computed_at timestamptz not null default now()
);

create index if not exists signals_coin_idx on signals(coin, computed_at desc);

-- Brief module schema (Phase 1 placeholder)
create table if not exists briefs (
  id uuid primary key default gen_random_uuid(),
  generated_for_date date not null,
  language text not null default 'ko',
  content_markdown text not null,
  sources jsonb not null default '[]'::jsonb,
  confidence_score numeric,
  created_at timestamptz not null default now(),
  unique (generated_for_date, language)
);

create index if not exists briefs_date_idx on briefs(generated_for_date desc);

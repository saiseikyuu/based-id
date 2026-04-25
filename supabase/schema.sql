-- Based ID — Drops Portal Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── drops ───────────────────────────────────────────────────────────────────
create type drop_type   as enum ('whitelist', 'raffle', 'token_drop', 'nft_mint');
create type drop_tier   as enum ('standard', 'featured');
create type drop_status as enum ('pending_payment', 'active', 'ended', 'drawn', 'cancelled');

create table drops (
  id               uuid primary key default uuid_generate_v4(),
  partner_address  text not null,
  title            text not null,
  description      text not null default '',
  image_url        text,
  type             drop_type   not null default 'raffle',
  tier             drop_tier   not null default 'standard',
  fee_amount_usdc  numeric     not null default 50,
  fee_paid_tx      text,
  prize_details    jsonb       not null default '{}',
  winner_count     int         not null default 1,
  starts_at        timestamptz not null default now(),
  ends_at          timestamptz not null,
  status           drop_status not null default 'pending_payment',
  winners          text[]      not null default '{}',
  created_at       timestamptz not null default now()
);

create index drops_status_idx   on drops (status);
create index drops_partner_idx  on drops (partner_address);
create index drops_ends_at_idx  on drops (ends_at);

-- ─── tasks ───────────────────────────────────────────────────────────────────
create type task_type as enum (
  'follow_x', 'join_discord', 'hold_nft', 'hold_based_id', 'min_hunter_rank'
);

create table tasks (
  id       uuid primary key default uuid_generate_v4(),
  drop_id  uuid not null references drops(id) on delete cascade,
  type     task_type not null,
  params   jsonb not null default '{}'
);

create index tasks_drop_idx on tasks (drop_id);

-- ─── entries ─────────────────────────────────────────────────────────────────
create type entry_status as enum ('entered', 'disqualified', 'won', 'lost');

create table entries (
  id             uuid primary key default uuid_generate_v4(),
  drop_id        uuid not null references drops(id) on delete cascade,
  wallet_address text not null,
  status         entry_status not null default 'entered',
  created_at     timestamptz  not null default now(),
  unique (drop_id, wallet_address)
);

create index entries_drop_idx    on entries (drop_id);
create index entries_wallet_idx  on entries (wallet_address);

-- ─── task_completions ────────────────────────────────────────────────────────
create type verify_method as enum ('self_attest', 'onchain');

create table task_completions (
  id          uuid primary key default uuid_generate_v4(),
  entry_id    uuid not null references entries(id) on delete cascade,
  task_id     uuid not null references tasks(id)   on delete cascade,
  verified_at timestamptz  not null default now(),
  method      verify_method not null default 'self_attest',
  unique (entry_id, task_id)
);

create index tc_entry_idx on task_completions (entry_id);

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- Public can read active/ended/drawn drops
alter table drops enable row level security;
create policy "drops_public_read" on drops
  for select using (status in ('active', 'ended', 'drawn'));
create policy "drops_service_all" on drops
  for all using (true) with check (true);

-- Public can read tasks for visible drops
alter table tasks enable row level security;
create policy "tasks_public_read" on tasks
  for select using (
    exists (select 1 from drops d where d.id = drop_id and d.status in ('active','ended','drawn'))
  );
create policy "tasks_service_all" on tasks
  for all using (true) with check (true);

-- Entries: service key only (read/write via API routes)
alter table entries enable row level security;
create policy "entries_service_all" on entries
  for all using (true) with check (true);

alter table task_completions enable row level security;
create policy "tc_service_all" on task_completions
  for all using (true) with check (true);

-- ─── projects ─────────────────────────────────────────────────────────────────
-- Run this block if you already applied the initial schema above
create table if not exists projects (
  address      text primary key,           -- partner wallet address (lowercase)
  name         text not null default '',
  description  text not null default '',
  logo_url     text,
  website      text,
  twitter      text,
  discord      text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table projects enable row level security;
create policy "projects_public_read" on projects for select using (true);
create policy "projects_service_all" on projects for all using (true) with check (true);

-- ─── Supabase Storage bucket ──────────────────────────────────────────────────
-- Run this in Storage → New bucket → name: drop-images → Public: ON
-- OR run via SQL:
insert into storage.buckets (id, name, public)
values ('drop-images', 'drop-images', true)
on conflict (id) do nothing;

create policy "drop_images_public_read" on storage.objects
  for select using (bucket_id = 'drop-images');
create policy "drop_images_authenticated_upload" on storage.objects
  for insert with check (bucket_id = 'drop-images');

-- ─── Add banner_url to projects (run if projects table already exists) ────────
alter table projects add column if not exists banner_url text;

-- ─── Add email to projects (for winner notification emails) ──────────────────
alter table projects add column if not exists email text;

-- ─── Twitter OAuth verifications ──────────────────────────────────────────────
-- Stores confirmed follows (wallet verified they follow a Twitter handle)
create table if not exists twitter_verifications (
  id              uuid primary key default uuid_generate_v4(),
  wallet_address  text not null,
  twitter_handle  text not null,           -- lowercase, no @
  twitter_user_id text,
  verified_at     timestamptz not null default now(),
  unique (wallet_address, twitter_handle)
);
alter table twitter_verifications enable row level security;
create policy "tv_service_all" on twitter_verifications for all using (true) with check (true);

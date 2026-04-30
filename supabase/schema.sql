-- Based ID — Drops Portal Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── campaigns ────────────────────────────────────────────────────────────────
create type campaign_type   as enum ('whitelist', 'raffle', 'token_drop', 'nft_mint', 'quest');
create type drop_tier       as enum ('standard', 'featured');
create type campaign_status as enum ('pending_payment', 'pending_review', 'active', 'ended', 'drawn', 'completed', 'cancelled');

create table campaigns (
  id               uuid primary key default uuid_generate_v4(),
  partner_address  text not null,
  title            text not null,
  description      text not null default '',
  image_url        text,
  type             campaign_type   not null default 'raffle',
  tier             drop_tier       not null default 'standard',
  fee_amount_usdc  numeric         not null default 50,
  fee_paid_tx      text,
  prize_details    jsonb           not null default '{}',
  winner_count     int             not null default 1,
  xp_reward        int             not null default 0,
  starts_at        timestamptz     not null default now(),
  ends_at          timestamptz     not null,
  status           campaign_status not null default 'active',
  winners          text[]          not null default '{}',
  created_at       timestamptz     not null default now()
);

create index campaigns_status_idx   on campaigns (status);
create index campaigns_partner_idx  on campaigns (partner_address);
create index campaigns_ends_at_idx  on campaigns (ends_at);

-- ─── tasks ───────────────────────────────────────────────────────────────────
create type task_type as enum (
  'follow_x', 'hold_nft', 'hold_based_id', 'min_hunter_rank'
);

create table tasks (
  id           uuid primary key default uuid_generate_v4(),
  campaign_id  uuid not null references campaigns(id) on delete cascade,
  type         task_type not null,
  params       jsonb not null default '{}'
);

create index tasks_campaign_idx on tasks (campaign_id);

-- ─── entries ─────────────────────────────────────────────────────────────────
create type entry_status as enum ('entered', 'disqualified', 'won', 'lost');

create table entries (
  id             uuid primary key default uuid_generate_v4(),
  campaign_id    uuid not null references campaigns(id) on delete cascade,
  wallet_address text not null,
  status         entry_status not null default 'entered',
  created_at     timestamptz  not null default now(),
  unique (campaign_id, wallet_address)
);

create index entries_campaign_idx  on entries (campaign_id);
create index entries_wallet_idx    on entries (wallet_address);

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
-- Public can read active/ended/drawn/completed campaigns
alter table campaigns enable row level security;
create policy "campaigns_public_read" on campaigns
  for select using (status in ('active', 'ended', 'drawn', 'completed'));
create policy "campaigns_service_all" on campaigns
  for all using (true) with check (true);

-- Public can read tasks for visible campaigns
alter table tasks enable row level security;
create policy "tasks_public_read" on tasks
  for select using (
    exists (select 1 from campaigns c where c.id = campaign_id and c.status in ('active','ended','drawn','completed'))
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

-- ─── Hunter XP ────────────────────────────────────────────────────────────────
-- Tracks XP from all sources per wallet. One row per wallet.
create table if not exists hunter_xp (
  id               uuid        primary key default uuid_generate_v4(),
  wallet_address   text        not null unique,
  total_xp         int         not null default 0,
  entries_xp       int         not null default 0,   -- 10 XP per drop entered
  wins_xp          int         not null default 0,   -- 50 XP per drop won
  checkin_xp       int         not null default 0,   -- 5 XP/day + streak bonuses
  quest_xp         int         not null default 0,
  last_checkin_at  timestamptz,
  checkin_streak   int         not null default 0,
  updated_at       timestamptz not null default now()
);
alter table hunter_xp enable row level security;
create policy "hxp_service_all" on hunter_xp for all using (true) with check (true);

-- ─── quest_completions ────────────────────────────────────────────────────────
create table quest_completions (
  id             uuid primary key default uuid_generate_v4(),
  wallet_address text        not null,
  quest_id       text        not null,
  earned_xp      int         not null default 0,
  period         text        not null, -- "once" for milestones, "YYYY-MM-DD" for daily
  created_at     timestamptz not null default now(),
  unique (wallet_address, quest_id, period)
);

create index qc_wallet_idx on quest_completions (wallet_address);

-- ─── campaign_claims ──────────────────────────────────────────────────────────
create table campaign_claims (
  id             uuid primary key default uuid_generate_v4(),
  campaign_id    uuid        not null references campaigns(id) on delete cascade,
  wallet_address text        not null,
  xp_earned      int         not null default 0,
  claimed_at     timestamptz not null default now(),
  unique (campaign_id, wallet_address)
);

create index cc_campaign_idx on campaign_claims (campaign_id);
create index cc_wallet_idx   on campaign_claims (wallet_address);

-- ─── Phase 1 Completion Migrations ───────────────────────────────────────────
-- Run each block in Supabase Dashboard → SQL Editor → New query → Run

-- 1. Extend campaign_type enum
ALTER TYPE campaign_type ADD VALUE IF NOT EXISTS 'bounty';
ALTER TYPE campaign_type ADD VALUE IF NOT EXISTS 'creator_campaign';

-- 2. Reputation score columns on hunter_xp
ALTER TABLE hunter_xp
  ADD COLUMN IF NOT EXISTS reputation_score     int  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reputation_breakdown jsonb NOT NULL DEFAULT '{}';

-- 3. Bounty submissions table
CREATE TABLE IF NOT EXISTS bounty_submissions (
  id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id     uuid        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  wallet_address  text        NOT NULL,
  content_url     text,
  submission_text text,
  status          text        NOT NULL DEFAULT 'pending',
  reviewer_notes  text,
  xp_awarded      int         NOT NULL DEFAULT 0,
  paid_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bounty_submissions_status_check CHECK (status IN ('pending','approved','rejected'))
);
CREATE INDEX IF NOT EXISTS bs_campaign_idx ON bounty_submissions (campaign_id);
CREATE INDEX IF NOT EXISTS bs_wallet_idx   ON bounty_submissions (wallet_address);
ALTER TABLE bounty_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bs_service_all" ON bounty_submissions FOR ALL USING (true) WITH CHECK (true);

-- 4. Hunter profiles table (skills, availability, region for Talents phase)
CREATE TABLE IF NOT EXISTS hunter_profiles (
  wallet_address  text        PRIMARY KEY,
  skills          text[]      NOT NULL DEFAULT '{}',
  availability    text        NOT NULL DEFAULT 'not_looking',
  region          text,
  timezone        text,
  portfolio_links text[]      NOT NULL DEFAULT '{}',
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hp_availability_check CHECK (availability IN ('available','open_to_offers','not_looking'))
);
ALTER TABLE hunter_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hp_public_read" ON hunter_profiles FOR SELECT USING (true);
CREATE POLICY "hp_service_all" ON hunter_profiles FOR ALL USING (true) WITH CHECK (true);

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

-- ─── Phase 2A Migrations ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS squads (
  id            uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          text        NOT NULL UNIQUE,
  slug          text        NOT NULL UNIQUE,
  description   text,
  logo_url      text,
  region        text,
  type          text        NOT NULL DEFAULT 'general',
  owner_wallet  text        NOT NULL,
  total_xp      int         NOT NULL DEFAULT 0,
  member_count  int         NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT squads_type_check CHECK (type IN ('general','regional','skill','project'))
);
CREATE INDEX IF NOT EXISTS squads_owner_idx  ON squads (owner_wallet);
CREATE INDEX IF NOT EXISTS squads_region_idx ON squads (region);
ALTER TABLE squads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "squads_public_read" ON squads FOR SELECT USING (true);
CREATE POLICY "squads_service_all" ON squads FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS squad_members (
  squad_id        uuid        NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
  wallet_address  text        NOT NULL,
  role            text        NOT NULL DEFAULT 'member',
  contribution_xp int         NOT NULL DEFAULT 0,
  joined_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (squad_id, wallet_address),
  CONSTRAINT sm_role_check CHECK (role IN ('owner','officer','member'))
);
CREATE INDEX IF NOT EXISTS sm_wallet_idx ON squad_members (wallet_address);
ALTER TABLE squad_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sm_public_read" ON squad_members FOR SELECT USING (true);
CREATE POLICY "sm_service_all" ON squad_members FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS badges (
  id             uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           text        NOT NULL UNIQUE,
  description    text,
  image_url      text,
  criteria_type  text        NOT NULL,
  criteria_value int         NOT NULL DEFAULT 1,
  soulbound      boolean     NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "badges_public_read" ON badges FOR SELECT USING (true);
CREATE POLICY "badges_service_all" ON badges FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS hunter_badges (
  id             uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address text        NOT NULL,
  badge_id       uuid        NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (wallet_address, badge_id)
);
CREATE INDEX IF NOT EXISTS hb_wallet_idx ON hunter_badges (wallet_address);
ALTER TABLE hunter_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hb_public_read" ON hunter_badges FOR SELECT USING (true);
CREATE POLICY "hb_service_all" ON hunter_badges FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION increment_squad_xp(squad_id_param uuid, amount int)
RETURNS void LANGUAGE sql AS $$
  UPDATE squads SET total_xp = total_xp + amount WHERE id = squad_id_param;
$$;

-- ─── Phase 2B Migrations ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meme_wars (
  id               uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_war_id  int,
  contract_address text,
  creator_wallet   text        NOT NULL,
  title            text        NOT NULL,
  theme            text,
  prize_pool_usdc  numeric     NOT NULL,
  vote_cost_usdc   numeric     NOT NULL DEFAULT 0.10,
  starts_at        timestamptz NOT NULL DEFAULT now(),
  ends_at          timestamptz NOT NULL,
  status           text        NOT NULL DEFAULT 'active',
  winner_entry_id  uuid,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mw_status_check CHECK (status IN ('active','ended','settled','cancelled'))
);
CREATE INDEX IF NOT EXISTS mw_status_idx ON meme_wars (status);
ALTER TABLE meme_wars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mw_public_read" ON meme_wars FOR SELECT USING (true);
CREATE POLICY "mw_service_all" ON meme_wars FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS meme_entries (
  id            uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  meme_war_id   uuid        NOT NULL REFERENCES meme_wars(id) ON DELETE CASCADE,
  on_chain_id   int         NOT NULL,
  hunter_wallet text        NOT NULL,
  media_url     text        NOT NULL,
  caption       text,
  vote_count    int         NOT NULL DEFAULT 0,
  support_amt   numeric     NOT NULL DEFAULT 0,
  rank          int,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (meme_war_id, hunter_wallet),
  UNIQUE (meme_war_id, on_chain_id)
);
CREATE INDEX IF NOT EXISTS me_war_idx ON meme_entries (meme_war_id);
ALTER TABLE meme_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "me_public_read" ON meme_entries FOR SELECT USING (true);
CREATE POLICY "me_service_all" ON meme_entries FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS meme_votes (
  id           uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id     uuid        NOT NULL REFERENCES meme_entries(id) ON DELETE CASCADE,
  voter_wallet text        NOT NULL,
  vote_count   int         NOT NULL,
  amount_paid  numeric     NOT NULL,
  tx_hash      text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mv_entry_idx ON meme_votes (entry_id);
ALTER TABLE meme_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mv_public_read" ON meme_votes FOR SELECT USING (true);
CREATE POLICY "mv_service_all" ON meme_votes FOR ALL USING (true) WITH CHECK (true);

-- ─── Phase 3 Migrations ──────────────────────────────────────────────────────
ALTER TYPE task_type ADD VALUE IF NOT EXISTS 'min_reputation_score';

CREATE TABLE IF NOT EXISTS project_shortlists (
  project_address  text        NOT NULL,
  wallet_address   text        NOT NULL,
  note             text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_address, wallet_address)
);
ALTER TABLE project_shortlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "psl_service_all" ON project_shortlists FOR ALL USING (true) WITH CHECK (true);

-- Phase 4: Public read on hunter_xp (for Farcaster frames using anon key)
CREATE POLICY IF NOT EXISTS "hxp_public_read" ON hunter_xp FOR SELECT USING (true);

-- Phase 4: Featured campaigns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS campaigns_featured_idx ON campaigns (featured) WHERE featured = true;

import { createClient } from "@supabase/supabase-js";

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const svc  = process.env.SUPABASE_SERVICE_KEY ?? "";

// Browser client — uses anon key, respects Row Level Security
export function createBrowserClient() {
  return createClient(url, anon);
}

// Server client — uses service key, bypasses RLS (for API routes only)
export function createServerClient() {
  return createClient(url, svc);
}

export type CampaignType   = "whitelist" | "raffle" | "token_drop" | "nft_mint" | "quest" | "bounty" | "creator_campaign";
export type DropTier       = "standard"  | "featured";
export type CampaignStatus = "pending_payment" | "pending_review" | "active" | "ended" | "drawn" | "completed" | "cancelled";
export type EntryStatus    = "entered" | "disqualified" | "won" | "lost";
export type TaskType       = "follow_x" | "hold_nft" | "hold_based_id" | "min_hunter_rank";
export type VerifyMethod   = "self_attest" | "onchain";

export interface Campaign {
  id: string;
  partner_address: string;
  title: string;
  description: string;
  image_url: string | null;
  type: CampaignType;
  tier: DropTier;
  fee_amount_usdc: number;
  fee_paid_tx: string | null;
  prize_details: Record<string, unknown>;
  winner_count: number;
  xp_reward: number;
  starts_at: string;
  ends_at: string;
  status: CampaignStatus;
  winners: string[];
  created_at: string;
  tasks?: Task[];
  project?: Project | null;
  entry_count?: number;
}

export interface Task {
  id: string;
  campaign_id: string;
  type: TaskType;
  params: Record<string, unknown>; // {handle:"basedidofficial"} or {contract:"0x...",minCount:1}
}

export interface Entry {
  id: string;
  campaign_id: string;
  wallet_address: string;
  status: EntryStatus;
  created_at: string;
  task_completions?: TaskCompletion[];
}

export interface Project {
  address: string;
  name: string;
  description: string;
  logo_url: string | null;
  banner_url: string | null;
  website: string | null;
  twitter: string | null;
  discord: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskCompletion {
  id: string;
  entry_id: string;
  task_id: string;
  verified_at: string;
  method: VerifyMethod;
}

export interface QuestCompletion {
  id: string;
  wallet_address: string;
  quest_id: string;
  earned_xp: number;
  period: string;
  created_at: string;
}

export interface CampaignClaim {
  id: string;
  campaign_id: string;
  wallet_address: string;
  xp_earned: number;
  claimed_at: string;
}

export interface BountySubmission {
  id: string;
  campaign_id: string;
  wallet_address: string;
  content_url: string | null;
  submission_text: string | null;
  status: "pending" | "approved" | "rejected";
  reviewer_notes: string | null;
  xp_awarded: number;
  paid_at: string | null;
  created_at: string;
}

export interface HunterProfile {
  wallet_address: string;
  skills: string[];
  availability: "available" | "open_to_offers" | "not_looking";
  region: string | null;
  timezone: string | null;
  portfolio_links: string[];
  updated_at: string;
}

export interface HunterXP {
  id: string;
  wallet_address: string;
  total_xp: number;
  entries_xp: number;
  wins_xp: number;
  checkin_xp: number;
  quest_xp: number;
  reputation_score: number;
  reputation_breakdown: Record<string, number>;
  last_checkin_at: string | null;
  checkin_streak: number;
  updated_at: string;
}

export interface PlatformStats {
  hunters: number;
  campaigns: number;
  total_xp: number;
  rewards_paid: number;
  projects: number;
}

export const HUNTER_SKILLS = [
  "meme_creator", "designer", "writer", "community_mod",
  "ambassador", "developer", "qa_tester", "translator",
  "video_editor", "growth_lead",
] as const;
export type HunterSkill = typeof HUNTER_SKILLS[number];

export const HUNTER_SKILL_LABELS: Record<HunterSkill, string> = {
  meme_creator:  "Meme Creator",
  designer:      "Designer",
  writer:        "Writer",
  community_mod: "Community Mod",
  ambassador:    "Ambassador",
  developer:     "Developer",
  qa_tester:     "QA Tester",
  translator:    "Translator",
  video_editor:  "Video Editor",
  growth_lead:   "Growth Lead",
};

export interface Squad {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  region: string | null;
  type: "general" | "regional" | "skill" | "project";
  owner_wallet: string;
  total_xp: number;
  member_count: number;
  created_at: string;
}

export interface SquadMember {
  squad_id: string;
  wallet_address: string;
  role: "owner" | "officer" | "member";
  contribution_xp: number;
  joined_at: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  criteria_type: string;
  criteria_value: number;
  soulbound: boolean;
  created_at: string;
}

export interface HunterBadge {
  id: string;
  wallet_address: string;
  badge_id: string;
  earned_at: string;
  badge?: Badge;
}

export const BADGE_CRITERIA_LABELS: Record<string, string> = {
  campaign_count: "Campaigns completed",
  streak_days:    "Day streak",
  rank_reached:   "Rank reached",
  squad_role:     "Squad role",
  bounty_count:   "Bounties approved",
};

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

export type DropType     = "whitelist" | "raffle" | "token_drop" | "nft_mint";
export type DropTier     = "standard"  | "featured";
export type DropStatus   = "pending_payment" | "active" | "ended" | "drawn" | "cancelled";
export type EntryStatus  = "entered" | "disqualified" | "won" | "lost";
export type TaskType     = "follow_x" | "join_discord" | "hold_nft" | "hold_based_id" | "min_hunter_rank";
export type VerifyMethod = "self_attest" | "onchain";

export interface Drop {
  id: string;
  partner_address: string;
  title: string;
  description: string;
  image_url: string | null;
  type: DropType;
  tier: DropTier;
  fee_amount_usdc: number;
  fee_paid_tx: string | null;
  prize_details: Record<string, unknown>;
  winner_count: number;
  starts_at: string;
  ends_at: string;
  status: DropStatus;
  winners: string[];
  created_at: string;
  tasks?: Task[];
  project?: Project | null;
  entry_count?: number;
}

export interface Task {
  id: string;
  drop_id: string;
  type: TaskType;
  params: Record<string, unknown>; // {handle:"basedidofficial"} or {contract:"0x...",minCount:1}
}

export interface Entry {
  id: string;
  drop_id: string;
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

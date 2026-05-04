"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { motion, AnimatePresence, useInView, animate } from "motion/react";
import {
  BASED_ID_ADDRESS,
  USDC_ADDRESS,
  MINT_PRICE,
  BASED_ID_ABI,
  ERC20_ABI,
  BASESCAN_URL,
} from "@/lib/contracts";
import { NftCard } from "./NftCard";
import { Nav } from "@/app/components/Nav";
import { createBrowserClient } from "@/lib/supabase";

type MintState = "idle" | "approving" | "approved" | "minting" | "success";

const D: React.CSSProperties = { fontFamily: "var(--font-display), system-ui, sans-serif" };
const ease = [0.16, 1, 0.3, 1] as const;

const PLATFORM_AREAS = [
  {
    label: "Campaigns",
    href: "/campaigns",
    eyebrow: "Quests, raffles, drops",
    body: "High-intent distribution to wallets that have already paid onchain to participate.",
  },
  {
    label: "Meme Wars",
    href: "/meme-wars",
    eyebrow: "Competitive content",
    body: "Paid voting, public rankings, and stronger incentives than generic engagement quests.",
  },
  {
    label: "Squads",
    href: "/squads",
    eyebrow: "Team identity",
    body: "Organize hunters into persistent groups with shared XP, contribution history, and internal momentum.",
  },
  {
    label: "Talents",
    href: "/talents",
    eyebrow: "Verified contributors",
    body: "A cleaner hiring surface for Base projects that want signal beyond follower counts.",
  },
] as const;

const HUNTER_RANKS = [
  { label: "E", color: "#94a3b8", name: "E-Rank Hunter", cls: "E-CLASS", d1: "#1a1c26", d2: "#030508" },
  { label: "D", color: "#a3e635", name: "D-Rank Hunter", cls: "D-CLASS", d1: "#141d09", d2: "#030508" },
  { label: "C", color: "#34d399", name: "C-Rank Hunter", cls: "C-CLASS", d1: "#071a13", d2: "#030508" },
  { label: "B", color: "#60a5fa", name: "B-Rank Hunter", cls: "B-CLASS", d1: "#071528", d2: "#030508" },
  { label: "A", color: "#c084fc", name: "A-Rank Hunter", cls: "A-CLASS", d1: "#160826", d2: "#030508" },
  { label: "S", color: "#f97316", name: "S-Rank Hunter", cls: "S-CLASS", d1: "#1e0d04", d2: "#030508" },
  { label: "N", color: "#fcd34d", name: "National Hunter", cls: "NATIONAL", d1: "#1a1404", d2: "#030508" },
];

const XP_THRESHOLDS = [0, 300, 800, 2000, 5000, 12000, 30000];
const RANK_BADGE_LABELS = ["E", "D", "C", "B", "A", "S", "N"];
const RANK_BADGE_COLORS = ["#94a3b8", "#a3e635", "#34d399", "#60a5fa", "#c084fc", "#f97316", "#fcd34d"];

const FAQ_ITEMS = [
  {
    q: "What is Based ID?",
    a: "A $2 NFT on Base that acts as your permanent platform pass. It unlocks campaigns, Meme Wars, squads, talents, and the hunters rank system.",
  },
  {
    q: "Why does it cost $2?",
    a: "The mint price filters bots and empty wallets. You pay once, hold forever, and keep access without subscriptions or resets.",
  },
  {
    q: "Can I browse without one?",
    a: "Yes. Anyone can browse campaigns and project pages. You need a Based ID to participate, earn XP, and access the full platform loop.",
  },
  {
    q: "What are Based Hunters?",
    a: "Free soulbound Hunter License NFTs for Based ID holders. Your rank rises as you enter campaigns, win raffles, complete bounties, and check in daily.",
  },
  {
    q: "What are Meme Wars?",
    a: "Onchain competitive meme battles with paid voting, ranked entries, XP rewards, and stronger public signal than passive engagement farming.",
  },
  {
    q: "Is the ID tradeable?",
    a: "Yes. Based ID is a standard ERC-721. Only the current holder receives platform access and the attached user journey.",
  },
];

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, delay, ease }}
    >
      {children}
    </motion.div>
  );
}

function AnimatedCounter({
  value,
  prefix = "",
  suffix = "",
}: {
  value: number | null;
  prefix?: string;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const [display, setDisplay] = useState("--");

  useEffect(() => {
    if (!isInView || value === null) return;
    const controls = animate(0, value === 0 ? 0.0001 : value, {
      duration: 1.8,
      ease,
      onUpdate: (v) => setDisplay(prefix + Math.floor(v).toLocaleString() + suffix),
    });
    return controls.stop;
  }, [isInView, prefix, suffix, value]);

  return <span ref={ref}>{display}</span>;
}

function HunterLicenseCard({ rankIdx }: { rankIdx: number }) {
  const r = HUNTER_RANKS[rankIdx];
  const c = r.color;
  const uid = `lp${rankIdx}`;
  const lic = "HA-2026-????";

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 330" className="w-full rounded-xl">
      <defs>
        <linearGradient id={`bg${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={r.d1} />
          <stop offset="100%" stopColor={r.d2} />
        </linearGradient>
        <linearGradient id={`hd${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#090c15" />
          <stop offset="100%" stopColor="#05070d" />
        </linearGradient>
        <radialGradient id={`rb${uid}`} cx="50%" cy="30%" r="75%">
          <stop offset="0%" stopColor={c} stopOpacity="0.32" />
          <stop offset="100%" stopColor={c} stopOpacity="0.05" />
        </radialGradient>
        <linearGradient id={`bt${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#04060d" />
          <stop offset="100%" stopColor="#020409" />
        </linearGradient>
        <filter id={`gf${uid}`}>
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id={`cl${uid}`}>
          <rect width="520" height="330" rx="13" />
        </clipPath>
      </defs>
      <rect width="520" height="330" fill={`url(#bg${uid})`} rx="13" />
      <g clipPath={`url(#cl${uid})`}>
        {[-84, -42, 0, 42, 84, 126, 168, 210].map((x, i) => (
          <line
            key={i}
            x1={x}
            y1="0"
            x2={x + 330}
            y2="330"
            stroke={c}
            strokeWidth="0.4"
            strokeOpacity="0.05"
          />
        ))}
      </g>
      <rect x="0" y="0" width="520" height="52" fill={`url(#hd${uid})`} />
      <rect x="0" y="0" width="520" height="2.5" fill={c} fillOpacity="0.9" />
      <rect x="0" y="51" width="520" height="1" fill={c} fillOpacity="0.15" />
      <text x="28" y="21" fontFamily="system-ui" fontSize="13" fontWeight="700" fill="#fff" opacity="0.95">
        Official Hunter&apos;s License
      </text>
      <text x="28" y="39" fontFamily="system-ui" fontSize="9.5" fill={c} opacity="0.75" letterSpacing="1.5">
        HUNTER LICENSE &gt;&gt;&gt;
      </text>
      <polygon points="18,68 432,68 420,106 18,106" fill={c} fillOpacity="0.9" />
      <polygon points="18,68 432,68 420,106 18,106" fill="#000" fillOpacity="0.15" />
      <text x="28" y="93" fontFamily="system-ui" fontSize="22" fontWeight="900" fill="#fff">
        BASED HUNTERS
      </text>
      <text x="28" y="125" fontFamily="system-ui" fontSize="9.5" letterSpacing="5" fill={c} opacity="0.65">
        BASED ID
      </text>
      <line x1="18" y1="138" x2="390" y2="138" stroke={c} strokeWidth="0.4" strokeOpacity="0.2" />
      <text x="28" y="190" fontFamily="monospace" fontSize="9" letterSpacing="2" fill={c} opacity="0.12">
        {lic}
      </text>
      <rect x="400" y="52" width="120" height="158" fill={`url(#rb${uid})`} />
      <rect x="400" y="52" width="1.5" height="158" fill={c} fillOpacity="0.45" />
      <text x="460" y="138" textAnchor="middle" dominantBaseline="middle" fontFamily="system-ui" fontSize="68" fontWeight="900" fill={c} filter={`url(#gf${uid})`}>
        {r.label}
      </text>
      <rect x="418" y="163" width="84" height="22" rx="3" fill={c} fillOpacity="0.2" stroke={c} strokeWidth="0.8" strokeOpacity="0.6" />
      <text x="460" y="178" textAnchor="middle" fontFamily="system-ui" fontSize="10" fontWeight="800" letterSpacing="3" fill="#fff">
        RANK
      </text>
      <text x="460" y="200" textAnchor="middle" fontFamily="system-ui" fontSize="10" fill={c} opacity="0.85" fontWeight="700">
        {r.cls}
      </text>
      <rect x="0" y="210" width="520" height="120" fill={`url(#bt${uid})`} />
      <rect x="0" y="210" width="520" height="1" fill={c} fillOpacity="0.18" />
      <text x="76" y="228" fontFamily="system-ui" fontSize="8" fill="#475569">Class</text>
      <text x="115" y="228" fontFamily="system-ui" fontSize="8.5" fill={c} fontWeight="700">{r.name}</text>
      <text x="76" y="245" fontFamily="system-ui" fontSize="8" fill="#475569">License</text>
      <text x="115" y="245" fontFamily="monospace" fontSize="8.5" fill="#cbd5e1">{lic}</text>
      <text x="76" y="280" fontFamily="system-ui" fontSize="8" fill="#475569">Issued by</text>
      <text x="120" y="280" fontFamily="system-ui" fontSize="8.5" fill="#94a3b8">Based ID Hunters Association</text>
      <rect x="0.5" y="0.5" width="519" height="329" rx="12.5" fill="none" stroke={c} strokeWidth="0.8" strokeOpacity="0.4" />
    </svg>
  );
}

function RotatingHunterCard() {
  const [idx, setIdx] = useState(3);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % HUNTER_RANKS.length), 3000);
    return () => clearInterval(t);
  }, []);

  const active = HUNTER_RANKS[idx];

  return (
    <div className="space-y-5">
      <div className="relative">
        <div
          className="absolute inset-0 rounded-xl blur-2xl opacity-20 scale-95 transition-all duration-700"
          style={{ background: active.color }}
        />
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 1.01 }}
            transition={{ duration: 0.35, ease }}
            className="relative"
          >
            <HunterLicenseCard rankIdx={idx} />
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex justify-center gap-2 flex-wrap">
        {HUNTER_RANKS.map((r, i) => (
          <button
            key={r.label}
            onClick={() => setIdx(i)}
            className="px-2.5 py-1 rounded-full border text-[11px] font-bold transition-all duration-200"
            style={{
              color: i === idx ? r.color : "#9ca3af",
              borderColor: i === idx ? `${r.color}50` : "rgba(255,255,255,0.15)",
              background: i === idx ? `${r.color}12` : "transparent",
            }}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function xpToRankIdx(xp: number): number {
  let r = 0;
  for (let i = XP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= XP_THRESHOLDS[i]) {
      r = i;
      break;
    }
  }
  return r;
}

function addrHue(addr: string): number {
  return parseInt(addr.slice(2, 6), 16) % 360;
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-black/[0.07] py-5">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-4 text-left">
        <span className="text-sm font-semibold text-gray-900">{q}</span>
        <motion.div
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.18 }}
          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-black/[0.1] text-gray-400"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="5.5" y1="1" x2="5.5" y2="10" />
            <line x1="1" y1="5.5" x2="10" y2="5.5" />
          </svg>
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="mt-3 pr-8 text-sm leading-relaxed text-gray-500">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Home() {
  const { address, isConnected } = useAccount();
  const [mintState, setMintState] = useState<MintState>("idle");
  const [mintedId, setMintedId] = useState<bigint | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [featuredProjects, setFeaturedProjects] = useState<
    Array<{
      address: string;
      name: string;
      description: string;
      logo_url: string | null;
      banner_url: string | null;
      twitter: string | null;
      website: string | null;
    }>
  >([]);
  const [topHunters, setTopHunters] = useState<Array<{ wallet_address: string; total_xp: number }>>([]);
  const [hunterCount, setHunterCount] = useState<number | null>(null);
  const [totalCampaignCount, setTotalCampaignCount] = useState<number | null>(null);
  const [totalXP, setTotalXP] = useState<number | null>(null);
  const [rewardsPaid, setRewardsPaid] = useState<number | null>(null);

  const { data: totalMinted, refetch: refetchTotal } = useReadContract({
    address: BASED_ID_ADDRESS,
    abi: BASED_ID_ABI,
    functionName: "totalMinted",
    query: { refetchInterval: 5000 },
  });

  const { data: nextId, refetch: refetchNext } = useReadContract({
    address: BASED_ID_ADDRESS,
    abi: BASED_ID_ABI,
    functionName: "nextTokenId",
    query: { refetchInterval: 5000 },
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address as `0x${string}`, BASED_ID_ADDRESS],
    query: { enabled: !!address },
  });

  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address as `0x${string}`],
    query: { enabled: !!address },
  });

  const hasAllowance = allowance !== undefined && allowance >= MINT_PRICE;
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (!isConfirmed || !receipt) return;
    if (mintState === "approving") {
      setMintState("approved");
      refetchAllowance();
      toast.success("USDC approved. Ready to mint.");
      return;
    }
    if (mintState === "minting") {
      const log = receipt.logs.find(
        (l) => l.address.toLowerCase() === BASED_ID_ADDRESS.toLowerCase() && l.topics.length === 3,
      );
      const newId = log?.topics[2] ? BigInt(log.topics[2]) : null;
      if (newId) setMintedId(newId);
      setMintState("success");
      refetchTotal();
      refetchNext();
      toast.success(newId ? `Based ID #${newId.toString()} minted.` : "Minted successfully.");
    }
  }, [isConfirmed, mintState, receipt, refetchAllowance, refetchNext, refetchTotal]);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setFeaturedProjects(d.slice(0, 6));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const db = createBrowserClient();
    db.from("hunter_xp")
      .select("wallet_address, total_xp")
      .order("total_xp", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (data?.length) setTopHunters(data);
      });

    fetch("/api/stats")
      .then((r) => r.json())
      .then((s: { hunters: number; campaigns: number; total_xp: number; rewards_paid: number }) => {
        setHunterCount(s.hunters);
        setTotalCampaignCount(s.campaigns);
        setTotalXP(s.total_xp);
        setRewardsPaid(s.rewards_paid);
      })
      .catch(() => {});
  }, []);

  const handleApprove = useCallback(() => {
    setErrorMsg("");
    setMintState("approving");
    writeContract(
      {
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [BASED_ID_ADDRESS, MINT_PRICE],
      },
      {
        onError: (e) => {
          const m = e.message.split("\n")[0];
          setErrorMsg(m);
          setMintState("idle");
          toast.error(m);
        },
      },
    );
  }, [writeContract]);

  const handleMint = useCallback(() => {
    setErrorMsg("");
    setMintState("minting");
    writeContract(
      {
        address: BASED_ID_ADDRESS,
        abi: BASED_ID_ABI,
        functionName: "mint",
      },
      {
        onError: (e) => {
          const m = e.message.split("\n")[0];
          setErrorMsg(m);
          setMintState("approved");
          toast.error(m);
        },
      },
    );
  }, [writeContract]);

  const isLoading = isPending || isConfirming;
  const insufficientBalance = usdcBalance !== undefined && usdcBalance < MINT_PRICE;
  const resolvedNextId = nextId !== undefined ? (nextId <= BigInt(100) ? BigInt(101) : nextId) : BigInt(101);
  const previewId = mintState === "success" && mintedId ? `#${mintedId.toString()}` : `#${resolvedNextId.toString()}`;
  const proofStats = [
    { value: totalMinted !== undefined ? Number(totalMinted) : null, label: "IDs minted" },
    { value: hunterCount, label: "Active hunters" },
    { value: totalCampaignCount, label: "Campaigns launched" },
    { value: totalXP, label: "XP distributed" },
  ];
  const selectedProjects = featuredProjects.slice(0, 3);

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-black">
      <Nav />

      <section className="relative overflow-hidden bg-white">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "linear-gradient(to bottom, black 0%, black 72%, transparent 100%)",
          }}
        />
        <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-blue-50/70 to-transparent pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-6 pb-14 pt-20 sm:pb-16 sm:pt-24">
          <div className="grid grid-cols-1 items-start gap-14 lg:grid-cols-[minmax(0,1fr)_430px] xl:gap-20">
            <div className="space-y-10 pt-6">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease }}
                className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white/80 px-3.5 py-2 text-[11px] font-medium text-gray-600 backdrop-blur-sm"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#0052FF]" />
                Onchain identity and participation layer for Base
              </motion.div>

              <div className="space-y-6">
                <motion.h1
                  style={D}
                  className="max-w-4xl text-[3.25rem] font-black leading-[0.92] tracking-tight text-black sm:text-[4.75rem] lg:text-[6.4rem]"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.65, delay: 0.04, ease }}
                >
                  The Hunters
                  <span className="block text-[#0052FF]">of Base.</span>
                </motion.h1>

                <motion.p
                  className="max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.55, delay: 0.18, ease }}
                >
                  Mint once, then participate across campaigns, Meme Wars, squads, and verified talent surfaces.
                  Based ID turns anonymous wallet traffic into a cleaner reputation layer for projects and hunters.
                </motion.p>
              </div>

              <motion.div
                className="flex flex-wrap items-center gap-3"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.12, ease }}
              >
                <Link href="#mint-card" className="inline-flex items-center gap-2 rounded-full bg-black px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800">
                  Mint Based ID
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M2 7h10M8 3l4 4-4 4" />
                  </svg>
                </Link>
                <Link href="/campaigns" className="inline-flex items-center gap-2 rounded-full border border-black/[0.12] px-7 py-3.5 text-sm font-semibold text-gray-700 transition-colors hover:border-black/[0.26] hover:text-black">
                  Browse campaigns
                </Link>
              </motion.div>

            </div>

            <motion.div
              id="mint-card"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.65, delay: 0.2, ease }}
              className="lg:pt-4"
            >
              <div className="rounded-[28px] border border-black/[0.08] bg-[#0b0d12] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
                <div className="overflow-hidden rounded-[22px] border border-white/[0.06] bg-[linear-gradient(180deg,#11141b_0%,#090b10_100%)]">
                  <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500" style={D}>Based ID</p>
                      <p className="mt-1 text-sm text-zinc-300">Permanent access pass</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">Preview</p>
                      <p className="mt-1 text-sm font-mono text-zinc-400">{previewId}</p>
                    </div>
                  </div>

                  <div className="px-4 pt-4">
                    <div className="overflow-hidden rounded-[20px] border border-white/[0.06] bg-black">
                      <NftCard id={previewId} />
                    </div>
                  </div>

                  <div className="space-y-4 p-5">
                    {mintState === "success" ? (
                      <div className="space-y-4 py-3 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M4 10l4 4 8-8" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-lg font-black text-white" style={D}>Based ID {previewId} minted</p>
                          <p className="mt-1 text-sm text-zinc-500">Your wallet now has full platform access.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Link href="/campaigns" className="rounded-xl border border-white/[0.1] py-3 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/[0.05]">
                            Browse campaigns
                          </Link>
                          <Link href="/hunters" className="rounded-xl bg-[#0052FF] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0041cc]">
                            Claim Hunter
                          </Link>
                        </div>
                        <a href={`${BASESCAN_URL}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="block text-xs text-zinc-600 transition-colors hover:text-zinc-400">
                          View transaction on Basescan
                        </a>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-6">
                          <div className="space-y-1">
                            <p className="text-base font-black text-white" style={D}>Mint your Based ID</p>
                            <p className="text-sm leading-relaxed text-zinc-500">One-time mint. Permanent access to the full Based ID ecosystem.</p>
                          </div>
                          <div className="text-right">
                            <p className="text-3xl font-black text-white" style={D}>$2</p>
                            <p className="text-xs text-zinc-600">USDC on Base</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center">
                          {["Campaigns", "Hunters", "Talents"].map((item) => (
                            <div key={item} className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-[11px] font-medium text-zinc-400">
                              {item}
                            </div>
                          ))}
                        </div>

                        {!isConnected ? (
                          <ConnectButton.Custom>
                            {({ openConnectModal }) => (
                              <button onClick={openConnectModal} className="w-full rounded-xl bg-[#0052FF] py-4 text-sm font-semibold text-white transition-colors hover:bg-[#0041cc]">
                                Connect wallet to mint
                              </button>
                            )}
                          </ConnectButton.Custom>
                        ) : insufficientBalance ? (
                          <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-center">
                            <p className="text-sm font-semibold text-amber-300">Insufficient USDC</p>
                            <p className="mt-1 text-xs text-zinc-500">You need $2 USDC on Base.</p>
                          </div>
                        ) : !hasAllowance && mintState === "idle" ? (
                          <button onClick={handleApprove} disabled={isLoading} className="w-full rounded-xl bg-[#0052FF] py-4 text-sm font-semibold text-white transition-colors hover:bg-[#0041cc] disabled:opacity-50">
                            Approve $2 USDC
                          </button>
                        ) : mintState === "approving" ? (
                          <button disabled className="w-full rounded-xl bg-[#0052FF] py-4 text-sm font-semibold text-white opacity-60">
                            Approving... confirm in wallet
                          </button>
                        ) : hasAllowance || mintState === "approved" ? (
                          <button onClick={handleMint} disabled={isLoading} className="w-full rounded-xl bg-[#0052FF] py-4 text-sm font-semibold text-white transition-colors hover:bg-[#0041cc] disabled:opacity-50">
                            {isLoading ? "Minting..." : "Mint Based ID"}
                          </button>
                        ) : null}

                        {errorMsg && <p className="text-center text-xs text-red-400">{errorMsg}</p>}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="border-y border-black/[0.06] bg-[#fafafa]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 gap-px sm:grid-cols-4">
            {proofStats.map((item) => (
              <div key={item.label} className="bg-[#fafafa] px-5 py-8 sm:py-10">
                <p className="text-3xl font-black leading-none tabular-nums text-black sm:text-5xl" style={D}>
                  <AnimatedCounter value={item.value} />
                </p>
                <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.18em] text-gray-400">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-black/[0.06] bg-white">
        <div className="mx-auto max-w-7xl space-y-10 px-6 py-20 sm:py-24">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="max-w-2xl space-y-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-gray-400">Selected on Base</p>
                <h2 className="text-4xl font-black leading-tight text-black sm:text-5xl" style={D}>
                  Projects building for committed wallets.
                </h2>
              </div>
              <Link href="/projects" className="text-sm font-semibold text-gray-500 transition-colors hover:text-black">
                View all projects
              </Link>
            </div>
          </Reveal>

          {selectedProjects.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              {selectedProjects.map((p, i) => (
                <Reveal key={p.address} delay={i * 0.06}>
                  <Link
                    href={`/projects/${p.address}`}
                    className="group flex h-full flex-col overflow-hidden rounded-[22px] border border-black/[0.07] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(0,0,0,0.08)]"
                  >
                    <div className="aspect-[16/8] overflow-hidden bg-zinc-100">
                      {p.banner_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.banner_url} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                      ) : (
                        <div className="h-full w-full bg-[linear-gradient(135deg,#f5f7fb_0%,#eceff5_100%)]" />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-4 p-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-black/[0.06] bg-zinc-50 text-sm font-black text-black" style={D}>
                          {p.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.logo_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            p.name.slice(0, 1).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-lg font-black leading-tight text-black" style={D}>{p.name}</p>
                          <p className="text-xs text-gray-400">Project profile</p>
                        </div>
                      </div>
                      <p className="flex-1 line-clamp-3 text-sm leading-relaxed text-gray-600">
                        {p.description || "Campaigns, content, and community activations running through Based ID."}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        {p.twitter && <span>@{p.twitter.replace(/^@/, "")}</span>}
                        {p.website && <span className="truncate">{p.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>}
                      </div>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          ) : (
            <Reveal delay={0.08}>
              <div className="rounded-[22px] border border-black/[0.07] bg-[#fafafa] px-8 py-20 text-center">
                <p className="text-2xl font-black text-black" style={D}>Projects are joining the network now.</p>
                <p className="mt-3 text-sm text-gray-500">List yours to reach hunters with real wallet intent.</p>
              </div>
            </Reveal>
          )}
        </div>
      </section>

      <section className="border-t border-white/[0.04] bg-[#0b0d12] text-white">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-6 py-20 sm:py-24 lg:grid-cols-[minmax(0,1fr)_520px] xl:gap-20">
          <Reveal>
            <div className="space-y-8">
              <div className="space-y-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/35">Based Hunters</p>
                <h2 className="text-4xl font-black leading-tight text-white sm:text-5xl" style={D}>
                  A rank system people can actually see and use.
                </h2>
                <p className="max-w-2xl text-base leading-relaxed text-white/65">
                  Claim a free Hunter License NFT, accumulate XP from participation, and make reputation portable across the ecosystem.
                  Hunters are not a side feature. They are the visible proof that Based ID has persistent user state.
                </p>
              </div>

              {topHunters.length > 0 ? (
                <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-3">
                  <div className="flex items-center justify-between px-3 py-2">
                    <p className="text-sm font-semibold text-white">Top hunters</p>
                    <Link href="/hunters" className="text-xs text-white/45 transition-colors hover:text-white">
                      View full leaderboard
                    </Link>
                  </div>
                  <div className="space-y-1">
                    {topHunters.map((hunter, i) => {
                      const rankIdx = xpToRankIdx(hunter.total_xp);
                      const hue = addrHue(hunter.wallet_address);
                      return (
                        <Link
                          key={hunter.wallet_address}
                          href={`/profile/${hunter.wallet_address}`}
                          className="flex items-center gap-4 rounded-2xl px-3 py-3 transition-colors hover:bg-white/[0.04]"
                        >
                          <span className="w-6 text-sm font-black tabular-nums text-white/35">{i + 1}</span>
                          <div
                            className="flex h-9 w-9 items-center justify-center rounded-full border text-[11px] font-black"
                            style={{ background: `hsl(${hue},50%,16%)`, borderColor: `hsl(${hue},50%,26%)`, color: `hsl(${hue},65%,62%)`, ...D }}
                          >
                            {hunter.wallet_address.slice(2, 4).toUpperCase()}
                          </div>
                          <span className="min-w-0 flex-1 truncate font-mono text-xs text-white/45">
                            {hunter.wallet_address.slice(0, 6)}...{hunter.wallet_address.slice(-4)}
                          </span>
                          <span className="text-sm font-black tabular-nums text-[#6ea2ff]" style={D}>
                            {hunter.total_xp.toLocaleString()} XP
                          </span>
                          <span
                            className="flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-black"
                            style={{ background: `${RANK_BADGE_COLORS[rankIdx]}15`, borderColor: `${RANK_BADGE_COLORS[rankIdx]}35`, color: RANK_BADGE_COLORS[rankIdx], ...D }}
                          >
                            {RANK_BADGE_LABELS[rankIdx]}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-6 text-sm leading-relaxed text-white/60">
                  Hunter rankings will populate here as wallets mint, participate, and accumulate XP across the platform.
                </div>
              )}

              <Link href="/hunters" className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-black transition-colors hover:bg-zinc-100">
                Explore hunters
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="relative">
              <div className="absolute inset-0 rounded-[28px] bg-[#0052FF] opacity-10 blur-3xl" />
              <RotatingHunterCard />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-[#0052FF] text-white">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
          <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[minmax(0,1fr)_360px]">
            <Reveal>
              <div className="max-w-3xl space-y-5">
                <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/45">For Base projects</p>
                <h2 className="text-4xl font-black leading-tight text-white sm:text-5xl" style={D}>
                  Reach wallets with more signal than a follow button.
                </h2>
                <p className="text-base leading-relaxed text-white/72">
                  Based ID gives projects a cleaner participant base: wallets that minted onchain, hunters with visible XP, and contributors with searchable history.
                  Standard listings stay lightweight, while the ecosystem surface feels more curated than generic quest traffic.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <div className="rounded-[24px] border border-white/15 bg-white/10 p-6 backdrop-blur-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Listing</p>
                    <p className="mt-3 text-3xl font-black text-white" style={D}>Free</p>
                    <p className="mt-1 text-sm text-white/65">Standard campaign setup</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Rewards paid</p>
                    <p className="mt-3 text-3xl font-black text-white" style={D}>
                      {rewardsPaid !== null ? rewardsPaid.toLocaleString() : "--"}
                    </p>
                    <p className="mt-1 text-sm text-white/65">Tracked across the platform</p>
                  </div>
                </div>
                <div className="mt-6 flex flex-col gap-3">
                  <Link href="/projects" className="rounded-full bg-white px-6 py-3.5 text-center text-sm font-semibold text-[#0052FF] transition-colors hover:bg-blue-50">
                    List your project
                  </Link>
                  <Link href="/campaigns" className="rounded-full border border-white/25 px-6 py-3.5 text-center text-sm font-semibold text-white transition-colors hover:bg-white/10">
                    Browse live campaigns
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="border-t border-black/[0.06] bg-white">
        <div className="mx-auto max-w-3xl space-y-10 px-6 py-20 sm:py-24">
          <Reveal>
            <div className="space-y-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-gray-400">FAQ</p>
              <h2 className="text-4xl font-black text-black sm:text-5xl" style={D}>Questions, answered simply.</h2>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="border-t border-black/[0.07]">
              {FAQ_ITEMS.map((item) => <FAQItem key={item.q} {...item} />)}
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-black/[0.07] bg-white px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Based ID" className="h-5 w-5 rounded-md opacity-60" />
            <span className="text-sm text-gray-400">Based ID · Built on Base · 2026</span>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-[13px] text-gray-400">
            {[["Campaigns", "/campaigns"], ["Hunters", "/hunters"], ["Projects", "/projects"], ["Talents", "/talents"]].map(([l, h]) => (
              <Link key={h} href={h} className="transition-colors hover:text-black">{l}</Link>
            ))}
            <a href="https://x.com/basedidofficial" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-black">
              @basedidofficial
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

import { createPublicClient, http } from "viem";
import { base, baseSepolia } from "viem/chains";
import { BASED_ID_ADDRESS, BASED_ID_ABI, isAuctionId, BASESCAN_URL } from "@/lib/contracts";
import { NftCard } from "../../NftCard";
import Link from "next/link";
import type { Metadata } from "next";

const chain = process.env.NEXT_PUBLIC_CHAIN_ID === "8453" ? base : baseSepolia;

function getClient() {
  return createPublicClient({ chain, transport: http() });
}

function getTier(id: number) {
  if (id <= 100) return "GENESIS";
  if (id <= 1000) return "FOUNDING";
  if (id <= 10000) return "PIONEER";
  return "BUILDER";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const n = parseInt(id);
  if (isNaN(n) || n < 1) return { title: "Based ID" };
  const tier = getTier(n);
  const weight = (1 / Math.sqrt(n)).toFixed(4);
  return {
    title: `Based ID #${n} — basedid.space`,
    description: `${tier} tier · $BASED weight: ${weight}× · View and share onchain.`,
    openGraph: {
      title: `Based ID #${n}`,
      description: `${tier} · weight ${weight}× · basedid.space`,
      images: [{ url: `https://basedid.space/api/frame/image?id=${n}`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `Based ID #${n}`,
      images: [`https://basedid.space/api/frame/image?id=${n}`],
    },
    other: {
      "fc:frame": "vNext",
      "fc:frame:image": `https://basedid.space/api/frame/image?id=${n}`,
      "fc:frame:image:aspect_ratio": "1.91:1",
      "fc:frame:button:1": "Mint your Based ID →",
      "fc:frame:button:1:action": "link",
      "fc:frame:button:1:target": "https://basedid.space",
    },
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tokenId = parseInt(id);

  if (isNaN(tokenId) || tokenId < 1) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <p className="text-zinc-500 text-sm">Invalid ID.</p>
          <Link href="/" className="text-blue-400 text-sm hover:underline">← Back to home</Link>
        </div>
      </div>
    );
  }

  const client = getClient();
  let holder: string | null = null;

  try {
    holder = (await client.readContract({
      address: BASED_ID_ADDRESS,
      abi: BASED_ID_ABI,
      functionName: "ownerOf",
      args: [BigInt(tokenId)],
    })) as string;
  } catch {
    // not minted yet
  }

  const tier = getTier(tokenId);
  const weight = (1 / Math.sqrt(tokenId)).toFixed(6);
  const auction = isAuctionId(tokenId);

  const shareText = holder
    ? `Based ID #${tokenId} — ${tier} tier · weight ${(1 / Math.sqrt(tokenId)).toFixed(4)}×\n\nMint yours for $2 → basedid.space\n\n@basedidofficial`
    : `Based ID #${tokenId} is still unclaimed.\n\nMint it for $2 → basedid.space\n\n@basedidofficial`;

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <div className="border-b border-white/[0.05] px-6 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link href="/" className="text-zinc-500 text-[11px] uppercase tracking-[0.2em] hover:text-white transition-colors">
            ← Based ID
          </Link>
          <span className="text-zinc-700 text-[11px] uppercase tracking-[0.15em]">Profile</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 py-12 space-y-6">

        {/* NFT Card */}
        <NftCard id={`#${tokenId}`} holder={holder ?? "not minted yet"} />

        {/* Stats panel */}
        <div className="grid grid-cols-3 border border-white/[0.06] rounded-2xl overflow-hidden divide-x divide-white/[0.06]">
          <div className="px-5 py-4">
            <p className="text-white font-bold text-lg leading-none">#{tokenId}</p>
            <p className="text-zinc-600 text-[10px] uppercase tracking-[0.15em] mt-2">ID Number</p>
          </div>
          <div className="px-5 py-4">
            <p className={`font-bold text-lg leading-none ${auction ? "text-amber-400" : "text-white"}`}>{tier}</p>
            <p className="text-zinc-600 text-[10px] uppercase tracking-[0.15em] mt-2">Tier</p>
          </div>
          <div className="px-5 py-4">
            <p className="text-white font-bold text-lg leading-none">{parseFloat(weight).toFixed(4)}×</p>
            <p className="text-zinc-600 text-[10px] uppercase tracking-[0.15em] mt-2">$BASED Weight</p>
          </div>
        </div>

        {/* Weight explanation */}
        <div className="rounded-xl border border-white/[0.05] px-5 py-4">
          <p className="text-zinc-500 text-xs leading-relaxed">
            Weight = 1 ÷ √{tokenId} = <span className="text-white font-medium">{weight}</span>
            {" "}— determines share of 1B $BASED airdrop across two snapshots (Sep 30 + Dec 31, 2026).
          </p>
        </div>

        {/* Holder or Not Minted */}
        {holder ? (
          <div className="rounded-2xl border border-white/[0.06] p-5 space-y-2">
            <p className="text-zinc-600 text-[10px] uppercase tracking-[0.2em]">Current holder</p>
            <a
              href={`${BASESCAN_URL}/address/${holder}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 font-mono text-sm hover:text-blue-300 transition-colors break-all"
            >
              {holder}
            </a>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.01] p-5 space-y-3 text-center">
            <p className="text-white font-semibold text-sm">This ID hasn&apos;t been minted yet.</p>
            <p className="text-zinc-500 text-xs">Mint it now for $2 USDC — permanently yours.</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-bold text-sm hover:bg-zinc-100 transition-colors"
            >
              Mint Now — $2 USDC
            </Link>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          {holder && (
            <Link
              href="/"
              className="flex-1 text-center px-5 py-3 rounded-xl bg-white text-black font-bold text-sm hover:bg-zinc-100 transition-colors"
            >
              Mint your own →
            </Link>
          )}
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-3 rounded-xl border border-white/[0.08] text-zinc-400 text-sm font-medium hover:text-white hover:border-white/[0.15] transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.631 5.905-5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            Share on X
          </a>
        </div>

      </div>
    </div>
  );
}

"use client";

import { useState, useRef } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import toast from "react-hot-toast";
import { MEME_WAR_ADDRESS, MEME_WAR_ABI, USDC_ADDRESS, ERC20_ABI } from "@/lib/contracts";

const BODY = { fontFamily: "var(--font-sans), system-ui, sans-serif" };

export function SubmitEntry({
  warId,
  onChainWarId,
  submissionFeeUsdc,
  warEnded,
  onSubmitted,
}: {
  warId: string;
  onChainWarId: number | null;
  submissionFeeUsdc: number;
  warEnded: boolean;
  onSubmitted: () => void;
}) {
  const { address, isConnected } = useAccount();
  const [mediaUrl,   setMediaUrl]   = useState("");
  const [caption,    setCaption]    = useState("");
  const [uploading,  setUploading]  = useState(false);
  const [phase,      setPhase]      = useState<"idle"|"approving"|"submitting-chain"|"saving">("idle");
  const fileRef = useRef<HTMLInputElement>(null);

  const { writeContract } = useWriteContract();
  useWaitForTransactionReceipt();

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res  = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (res.ok) { setMediaUrl(data.url); toast.success("Image uploaded"); }
      else toast.error(data.error ?? "Upload failed");
    } catch { toast.error("Upload failed"); }
    finally { setUploading(false); }
  }

  async function saveToDb(onChainEntryId?: number) {
    const res = await fetch(`/api/meme-wars/${warId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hunter_wallet: address, media_url: mediaUrl, caption, on_chain_entry_id: onChainEntryId }),
    });
    const data = await res.json();
    if (res.ok) { toast.success("Meme submitted! +10 XP"); onSubmitted(); }
    else toast.error(data.error ?? "Submit failed");
  }

  function handleSubmit() {
    if (!address || !mediaUrl) return;

    // No on-chain war or free submission — just save to DB
    if (!onChainWarId || submissionFeeUsdc === 0) {
      setPhase("saving");
      saveToDb().finally(() => setPhase("idle"));
      return;
    }

    const feeWei = BigInt(Math.round(submissionFeeUsdc * 1_000_000));

    // Approve USDC then call submitEntry on-chain
    setPhase("approving");
    writeContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [MEME_WAR_ADDRESS, feeWei],
    }, {
      onSuccess: () => {
        setPhase("submitting-chain");
        writeContract({
          address: MEME_WAR_ADDRESS,
          abi: MEME_WAR_ABI,
          functionName: "submitEntry",
          args: [BigInt(onChainWarId)],
        }, {
          onSuccess: async () => {
            setPhase("saving");
            await saveToDb();
            setPhase("idle");
          },
          onError: (e) => { toast.error(e.message.split("\n")[0]); setPhase("idle"); },
        });
      },
      onError: (e) => { toast.error(e.message.split("\n")[0]); setPhase("idle"); },
    });
  }

  if (!isConnected) return (
    <div className="text-center"><ConnectButton label="Connect to submit" /></div>
  );
  if (warEnded) return null;

  const loading = phase !== "idle";
  const submitLabel = phase === "approving"        ? "Approving USDC…" :
                      phase === "submitting-chain"  ? "Confirm in wallet…" :
                      phase === "saving"            ? "Saving…" :
                      submissionFeeUsdc > 0         ? `Submit · $${submissionFeeUsdc} USDC · +10 XP`
                                                    : "Submit Meme · +10 XP";

  return (
    <div className="space-y-3">
      <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleUpload} className="hidden" />
      <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
        className="w-full py-3 rounded-xl border-2 border-dashed border-black/[0.1] text-gray-400 text-sm hover:border-black/20 hover:text-black transition-colors disabled:opacity-40" style={BODY}>
        {uploading ? "Uploading…" : mediaUrl ? "✓ Uploaded — change?" : "Upload meme image / video"}
      </button>
      {mediaUrl && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediaUrl} alt="Preview" className="w-full rounded-xl object-cover max-h-40" />
          <input value={caption} onChange={e => setCaption(e.target.value)}
            placeholder="Add a caption (optional)" maxLength={100}
            className="w-full border border-black/[0.1] rounded-xl px-4 py-2.5 text-black text-sm placeholder-gray-300 outline-none focus:border-black/30 transition-all" style={BODY} />
          <button onClick={handleSubmit} disabled={loading}
            className="w-full py-3 rounded-xl bg-black text-white font-bold text-sm disabled:opacity-50 hover:bg-zinc-800 transition-colors" style={BODY}>
            {submitLabel}
          </button>
        </>
      )}
    </div>
  );
}

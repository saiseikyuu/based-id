"use client";

import { useState, useRef } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import toast from "react-hot-toast";

const BODY = { fontFamily: "var(--font-sans), system-ui, sans-serif" };

export function SubmitEntry({
  warId,
  warEnded,
  onSubmitted,
}: {
  warId: string;
  warEnded: boolean;
  onSubmitted: () => void;
}) {
  const { address, isConnected } = useAccount();
  const [mediaUrl,   setMediaUrl]   = useState("");
  const [caption,    setCaption]    = useState("");
  const [uploading,  setUploading]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  async function handleSubmit() {
    if (!address || !mediaUrl) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/meme-wars/${warId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hunter_wallet: address, media_url: mediaUrl, caption }),
      });
      const data = await res.json();
      if (res.ok) { toast.success("Meme submitted! +10 XP"); onSubmitted(); }
      else toast.error(data.error ?? "Submit failed");
    } catch { toast.error("Something went wrong"); }
    finally { setSubmitting(false); }
  }

  if (!isConnected) return (
    <div className="text-center"><ConnectButton label="Connect to submit" /></div>
  );
  if (warEnded) return null;

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
          <button onClick={handleSubmit} disabled={submitting}
            className="w-full py-3 rounded-xl bg-black text-white font-bold text-sm disabled:opacity-50 hover:bg-zinc-800 transition-colors" style={BODY}>
            {submitting ? "Submitting…" : "Submit Meme · +10 XP"}
          </button>
        </>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";

export function ShareBar({ title, dropUrl }: { title: string; dropUrl: string }) {
  const [copied, setCopied] = useState(false);

  const tweetText = encodeURIComponent(`⚡ ${title}\n\nJoin this campaign on Based ID:\n${dropUrl}`);
  const warpcastText = encodeURIComponent(`⚡ ${title}\n\nJoin on Based ID → ${dropUrl}`);

  function handleCopy() {
    navigator.clipboard.writeText(dropUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-zinc-600 text-xs">Share:</span>

      <button onClick={handleCopy}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] text-zinc-400 text-xs font-medium hover:bg-white/[0.04] hover:text-white transition-colors">
        {copied ? (
          <>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l2.5 2.5L10 3" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span className="text-green-400">Copied</span>
          </>
        ) : (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Link
          </>
        )}
      </button>

      <a href={`https://x.com/intent/tweet?text=${tweetText}`} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] text-zinc-400 text-xs font-medium hover:bg-white/[0.04] hover:text-white transition-colors">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.741l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        Post
      </a>

      <a href={`https://warpcast.com/~/compose?text=${warpcastText}`} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] text-zinc-400 text-xs font-medium hover:bg-white/[0.04] hover:text-white transition-colors">
        <svg width="12" height="12" viewBox="0 0 1000 1000" fill="currentColor"><path d="M257.778 155.556H742.222V844.444H671.111V528.889H670.414C662.554 441.677 589.258 373.333 500 373.333C410.742 373.333 337.446 441.677 329.586 528.889H328.889V844.444H257.778V155.556Z"/><path d="M128.889 253.333L157.778 351.111H182.222V746.667C169.949 746.667 160 756.616 160 768.889V795.556H155.556C143.283 795.556 133.333 805.505 133.333 817.778V844.444H382.222V817.778C382.222 805.505 372.273 795.556 360 795.556H355.556V768.889C355.556 756.616 345.606 746.667 333.333 746.667H306.667V253.333H128.889Z"/><path d="M675.556 746.667C663.283 746.667 653.333 756.616 653.333 768.889V795.556H648.889C636.616 795.556 626.667 805.505 626.667 817.778V844.444H875.556V817.778C875.556 805.505 865.606 795.556 853.333 795.556H848.889V768.889C848.889 756.616 838.94 746.667 826.667 746.667V351.111H851.111L880 253.333H702.222V746.667H675.556Z"/></svg>
        Cast
      </a>
    </div>
  );
}

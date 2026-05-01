"use client";

import { useEffect, useState } from "react";

const D = { fontFamily: "var(--font-display), system-ui, sans-serif" };

interface CampaignAnalytic {
  id: string;
  title: string;
  type: string;
  status: string;
  entries: number;
  winners: number;
  claims: number;
  completion_rate: number;
  low_rep_pct: number;
  qualified_pct: number;
  bounty: { total: number; approved: number; rejected: number; pending: number } | null;
}

export function AnalyticsTab({ address }: { address: string }) {
  const [data, setData] = useState<CampaignAnalytic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/projects/${address}/analytics`)
      .then(r => r.json())
      .then(d => { setData(d.campaigns ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [address]);

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="py-16 text-center text-zinc-500 text-sm">
        No campaigns yet. Create your first campaign to see analytics.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-black text-lg" style={D}>Campaign Analytics</h3>
        <a href={`/api/projects/${address}/analytics/csv?requester=${address}`} download
          className="px-3 py-1.5 rounded-lg border border-white/[0.08] text-zinc-400 text-xs hover:text-white hover:border-white/20 transition-colors"
          style={{ fontFamily: "var(--font-sans)" }}>
          ↓ CSV
        </a>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {["Campaign", "Type", "Status", "Entries", "Claims", "Completion", "Quality", "Bot Risk", "Winners"].map(h => (
                <th key={h} className="text-left py-3 pr-6 text-zinc-500 font-medium text-xs uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {data.map(c => (
              <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3 pr-6 text-white font-medium max-w-[180px] truncate" title={c.title}>
                  {c.title}
                </td>
                <td className="py-3 pr-6 text-zinc-400 capitalize text-xs">
                  {c.type.replace("_", " ")}
                </td>
                <td className="py-3 pr-6">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    c.status === "active"   ? "bg-green-500/15 text-green-400"  :
                    c.status === "ended"    ? "bg-zinc-500/15 text-zinc-400"    :
                    c.status === "drawn"    ? "bg-blue-500/15 text-blue-400"    :
                    "bg-zinc-800 text-zinc-500"
                  }`}>
                    {c.status}
                  </span>
                </td>
                <td className="py-3 pr-6 text-white tabular-nums">{c.entries.toLocaleString()}</td>
                <td className="py-3 pr-6 text-white tabular-nums">{c.claims.toLocaleString()}</td>
                <td className="py-3 pr-6">
                  <div className="flex items-center gap-2">
                    <div className="w-14 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${c.completion_rate}%` }} />
                    </div>
                    <span className="text-zinc-300 tabular-nums text-xs">{c.completion_rate}%</span>
                  </div>
                </td>
                <td className="py-3 pr-6">
                  <span className="text-xs font-bold tabular-nums" style={{ color: (c.qualified_pct ?? 0) >= 50 ? "#4ade80" : "#f59e0b" }}>
                    {c.qualified_pct ?? 0}% B+
                  </span>
                </td>
                <td className="py-3 pr-6">
                  <span className={`text-xs font-bold tabular-nums ${(c.low_rep_pct ?? 0) > 30 ? "text-red-400" : "text-zinc-500"}`}>
                    {c.low_rep_pct ?? 0}%
                  </span>
                </td>
                <td className="py-3 pr-6 text-white tabular-nums">{c.winners.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.some(c => c.bounty) && (
        <div className="space-y-3 pt-2">
          <h4 className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Bounty Submissions</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {["Campaign", "Total", "Pending", "Approved", "Rejected", "Approval Rate"].map(h => (
                    <th key={h} className="text-left py-3 pr-6 text-zinc-500 font-medium text-xs uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {data.filter(c => c.bounty).map(c => (
                  <tr key={c.id}>
                    <td className="py-3 pr-6 text-white font-medium max-w-[180px] truncate">{c.title}</td>
                    <td className="py-3 pr-6 text-zinc-300 tabular-nums">{c.bounty!.total}</td>
                    <td className="py-3 pr-6 text-yellow-400 tabular-nums">{c.bounty!.pending}</td>
                    <td className="py-3 pr-6 text-green-400 tabular-nums">{c.bounty!.approved}</td>
                    <td className="py-3 pr-6 text-red-400 tabular-nums">{c.bounty!.rejected}</td>
                    <td className="py-3 pr-6 text-zinc-300">
                      {c.bounty!.total > 0
                        ? `${Math.round((c.bounty!.approved / c.bounty!.total) * 100)}%`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

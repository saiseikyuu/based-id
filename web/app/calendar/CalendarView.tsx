"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

type Drop = {
  id: string; title: string; type: string; tier: string;
  ends_at: string; status: string; image_url: string | null;
  project?: { name: string; logo_url: string | null } | null;
};

const TYPE_SHORT: Record<string, string> = {
  whitelist: "WL", raffle: "Raffle", token_drop: "Drop", nft_mint: "Mint",
};

const DAYS   = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function calendarDays(year: number, month: number) {
  const first = new Date(year, month, 1).getDay();
  const last  = new Date(year, month + 1, 0).getDate();
  const days: { date: Date; current: boolean }[] = [];
  for (let i = 0; i < first; i++)
    days.push({ date: new Date(year, month, i - first + 1), current: false });
  for (let i = 1; i <= last; i++)
    days.push({ date: new Date(year, month, i), current: true });
  const rem = 42 - days.length;
  for (let i = 1; i <= rem; i++)
    days.push({ date: new Date(year, month + 1, i), current: false });
  return days;
}

export function CalendarView() {
  const today = new Date();
  const [year,    setYear]    = useState(today.getFullYear());
  const [month,   setMonth]   = useState(today.getMonth());
  const [selDay,  setSelDay]  = useState(today);
  const [drops,   setDrops]   = useState<Drop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/drops?status=all")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setDrops(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const days = useMemo(() => calendarDays(year, month), [year, month]);

  // Group drops by end date
  const dropsByDay = useMemo(() => {
    const map: Record<string, Drop[]> = {};
    drops.forEach(d => {
      const key = new Date(d.ends_at).toDateString();
      if (!map[key]) map[key] = [];
      map[key].push(d);
    });
    return map;
  }, [drops]);

  const selectedDrops = useMemo(() =>
    (dropsByDay[selDay.toDateString()] ?? []).sort(
      (a, b) => new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime()
    ), [dropsByDay, selDay]);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  // Generate 24h timeline slots
  const hours = Array.from({ length: 24 }, (_, i) => {
    const h = i % 12 || 12;
    const ampm = i < 12 ? "AM" : "PM";
    return `${h}:00 ${ampm}`;
  });

  function formatTime(iso: string) {
    const d = new Date(iso);
    const h = d.getUTCHours() % 12 || 12;
    const m = d.getUTCMinutes().toString().padStart(2, "0");
    const ampm = d.getUTCHours() < 12 ? "AM" : "PM";
    return `${h}:${m} ${ampm}`;
  }

  function getDropsForHour(hour: number) {
    return selectedDrops.filter(d => new Date(d.ends_at).getUTCHours() === hour);
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <h1 className="text-xl font-black text-white" style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}>
        Drop Calendar
      </h1>

      <div className="flex gap-4 items-start">

        {/* ── LEFT: Month grid ── */}
        <div className="flex-1 rounded-2xl border border-white/[0.07] bg-white/[0.01] overflow-hidden min-w-0">
          {/* Month header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.07]">
            <div className="flex items-center gap-3">
              <button onClick={prevMonth} className="w-7 h-7 rounded-lg border border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-all flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M8 2L4 6l4 4"/></svg>
              </button>
              <button onClick={nextMonth} className="w-7 h-7 rounded-lg border border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-all flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4 2l4 4-4 4"/></svg>
              </button>
              <span className="text-white font-bold text-base">{MONTHS[month]} {year}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-zinc-500 text-xs">{drops.filter(d => d.status === "active").length} live</span>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-white/[0.06]">
            {DAYS.map(d => (
              <div key={d} className="py-2 text-center text-[10px] font-bold text-zinc-600 tracking-[0.12em]">{d}</div>
            ))}
          </div>

          {/* Day grid */}
          {loading ? (
            <div className="py-16 text-center">
              <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin mx-auto" />
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {days.map(({ date, current }, idx) => {
                const key     = date.toDateString();
                const dayDrops = dropsByDay[key] ?? [];
                const isToday  = sameDay(date, today);
                const isSel    = sameDay(date, selDay);
                const visible  = dayDrops.slice(0, 2);
                const overflow = dayDrops.length - 2;

                return (
                  <button key={idx} onClick={() => { setSelDay(date); setYear(date.getFullYear()); setMonth(date.getMonth()); }}
                    className={`min-h-[100px] p-2 border-b border-r border-white/[0.04] text-left transition-colors relative
                      ${!current ? "opacity-30" : ""}
                      ${isSel ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"}
                    `}>
                    {/* Date number */}
                    <span className={`text-xs font-bold leading-none block mb-1.5 w-5 h-5 flex items-center justify-center rounded-full ${
                      isToday ? "bg-blue-600 text-white" : isSel ? "text-white" : "text-zinc-500"
                    }`}>
                      {date.getDate()}
                    </span>

                    {/* Overflow badge */}
                    {overflow > 0 && (
                      <span className="text-[9px] text-zinc-500 font-bold mb-0.5 block">+{overflow}</span>
                    )}

                    {/* Drop pills */}
                    <div className="space-y-0.5">
                      {visible.map(d => (
                        <div key={d.id} className={`text-[9px] font-medium px-1 py-0.5 rounded truncate leading-tight ${
                          d.status === "active" ? "bg-blue-600/20 text-blue-300" :
                          d.status === "drawn"  ? "bg-green-600/15 text-green-400" :
                          "bg-white/[0.04] text-zinc-500"
                        }`}>
                          {d.title}
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── RIGHT: Day detail ── */}
        <div className="w-72 flex-shrink-0 rounded-2xl border border-white/[0.07] bg-white/[0.01] overflow-hidden sticky top-20">
          {/* Day header */}
          <div className="px-4 py-3.5 border-b border-white/[0.07] flex items-center justify-between">
            <span className="text-white font-bold text-sm">
              {selDay.toLocaleDateString("en-US", { weekday: "long" })}
            </span>
            <span className="text-zinc-500 text-xs">
              {selDay.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </span>
          </div>

          {/* Hourly timeline */}
          <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 240px)" }}>
            {selectedDrops.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-zinc-600 text-xs">No drops ending this day</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {hours.map((label, hour) => {
                  const hourDrops = getDropsForHour(hour);
                  if (hourDrops.length === 0 && selectedDrops.length > 0) {
                    return (
                      <div key={hour} className="flex items-center gap-3 px-4 py-2 min-h-[40px]">
                        <span className="text-zinc-700 text-[10px] w-14 flex-shrink-0 tabular-nums">{label}</span>
                        <div className="flex-1 h-px bg-white/[0.03]" />
                      </div>
                    );
                  }
                  return (
                    <div key={hour} className="flex items-start gap-3 px-4 py-2 min-h-[40px]">
                      <span className="text-zinc-500 text-[10px] w-14 flex-shrink-0 tabular-nums pt-0.5">{label}</span>
                      <div className="flex-1 space-y-1">
                        {hourDrops.map(d => (
                          <Link key={d.id} href={`/drops/${d.id}`}
                            className="flex items-center justify-between gap-2 w-full group">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {d.image_url && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={d.image_url} alt="" className="w-4 h-4 rounded object-cover flex-shrink-0" />
                              )}
                              <span className="text-zinc-200 text-xs font-medium truncate group-hover:text-white transition-colors">
                                {d.title}
                              </span>
                            </div>
                            <span className="text-zinc-600 text-[9px] flex-shrink-0 tabular-nums">
                              {formatTime(d.ends_at)}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

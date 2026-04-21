import Link from "next/link";

const D: React.CSSProperties = {
  fontFamily: "var(--font-display), system-ui, sans-serif",
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0 hover:opacity-80 transition-opacity">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Based ID" className="w-7 h-7 rounded-lg" />
            <div className="flex items-center gap-1">
              <span style={D} className="font-bold text-sm text-white tracking-tight">Based</span>
              <span className="font-mono text-[11px] text-zinc-500 tracking-widest ml-0.5">ID</span>
            </div>
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 text-center px-6">
        <div className="relative">
          <span
            className="text-[10rem] font-black leading-none select-none"
            style={{
              background: "linear-gradient(180deg,#93c5fd 0%,#1d4ed8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            404
          </span>
        </div>

        <div className="space-y-3 max-w-sm">
          <h1 className="text-3xl font-black tracking-tight">Page not found</h1>
          <p className="text-zinc-500 text-sm leading-relaxed">
            This page doesn&apos;t exist. Your Based ID still does though.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/"
            className="px-8 py-3.5 rounded-lg bg-white text-black text-sm font-bold tracking-wide hover:bg-zinc-100 transition-colors"
          >
            Go home →
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            My dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

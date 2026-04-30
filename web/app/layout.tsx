import type { Metadata } from "next";
import { Barlow_Condensed, Outfit, Geist } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import EnvWarning from "./components/EnvWarning";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import { cn } from "@/lib/utils";

const barlowCondensed = Barlow_Condensed({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://basedid.space"),
  title: "Based ID — The Hunters of Base",
  description:
    "The home for quests, drops, and rewards on Base. Browse free. Participate with a Based ID.",
  keywords: ["Base", "airdrops", "NFT drops", "whitelists", "raffles", "Base NFT", "Alphabot Base", "onchain identity"],
  openGraph: {
    title: "Based ID — The Hunters of Base",
    description:
      "The home for quests, drops, and rewards on Base. One ID. Every opportunity.",
    type: "website",
    siteName: "Based ID",
    images: [{ url: "/api/frame/image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Based ID — The Hunters of Base",
    description:
      "The home for quests, drops, and rewards on Base. One ID. Every opportunity.",
    images: ["/api/frame/image"],
  },
  other: {
    "base:app_id": "69e778cc1fd7bfa1056aef46",
    "fc:frame": "vNext",
    "fc:frame:image": "https://basedid.space/api/frame/image",
    "fc:frame:image:aspect_ratio": "1.91:1",
    "fc:frame:button:1": "Mint Based ID — $2",
    "fc:frame:button:1:action": "link",
    "fc:frame:button:1:target": "https://basedid.space",
    "fc:frame:button:2": "See drops",
    "fc:frame:button:2:action": "link",
    "fc:frame:button:2:target": "https://basedid.space/drops",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", barlowCondensed.variable, geistMono.variable, "font-sans", geist.variable)}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground" style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}>
        <Providers>{children}</Providers>
        <EnvWarning />
        <Analytics />
      </body>
    </html>
  );
}

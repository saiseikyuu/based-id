import type { Metadata } from "next";
import { Space_Grotesk, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import EnvWarning from "./components/EnvWarning";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://basedid.space"),
  title: "Based ID — The base of Airdrops, NFT Drops & Whitelists on Base",
  description:
    "Every Base opportunity — airdrops, NFT drops, whitelists, raffles. One ID gets you in. $2 USDC. Permanent. Bot-free.",
  keywords: ["Base", "airdrops", "NFT drops", "whitelists", "raffles", "Base NFT", "Alphabot Base", "onchain identity"],
  openGraph: {
    title: "Based ID — The base of Airdrops.",
    description:
      "Every Base opportunity — airdrops, NFT drops, whitelists, raffles. One ID. $2.",
    type: "website",
    siteName: "Based ID",
    images: [{ url: "/api/frame/image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Based ID — The base of Airdrops.",
    description:
      "Every Base opportunity — airdrops, NFT drops, whitelists, raffles. One ID. $2.",
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
      className={`${spaceGrotesk.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-mono">
        <Providers>{children}</Providers>
        <EnvWarning />
        <Analytics />
      </body>
    </html>
  );
}

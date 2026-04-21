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
  title: "Based ID — Your Permanent Number on Base",
  description:
    "Mint your permanent sequential identity on Base. $2 USDC flat. The lower your number, the earlier you were. Partner NFT drops and whitelist access included.",
  keywords: ["NFT", "Base", "identity", "onchain", "airdrop", "whitelist", "USDC"],
  openGraph: {
    title: "Based ID — Your Permanent Number on Base",
    description:
      "The lower your number, the earlier you were. $2 USDC flat. Partner drops and whitelist access for every holder.",
    type: "website",
    siteName: "Based ID",
    images: [{ url: "/api/frame/image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Based ID — Your Permanent Number on Base",
    description:
      "Mint once. Keep it forever. $2 USDC flat. Partner NFT drops and whitelist access via your dashboard.",
    images: ["/api/frame/image"],
  },
  other: {
    "base:app_id": "69e778cc1fd7bfa1056aef46",
    "fc:frame": "vNext",
    "fc:frame:image": "https://basedid.space/api/frame/image",
    "fc:frame:image:aspect_ratio": "1.91:1",
    "fc:frame:button:1": "Mint your Based ID →",
    "fc:frame:button:1:action": "link",
    "fc:frame:button:1:target": "https://basedid.space",
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

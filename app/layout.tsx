import type { Metadata } from "next";
import localFont from "next/font/local";
import { SITE } from "@/lib/site";
import "./globals.css";

// self-host。ビルド時に外部へ取りに行かないのでCI/CDが落ちない
const display = localFont({
  src: "../public/fonts/SpaceGrotesk.woff2",
  variable: "--font-display",
  display: "swap",
  weight: "300 700",
});

// 日本語はOS標準に任せる（ヒラギノ/游ゴシック/Noto）。数MBの配信を避ける
const bodyStack =
  '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", "Noto Sans JP", sans-serif';

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.nameEn} — ${SITE.role}`,
    template: `%s — ${SITE.nameEn}`,
  },
  description: SITE.description,
  openGraph: {
    title: `${SITE.nameEn} — ${SITE.role}`,
    description: SITE.description,
    url: SITE.url,
    siteName: SITE.nameEn,
    locale: "ja_JP",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" className={display.variable}>
      <body style={{ ["--font-body" as string]: bodyStack }}>{children}</body>
    </html>
  );
}

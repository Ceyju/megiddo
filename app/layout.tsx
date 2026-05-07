import type { Metadata } from "next";
import { Bebas_Neue, Sora, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const bebasNeue = Bebas_Neue({
  weight: "400",
  variable: "--font-display",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-condensed",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Megiddo — For Close Encounters of the Anime Kind",
  description: "Stream anime online for free. Browse trending, seasonal, and all-time popular anime.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bebasNeue.variable} ${sora.variable} ${barlowCondensed.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-[--ink] text-[--paper]">
        <Navbar />
        <div className="flex-1">{children}</div>
        <footer className="border-t border-[--border] py-8 mt-16">
          <div className="w-full mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-[--muted] text-xs font-body uppercase tracking-widest">
              Powered by AniList &amp; Mangadex
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}

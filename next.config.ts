import type { NextConfig } from "next";
import { PLAYER_FRAME_ORIGINS } from './lib/embed-providers';

const isProduction = process.env.NODE_ENV === "production";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https://s4.anilist.co https://img1.ak.crunchyroll.com https://media.kitsu.app https://uploads.mangadex.org https://books.google.com https://novelfire.net",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss:",
  "worker-src 'self' blob:",
  `frame-src ${PLAYER_FRAME_ORIGINS.join(' ')} https://mangaplus.shueisha.co.jp`,
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  isProduction ? "upgrade-insecure-requests" : "",
].filter(Boolean).join("; ");

const securityHeaders = [
  { key: process.env.CSP_ENFORCE === "true" ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
  ...(isProduction ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }] : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1"],
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  async redirects() {
    return [
      { source: "/novels", destination: "/webnovels", permanent: true },
      { source: "/novels/:path*", destination: "/webnovels/:path*", permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "s4.anilist.co" },
      { protocol: "https", hostname: "img1.ak.crunchyroll.com" },
      { protocol: "https", hostname: "media.kitsu.app" },
      { protocol: "https", hostname: "uploads.mangadex.org" },
      { protocol: "https", hostname: "books.google.com" },
      { protocol: "https", hostname: "novelfire.net" },
      { protocol: "https", hostname: "cm.blazefast.co" },
      { protocol: "https", hostname: "avt.mkklcdnv6temp.com" },
    ],
  },
};

export default nextConfig;

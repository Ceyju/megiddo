import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "s4.anilist.co" },
      { protocol: "https", hostname: "img1.ak.crunchyroll.com" },
      { protocol: "https", hostname: "media.kitsu.app" },
      { protocol: "https", hostname: "**.gogoanime.tel" },
      { protocol: "https", hostname: "gogocdn.net" },
      { protocol: "https", hostname: "**.cdnfile.anilistimages.com" },
      { protocol: "https", hostname: "uploads.mangadex.org" },
      { protocol: "https", hostname: "**.mangadex.network" },
      { protocol: "https", hostname: "**.mangakakalot.tv" },
      { protocol: "https", hostname: "**.mkklcdnv6temp.com" },
      { protocol: "https", hostname: "cm.blazefast.co" },
      { protocol: "https", hostname: "avt.mkklcdnv6temp.com" },
    ],
  },
};

export default nextConfig;

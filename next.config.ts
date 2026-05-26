import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/novels',
        destination: '/webnovels',
        permanent: true,
      },
      {
        source: '/novels/:path*',
        destination: '/webnovels/:path*',
        permanent: true,
      },
    ];
  },
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
      { protocol: "https", hostname: "**.comix.to" },
      { protocol: "https", hostname: "comix.to" },
      { protocol: "https", hostname: "gomanga-api.vercel.app" },
      { protocol: "https", hostname: "**.2xstorage.com" },
      { protocol: "https", hostname: "books.google.com" },
      { protocol: "https", hostname: "**.books.google.com" },
      { protocol: "https", hostname: "novelfire.net" },
      { protocol: "https", hostname: "**.novelfire.net" },
    ],
  },
};

export default nextConfig;
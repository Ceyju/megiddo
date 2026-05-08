import { NextRequest, NextResponse } from "next/server";

interface TorrentioStream {
  name: string;
  title: string;
  infoHash?: string;
  fileIdx?: number;
  behaviorHints?: { filename?: string };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const imdb = searchParams.get("imdb");
  const season = searchParams.get("season") ?? "1";
  const episode = searchParams.get("episode");

  if (!imdb || !episode) {
    return NextResponse.json({ error: "Missing imdb or episode" }, { status: 400 });
  }

  const id = `${imdb}:${season}:${episode}`;
  const url = `https://torrentio.strem.fun/stream/series/${id}.json`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; anime-app/1.0)" },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json({ items: [] });
    }

    const data: { streams?: TorrentioStream[] } = await res.json();

    const items = (data.streams ?? [])
      .filter((s) => s.infoHash)
      .slice(0, 8)
      .map((s) => {
        const magnet = `magnet:?xt=urn:btih:${s.infoHash}${
          s.fileIdx !== undefined ? `&so=${s.fileIdx}` : ""
        }`;
        // Torrentio encodes seeders as "👤 N" in the title field
        const seeders = parseInt(s.title?.match(/👤\s*(\d+)/)?.[1] ?? "0", 10);
        const filename =
          s.behaviorHints?.filename ?? s.title?.split("\n")[0] ?? s.name ?? "";
        return { title: filename, magnet, seeders };
      })
      .sort((a, b) => b.seeders - a.seeders) 
      .slice(0, 8);

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "Internal error", items: [] }, { status: 500 });
  }
}

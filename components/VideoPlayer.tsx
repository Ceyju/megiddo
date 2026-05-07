"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import type { ConsumetSource } from "@/types";
import TorrentPlayer from "./TorrentPlayer";

export interface IframeProvider {
  label: string;
  src: string;
}

export interface StreamingLink {
  name: string;
  url: string;
}

interface VideoPlayerProps {
  sources?: ConsumetSource[];
  refererHeader?: string;
  title?: string;
  iframeSrc?: string;
  iframeProviders?: IframeProvider[];
  torrentQuery?: string;
  streamingLinks?: StreamingLink[];
}

export default function VideoPlayer({ sources, title, iframeSrc, iframeProviders, torrentQuery, streamingLinks }: VideoPlayerProps) {
  const providers: IframeProvider[] = iframeProviders?.length
    ? iframeProviders
    : iframeSrc
    ? [{ label: "SERVER 1", src: iframeSrc }]
    : [];

  // Show IframePlayer if we have iframe providers, torrent fallback, or streaming links
  if (providers.length > 0 || torrentQuery || streamingLinks?.length) {
    return <IframePlayer providers={providers} title={title} torrentQuery={torrentQuery} streamingLinks={streamingLinks ?? []} />;
  }
  return <HlsPlayer sources={sources ?? []} title={title} />;
}

function IframePlayer({ providers, title, torrentQuery, streamingLinks }: {
  providers: IframeProvider[];
  title?: string;
  torrentQuery?: string;
  streamingLinks: StreamingLink[];
}) {
  const [active, setActive] = useState(0);
  const OFFICIAL_IDX = providers.length;
  const TORRENT_IDX = providers.length + (streamingLinks.length > 0 ? 1 : 0);
  const hasTorrent = Boolean(torrentQuery);
  const hasOfficial = streamingLinks.length > 0;
  const isTorrentActive = hasTorrent && active === TORRENT_IDX;
  const isOfficialActive = hasOfficial && active === OFFICIAL_IDX;

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", gap: "4px", padding: "6px 8px", background: "var(--surface)", borderBottom: "1px solid var(--border)", flexWrap: "wrap", alignItems: "center" }}>
        {providers.map((p, i) => (
          <button key={i} onClick={() => setActive(i)} style={{
            fontFamily: "var(--font-condensed, Arial)", fontSize: "0.6rem", letterSpacing: "0.12em",
            textTransform: "uppercase", padding: "4px 12px", cursor: "pointer",
            border: i === active ? "1px solid var(--red)" : "1px solid var(--border-2)",
            background: i === active ? "var(--red)" : "transparent",
            color: i === active ? "var(--paper)" : "var(--paper-2)", transition: "all 0.15s",
          }}>
            {p.label}
          </button>
        ))}
        {hasOfficial && (
          <button onClick={() => setActive(OFFICIAL_IDX)} style={{
            fontFamily: "var(--font-condensed, Arial)", fontSize: "0.6rem", letterSpacing: "0.12em",
            textTransform: "uppercase", padding: "4px 12px", cursor: "pointer",
            border: isOfficialActive ? "1px solid var(--paper)" : "1px solid var(--border-2)",
            background: isOfficialActive ? "var(--paper)" : "transparent",
            color: isOfficialActive ? "var(--ink)" : "var(--paper-2)", transition: "all 0.15s",
          }}>
            ★ OFFICIAL
          </button>
        )}
        {hasTorrent && (
          <button onClick={() => setActive(TORRENT_IDX)} style={{
            fontFamily: "var(--font-condensed, Arial)", fontSize: "0.6rem", letterSpacing: "0.12em",
            textTransform: "uppercase", padding: "4px 12px", cursor: "pointer",
            border: isTorrentActive ? "1px solid var(--lime)" : "1px solid var(--border-2)",
            background: isTorrentActive ? "rgba(196,255,0,0.12)" : "transparent",
            color: isTorrentActive ? "var(--lime)" : "var(--paper-2)", transition: "all 0.15s",
          }}>
            ↓ TORRENT
          </button>
        )}
        <span style={{ fontFamily: "var(--font-condensed, Arial)", fontSize: "0.55rem", color: "var(--muted)", marginLeft: "auto", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Try another server if unavailable
        </span>
      </div>
      {!isTorrentActive && !isOfficialActive && (
        <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", background: "#000" }}>
          <iframe key={providers[active]?.src} src={providers[active]?.src} title={title}
            allowFullScreen allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            referrerPolicy="origin"
            style={{ width: "100%", height: "100%", border: "none", display: "block" }} />
        </div>
      )}
      {isOfficialActive && (
        <div style={{ width: "100%", aspectRatio: "16/9", background: "var(--surface)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.5rem", padding: "2rem" }}>
          <div style={{ fontFamily: "var(--font-display, Impact)", fontSize: "1.1rem", letterSpacing: "0.1em", color: "var(--paper)" }}>
            WATCH OFFICIALLY ON
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center", maxWidth: "480px" }}>
            {streamingLinks.map((s, i) => (
              <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" style={{
                fontFamily: "var(--font-condensed, Arial)", fontSize: "0.75rem", letterSpacing: "0.12em",
                textTransform: "uppercase", padding: "10px 22px",
                border: "1px solid var(--border-2)", color: "var(--paper)", textDecoration: "none",
                background: "transparent", transition: "all 0.15s", display: "inline-flex", alignItems: "center", gap: "6px",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--paper)"; (e.currentTarget as HTMLElement).style.background = "var(--paper)"; (e.currentTarget as HTMLElement).style.color = "var(--ink)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-2)"; (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--paper)"; }}
              >
                {s.name}
                <span style={{ fontSize: "0.55rem", opacity: 0.6 }}>↗</span>
              </a>
            ))}
          </div>
          <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "0.65rem", color: "var(--muted)", textAlign: "center" }}>
            External links — opens in a new tab
          </p>
        </div>
      )}
      {isTorrentActive && torrentQuery && (
        <TorrentPlayer query={torrentQuery} title={title} />
      )}
    </div>
  );
}

function HlsPlayer({ sources, title }: { sources: ConsumetSource[]; title?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [selectedQuality, setSelectedQuality] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const sortedSources = [...sources].sort((a, b) => {
    const order: Record<string, number> = { "1080p": 0, "720p": 1, "480p": 2, "360p": 3, default: 10 };
    return (order[a.quality ?? "default"] ?? 10) - (order[b.quality ?? "default"] ?? 10);
  });
  const currentSource = sortedSources[selectedQuality] ?? sortedSources[0];

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentSource) return;
    setError(null); setLoading(true);
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    if (currentSource.isM3U8 && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hlsRef.current = hls;
      hls.loadSource(currentSource.url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { setLoading(false); video.play().catch(() => {}); });
      hls.on(Hls.Events.ERROR, (_, d) => { if (d.fatal) { setError("Stream failed."); setLoading(false); } });
    } else {
      video.src = currentSource.url;
      video.addEventListener("canplay", () => setLoading(false));
      video.addEventListener("error", () => setError("Failed to load video."));
    }
    return () => { if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; } };
  }, [currentSource]);

  return (
    <div className="relative w-full" style={{ background: "#000", aspectRatio: "16/9" }}>
      {loading && <div className="absolute inset-0 flex items-center justify-center z-10" style={{ background: "rgba(0,0,0,0.85)" }}><div className="animate-spin" style={{ width: "36px", height: "36px", border: "3px solid var(--border-2)", borderTopColor: "var(--red)", borderRadius: "50%" }} /></div>}
      {error && <div className="absolute inset-0 flex flex-col items-center justify-center z-10" style={{ background: "rgba(0,0,0,0.9)" }}><div style={{ fontFamily: "var(--font-display, Impact)", fontSize: "1.5rem", color: "var(--red)" }}>STREAM ERROR</div><p style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{error}</p></div>}
      <video ref={videoRef} className="w-full h-full" controls playsInline title={title} onWaiting={() => setLoading(true)} onPlaying={() => setLoading(false)} onCanPlay={() => setLoading(false)} style={{ display: "block" }} />
    </div>
  );
}
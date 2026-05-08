"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

interface TorrentioResult {
  title: string;
  magnet: string;
  seeders: number;
}

interface TorrentPlayerProps {
  imdbId: string | null;
  episode: number;
  title?: string;
}

type Phase = "searching" | "ready" | "connecting" | "streaming" | "error";

export default function TorrentPlayer({ imdbId, episode, title }: TorrentPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const clientRef = useRef<unknown>(null);

  const [results, setResults] = useState<TorrentioResult[]>([]);
  const [activeMagnet, setActiveMagnet] = useState<string | null>(null);
  const [wtLoaded, setWtLoaded] = useState(false);
  const [phase, setPhase] = useState<Phase>("searching");
  const [msg, setMsg] = useState("Searching torrent index...");
  const [dlPercent, setDlPercent] = useState(0);

  // Fetch Torrentio results
  useEffect(() => {
    if (!imdbId) {
      setPhase("error");
      setMsg("No IMDb ID available for this anime — torrent search unavailable.");
      return;
    }
    setPhase("searching");
    setMsg("Searching torrent index...");
    fetch(`/api/torrentio?imdb=${encodeURIComponent(imdbId)}&season=1&episode=${episode}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.items?.length) {
          setPhase("error");
          setMsg("No results found on Torrentio for this episode.");
          return;
        }
        setResults(data.items);
        setActiveMagnet(data.items[0].magnet);
        setPhase("ready");
        setMsg("Ready — loading WebTorrent...");
      })
      .catch(() => {
        setPhase("error");
        setMsg("Could not reach torrent index.");
      });
  }, [imdbId, episode]);

  // Start streaming when both Torrentio result and WebTorrent are available
  useEffect(() => {
    if (wtLoaded && activeMagnet && phase === "ready") {
      startStream(activeMagnet);
    }
  }, [wtLoaded, activeMagnet, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  function startStream(mag: string) {
    // Destroy any previous client
    const prev = clientRef.current as { destroy?: () => void } | null;
    if (prev?.destroy) prev.destroy();
    clientRef.current = null;

    setPhase("connecting");
    setMsg("Finding peers...");
    setDlPercent(0);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const WT = (window as any).WebTorrent;
    if (!WT) {
      setPhase("error");
      setMsg("WebTorrent failed to load.");
      return;
    }

    const client = new WT();
    clientRef.current = client;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client.add(mag, (torrent: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const file = torrent.files.find((f: any) =>
        /\.(mp4|mkv|webm|m4v|avi)$/i.test(f.name)
      );

      if (!file) {
        setPhase("error");
        setMsg("No playable video file found in this torrent.");
        client.destroy();
        return;
      }

      setMsg(file.name);
      setPhase("streaming");

      if (videoRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        file.renderTo(videoRef.current, { autoplay: true }, (err: any) => {
          if (err) {
            setPhase("error");
            setMsg(err?.message || "Stream render failed.");
          }
        });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      torrent.on("download", () =>
        setDlPercent(Math.round(torrent.progress * 100))
      );
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client.on("error", (err: any) => {
      setPhase("error");
      setMsg(err?.message || "Torrent client error.");
    });
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const c = clientRef.current as { destroy?: () => void } | null;
      if (c?.destroy) c.destroy();
    };
  }, []);

  const isStreaming = phase === "streaming";
  const isSpinning = phase === "searching" || phase === "connecting" || phase === "ready";

  const phaseColor: Record<Phase, string> = {
    searching: "var(--paper-2)",
    ready: "var(--lime)",
    connecting: "var(--paper-2)",
    streaming: "var(--lime)",
    error: "var(--red)",
  };

  const phaseLabel: Record<Phase, string> = {
    searching: "SEARCHING",
    ready: "READY",
    connecting: "CONNECTING",
    streaming: "STREAMING",
    error: "UNAVAILABLE",
  };

  return (
    <>
      {/* Load WebTorrent browser bundle from CDN only when this tab is active */}
      <Script
        src="https://cdn.jsdelivr.net/npm/webtorrent@latest/webtorrent.min.js"
        strategy="afterInteractive"
        onLoad={() => setWtLoaded(true)}
        onError={() => {
          setPhase("error");
          setMsg("WebTorrent CDN failed to load.");
        }}
      />

      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16/9",
          background: "#000",
        }}
      >
        <video
          ref={videoRef}
          controls
          title={title}
          style={{
            width: "100%",
            height: "100%",
            display: isStreaming ? "block" : "none",
          }}
        />

        {!isStreaming && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              padding: "2rem",
            }}
          >
            {isSpinning && (
              <div
                className="animate-spin"
                style={{
                  width: "32px",
                  height: "32px",
                  border: "3px solid var(--border-2)",
                  borderTopColor: "var(--lime)",
                  borderRadius: "50%",
                }}
              />
            )}
            <div
              style={{
                fontFamily: "var(--font-display, Impact)",
                fontSize: "1.2rem",
                letterSpacing: "0.1em",
                color: phaseColor[phase],
              }}
            >
              {phaseLabel[phase]}
            </div>
            <p
              style={{
                fontFamily: "var(--font-body, sans-serif)",
                fontSize: "0.72rem",
                color: "var(--muted)",
                textAlign: "center",
                maxWidth: "320px",
                lineHeight: 1.5,
              }}
            >
              {msg}
            </p>
            {phase === "error" && (
              <p
                style={{
                  fontFamily: "var(--font-condensed, Arial)",
                  fontSize: "0.6rem",
                  color: "var(--border-2)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Try a different server above
              </p>
            )}
          </div>
        )}

        {/* Download progress bar */}
        {(phase === "connecting" || phase === "streaming") && dlPercent > 0 && (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "3px",
              background: "var(--border)",
            }}
          >
            <div
              style={{
                width: `${dlPercent}%`,
                height: "100%",
                background: "var(--lime)",
                transition: "width 0.5s ease",
              }}
            />
          </div>
        )}
      </div>

      {/* Source switcher (multiple results) */}
      {results.length > 1 && (
        <div
          style={{
            padding: "6px 8px",
            background: "var(--surface)",
            borderTop: "1px solid var(--border)",
            display: "flex",
            gap: "4px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-condensed, Arial)",
              fontSize: "0.55rem",
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginRight: "4px",
            }}
          >
            TORRENT:
          </span>
          {results.map((r, i) => (
            <button
              key={i}
              title={r.title}
              onClick={() => {
                setActiveMagnet(r.magnet);
                setPhase("ready");
              }}
              style={{
                fontFamily: "var(--font-condensed, Arial)",
                fontSize: "0.55rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "3px 10px",
                cursor: "pointer",
                border:
                  r.magnet === activeMagnet
                    ? "1px solid var(--lime)"
                    : "1px solid var(--border-2)",
                background:
                  r.magnet === activeMagnet
                    ? "rgba(196,255,0,0.08)"
                    : "transparent",
                color:
                  r.magnet === activeMagnet ? "var(--lime)" : "var(--paper-2)",
                maxWidth: "180px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              #{i + 1} · {r.seeders}S
            </button>
          ))}
        </div>
      )}
    </>
  );
}

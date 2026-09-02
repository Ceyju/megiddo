"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface IframeProvider {
  label: string;
  src: string;
  experimental?: boolean;
  parameterSummary?: string;
}

export interface StreamingLink {
  name: string;
  url: string;
}

interface VideoPlayerProps {
  title?: string;
  iframeSrc?: string;
  iframeProviders?: IframeProvider[];
  streamingLinks?: StreamingLink[];
}

const EMBED_HOSTS = new Set([
  "vidfast.pro",
  "vidfast.vc",
  "vidlink.pro",
  "dropfile.cc",
]);
const EMBED_POLICY_VERSION = "vidfast-unsandboxed-v1";
const EXPERIMENTAL_PROVIDER_TIMEOUT_MS = 12_000;

function safeHttpsUrl(value: string, allowedHosts?: Set<string>) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || (allowedHosts && !allowedHosts.has(url.hostname))) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export default function VideoPlayer({ title, iframeSrc, iframeProviders, streamingLinks = [] }: VideoPlayerProps) {
  const providers = (iframeProviders?.length ? iframeProviders : iframeSrc ? [{ label: "SERVER 1", src: iframeSrc }] : [])
    .flatMap((provider) => {
      const src = safeHttpsUrl(provider.src, EMBED_HOSTS);
      return src ? [{ ...provider, src }] : [];
    });
  return <IsolatedPlayer providers={providers} title={title} streamingLinks={streamingLinks} />;
}

function IsolatedPlayer({ providers, title, streamingLinks }: {
  providers: IframeProvider[];
  title?: string;
  streamingLinks: StreamingLink[];
}) {
  const [active, setActive] = useState(0);
  const [iframeAttempt, setIframeAttempt] = useState(0);
  const [loadedAttemptKey, setLoadedAttemptKey] = useState<string | null>(null);
  const [timedOutAttemptKey, setTimedOutAttemptKey] = useState<string | null>(null);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const playerRef = useRef<HTMLElement>(null);
  const officialLinks = streamingLinks.flatMap((link) => {
    const url = safeHttpsUrl(link.url);
    return url ? [{ ...link, url }] : [];
  });
  const officialIndex = providers.length;
  const isOfficial = officialLinks.length > 0 && active === officialIndex;
  const provider = providers[active] ?? providers[0];
  const vidfastIndex = providers.findIndex((item) => item.label.toLowerCase() === "vidfast");
  const isFullscreen = isNativeFullscreen || isTheaterMode;
  const providerAttemptKey = provider ? `${provider.src}:${iframeAttempt}` : "";
  const isProviderTimedOut = timedOutAttemptKey === providerAttemptKey;

  useEffect(() => {
    if (!provider?.experimental || isOfficial || loadedAttemptKey === providerAttemptKey) return;

    const timeout = window.setTimeout(() => {
      setTimedOutAttemptKey(providerAttemptKey);
    }, EXPERIMENTAL_PROVIDER_TIMEOUT_MS);

    return () => window.clearTimeout(timeout);
  }, [isOfficial, loadedAttemptKey, provider?.experimental, providerAttemptKey]);

  useEffect(() => {
    const syncFullscreenState = () => {
      const playerIsFullscreen = document.fullscreenElement === playerRef.current;
      setIsNativeFullscreen(playerIsFullscreen);
      if (playerIsFullscreen) setIsTheaterMode(false);
    };

    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  useEffect(() => {
    if (!isTheaterMode) return;

    document.body.classList.add("player-theater-open");
    const exitOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsTheaterMode(false);
    };
    document.addEventListener("keydown", exitOnEscape);

    return () => {
      document.body.classList.remove("player-theater-open");
      document.removeEventListener("keydown", exitOnEscape);
    };
  }, [isTheaterMode]);

  const toggleFullscreen = async () => {
    const player = playerRef.current;
    if (!player) return;

    if (document.fullscreenElement === player) {
      try {
        await document.exitFullscreen();
      } catch {
        // The fullscreenchange event remains the source of truth if exit is denied.
      }
      return;
    }

    if (isTheaterMode) {
      setIsTheaterMode(false);
      return;
    }

    if (typeof player.requestFullscreen === "function") {
      try {
        await player.requestFullscreen();
        if (document.fullscreenElement !== player) setIsTheaterMode(true);
        return;
      } catch {
        // Some embedded browsers expose the API but reject fullscreen requests.
      }
    }

    setIsTheaterMode(true);
  };

  const handleProviderLoad = () => {
    setLoadedAttemptKey(providerAttemptKey);
    setTimedOutAttemptKey(null);
  };

  const selectProvider = (index: number) => {
    setActive(index);
    setIframeAttempt((attempt) => attempt + 1);
  };

  const retryProvider = () => setIframeAttempt((attempt) => attempt + 1);

  return (
    <section
      ref={playerRef}
      className={`player-shell${isTheaterMode ? " is-theater-mode" : ""}`}
      aria-label={title ? `${title} player` : "Media player"}
    >
      <div className="provider-tabs" role="tablist" aria-label="Playback source">
        {providers.map((item, index) => (
          <button
            className="provider-tab"
            role="tab"
            aria-selected={index === active}
            aria-label={`${item.label}${item.experimental ? " experimental" : ""}`}
            key={item.src}
            onClick={() => selectProvider(index)}
          >
            <span>{item.label}</span>
            {item.experimental && <span className="provider-experimental-badge">Experimental</span>}
          </button>
        ))}
        {officialLinks.length > 0 && (
          <button className="provider-tab" role="tab" aria-selected={isOfficial} onClick={() => setActive(officialIndex)}>Official</button>
        )}
        {/* <span className="provider-help">Try another source if playback is unavailable</span> -- check on this if there is another source available */}
      </div>

      {!isOfficial && provider && (
        <>
          {provider.experimental && (
            <div className="provider-experimental-notice" role="note" aria-label={`${provider.label} experimental provider notice`}>
              <span><strong>Experimental source.</strong> This third-party player may be unavailable, and the app cannot inspect failures inside it.</span>
              {provider.parameterSummary && <code>{provider.parameterSummary}</code>}
            </div>
          )}
          <div className="player-frame">
            <iframe
              key={`${EMBED_POLICY_VERSION}:${provider.src}:${iframeAttempt}`}
              src={provider.src}
              title={title ?? provider.label}
              allowFullScreen
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              referrerPolicy="no-referrer"
              onLoad={handleProviderLoad}
            />
            {isProviderTimedOut && (
              <div className="provider-timeout" role="alert">
                <strong>Provider is taking too long</strong>
                <span>{provider.label} did not finish loading. You can retry it or return to VidFast.</span>
                <div className="provider-timeout-actions">
                  <button type="button" className="editorial-button" onClick={retryProvider}>Retry provider</button>
                  {vidfastIndex >= 0 && active !== vidfastIndex && (
                    <button type="button" className="editorial-button" onClick={() => selectProvider(vidfastIndex)}>Back to VidFast</button>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="player-frame-actions">
            {/* <a className="player-external-link" href={provider.src} target="_blank" rel="noopener noreferrer">Open provider externally</a> */}
            <button
              type="button"
              className="player-fullscreen-button"
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              aria-pressed={isFullscreen}
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
              <span>{isFullscreen ? "Exit fullscreen" : ""}</span>
            </button>
          </div>
        </>
      )}

      {!isOfficial && !provider && (
        <div className="player-empty" role="status">No safe embedded provider is available.</div>
      )}

      {isOfficial && (
        <div className="player-empty">
          <h2>Watch officially on</h2>
          <div className="provider-links">
            {officialLinks.map((link) => <a className="editorial-button" key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">{link.name} ↗</a>)}
          </div>
          <p>External links open in a new tab.</p>
        </div>
      )}
    </section>
  );
}

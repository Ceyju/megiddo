"use client";

import { useState } from "react";

export interface IframeProvider {
  label: string;
  src: string;
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
]);

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
  const officialLinks = streamingLinks.flatMap((link) => {
    const url = safeHttpsUrl(link.url);
    return url ? [{ ...link, url }] : [];
  });
  const officialIndex = providers.length;
  const isOfficial = officialLinks.length > 0 && active === officialIndex;
  const provider = providers[active] ?? providers[0];

  return (
    <section className="player-shell" aria-label={title ? `${title} player` : "Media player"}>
      <div className="provider-tabs" role="tablist" aria-label="Playback source">
        {providers.map((item, index) => (
          <button className="provider-tab" role="tab" aria-selected={index === active} key={item.src} onClick={() => setActive(index)}>
            {item.label}
          </button>
        ))}
        {officialLinks.length > 0 && (
          <button className="provider-tab" role="tab" aria-selected={isOfficial} onClick={() => setActive(officialIndex)}>Official</button>
        )}
        {/* <span className="provider-help">Try another source if playback is unavailable</span> -- check on this if there is another source available */}
      </div>

      {!isOfficial && provider && (
        <>
          <div className="player-frame">
            <iframe
              key={provider.src}
              src={provider.src}
              title={title ?? provider.label}
              allowFullScreen
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="player-frame-actions">
            <a className="player-external-link" href={provider.src} target="_blank" rel="noopener noreferrer">Open provider externally</a>
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

import Link from 'next/link';

interface Props {
  title?: string;
  message?: string;
  backHref: string;
  backLabel: string;
  retryHref?: string;
  officialLinks?: Array<{ label: string; url: string }>;
}

export default function ProviderUnavailable({ title = 'Source temporarily unavailable', message = 'Please retry or choose another chapter.', backHref, backLabel, retryHref, officialLinks = [] }: Props) {
  return (
    <section role="status" className="player-empty" style={{ padding: '3rem 1.5rem' }}>
      <h1 style={{ fontSize: '1.5rem' }}>{title}</h1>
      <p>{message}</p>
      <div className="provider-links">
        <Link className="editorial-button" href={backHref}>{backLabel}</Link>
        {retryHref && <a className="editorial-button" href={retryHref}>Retry</a>}
        {officialLinks.map(link => <a key={link.url} className="editorial-button" href={link.url} target="_blank" rel="noopener noreferrer">{link.label} ↗</a>)}
      </div>
    </section>
  );
}

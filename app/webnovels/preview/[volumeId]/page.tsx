import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getGBVolumeById } from '@/lib/googlebooks';
import { parseNovel } from '@/lib/novelfire';
import NovelFirePanel from '@/components/NovelFirePanel';

function titleToNFSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[''`]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

interface Props {
  params: Promise<{ volumeId: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { volumeId } = await params;
  const vol = await getGBVolumeById(volumeId);
  return {
    title: vol ? `${vol.title} — Preview · Megiddo` : 'Preview · Megiddo',
  };
}

export default async function PreviewPage({ params }: Props) {
  const { volumeId } = await params;

  // Basic validation — Google Books IDs are alphanumeric
  if (!/^[A-Za-z0-9_-]{4,40}$/.test(volumeId)) return notFound();

  const vol = await getGBVolumeById(volumeId);
  if (!vol) return notFound();

  const year = vol.publishedDate?.slice(0, 4) ?? null;
  const nfSlug = titleToNFSlug(vol.title);
  const nfNovel = await parseNovel(nfSlug);
  const coverUrl = nfNovel?.coverUrl ?? null;
  console.log('[preview] slug:', nfSlug, '| nfNovel:', nfNovel ? 'found' : 'null', '| coverUrl:', coverUrl);

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '0 0 5rem' }}>

      {/* ── Breadcrumb / back ── */}
      <nav style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Link
          href="/webnovels"
          style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', textDecoration: 'none' }}
        >
          ← Light Novels
        </Link>
        <span style={{ color: 'var(--border-2)', fontSize: '0.6rem' }}>›</span>
        <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--paper-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {vol.title}
        </span>
      </nav>

      {/* ── Layout: sidebar + viewer ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 220px) 1fr', gap: 0 }}>

        {/* ── Sidebar ── */}
        <aside style={{ borderRight: '1px solid var(--border)', padding: '1.5rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Cover */}
          {coverUrl ? (
            <div style={{ width: '100%', aspectRatio: '2/3', position: 'relative', border: '1px solid var(--border)' }}>
              <Image
                src={coverUrl}
                alt={vol.title}
                fill
                unoptimized
                sizes="220px"
                style={{ objectFit: 'cover' }}
                priority
              />
            </div>
          ) : (
            <div style={{ width: '100%', aspectRatio: '2/3', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.6rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>No Cover</span>
            </div>
          )}

          {/* Title */}
          <h1 style={{ fontFamily: 'var(--font-display, Impact)', fontSize: 'clamp(1rem, 2.5vw, 1.4rem)', letterSpacing: '0.02em', color: 'var(--paper)', margin: 0, lineHeight: 1.15 }}>
            {vol.title}
          </h1>

          {/* Meta rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {vol.authors.length > 0 && (
              <MetaRow label="Author" value={vol.authors.join(', ')} />
            )}
            {vol.publisher && (
              <MetaRow label="Publisher" value={vol.publisher} />
            )}
            {year && (
              <MetaRow label="Year" value={year} />
            )}
            {vol.pageCount && (
              <MetaRow label="Pages" value={vol.pageCount.toString()} />
            )}
            {vol.averageRating && (
              <MetaRow label="Rating" value={`★ ${vol.averageRating.toFixed(1)}`} />
            )}
          </div>

          {/* Description */}
          {vol.description && (
            <p style={{ fontFamily: 'var(--font-body, sans-serif)', fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.65, margin: 0, borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
              {vol.description.replace(/<[^>]*>/g, '').slice(0, 320)}{vol.description.length > 320 ? '…' : ''}
            </p>
          )}

          {/* External link */}
          {vol.previewLink && (
            <a
              href={vol.previewLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', textDecoration: 'none', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', display: 'block' }}
            >
              Open on Google Books ↗
            </a>
          )}
        </aside>

        {/* ── NovelFire reader panel ── */}
        <div style={{ borderTop: '2px solid var(--red)', overflow: 'hidden' }}>
          <NovelFirePanel initialSlug={nfSlug} novelTitle={vol.title} />
        </div>
      </div>

      {/* Responsive: stack on mobile */}
      <style>{`
        @media (max-width: 680px) {
          div[style*="gridTemplateColumns"] {
            grid-template-columns: 1fr !important;
          }
          aside[style*="borderRight"] {
            border-right: none !important;
            border-bottom: 1px solid var(--border);
            flex-direction: row !important;
            flex-wrap: wrap;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline' }}>
      <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--border-2)', flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ fontFamily: 'var(--font-body, sans-serif)', fontSize: '0.7rem', color: 'var(--paper-2)', lineHeight: 1.3 }}>
        {value}
      </span>
    </div>
  );
}

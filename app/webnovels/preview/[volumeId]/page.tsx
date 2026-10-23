import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getGBVolumeById } from '@/lib/googlebooks';
import { parseNovel } from '@/lib/novelfire';
import NovelFirePanel from '@/components/NovelFirePanel';
import ProviderUnavailable from '@/components/ProviderUnavailable';

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
  const vol = await getGBVolumeById(volumeId).catch(() => null);
  return {
    title: vol ? `${vol.title} — Preview · Megiddo` : 'Preview · Megiddo',
  };
}

export default async function PreviewPage({ params }: Props) {
  const { volumeId } = await params;

  // Basic validation — Google Books IDs are alphanumeric
  if (!/^[A-Za-z0-9_-]{4,40}$/.test(volumeId)) return notFound();

  let vol;
  try { vol = await getGBVolumeById(volumeId); }
  catch {
    return <ProviderUnavailable title="Book metadata temporarily unavailable" message="The book service could not return metadata. Native novel reading is still available from the novel library." backHref="/webnovels" backLabel="Browse novels" retryHref={`/webnovels/preview/${volumeId}`} />;
  }
  if (!vol) return notFound();

  const year = vol.publishedDate?.slice(0, 4) ?? null;
  const nfSlug = titleToNFSlug(vol.title);
  const nfNovel = await parseNovel(nfSlug).catch(() => null);
  const coverUrl = nfNovel?.coverUrl ?? vol.coverUrl;

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '0 0 5rem' }}>

      {/* ── Breadcrumb / back ── */}
      <nav className="page-gutter" style={{ paddingBlock: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
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
      <div className="novel-preview-layout grid grid-cols-[minmax(0,1fr)] md:grid-cols-[220px_minmax(0,1fr)]">

        {/* ── Sidebar ── */}
        <aside className="novel-preview-sidebar page-gutter min-w-0" style={{ paddingBlock: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Cover */}
          {coverUrl ? (
            <div style={{ width: '100%', maxWidth: '180px', aspectRatio: '2/3', position: 'relative', border: '1px solid var(--border)' }}>
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
        <div className="min-w-0" style={{ borderTop: '2px solid var(--red)' }}>
          <NovelFirePanel initialSlug={nfSlug} novelTitle={vol.title} />
        </div>
      </div>

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

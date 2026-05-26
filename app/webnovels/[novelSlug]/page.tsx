import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getNovelChapters } from '@/lib/novelfire';
import NovelChapterList from '@/components/NovelChapterList';

interface Props {
  params: Promise<{ novelSlug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { novelSlug } = await params;
  try {
    const { novel } = await getNovelChapters(novelSlug, 1);
    return {
      title: `${novel.title} — Chapters · Megiddo`,
      description: `Read ${novel.title} chapters online. ${novel.totalChapters ?? ''} chapters available.`,
    };
  } catch {
    return { title: 'Novel — Megiddo' };
  }
}

export default async function NovelChaptersPage({ params }: Props) {
  const { novelSlug } = await params;

  if (!/^[a-z0-9-]{1,80}$/.test(novelSlug)) return notFound();

  let data: Awaited<ReturnType<typeof getNovelChapters>>;
  try {
    data = await getNovelChapters(novelSlug, 1);
  } catch {
    return notFound();
  }

  const { novel, chapters } = data;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 0 5rem' }}>

      {/* ── Breadcrumb ───────────────────────────────────────── */}
      <nav style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {[
          { label: 'Novel', href: '/webnovels' },
          { label: novel.title, href: null },
          { label: 'Chapters', href: null },
        ].map((crumb, i, arr) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {crumb.href ? (
              <Link
                href={crumb.href}
                style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', textDecoration: 'none' }}
              >
                {crumb.label}
              </Link>
            ) : (
              <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--paper-2)' }}>
                {crumb.label}
              </span>
            )}
            {i < arr.length - 1 && (
              <span style={{ color: 'var(--border-2)', fontSize: '0.6rem' }}>›</span>
            )}
          </span>
        ))}
      </nav>

      {/* ── Novel header ─────────────────────────────────────── */}
      <header style={{ padding: '1.75rem 1.5rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
        {/* Cover */}
        {novel.coverUrl && (
          <div style={{ flexShrink: 0, width: '64px', height: '88px', position: 'relative', border: '1px solid var(--border)' }}>
            <Image
              src={novel.coverUrl}
              alt={novel.title}
              fill
              unoptimized
              sizes="64px"
              style={{ objectFit: 'cover' }}
            />
          </div>
        )}
        {/* Meta */}
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: 'var(--font-display, Impact)', fontSize: 'clamp(1.4rem, 4vw, 2.2rem)', letterSpacing: '0.02em', color: 'var(--red)', margin: '0 0 4px' }}>
            {novel.title}
          </h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '4px' }}>
            {novel.updatedAt && (
              <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.65rem', letterSpacing: '0.08em', color: 'var(--muted)', textTransform: 'uppercase' }}>
                Updated {novel.updatedAt}
              </span>
            )}
            {novel.status && (
              <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.65rem', letterSpacing: '0.08em', color: 'var(--muted)', textTransform: 'uppercase' }}>
                Status: {novel.status}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ── Chapter section title ─────────────────────────────── */}
      <div style={{ padding: '1.5rem 1.5rem 0.75rem', borderBottom: '1px solid var(--border)' }}>
        <h2 style={{ fontFamily: 'var(--font-display, Impact)', fontSize: 'clamp(1.1rem, 3vw, 1.6rem)', letterSpacing: '0.04em', color: 'var(--paper)', margin: '0 0 8px' }}>
          {novel.title} 
        </h2>
        {novel.totalChapters && (
          <p style={{ fontFamily: 'var(--font-body, sans-serif)', fontSize: '0.78rem', color: 'var(--muted)', margin: '0 0 6px', lineHeight: 1.5 }}>
            A total of <strong style={{ color: 'var(--paper-2)' }}>{novel.totalChapters.toLocaleString()}</strong> chapters have been translated.
          </p>
        )}
        {novel.latestChapter && (
          <p style={{ fontFamily: 'var(--font-body, sans-serif)', fontSize: '0.78rem', color: 'var(--muted)', margin: 0 }}>
            Latest Release:{' '}
            <span style={{ color: 'var(--red)', cursor: 'pointer' }}>
              {novel.latestChapter.title}
            </span>
          </p>
        )}
      </div>

      {/* ── Chapter list + inline reader (client) ─────────────── */}
      <Suspense fallback={
        <div style={{ padding: '3rem 1.5rem', textAlign: 'center', fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.65rem', letterSpacing: '0.14em', color: 'var(--muted)', textTransform: 'uppercase' }}>
          LOADING CHAPTERS…
        </div>
      }>
        <NovelChapterList
          slug={novelSlug}
          novel={novel}
          initialChapters={chapters}
          initialTotalPages={novel.totalPages}
        />
      </Suspense>
    </div>
  );
}

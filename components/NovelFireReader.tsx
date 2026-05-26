'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { NFChapterContent } from '@/lib/novelfire';

export interface ReadingProgress {
  novelSlug: string;
  chapterSlug: string;
  chapterNumber: string | null;
  progressPercent: number;
  paragraphIndex: number;
  scrollY: number;
  savedAt: number;
}

interface ReaderSettings {
  fontSize: number;
  lineHeight: number;
  theme: 'dark' | 'sepia' | 'light';
  fontFamily: 'serif' | 'sans' | 'mono';
}

const DEFAULT_SETTINGS: ReaderSettings = { fontSize: 18, lineHeight: 1.9, theme: 'dark', fontFamily: 'serif' };

const THEMES = {
  dark:  { bg: '#0e0e0e', text: '#e8e4dc', muted: '#666', border: '#222' },
  sepia: { bg: '#fdf6e3', text: '#433422', muted: '#9e896c', border: '#d6c9a4' },
  light: { bg: '#ffffff', text: '#1a1a1a', muted: '#888', border: '#e0e0e0' },
};

const FONTS = {
  serif: 'Georgia, "Times New Roman", serif',
  sans:  '"Inter", "Helvetica Neue", Arial, sans-serif',
  mono:  '"JetBrains Mono", "Courier New", monospace',
};

const STORAGE_KEY = 'nf_progress_';

function saveProgress(p: ReadingProgress) {
  try {
    localStorage.setItem(`${STORAGE_KEY}${p.novelSlug}__${p.chapterSlug}`, JSON.stringify(p));
    localStorage.setItem(`${STORAGE_KEY}last__${p.novelSlug}`, JSON.stringify({
      chapterSlug: p.chapterSlug, chapterNumber: p.chapterNumber,
      progressPercent: p.progressPercent, savedAt: p.savedAt,
    }));
  } catch {}
}

export function loadProgress(novelSlug: string, chapterSlug: string): ReadingProgress | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}${novelSlug}__${chapterSlug}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function loadLastReadChapter(novelSlug: string) {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}last__${novelSlug}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function loadSettings(): ReaderSettings {
  try {
    const raw = localStorage.getItem('nf_reader_settings');
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch { return DEFAULT_SETTINGS; }
}

function saveSettings(s: ReaderSettings) {
  try { localStorage.setItem('nf_reader_settings', JSON.stringify(s)); } catch {}
}

interface Props {
  novelSlug: string;
  chapterSlug: string;
  chapter: NFChapterContent;
  onProgress?: (p: ReadingProgress) => void;
}

type ThemeKey = keyof typeof THEMES;

export default function NovelFireReader({ novelSlug, chapterSlug, chapter, onProgress }: Props) {
  const paragraphRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const progressRef = useRef(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [restored, setRestored] = useState(false);

  useEffect(() => { setSettings(loadSettings()); }, []);

  useEffect(() => {
    if (restored) return;
    const saved = loadProgress(novelSlug, chapterSlug);
    if (saved?.scrollY) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: saved.scrollY, behavior: 'instant' });
        setCurrentProgress(saved.progressPercent);
        progressRef.current = saved.progressPercent;
        setRestored(true);
      });
    } else {
      window.scrollTo({ top: 0 });
      setRestored(true);
    }
  }, [novelSlug, chapterSlug, restored]);

  useEffect(() => {
    const paras = paragraphRefs.current.filter(Boolean) as HTMLParagraphElement[];
    if (!paras.length) return;
    const visible = new Set<number>();

    const observer = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const idx = parseInt(e.target.getAttribute('data-idx') ?? '0');
        e.isIntersecting ? visible.add(idx) : visible.delete(idx);
      }
      const max = visible.size ? Math.max(...visible) : 0;
      const pct = Math.round((max / Math.max(paras.length - 1, 1)) * 100);
      if (Math.abs(pct - progressRef.current) < 2) return;
      progressRef.current = pct;
      setCurrentProgress(pct);

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        const p: ReadingProgress = {
          novelSlug, chapterSlug, chapterNumber: chapter.chapterNumber,
          progressPercent: pct, paragraphIndex: max,
          scrollY: window.scrollY, savedAt: Date.now(),
        };
        saveProgress(p);
        onProgress?.(p);
        window.dispatchEvent(new CustomEvent('nf:progress', { detail: p }));
      }, 500);
    }, { threshold: 0.3 });

    paras.forEach(p => observer.observe(p));
    return () => { observer.disconnect(); if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [novelSlug, chapterSlug, chapter.chapterNumber, chapter.paragraphs, onProgress]);

  const updateSettings = useCallback((patch: Partial<ReaderSettings>) => {
    setSettings(prev => { const next = { ...prev, ...patch }; saveSettings(next); return next; });
  }, []);

  const theme = THEMES[settings.theme];
  const fontFamily = FONTS[settings.fontFamily];
  const avgWPM = 250;
  const minutesLeft = Math.max(1, Math.ceil((chapter.wordCount * (1 - currentProgress / 100)) / avgWPM));

  function btnStyle(active = false): React.CSSProperties {
    return {
      padding: '6px 20px', fontFamily: 'var(--font-condensed, Arial)',
      fontSize: '0.6rem', letterSpacing: '0.08em',
      background: active ? 'var(--red, #e53935)' : 'transparent',
      border: `1px solid ${active ? 'var(--red, #e53935)' : theme.border}`,
      color: active ? '#fff' : theme.muted, cursor: 'pointer',
    };
  }

  return (
    <div style={{ background: theme.bg, minHeight: '100vh', transition: 'background 0.2s' }}>

      {/* Top bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: theme.bg, borderBottom: `1px solid ${theme.border}`, padding: '0.5rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <a href={`/webnovels/${novelSlug}`} style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '1rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: theme.muted, textDecoration: 'none', flexShrink: 0 }}>
            ← CHAPTERS
          </a>
          <span style={{ color: theme.border }}>·</span>
          <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '1rem', color: theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {chapter.title}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '1rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: theme.muted }}>~{minutesLeft}m left</span>
          <button onClick={() => setShowSettings(s => !s)} style={btnStyle(showSettings)}>Aa</button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: '2px', background: theme.border }}>
        <div style={{ height: '100%', background: 'var(--red, #e53935)', width: `${currentProgress}%`, transition: 'width 0.4s ease' }} />
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div style={{ background: theme.bg, borderBottom: `1px solid ${theme.border}`, padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '1rem', textTransform: 'uppercase', color: theme.muted }}>SIZE</span>
            <button onClick={() => updateSettings({ fontSize: Math.max(14, settings.fontSize - 1) })} style={btnStyle()}>−</button>
            <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '1rem', color: theme.text, minWidth: '24px', textAlign: 'center' }}>{settings.fontSize}</span>
            <button onClick={() => updateSettings({ fontSize: Math.min(28, settings.fontSize + 1) })} style={btnStyle()}>+</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '1rem', textTransform: 'uppercase', color: theme.muted }}>LINE</span>
            {([1.5, 1.9, 2.4] as const).map(lh => (
              <button key={lh} onClick={() => updateSettings({ lineHeight: lh })} style={btnStyle(settings.lineHeight === lh)}>
                {lh === 1.5 ? 'Tight' : lh === 1.9 ? 'Normal' : 'Wide'}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '1rem', textTransform: 'uppercase', color: theme.muted }}>FONT</span>
            {(['serif', 'sans', 'mono'] as const).map(f => (
              <button key={f} onClick={() => updateSettings({ fontFamily: f })} style={btnStyle(settings.fontFamily === f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '1rem', textTransform: 'uppercase', color: theme.muted }}>THEME</span>
            {(['dark', 'sepia', 'light'] as const).map(t => (
              <button key={t} onClick={() => updateSettings({ theme: t })}
                style={{ ...btnStyle(settings.theme === t), background: THEMES[t].bg, color: THEMES[t].text, border: `1px solid ${settings.theme === t ? 'var(--red, #e53935)' : theme.border}` }}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '3rem 1.5rem 6rem' }}>
        <p style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.75rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: theme.muted, marginBottom: '0.5rem', fontWeight: 400 }}>
          {chapter.chapterNumber ? `Chapter ${chapter.chapterNumber}` : 'Chapter'}
        </p>
        <h1 style={{ fontFamily: fontFamily, fontSize: `${Math.round(settings.fontSize * 1.3)}px`, color: theme.text, lineHeight: 1.2, marginBottom: '2.5rem', fontWeight: 600 }}>
          {chapter.title}
        </h1>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '2.5rem', paddingBottom: '1.5rem', borderBottom: `1px solid ${theme.border}` }}>
          <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: theme.muted }}>{chapter.wordCount.toLocaleString()} words</span>
          <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: theme.muted }}>{Math.ceil(chapter.wordCount / avgWPM)} min read</span>
          <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--red, #e53935)', marginLeft: 'auto' }}>{currentProgress}% read</span>
        </div>

        {chapter.paragraphs.map((para, idx) => (
          <p key={idx} ref={el => { paragraphRefs.current[idx] = el; }} data-idx={idx}
            style={{ fontFamily, fontSize: `${settings.fontSize}px`, lineHeight: settings.lineHeight, color: theme.text, marginBottom: `${settings.lineHeight * 0.8}em`, textIndent: settings.fontFamily === 'serif' ? '2em' : '0' }}>
            {para}
          </p>
        ))}

        {/* Nav */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: '4rem', paddingTop: '2rem', borderTop: `1px solid ${theme.border}` }}>
          {chapter.prevChapterSlug ? (
            <a href={`/webnovels/${novelSlug}/${chapter.prevChapterSlug}`}
              style={{ padding: '10px 20px', fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', border: `1px solid ${theme.border}`, color: theme.muted, textDecoration: 'none' }}>
              ‹ PREV
            </a>
          ) : <div />}
          <a href={`/webnovels/${novelSlug}`}
            style={{ padding: '10px 20px', fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', border: `1px solid ${theme.border}`, color: theme.muted, textDecoration: 'none' }}>
            CHAPTERS
          </a>
          {chapter.nextChapterSlug ? (
            <a href={`/webnovels/${novelSlug}/${chapter.nextChapterSlug}`}
              style={{ padding: '10px 20px', fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', background: 'var(--red, #e53935)', border: '1px solid var(--red, #e53935)', color: '#fff', textDecoration: 'none' }}>
              NEXT ›
            </a>
          ) : (
            <span style={{ padding: '10px 20px', fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.65rem', color: theme.muted }}>END</span>
          )}
        </div>
      </div>
    </div>
  );
}
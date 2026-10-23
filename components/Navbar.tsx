"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

export default function Navbar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [panel, setPanel] = useState<'search' | 'menu' | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const searchTrigger = useRef<HTMLButtonElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const menuOpen = panel === 'menu';
  const searchOpen = panel === 'search';

  useEffect(() => {
    if (searchOpen) searchInput.current?.focus();
  }, [searchOpen]);

  function closePanel(returnFocus = false) {
    if (returnFocus) (searchOpen ? searchTrigger : menuTrigger).current?.focus();
    setPanel(null);
  }

  const pathname = usePathname();
  const isManga = pathname.startsWith("/manga");
  const isNovels = pathname.startsWith("/webnovels");
  const searchPlaceholder = isManga ? "Search manga..." : isNovels ? "Search webnovels..." : "Search anime...";

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    if (isManga) {
      const source = new URLSearchParams(window.location.search).get('source');
      const suffix = source === 'atsumaru' || pathname.startsWith('/manga/atsumaru') ? '&source=atsumaru' : '';
      router.push(`/manga/search?q=${encodeURIComponent(q)}${suffix}`);
    }
    else if (isNovels) router.push(`/webnovels?q=${encodeURIComponent(q)}`);
    else router.push(`/search?q=${encodeURIComponent(q)}`);
    setQuery("");
    setFocused(false);
    closePanel();
  }

  return (
    <header
      style={{ borderBottom: "1px solid var(--border)" }}
      className="site-header sticky top-0 z-50"
      onKeyDown={event => {
        if (event.key === 'Escape' && panel) {
          event.preventDefault();
          closePanel(true);
        }
      }}
    >
      <div
        style={{ background: "rgba(11, 10, 8, 0.92)", backdropFilter: "blur(12px)" }}
        className="site-header__bar page-gutter"
      >
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-1 shrink-0 group"
          style={{ textDecoration: "none" }}
        >
          <span
            style={{
              color: "var(--red)",
              fontFamily: "var(--font-display, Impact)",
              fontSize: "1.75rem",
              letterSpacing: "0.03em",
              lineHeight: 1,
            }}
          >
            MEGI
          </span>
          <span
            style={{
              color: "var(--paper)",
              fontFamily: "var(--font-display, Impact)",
              fontSize: "1.75rem",
              letterSpacing: "0.08em",
              lineHeight: 1,
            }}
          >
            DDO
          </span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex shrink-0 items-center gap-5 lg:gap-7">
          {[ 
            { href: "/", label: "ANIME" },
            { href: "/manga?source=anilist", label: "MANGA/MANHUA/MANHWA" },
            { href: "/webnovels", label: "NOVELS" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`nav-link ${href === "/" ? (!isManga && !isNovels ? "is-active" : "") : pathname.startsWith(href.split("?")[0]) ? "is-active" : ""}`}
              aria-current={href === "/" ? (!isManga && !isNovels ? "page" : undefined) : pathname.startsWith(href.split("?")[0]) ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Search */}
        <form id="site-search-panel" onSubmit={handleSearch} className={`site-search-form${searchOpen ? ' is-open' : ''}`}>
          <label className="sr-only" htmlFor="site-search">{searchPlaceholder}</label>
          <div
            className="site-search-field"
            style={{
              borderBottom: focused
                ? "1px solid var(--red)"
                : "1px solid var(--border-2)",
              transition: "border-color 0.2s",
            }}
          >
            <Search
              style={{ color: focused ? "var(--red)" : "var(--muted)", transition: "color 0.2s" }}
              className="w-3.5 h-3.5 shrink-0"
            />
            <input
              id="site-search"
              ref={searchInput}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={searchPlaceholder}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--paper)",
                fontFamily: "var(--font-body, sans-serif)",
                fontSize: "1rem",
                width: "100%",
                minWidth: 0,
              }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="nav-icon-button"
                style={{ color: "var(--muted)", background: "none", border: "none", cursor: "pointer" }}
              >
                <X className="w-3 h-3" />
              </button>
            )}
            <button type="submit" aria-label="Submit search" className="nav-icon-button"><Search size={18} /></button>
            <button type="button" aria-label="Close search" className="nav-icon-button nav-mobile-button" onClick={() => closePanel(true)}><X size={18} /></button>
          </div>
        </form>

        <button ref={searchTrigger} type="button" className="nav-icon-button nav-mobile-button ml-auto" aria-label="Toggle search" aria-expanded={searchOpen} aria-controls="site-search-panel" onClick={() => setPanel(searchOpen ? null : 'search')}>
          <Search size={20} />
        </button>

        {/* Mobile menu */}
        <button
          className="mobile-menu-button md:hidden"
          ref={menuTrigger}
          type="button"
          onClick={() => setPanel(menuOpen ? null : 'menu')}
          style={{ color: "var(--paper-2)", background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem" }}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
        >
          {menuOpen ? "✕" : "≡"}
        </button>
      </div>

      {menuOpen && (
        <div
          id="mobile-navigation"
          className="site-header__panel md:hidden page-gutter pb-5 pt-3 flex flex-col gap-4"
          style={{ background: "var(--ink-2)", borderBottom: "1px solid var(--border)" }}
        >
          {[
            { href: "/", label: "HOME" },
            { href: "/manga?source=anilist", label: "MANGA" },
            { href: "/webnovels", label: "NOVELS" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => closePanel()}
              aria-current={(href === '/' ? !isManga && !isNovels : pathname.startsWith(href.split('?')[0])) ? 'page' : undefined}
              className="min-h-11 flex items-center"
              style={{
                fontFamily: "var(--font-display, Impact)",
                fontSize: "1.25rem",
                letterSpacing: "0.08em",
                color: "var(--paper-2)",
                textDecoration: "none",
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}

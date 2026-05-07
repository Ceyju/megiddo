"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, X } from "lucide-react";

export default function Navbar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
      setQuery("");
      setFocused(false);
    }
  }

  return (
    <header
      style={{ borderBottom: "1px solid var(--border)" }}
      className="sticky top-0 z-50"
    >
      <div
        style={{ background: "rgba(11, 10, 8, 0.92)", backdropFilter: "blur(12px)" }}
        className="w-full px-6 h-14 flex items-center gap-6"
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
        <nav className="hidden md:flex items-center gap-7 ml-2">
          {[
            { href: "/", label: "HOME" },
            { href: "/search", label: "BROWSE" },
            { href: "/manga", label: "MANGA" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={{
                fontFamily: "var(--font-condensed, Arial)",
                fontSize: "0.78rem",
                letterSpacing: "0.12em",
                color: "var(--paper-2)",
                textDecoration: "none",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) =>
                ((e.target as HTMLElement).style.color = "var(--paper)")
              }
              onMouseLeave={(e) =>
                ((e.target as HTMLElement).style.color = "var(--paper-2)")
              }
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-sm ml-auto">
          <div
            className="flex items-center gap-2 px-3 py-1.5"
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
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Search anime..."
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--paper)",
                fontFamily: "var(--font-body, sans-serif)",
                fontSize: "0.82rem",
                width: "100%",
              }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                style={{ color: "var(--muted)", background: "none", border: "none", cursor: "pointer" }}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </form>

        {/* Mobile menu */}
        <button
          className="md:hidden"
          onClick={() => setMenuOpen((v) => !v)}
          style={{ color: "var(--paper-2)", background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem" }}
          aria-label="Toggle menu"
        >
          {menuOpen ? "✕" : "≡"}
        </button>
      </div>

      {menuOpen && (
        <div
          className="md:hidden px-6 pb-5 pt-3 flex flex-col gap-4"
          style={{ background: "var(--ink-2)", borderBottom: "1px solid var(--border)" }}
        >
          {[
            { href: "/", label: "HOME" },
            { href: "/search", label: "BROWSE" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
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

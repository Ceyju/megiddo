"use client";

import Image from "next/image";
import Link from "next/link";
import { useEditorialCarousel } from "./useEditorialCarousel";
import WobbleCard from "@/components/motion/WobbleCard";

export interface EditorialSlide {
  key: string;
  title: string;
  href: string;
  image: string | null;
  background?: string | null;
  badge: string;
  badgeColor?: string;
  badgeTextColor?: string;
  meta: string[];
  tags: string[];
  action: string;
}

export default function EditorialHeroCarousel({ items, label }: { items: EditorialSlide[]; label: string }) {
  const { current, goTo, next, previous, rootRef, progressRef, pause, resume, onKeyDown } = useEditorialCarousel(items.length);
  if (!items.length) return null;
  const item = items[current];
  const background = item.background || item.image;

  return (
    <section
      ref={rootRef}
      className="editorial-carousel"
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocusCapture={pause}
      onBlurCapture={resume}
    >
      {background && (
        <div data-carousel-bg className="editorial-carousel__background" key={`background-${item.key}`}>
          <Image src={background} alt="" fill sizes="100vw" />
        </div>
      )}
      <div className="editorial-carousel__wash" />
      <div className="editorial-carousel__content">
        <div data-carousel-content className="editorial-carousel__copy" key={`copy-${item.key}`} role="group" aria-roledescription="slide" aria-label={`${current + 1} of ${items.length}: ${item.title}`}>
          <span className="editorial-carousel__badge" style={{ background: item.badgeColor || "var(--red)", color: item.badgeTextColor || "var(--paper)" }}>{item.badge}</span>
          <h2>{item.title}</h2>
          <div className="editorial-carousel__meta">{item.meta.filter(Boolean).map((value) => <span key={value}>{value}</span>)}</div>
          <div className="editorial-carousel__tags">{item.tags.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}</div>
          <Link className="editorial-button editorial-carousel__action" href={item.href}>{item.action}</Link>
        </div>
        {item.image && (
          <WobbleCard className="hero-wobble">
            <div data-carousel-cover className="editorial-carousel__cover" key={`cover-${item.key}`}>
              <Image src={item.image} alt={item.title} fill sizes="200px" />
            </div>
          </WobbleCard>
        )}
      </div>
      <div className="editorial-carousel__indicators" aria-label="Choose slide">
        {items.map((slide, index) => (
          <button className="carousel-indicator" key={slide.key} onClick={() => goTo(index)} aria-label={`Go to slide ${index + 1}: ${slide.title}`} aria-current={index === current}>
            {index === current && <span ref={progressRef} className="carousel-progress" />}
          </button>
        ))}
      </div>
      <div className="editorial-carousel__mobile-controls" aria-label="Featured slides">
        <button type="button" onClick={previous} aria-label="Previous slide" disabled={items.length < 2}>‹</button>
        <span>{current + 1} / {items.length}</span>
        <button type="button" onClick={next} aria-label="Next slide" disabled={items.length < 2}>›</button>
      </div>
    </section>
  );
}


"use client";

export default function CarouselControls({ current, total, onPrevious, onNext }: { current: number; total: number; onPrevious: () => void; onNext: () => void }) {
  return (
    <div className="carousel-controls" aria-label="Carousel controls">
      <button type="button" onClick={onPrevious} aria-label="Previous slide">←</button>
      <span aria-live="polite">{String(current + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
      <button type="button" onClick={onNext} aria-label="Next slide">→</button>
    </div>
  );
}

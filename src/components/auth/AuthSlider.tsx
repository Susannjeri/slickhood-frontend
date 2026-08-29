"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { SliderSlide } from "@/lib/auth-slider.config";

interface AuthSliderProps {
  slides: SliderSlide[];
  interval?: number;
  className?: string;
}

export function AuthSlider({ slides, interval = 5000, className = "rounded-2xl shadow-2xl" }: AuthSliderProps) {
  const [current, setCurrent]           = useState(0);
  const [paused, setPaused]             = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const next = useCallback(
    () => setCurrent((c) => (c + 1) % slides.length),
    [slides.length],
  );
  const prev = useCallback(
    () => setCurrent((c) => (c - 1 + slides.length) % slides.length),
    [slides.length],
  );

  useEffect(() => {
    if (paused || reducedMotion || slides.length <= 1) return;
    const id = setInterval(next, interval);
    return () => clearInterval(id);
  }, [paused, reducedMotion, next, interval, slides.length]);

  if (slides.length === 0) return null;

  return (
    <div
      className={`relative w-full h-full overflow-hidden ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides */}
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          role="img"
          aria-label={slide.alt}
          className={`absolute inset-0 transition-opacity duration-700 ${
            i === current ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          aria-hidden={i !== current}
        >
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            className="object-cover"
            priority={i === 0}
            sizes="60vw"
          />
        </div>
      ))}

      {/* Prev button */}
      {slides.length > 1 && (
        <button
          type="button"
          onClick={prev}
          aria-label="Previous slide"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 hover:bg-black/55 flex items-center justify-center text-white transition-colors focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-1"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
      )}

      {/* Next button */}
      {slides.length > 1 && (
        <button
          type="button"
          onClick={next}
          aria-label="Next slide"
          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 hover:bg-black/55 flex items-center justify-center text-white transition-colors focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-1"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      )}

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div
          role="tablist"
          aria-label="Slide indicators"
          className="absolute bottom-4 left-0 right-0 flex justify-center gap-2"
        >
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={i === current}
              aria-label={`Slide ${i + 1} of ${slides.length}`}
              onClick={() => setCurrent(i)}
              className={`h-1.5 rounded-full transition-all duration-300 focus-visible:outline-2 focus-visible:outline-white ${
                i === current
                  ? "w-6 bg-white"
                  : "w-1.5 bg-white/45 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils";

interface RangeSliderProps {
  min: number;
  max: number;
  step: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  /** Accessible names of the two handles */
  labels: [string, string];
  /** Muted look (e.g. while "skip" is on) – still draggable, dragging is how you opt back in */
  muted?: boolean;
  formatValue?: (value: number) => string;
}

// Both inputs span the whole track; only their thumbs take pointer events, so either handle can be grabbed.
const thumb =
  "pointer-events-none absolute inset-0 h-full w-full appearance-none bg-transparent outline-none " +
  "[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-ink [&::-webkit-slider-thumb]:shadow-md active:[&::-webkit-slider-thumb]:cursor-grabbing " +
  "[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-6 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-ink [&::-moz-range-thumb]:shadow-md " +
  "focus-visible:[&::-webkit-slider-thumb]:ring-4 focus-visible:[&::-webkit-slider-thumb]:ring-ink/20 focus-visible:[&::-moz-range-thumb]:ring-4 focus-visible:[&::-moz-range-thumb]:ring-ink/20";

/** Two-handle slider (native range inputs, so keyboard, touch and screen readers work as usual). */
export function RangeSlider({ min, max, step, value, onChange, labels, muted = false, formatValue }: RangeSliderProps) {
  const [low, high] = value;
  const percent = (n: number) => ((n - min) / (max - min)) * 100;
  return (
    <div className={cn("relative h-8 transition-opacity", muted && "opacity-45")}>
      <div className="absolute inset-x-3 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-black/10">
        <div className="absolute inset-y-0 rounded-full bg-ink" style={{ left: `${percent(low)}%`, right: `${100 - percent(high)}%` }} />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={low}
        aria-label={labels[0]}
        aria-valuetext={formatValue?.(low)}
        onChange={(e) => onChange([Math.min(Number(e.target.value), high - step), high])}
        // The lower handle sits on top only near the right end, so it can still be pulled back from there.
        className={cn(thumb, percent(low) > 90 && "z-10")}
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={high}
        aria-label={labels[1]}
        aria-valuetext={formatValue?.(high)}
        onChange={(e) => onChange([low, Math.max(Number(e.target.value), low + step)])}
        className={thumb}
      />
    </div>
  );
}

"use client";

import { useState } from "react";

/**
 * A number that rolls to its new value (200ms): the old one slides out, the new one in – up when it grows, down when
 * it shrinks (.roll-* in globals.css; reduced motion: it just changes). Screen readers get the plain number.
 */
export function RollingNumber({ value }: { value: number }) {
  const [state, setState] = useState({ value, from: null as number | null, up: true, run: 0 });
  // A new value: remember where it came from and restart the roll (derived from props, no effect needed).
  if (state.value !== value) setState({ value, from: state.value, up: value > state.value, run: state.run + 1 });

  return (
    <span className="relative inline-grid overflow-hidden align-bottom tabular-nums">
      <span className="sr-only">{value}</span>
      {state.from !== null && (
        <span key={`out-${state.run}`} aria-hidden className={`col-start-1 row-start-1 ${state.up ? "roll-out-up" : "roll-out-down"}`}>
          {state.from}
        </span>
      )}
      <span
        key={`in-${state.run}`}
        aria-hidden
        className={`col-start-1 row-start-1 ${state.from === null ? "" : state.up ? "roll-in-up" : "roll-in-down"}`}
        onAnimationEnd={() => setState((s) => (s.from === null ? s : { ...s, from: null }))}
      >
        {value}
      </span>
    </span>
  );
}

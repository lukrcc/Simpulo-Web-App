"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { SPOTLIGHT_THEME_LINES, SPOTLIGHT_THEME_LINES_VISITOR, spotlightThemeFallback } from "@/config/explore";
import { useFormat } from "@/i18n/format";
import { EMPTY_FILTERS, withFilters } from "@/lib/exploreFilters";
import type { Vibe } from "@/lib/types";
import { cn } from "@/lib/utils";
import { changeLetters, FlipText, FlowText } from "./FlipText";
import { useMarkBreath } from "./useMarkBreath";

/** Beside the centre card the sizes come from the fit (SpotlightCoverflow): --fit-title, logged in and out --fit-theme. */
const SIDE_TITLE = { fontSize: "var(--fit-title, var(--text-stage))" };

interface GreetingProps {
  /** Logged in: "Hi {name}." · "Where to next?"; null (visitors): "Share a place." · "Find your people." */
  name: string | null;
  /** The centre card's category, once it has settled there */
  vibe: Vibe;
  /** Open Houses of a category */
  countOf: (vibe: Vibe) => number;
  /** Sets that category's chip and scrolls to the grid */
  onPick: (vibe: Vibe) => void;
  /** Each half's width beside the centre card; none: half the row, above the carousel */
  sideClassName?: string;
}

/**
 * The Spotlight's text, logged in and out alike, one row with a common top edge. Left, and it stays: "Hi Sam." and "Where to next?" (the "?"
 * breathes) – for visitors "Share a place." and "Find your people." (the orange dot breathes, same rhythm). Right, following the centre card's
 * category: its name, a sentence (visitors get the more inviting one) and the way to its Houses. Only the link takes the pointer: the
 * carousel's drag area is around it.
 */
export function SpotlightGreeting({ name, vibe, countOf, onPick, sideClassName }: GreetingProps) {
  const t = useTranslations("explore.spotlightGreeting");
  const tIntro = useTranslations("explore.spotlightIntro");
  const breath = useMarkBreath();
  const lines = name === null ? SPOTLIGHT_THEME_LINES_VISITOR : SPOTLIGHT_THEME_LINES;
  return (
    <div data-spotlight-greeting className="pointer-events-none flex items-start justify-between gap-6">
      <div data-spotlight-greeting-left className={cn("min-w-0", sideClassName ?? "flex-1")}>
        {/* One colour (muted, no gradient). Optically flush with the W, and about 6px of air from its letters down to the W's top (measured at 1280–1728): the
            big line's box has room above its capitals, the greeting's below its baseline – the margin takes both back. */}
        <p className="-ml-px truncate text-greeting text-muted">{name === null ? tIntro("first") : t("hi", { name })}</p>
        <FlowText ref={breath} text={name === null ? tIntro("second") : t("whereNext")} dot={name === null} style={SIDE_TITLE} className="text-stage mt-[calc(8px-0.33em)] w-fit whitespace-nowrap" />
      </div>
      {/* Beside the card it hangs from the common top edge: the left side alone sets the height, which puts "Where to next?" where it belongs. Its eyebrow's
          capitals level with those of "Hi …": the greeting's letters sit lower in their line, so the block comes down by that (GREETING_EYEBROW_DROP). */}
      <div data-spotlight-greeting-right className={cn("flex min-w-0 justify-end pt-[calc(var(--text-greeting)*0.15-1.5px)]", sideClassName ? cn(sideClassName, "h-0") : "flex-1")}>
        <ThemeBlock vibe={vibe} countOf={countOf} onPick={onPick} lines={lines} />
      </div>
    </div>
  );
}

/**
 * Follows the category. The name and the link crossfade, the name, the sentence and the link crossfade, nothing moves with it; never for the same category again. Two
 * lines of sentence always reserved.
 */
function ThemeBlock({ vibe, countOf, onPick, lines }: Pick<GreetingProps, "vibe" | "countOf" | "onPick"> & { lines: Record<Vibe, string> }) {
  const t = useTranslations("explore.spotlightGreeting");
  const format = useFormat();
  const [state, setState] = useState({ vibe, from: null as Vibe | null, run: 0 });
  if (state.vibe !== vibe) setState({ vibe, from: state.vibe, run: state.run + 1 });
  const { from, run } = state;
  const sentenceOf = (v: Vibe) => lines[v] ?? spotlightThemeFallback(countOf(v));
  const link = (v: Vibe) => (
    <Link
      href={`/?${withFilters(new URLSearchParams(), { ...EMPTY_FILTERS, vibes: [v] })}`}
      onClick={(e) => {
        e.preventDefault();
        onPick(v);
      }}
      className="pointer-events-auto inline-block text-body font-semibold text-ink underline-offset-4 hover:underline"
    >
      {lines[v] ? t("open", { count: countOf(v) }) : t("seeHouses")}
    </Link>
  );
  const fade = (out: ReactNode, current: ReactNode) => (
    <div className="grid justify-items-end">
      {from !== null && (
        <div key={`out-${run}`} aria-hidden inert className="theme-out col-start-1 row-start-1">
          {out}
        </div>
      )}
      <div key={`in-${run}`} className={cn("col-start-1 row-start-1", from !== null && "theme-in")}>
        {current}
      </div>
    </div>
  );
  return (
    <div className="w-full max-w-[360px] min-h-[calc(16px+6px+2*1.15*var(--fit-theme,28px)+10px+23px)] text-right">
      {fade(from !== null && <p className="text-eyebrow uppercase text-ink/55">{format.vibe(from)}</p>, <p className="text-eyebrow uppercase text-ink/55">{format.vibe(vibe)}</p>)}
      <ThemeSentence text={sentenceOf(vibe)} />
      <div className="mt-2.5">{fade(from !== null && link(from), link(vibe))}</div>
    </div>
  );
}

/** The sentence: a crossfade, its right edge stays. */
function ThemeSentence({ text }: { text: string }) {
  const [state, setState] = useState({ text, from: null as string | null, run: 0 });
  if (state.text !== text) setState({ text, from: state.text, run: state.run + 1 });
  const outer = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const current = useRef<HTMLElement>(null);
  const old = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const wrap = outer.current;
    const glide = box.current;
    const now = current.current;
    if (!wrap || !glide || !now) return;
    const measure = () => {
      wrap.style.setProperty("--theme-width", `${wrap.clientWidth}px`);
      glide.style.width = `${now.offsetWidth}px`;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrap);
    observer.observe(now);
    return () => observer.disconnect();
  }, [state.text]);

  const { from, run } = state;
  useLayoutEffect(() => {
    const glide = box.current;
    if (from === null || !old.current || !current.current || !glide) return;
    let live = true;
    void changeLetters(old.current, current.current).then(() => {
      if (live) setState((s) => (s.run === run ? { ...s, from: null } : s));
    });
    return () => {
      live = false;
    };
  }, [from, run]);

  return (
    <div ref={outer} className="mt-1.5 w-full">
      <div ref={box} className="ml-auto grid grid-cols-[minmax(0,1fr)] justify-items-end">
        {from !== null && <FlipText key={`out-${run}`} ref={old} as="p" text={from} style={THEME_SIZE} className={THEME_CLASS} />}
        <FlipText key={`in-${run}`} ref={current} as="p" text={state.text} style={THEME_SIZE} className={THEME_CLASS} />
      </div>
    </div>
  );
}

const THEME_SIZE = { fontSize: "var(--fit-theme, 28px)" };
const THEME_CLASS = "text-h2 col-start-1 row-start-1 w-max max-w-(--theme-width)";

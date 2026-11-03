"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { SPOTLIGHT_THEME_LINES, spotlightThemeFallback } from "@/config/explore";
import { useFormat } from "@/i18n/format";
import { EMPTY_FILTERS, withFilters } from "@/lib/exploreFilters";
import type { Vibe } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Beside the centre card the sizes come from the fit (SpotlightCoverflow): --fit-title, --fit-body body-lg → body, logged in --fit-theme. */
const SIDE_TITLE = { fontSize: "var(--fit-title, var(--text-stage))" };
const SIDE_BODY = { fontSize: "var(--fit-body, var(--text-body-lg))" };

/**
 * The Spotlight's title for visitors. "centre": over the carousel, the two phrases whole, on one line where they fit. "side":
 * top left beside the centre card, always on two lines; behind the cards and never in the way of the pointer.
 */
export function SpotlightIntro({ variant = "centre", className }: { variant?: "centre" | "side"; className?: string }) {
  const t = useTranslations("explore.spotlightIntro");
  if (variant === "side") {
    return (
      <div data-spotlight-intro="side" className={cn("pointer-events-none", className)}>
        <h2 style={SIDE_TITLE} className="text-stage whitespace-nowrap">
          <span className="block text-ink">{t("first")}</span>
          <span className="block text-muted">{t("second")}</span>
        </h2>
        <p style={SIDE_BODY} className="mt-4 max-w-[360px] text-body-lg text-muted">{t("subline")}</p>
      </div>
    );
  }
  return (
    <div data-spotlight-intro="centre" className={cn("px-4 text-center", className)}>
      <h2 className="text-stage max-sm:text-stage-sm">
        <span className="inline-block text-ink">{t("first")}</span> <span className="inline-block text-muted">{t("second")}</span>
      </h2>
      <p className="mt-3 text-body-lg text-muted">{t("subline")}</p>
    </div>
  );
}

interface GreetingProps {
  name: string;
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
 * The Spotlight's text when logged in, one row with a common top edge. Left, and it stays: "Hi Sam." and "Where to next?".
 * Right, following the centre card's category: its name, a sentence and the way to its Houses. Only the link takes the
 * pointer: the carousel's drag area is around it.
 */
export function SpotlightGreeting({ name, vibe, countOf, onPick, sideClassName }: GreetingProps) {
  const t = useTranslations("explore.spotlightGreeting");
  return (
    <div data-spotlight-greeting className="pointer-events-none flex items-start justify-between gap-6">
      <div data-spotlight-greeting-left className={cn("min-w-0", sideClassName ?? "flex-1")}>
        <p className="truncate text-greeting text-muted">{t("hi", { name })}</p>
        <h2 style={SIDE_TITLE} className="text-stage mt-2 whitespace-nowrap text-ink">
          {t("whereNext")}
        </h2>
      </div>
      <div data-spotlight-greeting-right className={cn("flex min-w-0 justify-end", sideClassName ?? "flex-1")}>
        <ThemeBlock vibe={vibe} countOf={countOf} onPick={onPick} />
      </div>
    </div>
  );
}

/** Crossfades when the category changes, never for the same one again. Two lines of sentence always reserved: nothing moves with it. */
function ThemeBlock({ vibe, countOf, onPick }: Pick<GreetingProps, "vibe" | "countOf" | "onPick">) {
  const [state, setState] = useState({ vibe, from: null as Vibe | null, run: 0 });
  if (state.vibe !== vibe) setState({ vibe, from: state.vibe, run: state.run + 1 });
  return (
    <div className="grid w-full max-w-[340px] min-h-[calc(16px+6px+2*1.15*var(--fit-theme,28px)+10px+23px)] text-right">
      {state.from !== null && (
        <div key={`out-${state.run}`} aria-hidden inert className="theme-out col-start-1 row-start-1">
          <ThemeText vibe={state.from} countOf={countOf} onPick={onPick} />
        </div>
      )}
      <div key={`in-${state.run}`} className={cn("col-start-1 row-start-1", state.from !== null && "theme-in")} onAnimationEnd={() => setState((s) => (s.from === null ? s : { ...s, from: null }))}>
        <ThemeText vibe={vibe} countOf={countOf} onPick={onPick} />
      </div>
    </div>
  );
}

function ThemeText({ vibe, countOf, onPick }: Pick<GreetingProps, "vibe" | "countOf" | "onPick">) {
  const t = useTranslations("explore.spotlightGreeting");
  const format = useFormat();
  const count = countOf(vibe);
  const sentence = SPOTLIGHT_THEME_LINES[vibe];
  return (
    <>
      <p className="text-eyebrow uppercase text-accent">{format.vibe(vibe)}</p>
      <p style={{ fontSize: "var(--fit-theme, 28px)" }} className="text-h2 mt-1.5 text-ink">
        {sentence ?? spotlightThemeFallback(count)}
      </p>
      <Link
        href={`/?${withFilters(new URLSearchParams(), { ...EMPTY_FILTERS, vibes: [vibe] })}`}
        onClick={(e) => {
          e.preventDefault();
          onPick(vibe);
        }}
        className="pointer-events-auto mt-2.5 inline-block text-body font-semibold text-ink underline-offset-4 hover:underline"
      >
        {sentence ? t("open", { count }) : t("seeHouses")}
      </Link>
    </>
  );
}

"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState, type CSSProperties } from "react";
import { useSpotlightThemeLines } from "./themeLines";
import { useFormat } from "@/i18n/format";
import { EMPTY_FILTERS, withFilters } from "@/lib/exploreFilters";
import type { Vibe } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/ActionButton";
import { FlipText, FlowText } from "./FlipText";
import { useMarkBreath } from "./useMarkBreath";

/** Beside the centre card the sizes come from the fit (SpotlightCoverflow): --fit-title, logged in and out --fit-theme. */
const SIDE_TITLE = { fontSize: "var(--fit-title, var(--text-stage))" };

/**
 * The greeting line ("Hi Sam." / "Share a place."): the stage headline's gradient as that one shows at rest – 135deg, twice as wide, from its
 * start – but still (no wandering) and at 45 % opacity. Inline, so it never waits for a stylesheet; without background-clip: text the
 * colour stays ink (at the same 45 %).
 */
const GREETING_GRADIENT: CSSProperties = {
  color: "var(--text)",
  backgroundImage: "var(--headline-gradient)",
  backgroundSize: "200% 100%",
  backgroundPosition: "0 0",
  backgroundRepeat: "no-repeat",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  WebkitTextFillColor: "transparent",
  opacity: 0.45,
};

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
  /** Before the launch and in the beta (config/platform.ts): the launch line above "Find your people.", and on the right "Come for the place,
   *  stay for the people." with "Join the waitlist" and "Become a Founding Host" instead of the category sentence */
  launch?: LaunchHero;
}

export interface LaunchHero {
  /** "Opening May 2027" */
  label: string;
  onJoin: () => void;
  hostHref: string;
}

/**
 * The Spotlight's text, logged in and out alike, one row with a common top edge. Left, and it stays: "Hi Sam." and "Where to next?" (the "?"
 * breathes) – for visitors "Share a place." and "Find your people." (its "." an ordinary letter in the gradient – nothing breathes there). Right, following the centre card's
 * category: its name, a sentence (visitors get the more inviting one) and the way to its Houses. Only the link takes the pointer: the
 * carousel's drag area is around it.
 */
export function SpotlightGreeting({ name, vibe, countOf, onPick, sideClassName, launch }: GreetingProps) {
  const t = useTranslations("explore.spotlightGreeting");
  const tIntro = useTranslations("explore.spotlightIntro");
  const breath = useMarkBreath();
  const { lines, fallback } = useSpotlightThemeLines(name === null);
  return (
    <div data-spotlight-greeting className="pointer-events-none flex items-start justify-between gap-6">
      <div data-spotlight-greeting-left className={cn("min-w-0", sideClassName ?? "flex-1")}>
        {/* The headline's gradient, still and at 45 % (GREETING_GRADIENT). Optically flush with the W, and about 6px of air from its letters down to the W's
            top (measured at 1280–1728): the big line's box has room above its capitals, the greeting's below its baseline – the margin takes both back. */}
        <p className="-ml-px truncate text-greeting" style={GREETING_GRADIENT}>
          {launch ? launch.label : name === null ? tIntro("first") : t("hi", { name })}
        </p>
        <FlowText ref={breath} text={launch || name === null ? tIntro("second") : t("whereNext")} style={SIDE_TITLE} className="text-stage mt-[calc(8px-0.33em)] w-fit whitespace-nowrap" />
      </div>
      {/* Beside the card it hangs from the common top edge: the left side alone sets the height, which puts "Where to next?" where it belongs. Its eyebrow's
          capitals level with those of "Hi …": the greeting's letters sit lower in their line, so the block comes down by that (GREETING_EYEBROW_DROP). */}
      <div data-spotlight-greeting-right className={cn("flex min-w-0 justify-end pt-[calc(var(--text-greeting)*0.15-1.5px)]", sideClassName ? cn(sideClassName, "h-0") : "flex-1")}>
        {launch ? <LaunchBlock launch={launch} /> : <ThemeBlock vibe={vibe} countOf={countOf} onPick={onPick} lines={lines} fallback={fallback} />}
      </div>
    </div>
  );
}

/**
 * Follows the category (CLAUDE.md "Hero-Textwechsel ruhig"): the whole block – name, sentence, "N houses open →" – fades out completely
 * (250ms), then the new one fades in at exactly the same place (250ms). Never two texts at once, nothing moves; the block keeps a fixed
 * height (two lines of sentence reserved). Reduced motion: an immediate swap.
 */
function ThemeBlock({ vibe, countOf, onPick, lines, fallback }: Pick<GreetingProps, "vibe" | "countOf" | "onPick"> & { lines: Record<Vibe, string>; fallback: (count: number) => string }) {
  const t = useTranslations("explore.spotlightGreeting");
  const format = useFormat();
  // What's shown, and what it's going to (a new category starts the fade-out; the swap happens once it is out).
  const [shown, setShown] = useState(vibe);
  const [target, setTarget] = useState(vibe);
  const [out, setOut] = useState(false);
  if (target !== vibe) {
    setTarget(vibe);
    setOut(vibe !== shown);
  }
  useEffect(() => {
    if (!out) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = window.setTimeout(() => {
      setShown(target);
      setOut(false);
    }, reduce ? 0 : FADE_MS);
    return () => window.clearTimeout(id);
  }, [out, target]);
  const sentenceOf = (v: Vibe) => lines[v] ?? fallback(countOf(v));
  return (
    <div
      data-theme-block
      data-out={out || undefined}
      aria-live="polite"
      className="w-full max-w-[360px] min-h-[calc(16px+6px+2*1.15*var(--fit-theme,28px)+10px+23px)] text-right transition-opacity duration-[250ms] ease-in-out motion-reduce:transition-none data-out:opacity-0"
    >
      <p className="text-eyebrow uppercase text-ink/55">{format.vibe(shown)}</p>
      <FlipText as="p" text={sentenceOf(shown)} style={THEME_SIZE} className="text-h2 mt-1.5 ml-auto w-max max-w-full" />
      <div className="mt-2.5">
        <Link
          href={`/?${withFilters(new URLSearchParams(), { ...EMPTY_FILTERS, vibes: [shown] })}`}
          onClick={(e) => {
            e.preventDefault();
            onPick(shown);
          }}
          className="pointer-events-auto inline-block text-body font-semibold text-ink underline-offset-4 hover:underline"
        >
          {lines[shown] ? t("open", { count: countOf(shown) }) : t("seeHouses")}
        </Link>
      </div>
    </div>
  );
}
// The swap a breath after the 250ms fade-out, so the old text is fully gone.
const FADE_MS = 260;

/** Before the launch and in the beta: the place of the category sentence – "Come for the place, stay for the people." and the two actions. */
function LaunchBlock({ launch }: { launch: LaunchHero }) {
  const t = useTranslations("platform");
  return (
    // As high as the category block it replaces (two lines of sentence and one row of actions): the Spotlight's fit stays the same.
    <div className="w-full max-w-[400px] min-h-[calc(16px+6px+2*1.15*var(--fit-theme,28px)+10px+23px)] text-right">
      <p className="text-h2 ml-auto w-fit max-w-full text-ink" style={THEME_SIZE}>
        {t("hero.sub")}
      </p>
      <LaunchActions launch={launch} oneRow className="mt-3 justify-end" />
    </div>
  );
}

/** "Join the waitlist" (primary) and "Become a Founding Host" (a thin outline button, to the host application). */
export function LaunchActions({ launch, className, oneRow = false }: { launch: LaunchHero; className?: string; /** Beside the Spotlight: never wrapping (the block keeps the category block's height) */ oneRow?: boolean }) {
  const t = useTranslations("platform");
  return (
    <div className={cn("pointer-events-auto flex gap-2", oneRow ? "flex-nowrap" : "flex-wrap", className)}>
      <Button variant="primary" size="sm" onClick={launch.onJoin}>
        {t("waitlist.join")}
      </Button>
      <Button variant="secondary" size="sm" href={launch.hostHref}>
        {t("hero.becomeHost")}
      </Button>
    </div>
  );
}

/** Phones (below lg, above the carousel): the same launch hero – the launch line, "Find your people.", the sentence and the two actions. */
export function LaunchIntro({ launch, className }: { launch: LaunchHero; className?: string }) {
  const t = useTranslations("platform");
  const tIntro = useTranslations("explore.spotlightIntro");
  return (
    <div className={cn("page-container pb-6 pt-6", className)}>
      <p className="text-eyebrow uppercase text-muted">{launch.label}</p>
      <h1 className="mt-2 text-h1 text-ink">{tIntro("second")}</h1>
      <p className="mt-2 text-body-lg text-muted">{t("hero.sub")}</p>
      <LaunchActions launch={launch} className="mt-5" />
    </div>
  );
}

const THEME_SIZE = { fontSize: "var(--fit-theme, 28px)" };

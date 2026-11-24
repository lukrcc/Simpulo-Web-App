"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSpotlightThemeLines } from "./themeLines";
import { useFormat } from "@/i18n/format";
import { EMPTY_FILTERS, withFilters } from "@/lib/exploreFilters";
import type { Vibe } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/ActionButton";

/** The main line on the left ("Hi Sam, where to next?"): about 44px, one line – smaller steps only if it wouldn't fit its half. */
const TITLE_SIZES = [44, 40, 36, 32];
/** The main line on the right (the category's sentence): about 32px, one line – smaller steps only if the longest wouldn't fit. */
const SENTENCE_SIZES = [32, 30, 28, 26, 24, 22];
/** The right block keeps 32px more room to the right edge than the page margin (pr-8). */
const RIGHT_INSET = 32;

interface GreetingProps {
  /** Logged in: "Hi {name}." · "Where to next?"; null (visitors): "Share a place." · "Find your people." */
  name: string | null;
  /** The centre card's category, once it has settled there */
  vibe: Vibe;
  /** Open Houses of a category */
  countOf: (vibe: Vibe) => number;
  /** Sets that category's chip and scrolls to the grid */
  onPick: (vibe: Vibe) => void;
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
export function SpotlightGreeting({ name, vibe, countOf, onPick, launch }: GreetingProps) {
  const t = useTranslations("explore.spotlightGreeting");
  const tIntro = useTranslations("explore.spotlightIntro");
  const { lines, fallback } = useSpotlightThemeLines(name === null);
  const rootRef = useRef<HTMLDivElement>(null);
  const title = launch ? tIntro("second") : name ? t("whereNextName", { name }) : t("whereNext");
  // Mirrored (CLAUDE.md "Kopftexte gespiegelt"): one grid of two halves – row 1 the small lines (left "FIND YOUR PEOPLE", right the category),
  // row 2 the main lines (left the title, right the sentence), row 3 the link on the right. align-items: baseline puts the small lines on one
  // line and the main lines on one baseline – no measuring. Only the sizes are fitted: the title and the longest sentence each on one line in
  // its half (--title-size, --theme-size).
  const sentences = Object.values(lines).join("\n");
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const fit = () => {
      const half = root.clientWidth / 2 - 12;
      const probe = document.createElement("span");
      probe.className = "text-h2";
      probe.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap;";
      root.append(probe);
      const widest = (texts: string[], size: number, family?: string) => {
        probe.style.fontSize = `${size}px`;
        if (family) probe.style.fontFamily = family;
        return Math.max(...texts.map((text) => ((probe.textContent = text), probe.offsetWidth)));
      };
      const titleEl = root.querySelector<HTMLElement>("[data-spot-title]");
      const titleFamily = titleEl ? getComputedStyle(titleEl).fontFamily : undefined;
      const titleSize = TITLE_SIZES.find((size) => widest([title], size, titleFamily) <= half) ?? TITLE_SIZES[TITLE_SIZES.length - 1];
      probe.style.fontFamily = "";
      const sentenceSize = SENTENCE_SIZES.find((size) => widest(sentences.split("\n"), size) <= half - RIGHT_INSET) ?? SENTENCE_SIZES[SENTENCE_SIZES.length - 1];
      probe.remove();
      root.style.setProperty("--title-size", `${titleSize}px`);
      root.style.setProperty("--theme-size", `${sentenceSize}px`);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(root);
    void document.fonts?.ready.then(fit);
    return () => observer.disconnect();
  }, [sentences, title]);
  return (
    <div ref={rootRef} data-spotlight-greeting className="pointer-events-none relative grid grid-cols-2 items-baseline gap-x-6">
      {/* Row 1: the small lines – grey, capitals. */}
      <p data-align-top className="text-eyebrow uppercase text-muted">
        {launch ? launch.label : t("findYourPeople")}
      </p>
      {/* Rows 1–3 on the right: the category, its sentence, the link (ThemeBlock – one fade for all three). */}
      {launch ? (
        <LaunchBlock launch={launch} />
      ) : (
        <ThemeBlock vibe={vibe} countOf={countOf} onPick={onPick} lines={lines} fallback={fallback} />
      )}
      {/* Row 3 left: the main line, one colour, no gradient – on the link's baseline, so the right block ends on it (CLAUDE.md
          "Startseite-Spotlight final"). */}
      <h2 data-spot-title style={TITLE_SIZE} className="stage-title col-start-1 row-start-3 whitespace-nowrap text-ink">
        {title}
      </h2>
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
  // Three cells of the greeting's grid (right column, rows 1–3), right-aligned; one fade for all three (data-out).
  const cell = cn("col-start-2 pr-8 text-right transition-opacity duration-[250ms] ease-in-out motion-reduce:transition-none", out && "opacity-0");
  return (
    <>
      <p data-theme-eyebrow aria-live="polite" className={cn(cell, "row-start-1 text-eyebrow uppercase text-muted")}>
        {format.vibe(shown)}
      </p>
      <p data-theme-sentence style={THEME_SIZE} className={cn(cell, "row-start-2 mt-2 whitespace-nowrap text-h2 text-ink")}>
        {sentenceOf(shown)}
      </p>
      <div data-theme-link className={cn(cell, "row-start-3 mt-2")}>
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
    </>
  );
}
// The swap a breath after the 250ms fade-out, so the old text is fully gone.
const FADE_MS = 260;

/** Before the launch and in the beta: the place of the category sentence – "Come for the place, stay for the people." and the two actions. */
function LaunchBlock({ launch }: { launch: LaunchHero }) {
  const t = useTranslations("platform");
  // The right column's main line and actions (rows 2 and 3 of the greeting's grid).
  return (
    <>
      <p data-theme-sentence style={THEME_SIZE} className="col-start-2 row-start-2 mt-2 pr-8 text-right text-h2 text-ink">
        {t("hero.sub")}
      </p>
      <div className="col-start-2 row-start-3 mt-3 flex justify-end pr-8">
        <LaunchActions launch={launch} oneRow />
      </div>
    </>
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

const THEME_SIZE = { fontSize: "var(--theme-size, 32px)" };
const TITLE_SIZE = { fontSize: "var(--title-size, 44px)", lineHeight: 1.05 };

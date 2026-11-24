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

interface GreetingProps {
  /** Signed in: "Where to next, {name}?"; null (visitors): "Where to next?" */
  name: string | null;
  /** The categories the theme block on the right cycles through (in this order) */
  vibes: readonly Vibe[];
  /** Open Houses of a category */
  countOf: (vibe: Vibe) => number;
  /** Sets that category's chip and scrolls to the grid */
  onPick: (vibe: Vibe) => void;
  /** Before the launch and in the beta (config/platform.ts): the launch line, and on the right "Come for the place, stay for the people."
   *  with "Join the waitlist" and "Become a Founding Host" instead of the category sentence */
  launch?: LaunchHero;
}

export interface LaunchHero {
  /** "Opening May 2027" */
  label: string;
  onJoin: () => void;
  hostHref: string;
}

/** The theme block changes on its own clock (CLAUDE.md "Spotlight-Kopftexte"), not with the cards. */
const THEME_EVERY_MS = 8000;
/** Out, then in at the same place. */
const FADE_MS = 250;

/**
 * The Spotlight's text (CLAUDE.md "Spotlight-Kopftexte – feste Typo-Hierarchie"), signed in and out alike, fixed sizes (tokens, globals.css
 * .spot-kicker · .spot-title · .spot-line · .spot-link): left the small line "FIND YOUR PEOPLE" and the one large line "Where to next, {Name}?"
 * (visitors "Where to next?"); right, right-aligned, a block of a fixed height (two lines of sentence kept): the category, its sentence, "X
 * houses open →". Both small lines on the same top edge; the link's baseline on the large line's baseline (measured once per size – the left
 * line moves down to it). Only the link takes the pointer: the cards' area is around it.
 */
export function SpotlightGreeting({ name, vibes, countOf, onPick, launch }: GreetingProps) {
  const t = useTranslations("explore.spotlightGreeting");
  const tIntro = useTranslations("explore.spotlightIntro");
  const rootRef = useRef<HTMLDivElement>(null);
  const title = launch ? tIntro("second") : name ? t("whereNextName", { name }) : t("whereNext");
  // The large line's baseline onto the link's (the right block is the taller one): the left column ends with it, and the difference of the
  // two baselines is taken off at its foot. Measured with a zero-height probe on each baseline; again on every size change.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const fit = () => {
      const titleEl = root.querySelector<HTMLElement>("[data-spot-title]");
      const anchor = root.querySelector<HTMLElement>("[data-spot-baseline]");
      if (!titleEl || !anchor) return;
      titleEl.style.marginBottom = "0px";
      const base = (el: HTMLElement) => {
        const probe = document.createElement("span");
        probe.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
        el.append(probe);
        const y = probe.getBoundingClientRect().top;
        probe.remove();
        return y;
      };
      const diff = base(anchor) - base(titleEl);
      titleEl.style.marginBottom = `${Math.round(-diff * 100) / 100}px`;
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(root);
    void document.fonts?.ready.then(fit);
    return () => observer.disconnect();
  }, [title]);
  return (
    <div ref={rootRef} data-spotlight-greeting className="pointer-events-none relative flex items-stretch justify-between gap-6">
      {/* Left: the small line on top, the one large line at the foot (its baseline on the link's). */}
      <div className="flex min-w-0 flex-col justify-between gap-3">
        <p data-align-top className="spot-kicker">
          {launch ? launch.label : t("findYourPeople")}
        </p>
        <h2 data-spot-title className="spot-title whitespace-nowrap">
          {title}
        </h2>
      </div>
      {launch ? <LaunchBlock launch={launch} /> : <ThemeBlock vibes={vibes} countOf={countOf} onPick={onPick} visitor={name === null} />}
    </div>
  );
}

/**
 * The theme on the right (CLAUDE.md "Spotlight-Kopftexte"): its own clock – every THEME_EVERY_MS the whole block (category, sentence, link)
 * fades out (250ms), then the next fades in at the same place (250ms); never two at once, a fixed height (two lines of sentence), nothing
 * moves. Independent of the cards (scrolling, arrows). Paused while the pointer is over it; reduced motion: no automatic change. The link
 * leads to the theme shown.
 */
function ThemeBlock({ vibes, countOf, onPick, visitor }: Pick<GreetingProps, "vibes" | "countOf" | "onPick"> & { /** Visitors get the more inviting sentences */ visitor: boolean }) {
  const t = useTranslations("explore.spotlightGreeting");
  const format = useFormat();
  const { lines, fallback } = useSpotlightThemeLines(visitor);
  const [index, setIndex] = useState(0);
  const [out, setOut] = useState(false);
  const paused = useRef(false);
  const count = vibes.length;
  useEffect(() => {
    if (count < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let swap = 0;
    const id = window.setInterval(() => {
      if (paused.current || document.hidden) return;
      setOut(true);
      swap = window.setTimeout(() => {
        setIndex((i) => (i + 1) % count);
        setOut(false);
      }, FADE_MS);
    }, THEME_EVERY_MS);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(swap);
    };
  }, [count]);
  const shown = vibes[index % Math.max(1, count)];
  if (!shown) return null;
  const sentence = lines[shown] ?? fallback(countOf(shown));
  return (
    <div
      data-theme-block
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
      className={cn("pointer-events-auto flex min-w-0 max-w-[50%] flex-col items-end pr-8 text-right transition-opacity duration-[250ms] ease-in-out motion-reduce:transition-none", out && "opacity-0")}
    >
      <p data-theme-eyebrow aria-live="polite" className="spot-kicker">
        {format.vibe(shown)}
      </p>
      {/* Two lines kept, so a short sentence never moves the link. */}
      <p data-theme-sentence className="spot-line mt-2 line-clamp-2 h-(--spot-line-box)">
        {sentence}
      </p>
      <Link
        href={`/explore${withFilters(new URLSearchParams(), { ...EMPTY_FILTERS, vibes: [shown] })}`}
        onClick={(e) => {
          e.preventDefault();
          onPick(shown);
        }}
        data-theme-link
        className="spot-link mt-2 underline-offset-4 hover:underline"
      >
        <span data-spot-baseline>{lines[shown] ? t("open", { count: countOf(shown) }) : t("seeHouses")}</span>
      </Link>
    </div>
  );
}

/** Before the launch and in the beta: the place of the category sentence – "Come for the place, stay for the people." and the two actions. */
function LaunchBlock({ launch }: { launch: LaunchHero }) {
  const t = useTranslations("platform");
  return (
    <div className="pointer-events-auto flex min-w-0 max-w-[50%] flex-col items-end pr-8 text-right">
      <p className="spot-kicker">&nbsp;</p>
      <p data-theme-sentence className="spot-line mt-2 line-clamp-2 h-(--spot-line-box)">
        {t("hero.sub")}
      </p>
      <div className="mt-2 flex justify-end">
        <LaunchActions launch={launch} oneRow />
      </div>
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



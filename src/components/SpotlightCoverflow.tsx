"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { SpotlightGreeting, type LaunchHero } from "@/components/explore/SpotlightIntro";
import { HouseCard } from "@/components/HouseCard";
import { Container } from "@/components/layout/Container";
import { Shelf } from "@/components/ui/Shelf";
import { StageBand } from "@/components/ui/StageBand";
import { markHeroSeen } from "@/lib/heroRotation";
import { rememberedSpotlight, rememberSpotlight } from "@/lib/houseTransition";
import { findUser, getCrew, getCurrentUser, useStore } from "@/lib/store";
import type { Stay, Vibe } from "@/lib/types";
import { firstName } from "@/lib/utils";

/*
 * The home page's Spotlight from 744px (CLAUDE.md "Spotlight natives Scrollen"; phones: SpotlightHero). The SAME native row as every other
 * shelf (ui/Shelf): the browser scrolls it at the speed of the trackpad, the wheel or the finger – no library, no snap points, no speed logic,
 * no transforms while it moves. Endless: the list five times in a row, the start in the middle copy; Shelf jumps back by whole copies only
 * while the row rests. The copies are aria-hidden (their links out of the tab order). Arrows: one card each (scrollBy, smooth). No autoplay.
 * Every card the same size: three whole cards in the middle and about a third of one on each side; the stage is exactly the window under the
 * header less the tab bar (always visible), the room left by the text and the cards split into three equal gaps – above the text, between
 * text and cards, and from the cards to the tab bar's top edge. The cards are the shelves' own (HouseCard variant="shelf"), nothing behind
 * them – no glow, no surface (CLAUDE.md "Spotlight-Karten = Reihen-Karte"); their hover is theirs (scale 1.02, no shadow).
 */

/** Room between the cards (the row's gap, globals.css .shelf-track). */
const GAP = 24;
/** The list this many times in a row: room for a long swipe both ways before the row has to rest. */
const COPIES = 5;
/** The smallest gap of the three around text and cards. */
const MIN_GAP = 24;

export function SpotlightCoverflow({ stays, countOf, onPickVibe, launchHero }: { stays: Stay[]; /** Open Houses of a category */ countOf: (vibe: Vibe) => number; onPickVibe: (vibe: Vibe) => void; /** Before the launch and in the beta: the launch hero instead of the greeting (components/explore/SpotlightIntro) */ launchHero?: LaunchHero }) {
  const t = useTranslations("explore");
  const store = useStore();
  const me = getCurrentUser(store);

  const houses = useMemo(
    () =>
      stays.flatMap((stay) => {
        const host = findUser(store, stay.hostId);
        return host ? [{ stay, host, crew: getCrew(store, stay) }] : [];
      }),
    [stays, store],
  );
  const middleCopy = Math.floor(COPIES / 2);
  const [startIndex] = useState(() => {
    const remembered = rememberedSpotlight();
    return remembered !== null && remembered < houses.length ? remembered : 0;
  });

  // The theme on the right runs on its own clock (CLAUDE.md "Spotlight-Kopftexte"): the categories of these Houses, in their order, each once.
  const themeVibes = useMemo(() => [...new Set(houses.map((h) => h.stay.vibe))].filter((v) => countOf(v) > 0), [houses, countOf]);
  // When the row rests: remember where it is (back from a House) and which Houses were seen – positions only, nothing moved.
  const onRest = useCallback((viewport: HTMLDivElement) => {
    const box = viewport.getBoundingClientRect();
    const centre = box.left + box.width / 2;
    let nearest: HTMLElement | null = null;
    let distance = Infinity;
    const seen = new Set<string>();
    for (const slide of viewport.querySelectorAll<HTMLElement>(".cf-slide")) {
      const r = slide.getBoundingClientRect();
      if (r.right > 0 && r.left < window.innerWidth && slide.dataset.id) seen.add(slide.dataset.id);
      const d = Math.abs(r.left + r.width / 2 - centre);
      if (d < distance) {
        distance = d;
        nearest = slide;
      }
    }
    if (nearest?.dataset.index) rememberSpotlight(Number(nearest.dataset.index));
    if (seen.size > 0) markHeroSeen([...seen]);
  }, []);

  // The copies stay out of the tab order (aria-hidden; not inert – that would take the pointer and the wheel too).
  const rowRef = useRef<HTMLElement>(null);
  useEffect(() => {
    rowRef.current?.querySelectorAll('.cf-slide[aria-hidden="true"] :is(a, button)').forEach((el) => el.setAttribute("tabindex", "-1"));
  });

  // Size: three whole cards in the middle and a third of one on each side – width (W − 4 gaps) × 3/11, 4:5 –, smaller only where the window
  // is too low; the first whole card starts at the row's gutter. The stage's free height is split into three equal gaps (header → text,
  // text → cards, cards → the stage's end).
  const textRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const text = textRef.current;
    const stage = text?.parentElement;
    const row = rowRef.current?.querySelector<HTMLElement>(".shelf-frame");
    if (!text || !stage || !row) return;
    const fit = () => {
      const width = document.documentElement.clientWidth;
      // Room for the tab bar, which is always there (CLAUDE.md "Tab-Leiste immer sichtbar"): everything from its top edge down is not stage.
      const bar = document.querySelector<HTMLElement>("[data-tab-bar]");
      // The bar mounts a moment after the page (a portal once hydrated): measure again once it is there.
      if (!bar && tries++ < 30) retry = window.setTimeout(fit, 100);
      const barTop = bar?.getBoundingClientRect().top ?? window.innerHeight;
      const reserve = Math.max(0, Math.round(window.innerHeight - barTop));
      const room = stage.clientHeight - text.offsetHeight - reserve;
      let w = ((width - 4 * GAP) * 3) / 11;
      let h = (w * 5) / 4;
      if (h > room - 3 * MIN_GAP) {
        h = Math.max(0, room - 3 * MIN_GAP);
        w = (h * 4) / 5;
      }
      const gap = Math.max(MIN_GAP, (room - h) / 3);
      const side = (width - 3 * w - 2 * GAP) / 2;
      stage.style.setProperty("--spot-w", `${Math.round(w)}px`);
      stage.style.setProperty("--spot-h", `${Math.round(h)}px`);
      stage.style.setProperty("--spot-gap", `${Math.floor(gap)}px`);
      row.style.setProperty("--row-gutter", `${Math.round(side)}px`);
    };
    let tries = 0;
    let retry = 0;
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(stage);
    observer.observe(text);
    return () => {
      observer.disconnect();
      window.clearTimeout(retry);
    };
  }, []);

  if (houses.length === 0) return null;

  return (
    // Exactly the window under the header; the three gaps from --spot-gap.
    <StageBand from="lg" className="hidden h-[calc(100dvh-var(--header-total))] flex-col pt-(--spot-gap,40px) md:flex [&>.stage-gradient]:hidden">
      <div ref={textRef} data-spot-text className="relative z-2 shrink-0">
        {(themeVibes.length > 0 || launchHero) && (
          <Container>
            <SpotlightGreeting launch={launchHero} name={me ? firstName(me) : null} vibes={themeVibes} countOf={countOf} onPick={onPickVibe} />
          </Container>
        )}
      </div>
      <section ref={rowRef} data-spot-row aria-label={t("featuredHouses")} className="relative mt-(--spot-gap,40px)">
        <Shelf snap={false} copies={COPIES} startIndex={startIndex} step="card" onRest={onRest} top="">
          {Array.from({ length: COPIES }, (_, copy) =>
            houses.map(({ stay, host, crew }, i) => (
              <div
                key={`${stay.id}-${copy}`}
                aria-hidden={copy !== middleCopy || undefined}
                data-id={stay.id}
                data-vibe={stay.vibe}
                data-index={i}
                data-surface="dark"
                className="cf-slide"
                style={{ width: "var(--spot-w)" }}
              >
                {/* Exactly the shelves' card ("Your people are going": variant="shelf", the same props) – no card of its own, no wrapper look. */}
                <HouseCard variant="shelf" stay={stay} host={host} crew={crew} />
              </div>
            )),
          )}
        </Shelf>
      </section>
    </StageBand>
  );
}

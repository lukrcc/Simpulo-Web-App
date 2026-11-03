"use client";

import Autoplay from "embla-carousel-autoplay";
import useEmblaCarousel from "embla-carousel-react";
import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EXPLORE_SPACING } from "@/config/explore";
import { StayCard } from "@/components/StayCard";
import { StageBand } from "@/components/ui/StageBand";
import { markHeroSeen } from "@/lib/heroRotation";
import { rememberedSpotlight, rememberSpotlight } from "@/lib/houseTransition";
import { findUser, getCrew, useStore } from "@/lib/store";
import type { Stay } from "@/lib/types";
import { cn } from "@/lib/utils";

/*
 * Spotlight sizes – do not change without explicit instruction.
 *
 * Embla Carousel (loop, centred, wheel gestures, autoplay 8s: stopped while the mouse is over it and for 20s after any
 * interaction). The carousel 640px, 48px under the header's bar, full-bleed, on the stage gradient, which starts right at the bar. Slides 400×533 (3:4). By
 * distance from the centre, on every scroll frame, straight on the DOM (never React state), along a cubic focus curve: at
 * rest scale 1 · 0.78 · 0.66, black overlay 0 · 0.25 · 0.38, moved inwards so the visible gap between the scaled cards is
 * 20px in every frame. The floor shadow fades with the curve; the card nearest the centre lies on top. All cards show the
 * same content in the same place, host tab included: it scales with its card and never fades on its own. No badge, no share / heart here. Floor
 * shadow under the centre: rgba(0,0,0,0.28), 70 % of its width, 24px under it, blur 20px. Arrows 44px, vertically centred. No CSS transition on
 * any slide's transform.
 */

const SLIDE_W = 400;
const SLIDE_H = 533;
/** How Embla lays the slides out, at their full size. */
const LAYOUT_GAP = 24;
/** The gap you see between the scaled cards. */
const GAP = 20;
/** At rest: centre, neighbour, outer. */
const SCALE_CENTRE = 1;
const SCALE_NEIGHBOUR = 0.78;
const SCALE_OUTER = 0.66;
const DIM_NEIGHBOUR = 0.25;
const DIM_OUTER = 0.38;

/**
 * The focus curve, by distance from the centre (0 centre, 1 neighbour): cubic, so a card stays near 0 until just before
 * the centre and the two cards trading places never both look half big.
 */
const focusOf = (d: number) => Math.max(0, 1 - d) ** 3;
const scaleAt = (d: number) =>
  d <= 1 ? SCALE_NEIGHBOUR + (SCALE_CENTRE - SCALE_NEIGHBOUR) * focusOf(d) : SCALE_NEIGHBOUR - (SCALE_NEIGHBOUR - SCALE_OUTER) * Math.min(1, d - 1);
const dimAt = (d: number) => (d <= 1 ? DIM_NEIGHBOUR * (1 - focusOf(d)) : DIM_NEIGHBOUR + (DIM_OUTER - DIM_NEIGHBOUR) * Math.min(1, d - 1));

/**
 * A card's centre from the stage's, so the gap you see stays 20px in every frame, whatever the scales are: each card sits
 * half of its own and half of the next inner card's width plus the gap further out. Embla lays them out at their full
 * 400px, which would leave the outer ones off a 1440px window. Within the first place the pair either side of the centre
 * has to add up the same way; the term in `d` does that and keeps 0 at the centre.
 */
const offsetAt = (d: number): number =>
  d <= 1 ? (SLIDE_W / 2) * (scaleAt(d) - SCALE_CENTRE) + (SLIDE_W + GAP) * d : offsetAt(d - 1) + (SLIDE_W / 2) * (scaleAt(d - 1) + scaleAt(d)) + GAP;

const SLIDE_STEP = SLIDE_W + LAYOUT_GAP;
const MAX_VISIBLE_DISTANCE = 2;
const AUTOPLAY_MS = 8_000;
const PAUSE_AFTER_INTERACTION_MS = 20_000;
/** A drag or swipe that moved the row at least this far goes on by one card, however slow. */
const MOVE_ON_FROM_PX = 40;
const EMBLA_OPTIONS = { loop: true, align: "center", containScroll: false, dragFree: false, skipSnaps: true, duration: 22, dragThreshold: 8 } as const;
/** How many rounds of the list so it's at least 3× as long as the window: Embla turns its loop off when the slides don't cover the view. */
const roundsFor = (houses: number, windowWidth: number) => (houses === 0 ? 1 : Math.max(1, Math.ceil((3 * windowWidth) / (houses * SLIDE_STEP))));

/**
 * Explore's Spotlight from lg up. A click on a side card brings it to the centre, a click on the centre card opens the
 * House. Arrows, ← →, trackpad swipe and drag. Phones and tablets still have SpotlightHero.
 */
export function SpotlightCoverflow({ stays }: { stays: Stay[] }) {
  const t = useTranslations("explore");
  const tc = useTranslations("common.ui.carousel");
  const store = useStore();
  // Keeps its value until the window crosses a threshold: changing it re-inits Embla, nothing else does.
  const [rounds, setRounds] = useState(1);
  const items = useMemo(() => {
    const houses = stays.flatMap((stay) => {
      const host = findUser(store, stay.hostId);
      return host ? [{ stay, host, crew: getCrew(store, stay) }] : [];
    });
    return Array.from({ length: rounds }, (_, round) => houses.map((house) => ({ ...house, key: round === 0 ? house.stay.id : `${house.stay.id}-copy${round > 1 ? round : ""}` }))).flat();
  }, [stays, store, rounds]);
  useEffect(() => {
    const measure = () => setRounds(roundsFor(stays.length, window.innerWidth));
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [stays.length]);
  // Created once: new plugin objects would make Embla re-init. With reduced motion autoplay never starts.
  const reducedMotion = useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const plugins = useMemo(
    () => [Autoplay({ delay: AUTOPLAY_MS, stopOnInteraction: true, stopOnMouseEnter: true, playOnInit: !reducedMotion }), WheelGesturesPlugin({ forceWheelAxis: "x" })],
    [reducedMotion],
  );
  const [viewportRef, emblaApi] = useEmblaCarousel(EMBLA_OPTIONS, plugins);
  const sectionRef = useRef<HTMLElement>(null);
  const floorRef = useRef<HTMLDivElement>(null);
  const hovered = useRef(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const ids = useRef<string[]>([]);
  useEffect(() => {
    ids.current = items.map((item) => item.stay.id);
  });

  /** Any interaction: autoplay stops, and only comes back after 20s without another one (and not under the mouse). */
  // Always the instance Embla started: useEmblaCarousel compares plugins by name and options, so after a recomputed
  // useMemo (Fast Refresh) our own object would be a new one that was never started – and throws.
  const pauseAutoplay = useCallback(() => {
    emblaApi?.plugins().autoplay?.stop();
    clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => {
      resumeTimer.current = undefined;
      if (!reducedMotion && !hovered.current) emblaApi?.plugins().autoplay?.play();
    }, PAUSE_AFTER_INTERACTION_MS);
  }, [emblaApi, reducedMotion]);
  useEffect(() => () => clearTimeout(resumeTimer.current), []);

  // A short swipe or slow drag has no speed for Embla to go by, and it would snap back to the nearest card – the one it
  // started from. Whoever visibly moved the card meant it: then it goes on by one.
  useEffect(() => {
    if (!emblaApi) return;
    const engine = emblaApi.internalEngine();
    let from = 0;
    let fromSnap = 0;
    const pointerDown = () => {
      pauseAutoplay();
      from = engine.location.get();
      fromSnap = emblaApi.selectedScrollSnap();
    };
    const pointerUp = () => {
      pauseAutoplay();
      if (emblaApi.selectedScrollSnap() !== fromSnap) return;
      // The loop wraps the location by the content's length: the short way round.
      const size = engine.limit.length;
      const moved = ((engine.location.get() - from + size / 2) % size + size) % size - size / 2;
      if (Math.abs(moved) < MOVE_ON_FROM_PX) return;
      if (moved < 0) emblaApi.scrollNext();
      else emblaApi.scrollPrev();
    };
    emblaApi.on("pointerDown", pointerDown).on("pointerUp", pointerUp);
    return () => {
      emblaApi.off("pointerDown", pointerDown).off("pointerUp", pointerUp);
    };
  }, [emblaApi, pauseAutoplay]);

  useEffect(() => {
    if (!emblaApi) return;
    /** Scale, offset and overlay of every slide, from where the scroll is now. On the inner element: Embla's loop moves the slide itself. */
    const tween = () => {
      const snaps = emblaApi.scrollSnapList();
      const count = snaps.length;
      const progress = emblaApi.scrollProgress();
      let focus = 0;
      emblaApi.slideNodes().forEach((slide, i) => {
        // Places from the centre, the short way round the loop.
        const raw = (snaps[i] - progress) * count;
        const d = ((raw + count / 2) % count + count) % count - count / 2;
        const away = Math.abs(d);
        const side = Math.sign(d);
        const f = focusOf(away);
        focus = Math.max(focus, f);
        const inner = slide.firstElementChild as HTMLElement;
        inner.style.transform = `translateX(${(side * (offsetAt(away) - away * SLIDE_STEP)).toFixed(2)}px) scale(${scaleAt(away).toFixed(4)})`;
        // The old card never lies over the new one.
        slide.style.zIndex = String(Math.round(f * 1000));
        const dim = slide.querySelector<HTMLElement>("[data-cf-dim]");
        if (dim) dim.style.opacity = dimAt(away).toFixed(3);
      });
      if (floorRef.current) floorRef.current.style.opacity = focus.toFixed(3);
    };
    /**
     * The others' links can't be reached, only the chosen card's. Inert one level inside the moved
     * element: that one stays hittable where the card is drawn.
     */
    const select = () => {
      const selected = emblaApi.selectedScrollSnap();
      rememberSpotlight(selected);
      const count = emblaApi.slideNodes().length;
      emblaApi.slideNodes().forEach((slide, i) => {
        (slide.firstElementChild?.firstElementChild as HTMLElement).inert = i !== selected;
      });
      const shown = [...new Set(ids.current.filter((_, i) => {
        const d = Math.abs(i - selected);
        return Math.min(d, count - d) <= MAX_VISIBLE_DISTANCE;
      }))];
      if (shown.length > 0) markHeroSeen(shown);
    };
    const all = () => {
      tween();
      select();
    };
    // Back from a House: the card it was opened from, right away.
    const remembered = rememberedSpotlight();
    if (remembered !== null && remembered < emblaApi.scrollSnapList().length) emblaApi.scrollTo(remembered, true);
    all();
    emblaApi.on("scroll", tween).on("slideFocus", tween).on("reInit", all).on("select", select);
    return () => {
      emblaApi.off("scroll", tween).off("slideFocus", tween).off("reInit", all).off("select", select);
    };
  }, [emblaApi]);

  // ← →: while the Spotlight is on screen and nothing that takes the keys has focus (a field, an open dialog).
  useEffect(() => {
    if (!emblaApi) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable], [role=dialog], [role=radiogroup]")) return;
      const box = sectionRef.current?.getBoundingClientRect();
      if (!box || box.height === 0 || box.bottom < 0 || box.top > window.innerHeight) return;
      e.preventDefault();
      pauseAutoplay();
      if (e.key === "ArrowRight") emblaApi.scrollNext();
      else emblaApi.scrollPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [emblaApi, pauseAutoplay]);

  // Stable while anything re-renders above: the same elements, the same order, nothing for Embla to notice.
  const slides = useMemo(
    () =>
      items.map(({ stay, host, crew, key }, i) => (
        <div
          key={key}
          // Only the moved element takes the pointer: the slide's own, unscaled box reaches over its neighbour's card.
          className="cf-slide pointer-events-none flex-none"
          style={{ width: SLIDE_W, height: SLIDE_H, marginRight: LAYOUT_GAP }}
          // Embla swallows the click that ends a drag (capture phase on its viewport), so this only sees real clicks: a
          // side card comes to the centre (its content is inert); the centre card's own link opens the House.
          onClick={() => {
            if (!emblaApi || i === emblaApi.selectedScrollSnap()) return;
            pauseAutoplay();
            emblaApi.scrollTo(i);
          }}
        >
          <div className="pointer-events-auto h-full">
            <div className="h-full">
              <StayCard stay={stay} host={host} crew={crew} spotlight />
            </div>
          </div>
        </div>
      )),
    [items, emblaApi, pauseAutoplay],
  );

  if (items.length === 0) return null;

  return (
    <StageBand from="lg" className={cn("hidden lg:block", EXPLORE_SPACING.spotlightTop)}>
      <section
        ref={sectionRef}
        aria-label={t("featuredHouses")}
        aria-roledescription="carousel"
        onMouseEnter={() => (hovered.current = true)}
        onMouseLeave={() => {
          hovered.current = false;
          // Not within the 20s after an interaction: that timer brings it back.
          if (!reducedMotion && resumeTimer.current === undefined) emblaApi?.plugins().autoplay?.play();
        }}
        className="relative h-160 overflow-x-clip"
      >
        {/* The floor shadow: 70 % of the centre card's width, 24px under its bottom edge. */}
        <div
          ref={floorRef}
          aria-hidden
          style={{ width: SLIDE_W * 0.7, top: `calc(50% + ${SLIDE_H / 2 + GAP}px)` }}
          className="pointer-events-none absolute left-1/2 h-8 -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(0,0,0,0.28),transparent)] blur-[20px]"
        />

        {/* Wider than the window: the cards are drawn closer to the centre than Embla lays them out, so it has to keep
            them in place past the window's edge too – up to 1.8× as far out at the outer cards' spacing. The section clips it. */}
        <div ref={viewportRef} data-spotlight-viewport className="absolute inset-y-0 -left-[40vw] -right-[40vw] overflow-hidden">
          <div className="flex h-full touch-pan-y items-center select-none [&_a]:[-webkit-user-drag:none] [&_img]:[-webkit-user-drag:none]">
            {slides}
          </div>
        </div>

        <button type="button" onClick={() => {
            pauseAutoplay();
            emblaApi?.scrollPrev();
          }} aria-label={tc("previous", { item: tc("defaultItem") })} className={cn(ARROW, "left-8")}>
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <button type="button" onClick={() => {
            pauseAutoplay();
            emblaApi?.scrollNext();
          }} aria-label={tc("next", { item: tc("defaultItem") })} className={cn(ARROW, "right-8")}>
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </section>
    </StageBand>
  );
}

const ARROW = "absolute top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors hover:bg-bg";

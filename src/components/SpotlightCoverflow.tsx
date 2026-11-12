"use client";

import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { SpotlightGreeting, type LaunchHero } from "@/components/explore/SpotlightIntro";
import { markSpotlightIntroDone } from "@/components/explore/useMarkBreath";
import { EXPLORE_SPACING, SPOTLIGHT_AUTOPLAY_MS, SPOTLIGHT_INTRO_KEY, SPOTLIGHT_THEME_LINES, SPOTLIGHT_THEME_LINES_VISITOR } from "@/config/explore";
import { Container } from "@/components/layout/Container";
import { HouseCard } from "@/components/HouseCard";
import { IconButton } from "@/components/ui/IconButton";
import { StageBand } from "@/components/ui/StageBand";
import { BAND_HEIGHT } from "@/lib/appMode";
import { markHeroSeen } from "@/lib/heroRotation";
import { rememberedSpotlight, rememberSpotlight } from "@/lib/houseTransition";
import { findUser, getCrew, getCurrentUser, useStore } from "@/lib/store";
import type { Stay, Vibe } from "@/lib/types";
import { cn, firstName } from "@/lib/utils";
import { PassiveWheelGestures } from "@/lib/passiveWheelGestures";

/*
 * Spotlight sizes – do not change without explicit instruction.
 *
 * Embla Carousel (loop, centred, wheel gestures). It goes on by itself every 7s: paused under the mouse, for 20s
 * after any interaction, off screen and in a hidden tab. The carousel as tall as its centre card, all cards on one axis, nothing under them, full-bleed, on the stage
 * gradient, which starts right at the bar; no shadow under them. Slides --spot-w × --spot-h: clamp(440px, 100vh − header − 160px,
 * 680px) tall, 3:4, so all of it fits the window. The text (logged out title + subline, logged in the greeting left and the centre
 * card's category right, on one top edge) is absolute and never moves the carousel: above the left neighbour's host tab (32px), left of the
 * centre card (48px). It fits itself in (clamp(44px, 3.6vw, 64px) → 36px, then 15px under it); if it can't, it goes centred above and pushes the
 * carousel down. By
 * distance from the centre, on every scroll frame, straight on the DOM (never React state), along a cubic focus curve: at
 * rest scale 1 · 0.78 · 0.66, black overlay 0 · 0.25 · 0.38, moved inwards so the visible gap between the scaled cards is
 * 20px in every frame. The card nearest the centre lies on top. All cards show the
 * same content in the same place, host tab included: it scales with its card and never fades on its own. No badge, no share / heart here. Arrows 44px, vertically centred. No CSS transition on
 * any slide's transform.
 */

/** The slide's size from the same clamp as --spot-h, before it can be measured (the header's 64px bar). */
const slideHeightFor = (windowHeight: number) => Math.min(680, Math.max(440, windowHeight - 64 - BAND_HEIGHT - 160));
/** How Embla lays the slides out, at their full size. */
const LAYOUT_GAP = 24;
/** The gap you see between the scaled cards. */
const GAP = 20;
/** The title's sizes to try beside the centre card, largest first: from --text-stage, clamp(44px, 3.6vw, 64px), down to 36px. */
const titleSizes = (windowWidth: number) => {
  const start = Math.round(Math.min(64, Math.max(44, 0.036 * windowWidth)));
  return [start, ...[60, 56, 52, 48, 44, 40, 36].filter((size) => size < start)];
};
/** Logged in, the theme's sentence at each of them. Logged out, at the last one the text under the title goes down to body. */
const FIT_THEME = [28, 24, 20];
/** Between the text and the left neighbour's host tab. */
const TEXT_ABOVE_TAB = 32;
/** Logged in: from the bottom of "Where to next?" to the neighbour's tab. */
const GREETING_ABOVE_TAB = 40;
/** The text sets the carousel's place: 40px under the header's one bar (64px) – no more centring, so the cards sit high. */
const TAB_BOTTOM = 64;
const GREETING_UNDER_TAB = 40;
/** At least this much under the centre card, or the text gets smaller. */
const WINDOW_BOTTOM = 32;
/** Logged in: how far the letters of "Hi …" sit below their line's top, in its size; the theme block comes down this much less 1.5px (its eyebrow's own room). */
const HI_ABOVE_LETTERS = 0.18;
const GREETING_EYEBROW_DROP = (hiSize: number) => hiSize * 0.15 - 1.5;
/** The theme block on the right hangs down from the same top edge; at least this far above the neighbour's card. */
const THEME_CLEARANCE = 4;
/** From the title's line box down to its letters' bottom edge, in its size (the same in the translate on the block below). */
const TITLE_BELOW_LETTERS = 0.16;
/** The theme block around its sentence: eyebrow 16 + 6, then 10 + the link 23. */
const THEME_AROUND_SENTENCE = 16 + 6 + 10 + 23;
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
 * width, which would leave the outer ones off a 1440px window. Within the first place the pair either side of the centre
 * has to add up the same way; the term in `d` does that and keeps 0 at the centre.
 */
const offsetAt = (d: number, w: number): number =>
  d <= 1 ? (w / 2) * (scaleAt(d) - SCALE_CENTRE) + (w + GAP) * d : offsetAt(d - 1, w) + (w / 2) * (scaleAt(d - 1) + scaleAt(d)) + GAP;

const MAX_VISIBLE_DISTANCE = 2;
const PAUSE_AFTER_INTERACTION_MS = 20_000;
/** A drag or swipe that moved the row at least this far goes on by one card, however slow. */
const MOVE_ON_FROM_PX = 40;
const EMBLA_OPTIONS = { loop: true, align: "center", containScroll: false, dragFree: false, skipSnaps: true, duration: 22, dragThreshold: 8 } as const;
const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
/** The entrance, once per session: each visible card comes from the right, one after the other; then the text. Under a second for the cards. */
const INTRO_CARD_MS = 600;
const INTRO_STAGGER_MS = 60;
const INTRO_DISTANCE = 3;
const INTRO_TEXT_MS = 200;

/** How many rounds of the list so it's at least 3× as long as the window: Embla turns its loop off when the slides don't cover the view. */
const roundsFor = (houses: number, windowWidth: number, windowHeight: number) => (houses === 0 ? 1 : Math.max(1, Math.ceil((3 * windowWidth) / (houses * ((slideHeightFor(windowHeight) * 3) / 4 + LAYOUT_GAP)))));

/**
 * Explore's Spotlight from lg up. A click on a side card brings it to the centre, a click on the centre card opens the
 * House. Arrows, ← →, trackpad swipe and drag. Phones and tablets still have SpotlightHero.
 */
export function SpotlightCoverflow({ stays, countOf, onPickVibe, launchHero }: { stays: Stay[]; /** Open Houses of a category */ countOf: (vibe: Vibe) => number; onPickVibe: (vibe: Vibe) => void; /** Before the launch and in the beta: the launch hero instead of the greeting (components/explore/SpotlightIntro) */ launchHero?: LaunchHero }) {
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
    const measure = () => setRounds(roundsFor(stays.length, window.innerWidth, window.innerHeight));
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [stays.length]);
  // Created once: new plugin objects would make Embla re-init. With reduced motion it never goes on by itself.
  const reducedMotion = useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const plugins = useMemo(() => [PassiveWheelGestures()], []);
  const [viewportRef, emblaApi] = useEmblaCarousel(EMBLA_OPTIONS, plugins);
  const sectionRef = useRef<HTMLElement>(null);
  const me = getCurrentUser(store);
  // The centre card's category, set once the carousel has come to rest on it.
  const [settledVibe, setSettledVibe] = useState<Vibe | null>(null);
  const themeVibe = settledVibe ?? items[0]?.stay.vibe;
  // The clock behind "goes on by itself": it only counts while nothing is holding it.
  const clock = useRef({ elapsed: 0, last: 0, frame: 0, hovered: false, interacted: false, onScreen: true, intro: true, sync: () => {} });
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const ids = useRef<string[]>([]);
  const vibes = useRef<Vibe[]>([]);
  useEffect(() => {
    ids.current = items.map((item) => item.stay.id);
    vibes.current = items.map((item) => item.stay.vibe);
  });

  /** Any interaction: the clock starts over and only runs again after 20s without another one. */
  const pauseAutoplay = useCallback(() => {
    const c = clock.current;
    c.elapsed = 0;
    c.interacted = true;
    c.sync();
    clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => {
      c.interacted = false;
      c.sync();
    }, PAUSE_AFTER_INTERACTION_MS);
  }, []);
  useEffect(() => () => clearTimeout(resumeTimer.current), []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!emblaApi || reducedMotion || !section) return;
    const c = clock.current;
    const tick = (now: number) => {
      c.elapsed += now - c.last;
      c.last = now;
      if (c.elapsed >= SPOTLIGHT_AUTOPLAY_MS) {
        c.elapsed = 0;
        emblaApi.scrollNext();
      }
      c.frame = requestAnimationFrame(tick);
    };
    c.sync = () => {
      const held = c.hovered || c.interacted || c.intro || !c.onScreen || document.hidden;
      if (held) {
        cancelAnimationFrame(c.frame);
        c.frame = 0;
      } else if (!c.frame) {
        c.last = performance.now();
        c.frame = requestAnimationFrame(tick);
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      c.onScreen = entry.isIntersecting;
      c.sync();
    });
    observer.observe(section);
    document.addEventListener("visibilitychange", c.sync);
    c.sync();
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", c.sync);
      cancelAnimationFrame(c.frame);
      c.frame = 0;
      c.sync = () => {};
    };
  }, [emblaApi, reducedMotion]);

  // The entrance, once per session. Hidden until it starts (from the first paint on: the script in app/layout.tsx and html[data-spot-intro] in
  // globals.css); the animations then hold their own first frame. On the element inside the one the focus curve moves, so they never meet.
  const introStarted = useRef(false);
  /** Decided once: this effect runs again when the rounds change, and by then the flag is already set. */
  const introSeen = useRef<boolean | null>(null);
  useEffect(() => {
    const section = sectionRef.current;
    if (!emblaApi || !section || introStarted.current) return;
    const root = document.documentElement;
    const finishWithout = () => {
      root.removeAttribute("data-spot-intro");
      clock.current.intro = false;
      clock.current.sync();
      markSpotlightIntroDone();
    };
    if (introSeen.current === null) {
      try {
        introSeen.current = sessionStorage.getItem(SPOTLIGHT_INTRO_KEY) !== null;
        sessionStorage.setItem(SPOTLIGHT_INTRO_KEY, "1");
      } catch {
        // no session storage: no entrance
        introSeen.current = true;
      }
    }
    const box = section.getBoundingClientRect();
    if (introSeen.current || reducedMotion || box.height === 0 || box.top > window.innerHeight || box.bottom < 0) {
      introStarted.current = true;
      return finishWithout();
    }
    root.setAttribute("data-spot-intro", "");
    // Two frames: the list's rounds and Embla's reInit have landed by then.
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        introStarted.current = true;
        const snaps = emblaApi.scrollSnapList();
        const progress = emblaApi.scrollProgress();
        const placed = emblaApi
          .slideNodes()
          .map((slide, i) => {
            const raw = (snaps[i] - progress) * snaps.length;
            return { slide, d: ((raw + snaps.length / 2) % snaps.length + snaps.length) % snaps.length - snaps.length / 2 };
          })
          .filter(({ d }) => Math.abs(d) <= INTRO_DISTANCE + 0.5)
          .toSorted((a, b) => a.d - b.d);
        const cards = placed.flatMap(({ slide }, i) => {
          const inner = slide.firstElementChild?.firstElementChild;
          return inner ? [inner.animate([{ transform: "translateX(40vw) scale(0.9)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: INTRO_CARD_MS, delay: i * INTRO_STAGGER_MS, easing: EASE, fill: "backwards" })] : [];
        });
        const cardsDone = INTRO_CARD_MS + (placed.length - 1) * INTRO_STAGGER_MS;
        const texts = [...document.querySelectorAll("[data-spot-text]")].map((text) => text.animate([{ opacity: 0 }, { opacity: 1 }], { duration: INTRO_TEXT_MS, delay: cardsDone, easing: "linear", fill: "backwards" }));
        const all = [...cards, ...texts];
        root.removeAttribute("data-spot-intro");
        const stopListening = () => EVENTS.forEach((name) => window.removeEventListener(name, cut, true));
        // Whoever does anything sees the end state at once.
        const cut = () => {
          stopListening();
          all.forEach((animation) => animation.finish());
        };
        const EVENTS = ["wheel", "pointerdown", "keydown", "scroll"];
        EVENTS.forEach((name) => window.addEventListener(name, cut, { capture: true, passive: true }));
        void Promise.allSettled(all.map((animation) => animation.finished)).then(() => {
          stopListening();
          clock.current.intro = false;
          clock.current.sync();
          markSpotlightIntroDone();
            });
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [emblaApi, reducedMotion, rounds]);

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
      const slideW = emblaApi.slideNodes()[0]?.offsetWidth ?? 0;
      emblaApi.slideNodes().forEach((slide, i) => {
        // Places from the centre, the short way round the loop.
        const raw = (snaps[i] - progress) * count;
        const d = ((raw + count / 2) % count + count) % count - count / 2;
        const away = Math.abs(d);
        const side = Math.sign(d);
        const f = focusOf(away);
        const inner = slide.firstElementChild as HTMLElement;
        inner.style.transform = `translateX(${(side * (offsetAt(away, slideW) - away * (slideW + LAYOUT_GAP))).toFixed(2)}px) scale(${scaleAt(away).toFixed(4)})`;
        // The old card never lies over the new one.
        slide.style.zIndex = String(Math.round(f * 1000));
        const dim = slide.querySelector<HTMLElement>("[data-cf-dim]");
        if (dim) dim.style.opacity = dimAt(away).toFixed(3);
      });
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
    const settle = () => setSettledVibe(vibes.current[emblaApi.selectedScrollSnap()] ?? null);
    const all = () => {
      tween();
      select();
      settle();
    };
    // Back from a House: the card it was opened from, right away.
    const remembered = rememberedSpotlight();
    if (remembered !== null && remembered < emblaApi.scrollSnapList().length) emblaApi.scrollTo(remembered, true);
    all();
    emblaApi.on("scroll", tween).on("slideFocus", tween).on("reInit", all).on("select", select).on("settle", settle);
    return () => {
      emblaApi.off("scroll", tween).off("slideFocus", tween).off("reInit", all).off("select", select).off("settle", settle);
    };
  }, [emblaApi]);

  // The text beside the centre card: as large as fits the free space, else above the carousel. Only ever looks at the side
  // block and at sizes worked out from the window, so the carousel moving down can't change the answer.
  const sideTextRef = useRef<HTMLDivElement>(null);
  const [textPlace, setTextPlace] = useState<"side" | "above" | null>(null);
  // Logged in and out share the greeting layout (visitors: "Share a place." · "Find your people.").
  const greeting = true;
  const themeLines = me ? SPOTLIGHT_THEME_LINES : SPOTLIGHT_THEME_LINES_VISITOR;
  useLayoutEffect(() => {
    const block = sideTextRef.current;
    const section = sectionRef.current;
    if (!block || !section) return;
    const fit = () => {
      const cardH = section.offsetHeight;
      if (cardH === 0) return;
      const title = block.querySelector("h2");
      const hi = block.querySelector<HTMLElement>("[data-spotlight-greeting-left] > p");
      const hiSize = hi ? parseFloat(getComputedStyle(hi).fontSize) : 0;
      // The right side must stay clear of its neighbour with any sentence, not only the one showing now.
      const theme = block.querySelector<HTMLElement>("[data-spotlight-greeting-right] > *");
      let probe: HTMLElement | null = null;
      if (greeting && theme) {
        probe = document.createElement("p");
        probe.className = "text-h2";
        probe.style.cssText = "position:absolute;visibility:hidden;font-size:var(--fit-theme,28px)";
        theme.append(probe);
      }
      const sentenceHeight = () => {
        if (!probe || !theme) return 0;
        // Single letters run a little wider than the text in one piece.
        probe.style.width = `${theme.clientWidth * 0.97}px`;
        return Math.max(...Object.values(themeLines).map((line) => {
          probe!.textContent = line;
          return probe!.offsetHeight;
        }));
      };
      const themeFits = () => {
        if (!probe || !title) return true;
        const titleSize = parseFloat(getComputedStyle(title).fontSize);
        return GREETING_EYEBROW_DROP(hiSize) + sentenceHeight() + THEME_AROUND_SENTENCE <= block.offsetHeight - TITLE_BELOW_LETTERS * titleSize + GREETING_ABOVE_TAB - THEME_CLEARANCE;
      };
      const fits = () => (title?.scrollWidth ?? 0) <= (title?.clientWidth ?? 0) && themeFits() && total() + GREETING_UNDER_TAB + WINDOW_BOTTOM <= area;
      const stage = block.closest<HTMLElement>("[data-glow-section]");
      // Text and carousel together, in the middle between the tab and the window's bottom. The text sets the card's place: its gap to the neighbour's tab, and
      // that tab is this far into the card.
      const gapToTab = greeting ? GREETING_ABOVE_TAB : TEXT_ABOVE_TAB;
      const tabInCard = ((1 - SCALE_NEIGHBOUR) / 2) * cardH;
      const area = window.innerHeight - BAND_HEIGHT - TAB_BOTTOM;
      const textHeight = () => block.offsetHeight - (greeting && title ? TITLE_BELOW_LETTERS * parseFloat(getComputedStyle(title).fontSize) : 0) - (greeting ? HI_ABOVE_LETTERS * hiSize : 0);
      const total = () => textHeight() + gapToTab + cardH - tabInCard;
      const done = (place: "side" | "above") => {
        probe?.remove();
        if (place === "side" && title) {
          const textTop = BAND_HEIGHT + TAB_BOTTOM + GREETING_UNDER_TAB;
          stage?.style.setProperty("--spot-top", `${Math.round(textTop + textHeight() + gapToTab - tabInCard)}px`);
        } else stage?.style.removeProperty("--spot-top");
        setTextPlace(place);
      };
      block.style.setProperty("--fit-body", "var(--text-body-lg)");
      for (const size of titleSizes(window.innerWidth)) {
        block.style.setProperty("--fit-title", `${size}px`);
        for (const theme of greeting ? FIT_THEME : [0]) {
          if (greeting) block.style.setProperty("--fit-theme", `${theme}px`);
          if (fits()) return done("side");
        }
      }
      block.style.setProperty("--fit-body", "var(--text-body)");
      done(fits() ? "side" : "above");
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(section);
    window.addEventListener("resize", fit);
    void document.fonts?.ready.then(fit);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fit);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- themeLines follows `me`
  }, [greeting, me?.name]);

  // Without a loop the arrows go at the row's ends.
  const [ends, setEnds] = useState({ prev: true, next: true });
  useEffect(() => {
    if (!emblaApi) return;
    const update = () =>
      setEnds((current) => {
        const prev = emblaApi.canScrollPrev();
        const next = emblaApi.canScrollNext();
        return current.prev === prev && current.next === next ? current : { prev, next };
      });
    update();
    emblaApi.on("select", update).on("reInit", update);
    return () => {
      emblaApi.off("select", update).off("reInit", update);
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
          style={{ width: "var(--spot-w)", height: "var(--spot-h)", marginRight: LAYOUT_GAP }}
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
              <HouseCard stay={stay} host={host} crew={crew} spotlight />
            </div>
          </div>
        </div>
      )),
    [items, emblaApi, pauseAutoplay],
  );

  if (items.length === 0) return null;

  return (
    <StageBand
      from="lg"
      className={cn(
        "hidden lg:block",
        // Until it's measured (server render): by the window's width.
        textPlace === "side" ? EXPLORE_SPACING.spotlightTop : textPlace === "above" ? EXPLORE_SPACING.spotlightTextTop : cn(EXPLORE_SPACING.spotlightTextTop, "min-[82.5rem]:pt-[calc(var(--spot-top)-var(--band-h)-56px)]"),
      )}
    >
      <div data-spot-text className={cn(EXPLORE_SPACING.spotlightIntroBottom, textPlace === "side" ? "hidden" : textPlace === null && "min-[82.5rem]:hidden")}>
        {themeVibe && (
          <Container>
            <SpotlightGreeting launch={launchHero} name={me ? firstName(me) : null} vibe={themeVibe} countOf={countOf} onPick={onPickVibe} />
          </Container>
        )}
      </div>
      <div className="relative">
        {/* Beside the carousel, not in it: the section clips its overflow, and this reaches above its top edge. */}
        {/* Out of the flow, from above the left neighbour's host tab upwards. Hidden, not gone, while it's above the carousel: it's what gets measured.
            Above the carousel's drag area, for the greeting's link; it takes the pointer alone. */}
        <div data-spot-text className={cn("pointer-events-none absolute inset-x-0 z-2", "bottom-[calc(var(--spot-h)*0.89+40px)]", textPlace === "above" ? "invisible" : textPlace === null && "max-[82.5rem]:invisible")}>
          <Container>
            <div ref={sideTextRef} className="translate-y-[calc(var(--fit-title,var(--text-stage))*0.16)]">
              {themeVibe && <SpotlightGreeting launch={launchHero} name={me ? firstName(me) : null} vibe={themeVibe} countOf={countOf} onPick={onPickVibe} sideClassName={TEXT_BESIDE} />}
            </div>
          </Container>
        </div>

      <section
        ref={sectionRef}
        aria-label={t("featuredHouses")}
        aria-roledescription="carousel"
        onMouseEnter={() => {
          clock.current.hovered = true;
          clock.current.sync();
        }}
        onMouseLeave={() => {
          clock.current.hovered = false;
          clock.current.sync();
        }}
        className="relative h-(--spot-h) overflow-x-clip"
      >
        {/* Wider than the window: the cards are drawn closer to the centre than Embla lays them out, so it has to keep
            them in place past the window's edge too – up to 1.8× as far out at the outer cards' spacing. The section clips it. */}
        {/* 96px taller above and below than the cards, the track padded back by the same: the cards stay put, their shadows (Spotlight depth,
            up to ~84px below) aren't cut by the clip. Only the cards take the pointer – the padding never covers what's above or below. */}
        <div ref={viewportRef} data-spotlight-viewport className="pointer-events-none absolute -inset-y-24 -left-[40vw] -right-[40vw] z-1 overflow-hidden">
          <div className="flex h-full touch-pan-y items-start py-24 select-none [&>*]:pointer-events-auto [&_a]:[-webkit-user-drag:none] [&_img]:[-webkit-user-drag:none]">
            {slides}
          </div>
        </div>

        <IconButton variant="raised" size="lg" onClick={() => {
            pauseAutoplay();
            emblaApi?.scrollPrev();
          }} aria-label={tc("previousShort")} className={cn(ARROW, "left-4", !ends.prev && ARROW_GONE)}>
          <ChevronLeft className="size-5" aria-hidden />
        </IconButton>
        <IconButton variant="raised" size="lg" onClick={() => {
            pauseAutoplay();
            emblaApi?.scrollNext();
          }} aria-label={tc("nextShort")} className={cn(ARROW, "right-4", !ends.next && ARROW_GONE)}>
          <ChevronRight className="size-5" aria-hidden />
        </IconButton>
      </section>
      </div>
    </StageBand>
  );
}

/** Half a row beside the centre card: 48px from it. */
const TEXT_BESIDE = "w-[calc(50%-var(--spot-w)/2-48px)]";
const ARROW = "absolute top-1/2 z-10 -translate-y-1/2";
/** The end of the row (only if Embla ever turns the loop off). */
const ARROW_GONE = "pointer-events-none opacity-0";

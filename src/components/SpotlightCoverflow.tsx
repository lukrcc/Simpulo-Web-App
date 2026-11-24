"use client";

import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { SpotlightGreeting, type LaunchHero } from "@/components/explore/SpotlightIntro";
import { markSpotlightIntroDone } from "@/components/explore/useMarkBreath";
import { SPOTLIGHT_AUTOPLAY_MS, SPOTLIGHT_INTRO_KEY } from "@/config/explore";
import { HOME } from "@/config/home";
import { PassiveWheelGestures } from "@/lib/passiveWheelGestures";
import { HouseCard } from "@/components/HouseCard";
import { Container } from "@/components/layout/Container";
import { IconButton } from "@/components/ui/IconButton";
import { StageBand } from "@/components/ui/StageBand";
import { BAND_HEIGHT } from "@/lib/appMode";
import { markHeroSeen } from "@/lib/heroRotation";
import { rememberedSpotlight, rememberSpotlight } from "@/lib/houseTransition";
import { findUser, getCrew, getCurrentUser, useStore } from "@/lib/store";
import type { Stay, Vibe } from "@/lib/types";
import { cn, firstName } from "@/lib/utils";

/*
 * Spotlight sizes – do not change without explicit instruction.
 *
 * Embla Carousel (loop, centred, wheel gestures). It goes on by itself every 6.5s (a soft ~600ms glide): paused under the mouse or the keyboard's focus, for 20s
 * after any interaction, off screen and in a hidden tab. The carousel as tall as its centre card, all cards on one axis, nothing under them, full-bleed, on the stage
 * gradient, which starts right at the bar; no shadow under them. Slides --spot-w × --spot-h: clamp(440px, 100vh − header − 160px,
 * 680px) tall, 3:4, so all of it fits the window. The text (logged out title + subline, logged in the greeting left and the centre
 * card's category right, on one top edge) is absolute and never moves the carousel: above the left neighbour's host tab (32px), left of the
 * centre card (48px). It fits itself in (clamp(44px, 3.6vw, 64px) → 36px, then 15px under it); if it can't, it goes centred above and pushes the
 * carousel down. By
 * distance from the centre, on every scroll frame, straight on the DOM (never React state), along a cubic focus curve: at
 * rest scale 1 · 0.84 · 0.72 (the centre at most 1.2 × its neighbours), black overlay 0 · 0.25 · 0.38, moved inwards so the visible gap between the scaled cards is
 * 20px in every frame. The card nearest the centre lies on top. All cards show the
 * same content in the same place, host tab included: it scales with its card and never fades on its own. No badge, no share / heart here. Arrows 44px, vertically centred. No CSS transition on
 * any slide's transform.
 */

/** The header bar's height as the page has it (--header-h: 48px from 1100px, else 64px). */
const headerHeight = () => (typeof window === "undefined" ? 64 : parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 64);
/** The slide's size from the same clamp as --spot-h, before it can be measured (the header's bar). */
const slideHeightFor = (windowHeight: number) => Math.min(680, Math.max(440, windowHeight - headerHeight() - BAND_HEIGHT - 160));
/** How Embla lays the slides out, at their full size. */
const LAYOUT_GAP = 24;
/** The gap you see between the scaled cards. */
const GAP = 20;
/** The smallest the centre card gets when a taller text needs the room. */
const MIN_CARD = 320;
/** From the text's foot to the cards' top (the neighbours' in "step"). */
const TEXT_TO_CARD = 40;
/** The largest the centre card gets (large windows: it ends 24px above the floating bar up to this). */
const MAX_CARD = 820;
/** At rest: centre, neighbour, outer. */
const SCALE_CENTRE = 1;
// The centre ≈ 1.15 × its neighbours (CLAUDE.md "Flüssiges, ruhiges horizontales Scrollen"): 1 / 0.87.
/** The Spotlight's mode (config/home.ts): "uniform" – every card the same size, no scaling, no veil; "step" – ONE step, the centre 1.15 ×. */
const UNIFORM = HOME.spotlightMode === "uniform";
const SCALE_NEIGHBOUR = UNIFORM ? 1 : HOME.stepNeighbourScale;
// "step": only one step – every card off the centre the same size and veil (no further shrinking outwards).
const SCALE_OUTER = SCALE_NEIGHBOUR;
const DIM_NEIGHBOUR = UNIFORM ? 0 : 0.25;
const DIM_OUTER = DIM_NEIGHBOUR;

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
/** Beyond this many places from the centre a card is off the window: not touched on every frame. */
const FAR = 3.5;
/** A drag or swipe that moved the row at least this far goes on by one card, however slow. */
const MOVE_ON_FROM_PX = 40;
const EMBLA_OPTIONS = { loop: true, align: "center", containScroll: false, dragFree: false, skipSnaps: false, duration: HOME.emblaDuration, dragThreshold: 8 } as const;
/**
 * A mouse wheel's notch: discrete steps of lines/pages (deltaMode), or one big whole step (≥ 50px) on the legacy 120 raster. A trackpad gives
 * small, frequent pixel deltas – those go to Embla's wheel plugin. (wheelDeltaX alone isn't enough: Chromium reports −120 for every small
 * pixel delta too – measured.)
 */
const isMouseWheelNotch = (e: WheelEvent) => {
  if (e.deltaMode !== 0) return true;
  const legacy = (e as WheelEvent & { wheelDeltaX?: number }).wheelDeltaX;
  return Number.isInteger(e.deltaX) && Math.abs(e.deltaX) >= 50 && typeof legacy === "number" && legacy !== 0 && legacy % 120 === 0;
};
/** After a mouse wheel's notch moved a card, the next one only after this long. */
const WHEEL_LOCK_MS = HOME.wheelLockMs;
const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
/** The entrance, once per session: each visible card comes from the right, one after the other; then the text. Under a second for the cards. */
const INTRO_CARD_MS = 600;
const INTRO_STAGGER_MS = 60;
const INTRO_DISTANCE = 3;
const INTRO_TEXT_MS = 200;

/** How many rounds of the list so it's at least 3× as long as the window: Embla turns its loop off when the slides don't cover the view. */
const roundsFor = (houses: number, windowWidth: number, windowHeight: number) => (houses === 0 ? 1 : Math.max(1, Math.ceil((3 * windowWidth) / (houses * ((slideHeightFor(windowHeight) * 3) / 4 + LAYOUT_GAP)))));

/**
 * Explore's Spotlight from 744px up (phones: SpotlightHero). A click on a side card brings it to the centre, a click on the centre card opens the
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
  // "uniform" scrolls natively, without a loop: each House once.
  const baseItems = useMemo(() => items.filter((item) => !item.key.includes("-copy")), [items]);
  useEffect(() => {
    const measure = () => setRounds(roundsFor(stays.length, window.innerWidth, window.innerHeight));
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [stays.length]);
  // Created once: new plugin objects would make Embla re-init. With reduced motion it never goes on by itself.
  const reducedMotion = useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  // Trackpad swipes follow the fingers (Embla's wheel plugin, behind a passive bridge – lib/passiveWheelGestures.ts); a mouse wheel's notches
  // are left to the one-card step below.
  const plugins = useMemo(() => [PassiveWheelGestures({ skip: isMouseWheelNotch })], []);
  const [viewportRef, emblaApi] = useEmblaCarousel(EMBLA_OPTIONS, plugins);
  const sectionRef = useRef<HTMLElement>(null);
  const me = getCurrentUser(store);
  // The centre card's category, set once the carousel has come to rest on it.
  const [settledVibe, setSettledVibe] = useState<Vibe | null>(null);
  const themeVibe = settledVibe ?? items[0]?.stay.vibe;
  // The clock behind "goes on by itself": it only counts while nothing is holding it.
  const clock = useRef({ elapsed: 0, last: 0, frame: 0, hovered: false, focused: false, interacted: false, onScreen: true, intro: true, sync: () => {} });
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
    // Your own interaction stops it for good, for this visit (CLAUDE.md "Spotlight neu ausbalancieren").
    c.interacted = true;
    c.sync();
  }, []);

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
      const held = c.hovered || c.focused || c.interacted || c.intro || !c.onScreen || document.hidden;
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
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
        // Far off the window (the loop's copies): written once at the outer card's rest and then left alone – each frame only touches the
        // cards that can be seen (CLAUDE.md "Flüssiges, ruhiges horizontales Scrollen").
        const far = away > FAR;
        if (far && slide.dataset.far === "1") return;
        slide.dataset.far = far ? "1" : "";
        const side = Math.sign(d);
        const f = focusOf(away);
        const inner = slide.firstElementChild as HTMLElement;
        // Reduced motion: no scaling – the cards keep their size, only the overlay tells the centre (offsetAt then lays them out at full size).
        inner.style.transform = still || UNIFORM ? "none" : `translateX(${(side * (offsetAt(away, slideW) - away * (slideW + LAYOUT_GAP))).toFixed(2)}px) scale(${scaleAt(away).toFixed(4)})`;
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
        // The hover lift is the neighbours' only (globals.css .cf-slide:not([data-centre])).
        if (i === selected) slide.dataset.centre = "";
        else delete slide.dataset.centre;
      });
      const shown = [...new Set(ids.current.filter((_, i) => {
        const d = Math.abs(i - selected);
        return Math.min(d, count - d) <= MAX_VISIBLE_DISTANCE;
      }))];
      if (shown.length > 0) markHeroSeen(shown);
    };
    // The theme text follows the centre card the moment it is chosen (Embla "select"), not when the glide comes to rest: it fades out while
    // the cards move and the new one fades in at the same place – in step with the card, never on its own.
    const settle = () => setSettledVibe(vibes.current[emblaApi.selectedScrollSnap()] ?? null);
    const all = () => {
      // A new layout (reInit, resize): every card placed again, the far ones too.
      for (const slide of emblaApi.slideNodes()) delete slide.dataset.far;
      tween();
      select();
      settle();
    };
    // Back from a House: the card it was opened from, right away.
    const remembered = rememberedSpotlight();
    if (remembered !== null && remembered < emblaApi.scrollSnapList().length) emblaApi.scrollTo(remembered, true);
    all();
    // will-change only while the cards move (CLAUDE.md "Flüssiges, ruhiges horizontales Scrollen"): set on the first scroll frame, taken off
    // once Embla has settled – a layer per card for the glide, none at rest.
    let moving = false;
    const layers = (on: boolean) => {
      if (moving === on) return;
      moving = on;
      // No hover lift while the cards move.
      if (on) emblaApi.rootNode().dataset.moving = "";
      else delete emblaApi.rootNode().dataset.moving;
      for (const slide of emblaApi.slideNodes()) {
        // Only the cards in sight get their own layer; the far copies none.
        if (on && slide.dataset.far === "1") continue;
        const inner = slide.firstElementChild as HTMLElement | null;
        if (inner) inner.style.willChange = on ? "transform" : "";
        const dim = slide.querySelector<HTMLElement>("[data-cf-dim]");
        if (dim) dim.style.willChange = on ? "opacity" : "";
      }
    };
    const startMoving = () => layers(true);
    const stopMoving = () => layers(false);
    emblaApi.on("scroll", tween).on("scroll", startMoving).on("settle", stopMoving).on("slideFocus", tween).on("reInit", all).on("select", select).on("select", settle);
    return () => {
      emblaApi.off("scroll", tween).off("scroll", startMoving).off("settle", stopMoving).off("slideFocus", tween).off("reInit", all).off("select", select).off("select", settle);
    };
  }, [emblaApi]);

  // A real mouse wheel's notches (Shift + wheel: discrete steps, isMouseWheelNotch): one card per notch, then WHEEL_LOCK_MS before the next.
  // Trackpads never come here – their swipes go to Embla's wheel plugin (PassiveWheelGestures above): the cards follow the fingers with the
  // swipe's own momentum and settle on a card, ready again at once. Passive, only mostly-sideways movement – a vertical turn always scrolls the
  // page. While the pointer is over it, the page's sideways overscroll is off (no accidental "back").
  useEffect(() => {
    const viewport = emblaApi?.rootNode();
    if (!emblaApi || !viewport) return;
    const root = document.documentElement;
    let lockedUntil = 0;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || !isMouseWheelNotch(e)) return;
      const now = performance.now();
      if (now < lockedUntil) return;
      pauseAutoplay();
      if (e.deltaX > 0) emblaApi.scrollNext();
      else emblaApi.scrollPrev();
      lockedUntil = now + WHEEL_LOCK_MS;
    };
    const guard = () => root.style.setProperty("overscroll-behavior-x", "none");
    const release = () => root.style.removeProperty("overscroll-behavior-x");
    viewport.addEventListener("wheel", onWheel, { passive: true });
    viewport.addEventListener("pointerenter", guard);
    viewport.addEventListener("pointerleave", release);
    return () => {
      viewport.removeEventListener("wheel", onWheel);
      viewport.removeEventListener("pointerenter", guard);
      viewport.removeEventListener("pointerleave", release);
      release();
    };
  }, [emblaApi, pauseAutoplay]);

  // The stage fills the window under the header (CLAUDE.md "Spotlight neu ausbalancieren"): header → text 40px, text → the centre card's top
  // 40px, its foot → the floating bar 40px (the bar 24px above the window's edge). The cards' height is what's left: "step" the centre card
  // that tall (3:4, its neighbours 1.12 smaller), "uniform" every card (4:5). The text stays on the page's grid – it never moves.
  const areaRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const area = areaRef.current;
    const stage = area?.closest<HTMLElement>("[data-glow-section]");
    if (!area || !stage) return;
    const fit = () => {
      const avail = area.clientHeight - (parseFloat(getComputedStyle(area).paddingBottom) || 0) - TEXT_TO_CARD;
      if (avail <= 0) return;
      const height = Math.max(MIN_CARD, Math.min(MAX_CARD, avail));
      const width = UNIFORM ? (height * 4) / 5 : (height * 3) / 4;
      stage.style.setProperty("--spot-h", `${Math.round(height)}px`);
      stage.style.setProperty("--spot-w", `${Math.round(width)}px`);
      area.style.setProperty("--spot-card-top", `${TEXT_TO_CARD}px`);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(area);
    observer.observe(stage);
    void document.fonts?.ready.then(fit);
    return () => observer.disconnect();
  }, []);

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
              <HouseCard stay={stay} host={host} crew={crew} spotlight eager={i < 3 || i >= items.length - 2} />
            </div>
          </div>
        </div>
      )),
    [items, emblaApi, pauseAutoplay],
  );

  if (items.length === 0) return null;

  return (
    // From 744px (tablets upright too, CLAUDE.md "Tablet"): the same carousel as the desktop – the centre card with its host notch, the
    // neighbours peeking in left and right. Phones keep SpotlightHero.
    <StageBand from="lg" className="hidden h-[calc(100dvh-var(--header-total))] flex-col pt-10 md:flex [&>.stage-gradient]:md:block">
      {/* The text on top: left "Hi {name}." and "Where to next?", right the centre card's theme – one row (SpotlightGreeting). */}
      {/* On the page's grid (Container): left flush left, right flush right; it never moves with the cards. */}
      <div data-spot-text className="relative z-2 shrink-0">
        {themeVibe && (
          <Container>
            <SpotlightGreeting launch={launchHero} name={me ? firstName(me) : null} vibe={themeVibe} countOf={countOf} onPick={onPickVibe} />
          </Container>
        )}
      </div>
      {/* The cards, centred in the room left under the text. */}
      {/* The cards 24px under the text, as tall as the room allows; the foot keeps clear of the floating bar (BottomTabBar): its height and 24px
          more, so the cards end 24px above it. */}
      <div ref={areaRef} data-spot-area className="relative flex min-h-0 flex-1 items-start pb-[calc(var(--tabbar-clear)+40px)]">
      {UNIFORM ? (
        <UniformRow items={baseItems} label={t("featuredHouses")} prevLabel={tc("previousShort")} nextLabel={tc("nextShort")} onVibe={setSettledVibe} />
      ) : (
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
          // Paused while the keyboard is in it too (CLAUDE.md "ruhige Spotlight-Bühne"): focus on a card or an arrow holds the clock.
          onFocusCapture={() => {
            clock.current.focused = true;
            clock.current.sync();
          }}
          onBlurCapture={(e) => {
            if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
            clock.current.focused = false;
            clock.current.sync();
          }}
          className="relative mt-(--spot-card-top) h-(--spot-h) w-full overflow-x-clip"
        >
          {/* Wider than the window: the cards are drawn closer to the centre than Embla lays them out, so it has to keep
              them in place past the window's edge too – up to 1.8× as far out at the outer cards' spacing. The section clips it. */}
          {/* 96px taller above and below than the cards, the track padded back by the same: the cards stay put, their shadows (Spotlight depth,
              up to ~84px below) aren't cut by the clip. Only the cards take the pointer – the padding never covers what's above or below. */}
          <div ref={viewportRef} data-spotlight-viewport className="pointer-events-none absolute -inset-y-24 -left-[40vw] -right-[40vw] z-1 overflow-hidden">
            {/* The track takes the pointer as ONE surface – cards and the gaps between them, and the room above and below the cards: a swipe or a
                drag anywhere there moves the row (CLAUDE.md "Spotlight-Scrollen reparieren"). It was pointer-events: none with only the cards
                taking the pointer, while the wheel listeners sat on the viewport – a gesture over a gap reached nothing (dead zones). A vertical
                turn is never caught (passive listeners, touch-pan-y): the page scrolls over all of it. */}
            <div className="pointer-events-auto flex h-full touch-pan-y items-start py-24 select-none [&>*]:pointer-events-auto [&_a]:[-webkit-user-drag:none] [&_img]:[-webkit-user-drag:none]">
              {slides}
            </div>
          </div>
  
          <IconButton variant="raised" size="lg" onClick={() => {
              pauseAutoplay();
              emblaApi?.scrollPrev();
            }} aria-label={tc("previousShort")} className={cn(ARROW, "spot-arrow left-4", !ends.prev && ARROW_GONE)}>
            <ChevronLeft className="size-5" aria-hidden />
          </IconButton>
          <IconButton variant="raised" size="lg" onClick={() => {
              pauseAutoplay();
              emblaApi?.scrollNext();
            }} aria-label={tc("nextShort")} className={cn(ARROW, "spot-arrow right-4", !ends.next && ARROW_GONE)}>
            <ChevronRight className="size-5" aria-hidden />
          </IconButton>
        </section>
      )}
      </div>
    </StageBand>
  );
}

const ARROW = "absolute top-1/2 z-10 -translate-y-1/2";
/** The end of the row (only if Embla ever turns the loop off). */
const ARROW_GONE = "pointer-events-none opacity-0";

/**
 * "uniform" (CLAUDE.md "Spotlight uniform: natürliches Scrollen", "Spotlight final"): every card the same size, a NATIVE horizontal scroller –
 * free scrolling with the trackpad's own momentum, no scroll-snap. Endless: the Houses are rendered three times in a row (the outer copies
 * aria-hidden, their links out of the Tab order – not inert, which would stop the pointer and the wheel on them) and it starts in the middle copy; once the view has run into the first or the last copy,
 * scrollLeft moves by exactly one copy's width – invisibly, no animation, the momentum goes on (Safari: only at scrollend or after a short
 * rest, where moving it mid-flight would stop the momentum). ‹ › move one card width, smooth, endlessly both ways. The theme text follows the
 * card nearest the middle (IntersectionObserver on a 1 % strip), 300ms after the scrolling has ended. It goes on by itself every
 * SPOTLIGHT_AUTOPLAY_MS (paused on hover, off screen, in a hidden tab; never with reduced motion) and stops for good for this visit once you
 * scroll it yourself or press an arrow. Hover like Apple TV: the card under the pointer 1.03 with a softer, larger shadow (200ms) – never
 * while scrolling, never with reduced motion (globals.css .spot-uni-card).
 */
function UniformRow({ items, label, prevLabel, nextLabel, onVibe }: { items: { stay: Stay; host: NonNullable<ReturnType<typeof findUser>>; crew: ReturnType<typeof getCrew>; key: string }[]; label: string; prevLabel: string; nextLabel: string; onVibe: (vibe: Vibe) => void }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const n = items.length;
  const state = useRef({ stopped: false, hovered: false, centre: n + Math.min(2, n - 1), programmatic: 0 });
  const vibes = useMemo(() => items.map((item) => item.stay.vibe), [items]);
  const onVibeRef = useRef(onVibe);
  useEffect(() => {
    onVibeRef.current = onVibe;
  });

  // No entrance here: the page shows the cards and the text at once.
  useEffect(() => {
    document.documentElement.removeAttribute("data-spot-intro");
    markSpotlightIntroDone();
  }, []);

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el || n === 0) return;
    const safari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    // The third card of the middle copy in the middle – again whenever the cards' size changes, until someone has scrolled.
    const centre = () => {
      if (state.current.stopped) return;
      el.scrollLeft = (n + Math.min(2, n - 1)) * stepOf(el);
    };
    centre();
    // The outer copies: out of the Tab order (they stay clickable and scrollable – inert would make them dead to the pointer and the wheel).
    el.querySelectorAll("[data-uni-card][aria-hidden] :is(a, button, [tabindex])").forEach((node) => node.setAttribute("tabindex", "-1"));
    const card = el.querySelector("[data-uni-card]");
    const resize = new ResizeObserver(centre);
    if (card) resize.observe(card);

    /** Back into the middle copy, by exactly one copy's width – the same picture, so nothing jumps. */
    const wrap = () => {
      const copy = n * stepOf(el);
      if (copy <= 0) return;
      // Keep the view between half a copy and two and a half: the middle copy and room either side – never near the row's ends.
      if (el.scrollLeft < copy * 0.5) el.scrollLeft += copy;
      else if (el.scrollLeft > copy * 2.5) el.scrollLeft -= copy;
    };

    // The card on the middle line.
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) state.current.centre = Number((entry.target as HTMLElement).dataset.index);
      },
      { root: el, rootMargin: "0px -49.5% 0px -49.5%", threshold: 0 },
    );
    el.querySelectorAll("[data-uni-card]").forEach((node) => io.observe(node));

    // Scrolling: the wrap (at once, but never inside a smooth scroll we started, and in Safari only at rest), the theme 300ms after it ends,
    // and data-scrolling for the hover (no lift while it moves).
    let settle: ReturnType<typeof setTimeout> | undefined;
    let rest: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      el.dataset.scrolling = "";
      const ours = performance.now() < state.current.programmatic;
      if (!safari && !ours) wrap();
      clearTimeout(rest);
      rest = setTimeout(() => {
        delete el.dataset.scrolling;
        wrap();
      }, REST_MS);
      clearTimeout(settle);
      settle = setTimeout(() => {
        const vibe = vibes[state.current.centre % n];
        if (vibe) onVibeRef.current(vibe);
      }, THEME_AFTER_SCROLL_MS);
    };
    const onScrollEnd = () => wrap();
    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("scrollend", onScrollEnd);
    const first = vibes[state.current.centre % n];
    if (first) onVibeRef.current(first);

    // Your own scrolling stops the clock for good.
    const stop = () => {
      state.current.stopped = true;
    };
    const inputs = ["wheel", "pointerdown", "touchstart", "keydown"] as const;
    inputs.forEach((name) => el.addEventListener(name, stop, { passive: true }));
    return () => {
      resize.disconnect();
      io.disconnect();
      clearTimeout(settle);
      clearTimeout(rest);
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("scrollend", onScrollEnd);
      inputs.forEach((name) => el.removeEventListener(name, stop));
    };
  }, [n, vibes]);

  // The clock: one card on every SPOTLIGHT_AUTOPLAY_MS while nothing holds it – endlessly.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let onScreen = true;
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
    });
    io.observe(el);
    const id = window.setInterval(() => {
      const s = state.current;
      if (s.stopped || s.hovered || !onScreen || document.hidden) return;
      glide(el, 1, s);
    }, SPOTLIGHT_AUTOPLAY_MS);
    return () => {
      window.clearInterval(id);
      io.disconnect();
    };
  }, []);

  const move = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    state.current.stopped = true;
    glide(el, direction, state.current);
  };

  return (
    <section
      aria-label={label}
      onMouseEnter={() => {
        state.current.hovered = true;
      }}
      onMouseLeave={() => {
        state.current.hovered = false;
      }}
      className="relative mt-(--spot-card-top) h-(--spot-h) w-full"
    >
      {/* 144px of room above and below for the cards' soft shadows (they reach ~112px; the negative inset takes it back); only the cards take
          the pointer – a wheel or a swipe on them still scrolls this. */}
      <div
        ref={scrollerRef}
        data-spot-scroller
        className="pointer-events-none absolute inset-x-0 -inset-y-36 overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex h-full w-max items-start gap-6 px-[calc(50%-var(--spot-w)/2)] py-36 [&_a]:[-webkit-user-drag:none] [&_img]:[-webkit-user-drag:none]">
          {[0, 1, 2].flatMap((copy) =>
            items.map(({ stay, host, crew, key }, i) => (
              // The outer copies are the loop's scenery: hidden from screen readers, out of the Tab order (tabindex -1, set in the effect).
              <div
                key={`${key}-${copy}`}
                data-uni-card
                data-index={copy * n + i}
                aria-hidden={copy === 1 ? undefined : true}
                className="spot-uni-card pointer-events-auto shrink-0"
                style={{ width: "var(--spot-w)", height: "var(--spot-h)" }}
              >
                <HouseCard stay={stay} host={host} crew={crew} spotlight eager={copy === 1 && i < 5} />
              </div>
            )),
          )}
        </div>
      </div>
      <IconButton variant="raised" size="lg" onClick={() => move(-1)} aria-label={prevLabel} className={cn(ARROW, "spot-arrow left-4")}>
        <ChevronLeft className="size-5" aria-hidden />
      </IconButton>
      <IconButton variant="raised" size="lg" onClick={() => move(1)} aria-label={nextLabel} className={cn(ARROW, "spot-arrow right-4")}>
        <ChevronRight className="size-5" aria-hidden />
      </IconButton>
    </section>
  );
}
/** "uniform": one card's step – its width and the gap. */
const stepOf = (el: HTMLElement) => (el.querySelector<HTMLElement>("[data-uni-card]")?.offsetWidth ?? 0) + UNIFORM_GAP;

/** "uniform": a smooth scroll of ours, one card either way; the wrap waits until it's done. */
function glide(el: HTMLElement, direction: 1 | -1, state: { programmatic: number }) {
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  state.programmatic = performance.now() + (still ? 0 : GLIDE_MS);
  el.scrollBy({ left: direction * stepOf(el), behavior: still ? "auto" : "smooth" });
}

/** "uniform": the gap between cards (gap-6). */
const UNIFORM_GAP = 24;
/** "uniform": the theme text changes this long after the scrolling has stopped. */
const THEME_AFTER_SCROLL_MS = 300;
/** "uniform": no scroll event for this long counts as rest (the wrap in Safari, the hover back on). */
const REST_MS = 140;
/** "uniform": how long a smooth scroll of ours takes at most – the wrap waits for it. */
const GLIDE_MS = 700;

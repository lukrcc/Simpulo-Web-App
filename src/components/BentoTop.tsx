"use client";

import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { Container } from "@/components/layout/Container";
import { CardTab } from "@/components/ui/CardTab";
import { NotchedCard } from "@/components/ui/NotchedCard";
import { CrewAvatars } from "@/components/ui/CrewAvatars";
import { Img } from "@/components/ui/Img";
import { PlaceText } from "@/components/ui/PlaceText";
import { useFormat } from "@/i18n/format";
import { markHeroSeen } from "@/lib/heroRotation";
import { findUser, getCrew, useStore } from "@/lib/store";
import type { Stay, User } from "@/lib/types";
import { usePageHidden } from "@/lib/usePageHidden";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { cn, firstName, firstSentence } from "@/lib/utils";

/** One cell switches this often – A, then B, then C, then A again. */
const TICK_MS = 5_000;
const CELL_COUNT = 3;
/** Crossfade of the switching cell on autoplay … */
const FADE_MS = 600;
/** … and of all three on "Next". */
const NEXT_FADE_MS = 300;
/** A House stays up for a full round (one tick per cell) – its photo zooms 1 → 1.06 over that time. */
const ZOOM_MS = TICK_MS * CELL_COUNT;

const mod = (n: number, m: number) => ((n % m) + m) % m;

/** Cell positions by how many featured Houses there are – fewer than three never leave an empty cell. */
const CELL_LAYOUTS: Record<1 | 2 | 3, readonly string[]> = {
  1: ["col-span-12 row-span-2"], // A across the whole block
  2: ["col-span-7 row-span-2", "col-span-5 col-start-8 row-span-2"], // A + B, both full height
  3: [
    "col-span-7 row-span-2", // A
    "col-span-5 col-start-8 row-start-1", // B
    "col-span-5 col-start-8 row-start-2", // C
  ],
};

/** The next `n` Houses (indexes) after `cursor` in the featured order that aren't on screen – never one twice. */
function nextUnseen(shown: readonly number[], cursor: number, n: number, total: number): number[] {
  const picks: number[] = [];
  for (let i = 0; i < total && picks.length < n; i++) {
    const index = mod(cursor + i, total);
    if (!shown.includes(index) && !picks.includes(index)) picks.push(index);
  }
  return picks;
}

interface Rotation {
  /** House index per cell */
  shown: number[];
  /** Per cell: the House that was there before its last switch – stays mounted (invisible) while it fades out */
  previous: (number | null)[];
  /** Where the featured order continues */
  cursor: number;
  /** Single-cell switches since the last shuffle – the next one is cell ticks % cells */
  ticks: number;
  /** Every switch (tick or shuffle) – restarts the timer and the ring */
  steps: number;
  /** Shuffles ("Next") */
  shuffles: number;
  /** Crossfade of the last switch (ms): Next is quicker than autoplay */
  fadeMs: number;
}

const initialRotation = (cells: number): Rotation => ({
  shown: Array.from({ length: cells }, (_, i) => i),
  previous: Array.from({ length: cells }, () => null),
  cursor: cells,
  ticks: 0,
  steps: 0,
  shuffles: 0,
  fadeMs: FADE_MS,
});

/**
 * Desktop (≥ lg) top section: one large and two small featured Houses. Every 5 seconds ONE cell switches to the next
 * House that isn't on screen – A, B, C, A … – with a 600ms crossfade (Next: all three, 300ms); each photo zooms slowly (Ken Burns) while it's
 * up. Shuffle switches all three at once and starts the round over at A. Every cell keeps its upcoming House mounted
 * (invisible), so the photo is loaded before it's shown. Pauses while hovered and while the tab is hidden; resuming
 * gives the cell a full 5 seconds. Reduced motion: no zoom, no turning icon – the crossfades stay.
 */
export function BentoTop({ stays }: { stays: Stay[] }) {
  const t = useTranslations("explore");
  const store = useStore();
  const items = stays.flatMap((stay) => {
    const host = findUser(store, stay.hostId);
    const guests = getCrew(store, stay).filter((u) => u.id !== stay.hostId);
    return host ? [{ stay, host, guests }] : [];
  });
  const cells = Math.min(items.length, CELL_COUNT);
  const canRotate = items.length > cells;

  const [rotation, setRotation] = useState<Rotation>(() => initialRotation(cells));
  const [hovered, setHovered] = useState(false);
  const pageHidden = usePageHidden();
  const reducedMotion = usePrefersReducedMotion();
  const switchingUntil = useRef(0);
  const running = canRotate && !hovered && !pageHidden;

  // The featured list changed size (data presets): start over.
  if (rotation.shown.length !== cells) setRotation(initialRotation(cells));

  /** A guard against a second switch while a crossfade is still running. */
  const claimSwitch = useCallback(() => {
    const now = performance.now();
    if (now < switchingUntil.current) return false;
    switchingUntil.current = now + FADE_MS + 50;
    return true;
  }, []);

  const tick = useCallback(() => {
    if (!claimSwitch()) return;
    setRotation((r) => {
      const cell = r.ticks % r.shown.length;
      const [next] = nextUnseen(r.shown, r.cursor, 1, items.length);
      if (next === undefined) return r;
      return {
        ...r,
        shown: r.shown.map((index, i) => (i === cell ? next : index)),
        previous: r.shown.map((index, i) => (i === cell ? index : null)),
        cursor: next + 1,
        ticks: r.ticks + 1,
        steps: r.steps + 1,
        fadeMs: FADE_MS,
      };
    });
  }, [claimSwitch, items.length]);

  const shuffle = useCallback(() => {
    if (!claimSwitch()) return;
    setRotation((r) => {
      const picks = nextUnseen(r.shown, r.cursor, r.shown.length, items.length);
      // Fewer unseen Houses than cells: keep the rest where they are.
      const shown = r.shown.map((index, i) => picks[i] ?? index);
      return {
        shown,
        previous: r.shown.map((index, i) => (shown[i] !== index ? index : null)),
        cursor: (picks.at(-1) ?? r.cursor - 1) + 1,
        ticks: 0,
        steps: r.steps + 1,
        shuffles: r.shuffles + 1,
        fadeMs: NEXT_FADE_MS,
      };
    });
  }, [claimSwitch, items.length]);

  // What's on screen won't lead the hero again this session round (src/lib/heroRotation.ts).
  const shownIds = rotation.shown.map((index) => items[index]?.stay.id).filter(Boolean).join(",");
  useEffect(() => {
    if (shownIds) markHeroSeen(shownIds.split(","));
  }, [shownIds]);

  // Keyboard on the hero card (cell A's link or its Next capsule): → or Space = Next.
  const onHeroKey = (e: KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== " ") return;
    e.preventDefault();
    shuffle();
  };

  // One timeout per tick: every switch (tick or shuffle) and every resume after a pause starts a full 5 seconds.
  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(tick, TICK_MS);
    return () => clearTimeout(timer);
  }, [running, rotation.steps, tick]);

  if (items.length === 0 || rotation.shown.length !== cells) return null;
  const layout = CELL_LAYOUTS[cells as 1 | 2 | 3];
  const upcoming = canRotate ? nextUnseen(rotation.shown, rotation.cursor, cells, items.length) : [];
  const nextCell = rotation.ticks % cells;
  const firstRender = rotation.steps === 0;

  return (
    <Container className="hidden pt-6 lg:block">
      <section
        aria-label={t("featuredHouses")}
        aria-roledescription="carousel"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="grid h-[min(72vh,820px)] min-h-[560px] grid-cols-12 grid-rows-2 gap-6"
      >
        {rotation.shown.map((index, i) => {
          const shown = items[index];
          const large = i === 0;
          const previousIndex = rotation.previous[i];
          // Preloaded underneath: the House this cell gets on its next tick, and the one a shuffle would bring.
          const preload = [i === nextCell ? upcoming[0] : undefined, upcoming[i]];
          // Current on top; the one fading out and the preloaded ones underneath, invisible. One layer per House.
          const layers = [
            { index, visible: true, leaving: false },
            ...(previousIndex === null ? [] : [{ index: previousIndex, visible: false, leaving: true }]),
            ...preload.filter((p) => p !== undefined).map((p) => ({ index: p, visible: false, leaving: false })),
          ].filter((layer, n, all) => all.findIndex((l) => l.index === layer.index) === n);
          // Crossfade also with reduced motion – it's only the turning and zooming that stop.
          const fade: CSSProperties = { transition: `opacity ${rotation.fadeMs}ms ease-in-out` };
          return (
            // One clipped silhouette per cell, notched around its host tab (NotchedCard). Cell A is the hover group
            // for the shuffle control.
            <NotchedCard
              key={i}
              className={cn(layout[i], large && "group/a")}
              clipClassName="rounded-[28px] bg-ink"
              tabKey={shown.stay.id}
              tab={
                // One tab per cell: only the avatar and name fade in with the cell.
                <CardTab
                  key={`tab-${shown.stay.id}`}
                  host={shown.host}
                  contentClassName={previousIndex !== null && !reducedMotion ? "bento-swap-in" : undefined}
                />
              }
            >
              {layers.map((layer) => (
                // key = House: the preloaded layer becomes the visible one, so its loaded photo is reused as is.
                <div
                  key={items[layer.index].stay.id}
                  aria-hidden={!layer.visible}
                  inert={!layer.visible}
                  style={fade}
                  className={cn("absolute inset-0", layer.visible ? "opacity-100" : "opacity-0")}
                >
                  <CellLayer
                    {...items[layer.index]}
                    large={large}
                    // Zooms while on screen and while fading out (no jump back); paused with the timer.
                    zoom={!reducedMotion && (layer.visible || layer.leaving)}
                    zoomPaused={!running}
                    eager={layer.visible}
                    preload={firstRender && layer.visible && large}
                  />
                </div>
              ))}

              <Link
                href={`/house/${shown.stay.slug}`}
                aria-label={t("houseWithHost", { title: shown.stay.title, host: firstName(shown.host) })}
                aria-keyshortcuts={large && canRotate ? "ArrowRight Space" : undefined}
                onKeyDown={large && canRotate ? onHeroKey : undefined}
                className="absolute inset-0 cursor-pointer"
              />
              {large && canRotate && <NextButton label={t("next")} onClick={shuffle} />}
            </NotchedCard>
          );
        })}
      </section>
    </Container>
  );
}

interface NextButtonProps {
  label: string;
  onClick: () => void;
}

/** Keys that press the Next button: Enter and Space like any button, → as the hero's own shortcut. */
const PRESS_KEYS = new Set(["Enter", " ", "ArrowRight"]);

/**
 * "Next" capsule, bottom-right of cell A: solid surface, ink text and icon, 44px, a soft shadow; hover a shade darker.
 * Held down – mouse (:active) or Enter / Space / → (data-pressed) – it sinks: scale 0.90, darker, the shadow turned
 * inward, for as long as it's held (in 120ms; back out in 160ms). Next happens on release, not on press: then the icon
 * turns half way (180°, 300ms – class "spin", off again on animationend) and the Houses crossfade. Reduced motion: the press is colour
 * only, no turn.
 */
function NextButton({ label, onClick }: NextButtonProps) {
  const iconRef = useRef<SVGSVGElement>(null);
  const [keyPressed, setKeyPressed] = useState(false);
  /** Just acted on a key release – a native click that may follow it is the same press, not another one. */
  const keyReleased = useRef(false);

  function release() {
    const icon = iconRef.current;
    if (icon && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Off, a forced reflow, on again: restarts the turn even while one is still running.
      icon.classList.remove("spin");
      void icon.getBoundingClientRect();
      icon.classList.add("spin");
    }
    onClick();
  }

  return (
    <button
      type="button"
      data-pressed={keyPressed || undefined}
      // Mouse / touch (and screen readers): the click comes on release by itself.
      onClick={() => {
        if (keyReleased.current) return;
        release();
      }}
      onKeyDown={(e) => {
        if (!PRESS_KEYS.has(e.key)) return;
        // Held down: show the press, don't act yet (and no native Enter click, no page scroll on Space).
        e.preventDefault();
        setKeyPressed(true);
      }}
      onKeyUp={(e) => {
        if (!PRESS_KEYS.has(e.key) || !keyPressed) return;
        e.preventDefault();
        setKeyPressed(false);
        release();
        keyReleased.current = true;
        setTimeout(() => (keyReleased.current = false));
      }}
      onBlur={() => setKeyPressed(false)}
      className={cn(
        "absolute bottom-10 right-10 z-20 inline-flex h-11 touch-manipulation items-center gap-2 rounded-full bg-surface px-[18px] text-sm font-semibold text-ink outline-none",
        // Rest – and the way back to it after a press: 160ms.
        "scale-100 shadow-[0_2px_8px_color-mix(in_srgb,var(--ink)_25%,transparent)] transition-[scale,background-color,box-shadow] duration-160 ease-out",
        // #F0EFEC: 60 % line on surface.
        "hover:bg-[color-mix(in_srgb,var(--line)_60%,var(--surface))] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-accent",
        // Pressed (into it in 120ms): #E8E6E1 (line with a little surface), the shadow inward, smaller – not with reduced motion.
        "active:bg-[color-mix(in_srgb,var(--line)_93%,var(--surface))] active:shadow-[inset_0_2px_4px_color-mix(in_srgb,var(--ink)_18%,transparent)] active:duration-120 motion-safe:active:scale-90",
        "data-pressed:bg-[color-mix(in_srgb,var(--line)_93%,var(--surface))] data-pressed:shadow-[inset_0_2px_4px_color-mix(in_srgb,var(--ink)_18%,transparent)] data-pressed:duration-120 motion-safe:data-pressed:scale-90",
      )}
    >
      <RefreshCw ref={iconRef} onAnimationEnd={(e) => e.currentTarget.classList.remove("spin")} className="size-4" aria-hidden />
      {label}
    </button>
  );
}

/** The large cell's title: at most this size once it runs to two lines. */
const TWO_LINE_TITLE_MAX_PX = 56;

/**
 * The large cell's title at its standard size – and if that runs to two lines, capped at TWO_LINE_TITLE_MAX_PX. Measured
 * with a ResizeObserver, always at the standard size (the cap off while measuring), so the result can't flip back and
 * forth between one and two lines.
 */
function HeroTitle({ title }: { title: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      delete el.dataset.twoLines;
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
      if (lineHeight > 0 && Math.round(el.scrollHeight / lineHeight) >= 2) el.dataset.twoLines = "";
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [title]);
  return (
    <h2
      ref={ref}
      style={{ "--two-line-max": `${TWO_LINE_TITLE_MAX_PX}px` } as CSSProperties}
      className="line-clamp-2 text-[clamp(32px,3.4vw,48px)] font-bold leading-[1.05] tracking-[-0.02em] data-two-lines:text-[min(clamp(32px,3.4vw,48px),var(--two-line-max))]"
    >
      {title}
    </h2>
  );
}

interface CellLayerProps {
  stay: Stay;
  host: User;
  guests: User[];
  large: boolean;
  /** Ken Burns on the photo (transform only) */
  zoom: boolean;
  zoomPaused: boolean;
  /** On screen: load right away (above the fold) */
  eager: boolean;
  /** Cell A on first render – the LCP image */
  preload: boolean;
}

/** Photo + text of one House in a cell – they fade as one layer (see BentoTop). */
function CellLayer({ stay, host, guests, large, zoom, zoomPaused, eager, preload }: CellLayerProps) {
  const t = useTranslations("explore");
  const format = useFormat();
  const zoomStyle: CSSProperties | undefined = zoom ? { animationDuration: `${ZOOM_MS}ms`, animationPlayState: zoomPaused ? "paused" : "running" } : undefined;

  return (
    <>
      <div className="absolute inset-0">
        <div style={zoomStyle} className={cn("absolute inset-0 will-change-transform", zoom && "animate-kenburns")}>
          <Img
            src={host.photos[0]}
            alt={t("cards.hostAlt", { name: host.name, title: stay.title })}
            fill
            preload={preload}
            loading={eager && !preload ? "eager" : undefined}
            sizes={large ? "(min-width: 1600px) 900px, 58vw" : "(min-width: 1600px) 640px, 42vw"}
            className="object-cover"
          />
        </div>
        {/* Bottom 55%: transparent → 70% black, eased through a midpoint so it stays soft. */}
        <div className="absolute inset-0 bg-linear-to-t from-ink/70 via-ink/30 via-25% to-transparent to-55%" />
      </div>

      <div className={cn("pointer-events-none absolute text-white", large ? "inset-x-10 bottom-10 pr-16" : "inset-x-8 bottom-8")}>
        {large ? (
          <HeroTitle title={stay.title} />
        ) : (
          <h2 className="line-clamp-2 text-2xl font-bold leading-[1.05] tracking-[-0.02em]">{stay.title}</h2>
        )}
        {large && <p className="mt-3 line-clamp-2 max-w-xl text-lg text-white/90">{firstSentence(stay.lookingForText)}</p>}
        <p className={cn("flex items-center gap-1.5 text-sm text-white/80", large ? "mt-3" : "mt-2")}>
          <span className="shrink-0">{format.shortRange(stay.startDate, stay.endDate)} ·</span>
          {/* "City, Region" in every cell ("Sant Josep, Ibiza"). */}
          <PlaceText>{format.shortPlaceLabel(stay)}</PlaceText>
          {stay.language && stay.language !== "en" && (
            <span className="shrink-0 text-white/65">· {format.language(stay.language)}</span>
          )}
        </p>
        {/* All three cells: the crew (or "Just opened"), bottom-left. */}
        <div className={large ? "mt-4" : "mt-3"}>
          <CrewAvatars host={host} members={guests} />
        </div>
      </div>
    </>
  );
}

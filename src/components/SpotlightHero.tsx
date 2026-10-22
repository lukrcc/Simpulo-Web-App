"use client";

import { BadgeCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { CrewAvatars } from "@/components/ui/CrewAvatars";
import { CarouselControls } from "@/components/ui/CarouselControls";
import { Img } from "@/components/ui/Img";
import { PlaceText } from "@/components/ui/PlaceText";
import { useFormat } from "@/i18n/format";
import { findUser, getCrew, useStore } from "@/lib/store";
import type { Stay, User } from "@/lib/types";
import { usePageHidden } from "@/lib/usePageHidden";
import { cn, firstName, firstSentence } from "@/lib/utils";

/** A slide counts as current once this much of it is visible. */
const ACTIVE_THRESHOLD = 0.6;
const AUTO_ADVANCE_MS = 6000;

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Apple-style spotlight: a native horizontal scroll-snap carousel, one slide per view.
 * Desktop: rounded cards aligned with the grid edges (scroll padding = side padding = gap).
 * Mobile: full-bleed slides with a small gap so a swipe reads as motion.
 * Trackpad, touch, arrow keys and the control pill all move it; the dots follow via IntersectionObserver.
 */
export function SpotlightHero({ stays }: { stays: Stay[] }) {
  const t = useTranslations("explore");
  const store = useStore();
  const slides = stays.flatMap((stay) => {
    const host = findUser(store, stay.hostId);
    // Accepted members only – the host is the slide itself.
    const guests = getCrew(store, stay).filter((u) => u.id !== stay.hostId);
    return host ? [{ stay, host, guests }] : [];
  });
  const count = slides.length;

  const [active, setActive] = useState(0);
  const [photoIndex, setPhotoIndex] = useState<Record<string, number>>({});
  const [hovered, setHovered] = useState(false);
  const [touched, setTouched] = useState(false);
  const [focused, setFocused] = useState(false);
  /** Bumped by ‹ › clicks to restart the auto-advance timer right away. */
  const [timerKey, setTimerKey] = useState(0);
  const pageHidden = usePageHidden();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= ACTIVE_THRESHOLD) {
            setActive(Number((entry.target as HTMLElement).dataset.index));
          }
        }
      },
      { root: scroller, threshold: ACTIVE_THRESHOLD },
    );
    slideRefs.current.slice(0, count).forEach((slide) => slide && observer.observe(slide));
    return () => observer.disconnect();
  }, [count]);

  function scrollToSlide(index: number) {
    const scroller = scrollerRef.current;
    const slide = slideRefs.current[index];
    if (!scroller || !slide) return;
    // offsetLeft includes the scroller's padding; subtract the scroll padding so the slide snaps to the grid edge.
    const scrollPadding = parseFloat(getComputedStyle(scroller).scrollPaddingLeft) || 0;
    scroller.scrollTo({
      left: slide.offsetLeft - scrollPadding,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }

  function step(delta: 1 | -1) {
    const target = active + delta;
    if (target < 0 || target >= count) return;
    scrollToSlide(target);
    setTimerKey((k) => k + 1);
  }

  // Auto-advance (wraps around); restarts after every slide change and every ‹ › click. Off for reduced motion.
  const paused = hovered || touched || focused || pageHidden;
  useEffect(() => {
    if (paused || count < 2 || prefersReducedMotion()) return;
    const timer = setTimeout(() => {
      // Hidden (≥ lg shows the bento block instead): just re-arm, so it starts as soon as it becomes visible.
      if (scrollerRef.current?.offsetParent === null) setTimerKey((k) => k + 1);
      else scrollToSlide((active + 1) % count);
    }, AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [active, paused, count, timerKey]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return; // leave arrow keys alone inside links/buttons
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      step(e.key === "ArrowRight" ? 1 : -1);
    }
  }

  // Pause for keyboard focus only – a mouse click on ‹ › focuses the button too, and that should not stop the timer.
  function onFocus(e: FocusEvent<HTMLElement>) {
    if (e.target.matches(":focus-visible")) setFocused(true);
  }
  function onBlur(e: FocusEvent<HTMLElement>) {
    if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
  }

  if (count === 0) return null;

  return (
    // The one deliberate exception to <Container>: below md the slides are full-bleed (edge to edge, under the
    // status bar). From md the scroller applies the container's 32px padding itself, as scroll padding.
    <section
      className="mx-auto max-w-[1600px] md:pt-6 lg:hidden"
      aria-roledescription="carousel"
      aria-label={t("featuredHouses")}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      <div
        ref={scrollerRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onTouchStart={() => setTouched(true)}
        onTouchEnd={() => setTouched(false)}
        onTouchCancel={() => setTouched(false)}
        aria-label={t("featuredHousesKeyboard")}
        className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink md:scroll-px-8 md:gap-8 md:px-8"
      >
        {slides.map(({ stay, host, guests }, i) => (
          <Slide
            key={stay.id}
            ref={(el) => {
              slideRefs.current[i] = el;
            }}
            stay={stay}
            host={host}
            guests={guests}
            index={i}
            isActive={i === active}
            count={count}
            photo={photoIndex[stay.id] ?? 0}
            onPhoto={(photo) => setPhotoIndex((p) => ({ ...p, [stay.id]: photo }))}
          />
        ))}
      </div>

      {count > 1 && (
        <CarouselControls
          className="mt-4"
          count={count}
          active={active}
          canPrev={active > 0}
          canNext={active < count - 1}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
          onSelect={(i) => {
            scrollToSlide(i);
            setTimerKey((k) => k + 1);
          }}
        />
      )}
    </section>
  );
}

interface SlideProps {
  ref: (el: HTMLElement | null) => void;
  stay: Stay;
  host: User;
  guests: User[];
  index: number;
  isActive: boolean;
  count: number;
  photo: number;
  onPhoto: (index: number) => void;
}

/** Inner controls must not trigger the slide link. */
function stopLink(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
}

function Slide({ ref, stay, host, guests, index, isActive, count, photo, onPhoto }: SlideProps) {
  const t = useTranslations("explore");
  const format = useFormat();
  const href = `/stays/${stay.slug}`;

  // The whole slide is clickable through a full-size link layer. Inner links/buttons sit above it as siblings –
  // nesting them inside the <a> would be invalid HTML (<a> in <a>). Overlay content is inset 24px (6) on mobile and
  // 32px (8) on desktop; on mobile the top row also clears the status bar (safe-area-inset-top).
  return (
    <article
      ref={ref}
      data-index={index}
      aria-roledescription="slide"
      aria-label={t("slideLabel", { index: index + 1, count, title: stay.title })}
      className="relative h-[calc(72vh_+_env(safe-area-inset-top))] min-h-130 w-full shrink-0 snap-start overflow-hidden bg-ink md:h-[64vh] md:rounded-4xl"
    >
      {/* Slow zoom while active; leaving the slide drops the animation, which snaps it back to 1.0. */}
      <div className={cn("absolute inset-0 will-change-transform", isActive && "motion-safe:animate-kenburns")}>
        <Img
          src={host.photos[photo] ?? host.photos[0]}
          alt=""
          fill
          preload={index === 0}
          sizes="(min-width: 1600px) 1536px, 100vw"
          className="object-cover"
        />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/75 to-transparent to-50%" />
      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-black/45 to-transparent to-30% md:from-black/35" />

      <Link href={href} aria-label={t("viewHouseWithHost", { title: stay.title, host: host.name })} className="absolute inset-0 cursor-pointer" />

      {/* Top-right: host photo thumbnails */}
      {host.photos.length > 1 && (
        <div className="absolute right-6 top-[calc(16px_+_env(safe-area-inset-top))] flex gap-2 md:right-8 md:top-8">
          {host.photos.slice(0, 3).map((src, i) => (
            <button
              key={src}
              type="button"
              aria-label={t("showHostPhoto", { index: i + 1, name: host.name })}
              aria-pressed={i === photo}
              onClick={(e) => {
                stopLink(e);
                onPhoto(i);
              }}
              className={cn(
                "relative size-14 overflow-hidden rounded-xl shadow-md transition-transform hover:scale-105",
                i === photo ? "border-2 border-white" : "border border-white/40",
              )}
            >
              <Img src={src} alt="" fill sizes="56px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Bottom: identity, place and crew, then the CTA. */}
      <div className="pointer-events-none absolute inset-x-6 bottom-6 flex flex-col gap-4 text-white md:inset-x-8 md:bottom-8">
        <div>
          <h2 className="line-clamp-2 text-4xl font-bold tracking-tight md:text-5xl">{stay.title}</h2>
          <p className="mt-2 flex items-center gap-1.5 text-base font-medium text-white/90">
            {t("withHost", { name: firstName(host) })}
            {host.verified && <BadgeCheck className="size-5 shrink-0" aria-label={t("verified")} />}
          </p>
          <p className="mt-3 line-clamp-2 max-w-2xl text-lg text-white/90">{firstSentence(stay.lookingForText)}</p>
          <p className="mt-3 text-sm text-white/80">
            <span className="inline-flex items-center gap-1.5">
              {format.shortRange(stay.startDate, stay.endDate)} · <PlaceText>{format.placeLabel(stay)}</PlaceText>
              {stay.language && stay.language !== "en" && (
                <span className="shrink-0 text-white/65">· {format.language(stay.language)}</span>
              )}
            </span>
          </p>
        </div>
        <div className="flex flex-col items-start gap-4">
          <CrewAvatars host={host} members={guests} />
          {/* Visual CTA only – the whole slide is the link. */}
          <span
            aria-hidden
            className="inline-flex h-11 items-center rounded-full bg-white px-7 text-sm font-semibold text-ink"
          >
            {t("viewHouse")}
          </span>
        </div>
      </div>
    </article>
  );
}

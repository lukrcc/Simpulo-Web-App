"use client";

import { Fragment, useEffect, useLayoutEffect, useRef, type CSSProperties, type RefObject } from "react";
import { cn } from "@/lib/utils";

export const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const lettersOf = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>("[data-flip-letter]")];

/** Lays the one gradient over all letters: each shows its own part, as if the whole text were one surface. */
function placeGradient(root: HTMLElement) {
  const width = root.offsetWidth;
  const height = root.offsetHeight;
  for (const letter of lettersOf(root)) {
    let x = 0;
    let y = 0;
    for (let el: HTMLElement | null = letter; el && el !== root; el = el.offsetParent as HTMLElement | null) {
      x += el.offsetLeft;
      y += el.offsetTop;
      if (!root.contains(el.offsetParent)) break;
    }
    letter.style.backgroundSize = `${width}px ${height}px`;
    letter.style.backgroundPosition = `${-x}px ${-y}px`;
  }
  root.setAttribute("data-ready", "");
}

/** The Spotlight also renders its text unseen, to measure it: that copy has no part in any of this. */
export const isSeen = (el: HTMLElement) => el.offsetWidth > 0 && getComputedStyle(el).visibility !== "hidden";

const FADE_MS = 250;

/** One text gives way to another: a soft crossfade. */
export async function changeLetters(from: HTMLElement, to: HTMLElement) {
  if (!isSeen(to)) return;
  const options = { duration: FADE_MS, easing: "ease-in-out", fill: "both" as const };
  await Promise.allSettled([from.animate([{ opacity: 1 }, { opacity: 0 }], options).finished, to.animate([{ opacity: 0 }, { opacity: 1 }], options).finished]);
}

function Word({ word }: { word: string }) {
  return (
    <span data-flip-word aria-hidden>
      {[...word].map((letter, i) => (
        <span key={i} data-flip-letter className="flip-letter">
          {letter}
        </span>
      ))}
    </span>
  );
}

function Line({ text }: { text: string }) {
  return text.split(" ").map((word, i) => (
    <Fragment key={i}>
      {i > 0 && " "}
      <Word word={word} />
    </Fragment>
  ));
}

interface FlipTextProps {
  /** The whole text, what's read out */
  text: string;
  /** Instead of one line: these, in their own boxes (`lineClassName`), under one gradient */
  lines?: string[];
  lineClassName?: string;
  as?: "h2" | "p";
  ref?: RefObject<HTMLElement | null>;
  className?: string;
  style?: CSSProperties;
}

/** Text in letters under one gradient, changing by a crossfade (changeLetters). Words stay whole when it wraps. */
export function FlipText({ text, lines, lineClassName, as: Tag = "h2", ref, className, style }: FlipTextProps) {
  const own = useRef<HTMLElement>(null);
  const root = ref ?? own;
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    placeGradient(el);
    const observer = new ResizeObserver(() => placeGradient(el));
    observer.observe(el);
    return () => observer.disconnect();
  }, [root, text]);
  useEffect(() => {
    // The face may arrive after the first measure.
    let live = true;
    void document.fonts?.ready.then(() => {
      if (live && root.current) placeGradient(root.current);
    });
    return () => {
      live = false;
    };
  }, [root, text]);
  return (
    <Tag ref={root as RefObject<HTMLHeadingElement & HTMLParagraphElement>} aria-label={text} role={Tag === "p" ? "group" : undefined} style={style} className={cn("relative flip-text", className)}>
      {lines ? (
        lines.map((line, i) => (
          <Fragment key={i}>
            {i > 0 && " "}
            <span data-flip-line className={lineClassName}>
              <Line text={line} />
            </span>
          </Fragment>
        ))
      ) : (
        <span data-flip-line>
          <Line text={text} />
        </span>
      )}
    </Tag>
  );
}

/** Lays one gradient, twice as wide as the text, over all its parts: they share it, and it wanders by one text's width (.flow-text in globals.css). */
function placeFlow(root: HTMLElement) {
  const width = root.offsetWidth;
  const height = root.offsetHeight;
  for (const part of root.querySelectorAll<HTMLElement>("[data-flow-part]")) {
    let x = 0;
    let y = 0;
    for (let el: HTMLElement | null = part; el && el !== root; el = el.offsetParent as HTMLElement | null) {
      x += el.offsetLeft;
      y += el.offsetTop;
      if (!root.contains(el.offsetParent)) break;
    }
    part.style.backgroundSize = `${width * 2}px ${height}px`;
    part.style.setProperty("--flow-x", `${-x}px`);
    part.style.setProperty("--flow-y", `${-y}px`);
    part.style.setProperty("--flow-w", `${width}px`);
  }
  root.setAttribute("data-ready", "");
}

/**
 * A stage headline under the slowly wandering gradient. A final "?" is a part of its own, so it can breathe (useMarkBreath). A final "." is
 * an ordinary letter of its word, in the same gradient – the orange dot belongs to the logo alone.
 */
export function FlowText({ text, lines, lineClassName, ref, className, style }: { text: string; lines?: string[]; lineClassName?: string; ref?: RefObject<HTMLElement | null>; className?: string; style?: CSSProperties }) {
  const own = useRef<HTMLElement>(null);
  const root = ref ?? own;
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    placeFlow(el);
    const observer = new ResizeObserver(() => placeFlow(el));
    observer.observe(el);
    return () => observer.disconnect();
  }, [root, text]);
  useEffect(() => {
    let live = true;
    void document.fonts?.ready.then(() => {
      if (live && root.current) placeFlow(root.current);
    });
    return () => {
      live = false;
    };
  }, [root, text]);
  const word = (w: string, i: number) => {
    const mark = w.endsWith("?") ? "?" : "";
    const body = mark ? w.slice(0, -1) : w;
    return (
      <Fragment key={i}>
        {i > 0 && " "}
        <span data-flip-word aria-hidden>
          <span data-flow-part className="flow-part">
            {body}
          </span>
          {mark && (
            <span data-flow-part data-mark className="flow-part origin-[50%_85%]">
              {mark}
            </span>
          )}
        </span>
      </Fragment>
    );
  };
  return (
    <h2 ref={root as RefObject<HTMLHeadingElement>} aria-label={text} style={style} className={cn("relative flip-text flow-text", className)}>
      {lines
        ? lines.map((line, i) => (
            <Fragment key={i}>
              {i > 0 && " "}
              <span data-flip-line className={lineClassName}>
                {line.split(" ").map(word)}
              </span>
            </Fragment>
          ))
        : text.split(" ").map(word)}
    </h2>
  );
}

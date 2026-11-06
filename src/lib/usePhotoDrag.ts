"use client";

import { type DragEvent, type PointerEvent, type RefObject, useRef, useState } from "react";

/**
 * Swipe works by itself (scroll snap); with a mouse the photos can be dragged too: they follow, then settle on the next or the same photo.
 * `dragged()` is true right after a drag, so a click that ends one doesn't open anything.
 */
export function usePhotoDrag(ref: RefObject<HTMLDivElement | null>, active: number, scrollTo: (index: number) => void, on: boolean) {
  const [dragging, setDragging] = useState(false);
  const start = useRef({ x: 0, left: 0, time: 0 });
  const moved = useRef(0);
  const dragged = () => Math.abs(moved.current) > 5;
  if (!on) return { props: {}, className: undefined, dragged };
  return {
    dragged,
    className: dragging ? "cursor-grabbing select-none" : "cursor-grab",
    props: {
      onDragStart: (e: DragEvent) => e.preventDefault(),
      onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
        const track = ref.current;
        moved.current = 0;
        if (e.pointerType !== "mouse" || e.button !== 0 || !track) return;
        start.current = { x: e.clientX, left: track.scrollLeft, time: performance.now() };
        track.style.scrollSnapType = "none";
        track.setPointerCapture(e.pointerId);
        setDragging(true);
      },
      onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
        const track = ref.current;
        if (!dragging || !track) return;
        moved.current = e.clientX - start.current.x;
        track.scrollLeft = start.current.left - moved.current;
      },
      onPointerUp: (e: PointerEvent<HTMLDivElement>) => {
        const track = ref.current;
        if (!dragging || !track) return;
        setDragging(false);
        const delta = e.clientX - start.current.x;
        moved.current = delta;
        const fast = Math.abs(delta) / Math.max(1, performance.now() - start.current.time) > 0.4;
        const next = Math.abs(delta) > track.clientWidth / 2 || (fast && Math.abs(delta) > 20) || Math.abs(delta) > 60 ? active + (delta < 0 ? 1 : -1) : active;
        track.style.scrollSnapType = "";
        scrollTo(next);
      },
    },
  };
}

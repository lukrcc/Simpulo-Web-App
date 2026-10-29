"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useNotchClip } from "./notch";

interface NotchedCardProps {
  /** The frame: size, position, hover scale – it moves card and tab as one */
  className?: string;
  style?: CSSProperties;
  /** The clipped layer: radius (its bottom-right radius is used for every corner), background */
  clipClassName?: string;
  /** The host tab (CardTab) – sits in the notch, outside the clip */
  tab?: ReactNode;
  /** Changes with the tab's host (rotating cells) – the notch is measured again */
  tabKey?: string;
  children: ReactNode;
}

/**
 * A card cut to one silhouette – rounded rectangle with the host tab's notch – via useNotchClip. Image, gradients and
 * overlays go in `children` (one clipped element); the tab goes in `tab`. No borders, corner pieces or shadows on the
 * clipped layer (shadows wouldn't follow the clip).
 */
export function NotchedCard({ className, style, clipClassName, tab, tabKey, children }: NotchedCardProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const clipRef = useRef<HTMLDivElement>(null);
  useNotchClip(frameRef, clipRef, tabKey);
  return (
    <div ref={frameRef} data-notch="pending" style={style} className={cn("notch-frame relative isolate", className)}>
      <div ref={clipRef} className={cn("relative h-full w-full overflow-hidden", tab !== undefined && tab !== null && tab !== false && "rounded-tl-none", clipClassName)}>
        {children}
      </div>
      {tab}
    </div>
  );
}

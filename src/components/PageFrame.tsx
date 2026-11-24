"use client";

import type { ComponentProps, ReactNode } from "react";
import { HeroBand } from "@/components/HeroBand";
import { StripRow } from "@/components/StripFig";

/**
 * ONE page frame for the pages of one thing (CLAUDE.md "Ein Seiten-Gerüst"): the House page, a House's members' area, Your houses and the
 * profile (yours and others'). The hero – the picture on the left (the House page's width, clamp(360px, 30 %, 640px)), the content on the
 * right, its actions top right – then the dark strip across the full width (`strip`: figures on the left, buttons on the right – FrameStrip),
 * then the page's body (the caller's, after it). Built on HeroBand: every HeroBand prop passes through; `fullStrip` and the stage height
 * (--stage-image-h) are the defaults.
 */
export function PageFrame({
  actions,
  strip,
  children,
  fullStrip = true,
  height = "split:h-(--stage-image-h)",
  ...rest
}: Omit<ComponentProps<typeof HeroBand>, "footer"> & {
  /** Top right in the content (Edit profile, ⋯, the gear; Share, Save, Message …) */
  actions?: ReactNode;
  /** The dark strip under the hero (FrameStrip, or a page's own) */
  strip?: ReactNode;
}) {
  return (
    <HeroBand {...rest} fullStrip={fullStrip} height={height} footer={strip}>
      {actions ? (
        <div className="relative flex h-full min-h-0 min-w-0 flex-col">
          <div className="absolute right-0 top-0 z-10 flex items-center gap-1 max-md:static max-md:mb-4 max-md:justify-end">{actions}</div>
          {children}
        </div>
      ) : (
        children
      )}
    </HeroBand>
  );
}

/**
 * The frame's dark strip (the strip rule: --stage-bar-h, the type scale text-bar-num / text-bar-label): the figures on the left (StripFig),
 * the buttons on the right. Phones: lower, the figures one sideways-scrolling row, the buttons in a row under it on the light page.
 */
export function FrameStrip({ figures, buttons }: { figures: ReactNode; buttons?: ReactNode }) {
  return (
    <>
      <div data-surface="dark" className="ember ember-strip band-inset band-inset-full flex flex-wrap items-center justify-between gap-x-6 gap-y-4 py-4 md:h-(--stage-bar-h) md:flex-nowrap md:py-0">
        <StripRow className="max-md:w-full md:flex-nowrap">{figures}</StripRow>
        {buttons && <div className="flex flex-wrap items-center justify-end gap-2 *:whitespace-nowrap max-md:hidden">{buttons}</div>}
      </div>
      {buttons && <StripRow className="gap-2 px-(--page-margin) py-4 md:hidden [&>*]:whitespace-nowrap">{buttons}</StripRow>}
    </>
  );
}

"use client";

import { createContext, useContext } from "react";
import type { InstallTrigger } from "@/lib/install";

/** Offers getting Simpulo on the phone at a moment that matters (see InstallPrompt); the rules decide whether it really shows. */
export type OfferInstall = (trigger: InstallTrigger, options?: { hostName?: string }) => void;

/**
 * Its own module: InstallPrompt.tsx then exports only its component, so editing it is a Fast Refresh, not a full reload (a full reload
 * aborts the open tab's prefetches – Safari reports them as "Failed to fetch RSC payload … Load failed" in Next's overlay).
 */
export const InstallPromptContext = createContext<OfferInstall | null>(null);

export function useOfferInstall(): OfferInstall {
  const offer = useContext(InstallPromptContext);
  if (!offer) throw new Error("useOfferInstall must be used inside <InstallPromptProvider>");
  return offer;
}

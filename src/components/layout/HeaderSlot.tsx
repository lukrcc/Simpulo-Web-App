"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface HeaderSlot {
  /** The header's second-row slot – null until the header has mounted (and on the server) */
  el: HTMLDivElement | null;
  setEl: (el: HTMLDivElement | null) => void;
}

const HeaderSlotContext = createContext<HeaderSlot>({ el: null, setEl: () => {} });

/** Lets a page (Explore) render its chip row into the site header's second row – one header, filled from the page. */
export function HeaderSlotProvider({ children }: { children: ReactNode }) {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  return <HeaderSlotContext value={{ el, setEl }}>{children}</HeaderSlotContext>;
}

export function useHeaderSlot(): HeaderSlot {
  return useContext(HeaderSlotContext);
}

"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";
import { restoreOrigin } from "@/lib/houseTransition";

/** Back on the page a House was opened from: its positions and the card (src/lib/houseTransition.ts). Renders nothing. */
export function HouseTransitions() {
  const pathname = usePathname();
  useLayoutEffect(() => restoreOrigin(pathname), [pathname]);
  return null;
}

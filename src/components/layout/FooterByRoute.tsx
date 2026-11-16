"use client";

import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { footerOf } from "@/config/footer";

/** The one footer of the route (config/footer.ts): large · slim · none. */
export function FooterByRoute({ large, slim }: { large: ReactNode; slim: ReactNode }) {
  const variant = footerOf(usePathname(), useSearchParams());
  return variant === "large" ? large : variant === "slim" ? slim : null;
}

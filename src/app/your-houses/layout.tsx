import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PRIVATE_ROBOTS } from "@/lib/seo";

/** Logged-in area (or flow): never indexed – see also robots.ts. */
export const metadata: Metadata = { robots: PRIVATE_ROBOTS };

export default function PrivateLayout({ children }: { children: ReactNode }) {
  return children;
}

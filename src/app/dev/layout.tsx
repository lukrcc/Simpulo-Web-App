import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { APP_MODE } from "@/lib/appMode";
import { PRIVATE_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = { robots: PRIVATE_ROBOTS };

/** /dev: the payments mock's simulation pages (instead of Stripe). Never in production. */
export default function DevLayout({ children }: { children: ReactNode }) {
  if (APP_MODE === "production") notFound();
  return children;
}

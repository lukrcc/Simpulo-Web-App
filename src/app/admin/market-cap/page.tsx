import type { Metadata } from "next";
import { AdminMarketCap } from "@/components/admin/AdminMarketCap";

export const metadata: Metadata = { title: "Market Cap · Admin", robots: { index: false, follow: false } };

/** The admin areas render only in the browser, after the admin check (AdminFrame) – nothing to prerender for instant navigation. */
export const instant = false;

/** Admins only (app/admin/layout.tsx): a rough value of Simpulo, three methods, its drivers and its course (components/admin/AdminMarketCap). */
export default function Page() {
  return <AdminMarketCap />;
}

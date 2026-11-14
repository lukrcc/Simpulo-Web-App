import type { Metadata } from "next";
import { AdminVision } from "@/components/admin/AdminVision";

export const metadata: Metadata = { title: "Admin · Vision" };

/** The admin areas render only in the browser, after the admin check (AdminFrame) – nothing to prerender for instant navigation. */
export const instant = false;

/** Admins only (app/admin/layout.tsx). */
export default function Page() {
  return <AdminVision />;
}

import type { Metadata } from "next";
import { AdminData } from "@/components/admin/AdminData";

export const metadata: Metadata = { title: "Admin · Data & Algorithm" };

/** The admin areas render only in the browser, after the admin check (AdminFrame) – nothing to prerender for instant navigation. */
export const instant = false;

/** Admins only (app/admin/layout.tsx). */
export default function Page() {
  return <AdminData />;
}

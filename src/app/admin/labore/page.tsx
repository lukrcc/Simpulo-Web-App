import type { Metadata } from "next";
import { AdminLabs } from "@/components/admin/AdminLabs";

export const metadata: Metadata = { title: "Labore · Admin" };

/** The admin areas render only in the browser, after the admin check (AdminFrame) – nothing to prerender for instant navigation. */
export const instant = false;

/** Admins only (app/admin/layout.tsx): Wachstum › Labore (components/admin/AdminLabs). */
export default function Page() {
  return <AdminLabs />;
}

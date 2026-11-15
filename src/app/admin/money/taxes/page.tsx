import type { Metadata } from "next";
import { AdminMoney } from "@/components/admin/AdminCockpit";

export const metadata: Metadata = { title: "Admin · Geld · Steuern" };

/** The admin areas render only in the browser, after the admin check (AdminFrame) – nothing to prerender for instant navigation. */
export const instant = false;

/** Geld with Steuern open (linked from "Heute" and Vision › Standort). Admins only (app/admin/layout.tsx). */
export default function Page() {
  return <AdminMoney initialView="taxes" />;
}

import type { Metadata } from "next";
import { AdminHouseList } from "@/components/admin/AdminAreas";

export const metadata: Metadata = { title: "Admin · Houses" };

/** The admin areas render only in the browser, after the admin check (AdminFrame) – nothing to prerender for instant navigation. */
export const instant = false;

/** Admins only (app/admin/layout.tsx). */
export default function Page() {
  return <AdminHouseList />;
}

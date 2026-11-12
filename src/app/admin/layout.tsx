import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { AdminFrame } from "@/components/admin/AdminShell";
import { PRIVATE_ROBOTS } from "@/lib/seo";

/** /admin: never indexed (noindex, see also robots.ts). Only admins get in – AdminFrame asks useIsAdmin, everyone else sees the 404.
 *  ⚠ That is the UI only: the real protection comes in phase 4 (Firebase custom claim, Security Rules, the check in every Function). */
export const metadata: Metadata = { robots: PRIVATE_ROBOTS };

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense>
      <AdminFrame>{children}</AdminFrame>
    </Suspense>
  );
}

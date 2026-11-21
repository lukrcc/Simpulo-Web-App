import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { DeleteAccount } from "@/components/views/DeleteAccount";
import { PRIVATE_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = { title: "Delete account", robots: PRIVATE_ROBOTS };

/** Settings › Privacy & safety › Your data › Delete account: what happens, pausing as the gentler way, then typing DELETE. */
export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <DeleteAccount />
    </Suspense>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DevDestinations } from "@/components/explore/DevDestinations";
import { APP_MODE } from "@/lib/appMode";

export const metadata: Metadata = { title: "Destinations", robots: { index: false, follow: false } };

/** Dev only, the approval list until there's an admin area. */
export default function DevDestinationsPage() {
  if (APP_MODE !== "dev") notFound();
  return <DevDestinations />;
}

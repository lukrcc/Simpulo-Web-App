"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { Button } from "./ActionButton";

/**
 * The round mobile "+" buttons (MobileHeader, BottomTabBar). All of their look lives in `.open-house-btn` (globals.css)
 * – ink outline on white, dark on hover, .97 when pressed – so no background or colour classes here. Only the focus
 * outline comes from Tailwind, in ink too: no orange on this button.
 */
export const openHouseClass =
  "open-house-btn outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ink";

/** The plus of every "Open a House" control: 16px, stroke 2, in the text colour (white on hover). */
export function OpenHousePlus() {
  return <Plus className="size-4 shrink-0" strokeWidth={2} aria-hidden />;
}

/** Explore-type routes, where "Open a House" is the page's one primary button. */
function isExploreRoute(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/next" ||
    pathname === "/saved" ||
    pathname.startsWith("/collections/") ||
    pathname.startsWith("/houses/")
  );
}

/**
 * The "Open a House" pill (header), 36px: primary on Explore-type routes (it's their main action), secondary
 * everywhere else so those pages keep their own primary. Secondary until the pathname is known.
 */
export function OpenHouseButton({ className }: { className?: string }) {
  // usePathname suspends on dynamic routes during prerender, so it gets its own boundary.
  return (
    <Suspense fallback={<OpenHouseLink primary={false} className={className} />}>
      <OpenHouseByRoute className={className} />
    </Suspense>
  );
}

function OpenHouseByRoute({ className }: { className?: string }) {
  return <OpenHouseLink primary={isExploreRoute(usePathname())} className={className} />;
}

function OpenHouseLink({ primary, className }: { primary: boolean; className?: string }) {
  const t = useTranslations("common.ui.openHouse");
  return (
    <Button href="/create" variant={primary ? "primary" : "secondary"} size="md" className={className}>
      {t("label")}
    </Button>
  );
}

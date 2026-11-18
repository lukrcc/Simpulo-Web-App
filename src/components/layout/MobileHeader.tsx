"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useId, useRef, useState } from "react";
import { MonthOptions } from "@/components/explore/SearchFields";
import { PlaceCombobox } from "@/components/explore/PlaceCombobox";
import { MobileSheet } from "@/components/ui/MobileSheet";
import { placeById } from "@/lib/data/places";
import { Logo } from "./Logo";
import { hidesMobileHeader } from "./nav";

/**
 * Phones' header (< md), the same in Safari and in the installed app, logged in or out: the wordmark left, a search icon right ("Where to
 * next?" as a sheet from the bottom). No account buttons – they live in the tab bar. Graphite like the desktop header, 56px, the status bar's
 * safe area above it (0 in a browser tab); no veil, no gradient. A normal row above the page (not sticky). Not on flows with their own head.
 */
export function MobileHeader() {
  return (
    <Suspense fallback={<Bar />}>
      <RoutedHeader />
    </Suspense>
  );
}

function RoutedHeader() {
  const pathname = usePathname();
  if (hidesMobileHeader(pathname)) return null;
  return <Bar search={<MobileSearch />} />;
}

function Bar({ search }: { search?: React.ReactNode }) {
  return (
    <header data-site-header data-mobile-header className="bg-graphite pt-(--safe-top) text-ink md:hidden">
      <div className="flex h-14 items-center justify-between gap-4 pl-(--page-margin) pr-2">
        <Logo />
        {search}
      </div>
    </header>
  );
}

/** "Where to next?" on phones: the place search, then the month – like the desktop bar's sheet, then on to Explore with the filter set. */
function MobileSearch() {
  const t = useTranslations("explore.search");
  const tn = useTranslations("nav");
  const router = useRouter();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<string | null>(null);
  // The latest place for the close handler: a month (or "Any month") goes on at once; closing with only a place goes on too.
  const latest = useRef<string | null>(null);
  const go = (month: string | null) => {
    const params = new URLSearchParams();
    if (latest.current) params.set("place", latest.current);
    if (month) params.set("month", month);
    latest.current = null;
    setPlace(null);
    setOpen(false);
    router.push(params.size ? `/explore?${params}` : "/explore");
  };
  const close = () => {
    if (latest.current) go(null);
    else setOpen(false);
  };
  const picked = placeById(place);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={tn("whereNext")} aria-haspopup="dialog" aria-expanded={open} className="press flex size-11 items-center justify-center rounded-full text-ink transition-colors duration-150 active:bg-(--header-pill)">
        <Search aria-hidden className="size-5" strokeWidth={2} />
      </button>
      <MobileSheet open={open} onClose={close} label={tn("whereNext")} className="px-4">
        <div className="pb-5 pt-2">
          <p className="mb-3 px-1 text-h3 text-ink">{tn("whereNext")}</p>
          <p className="mb-2 px-1 text-nav font-semibold text-ink">{t("where")}</p>
          {picked ? (
            <button
              type="button"
              onClick={() => {
                latest.current = null;
                setPlace(null);
              }}
              aria-label={`${picked.name.split(",")[0]} – ${t("anywhere")}`}
              className="flex h-11 w-full items-center justify-between rounded-full bg-(--menu-pick-bg) px-4 text-body font-semibold text-(--menu-pick-text)"
            >
              <span className="truncate">{picked.name.split(",")[0]}</span>
              <X aria-hidden className="size-4 shrink-0" />
            </button>
          ) : (
            <PlaceCombobox
              id={`${id}-place`}
              label={t("where")}
              placeholder={t("wherePlaceholder")}
              onPick={(p) => {
                latest.current = p.id;
                setPlace(p.id);
              }}
            />
          )}
          <p className="mb-2 mt-5 px-1 text-nav font-semibold text-ink">{t("when")}</p>
          <MonthOptions value={null} onPick={go} />
        </div>
      </MobileSheet>
    </>
  );
}

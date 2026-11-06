"use client";

import { ArrowUpRight, Home, Vote } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { OgPreview } from "@/app/api/link-preview/route";
import { Img } from "@/components/ui/Img";
import { useViewerAmount } from "@/components/ui/PriceLine";
import { APP_MODE } from "@/lib/appMode";
import { openVote } from "@/lib/crewVotes";
import { previewForUrl } from "@/lib/data";
import { crewThreadId } from "@/lib/links";
import { platformOf, type Platform } from "@/lib/platforms";
import type { Stay } from "@/lib/types";
import { cn, stayNights } from "@/lib/utils";

/**
 * The listing's preview. Real links: the server's Open Graph read (/api/link-preview, cached). Mock data: the mock preview, which
 * stands in for it (its example links lead nowhere).
 */
function useListingPreview(url: string, fallbackTitle: string): { title: string; imageUrl: string } | null {
  const mock = APP_MODE !== "production";
  const [fetched, setFetched] = useState<{ url: string; preview: OgPreview | null } | null>(null);
  useEffect(() => {
    if (mock) return;
    let live = true;
    fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
      .then((r) => (r.ok ? r.json() : { preview: null }))
      .then((data: { preview: OgPreview | null }) => live && setFetched({ url, preview: data.preview }))
      .catch(() => live && setFetched({ url, preview: null }));
    return () => {
      live = false;
    };
  }, [url, mock]);
  if (mock) {
    const preview = previewForUrl(url, fallbackTitle);
    return { title: preview.title, imageUrl: preview.imageUrl };
  }
  if (fetched?.url !== url) return null;
  return { title: fetched.preview?.title || fallbackTitle, imageUrl: fetched.preview?.imageUrl ?? "" };
}

/** The platform as a small mark: its initial on its colour, then its name. */
function PlatformMark({ platform, large = false }: { platform: Platform; large?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn("flex shrink-0 items-center justify-center rounded-md font-bold text-white", large ? "size-14 rounded-2xl text-h2" : "size-5 text-small")}
      style={{ background: large ? "rgba(255,255,255,0.18)" : platform.color }}
    >
      {platform.name.charAt(0).toUpperCase()}
    </span>
  );
}

const TILE = "relative flex h-full min-h-75 flex-col overflow-hidden rounded-3xl";

/**
 * The place, beside the map. Booked: the listing – picture (the link's, else the host's own photo of the place, else the platform's colour
 * with its mark), title, platform, the place's total ("€2,480 total · 7 nights", if known), "View listing ↗"; the whole tile opens it in a new tab. Not yet: that the crew decides, or the vote.
 */
export function AccommodationTile({ stay, canOpenChat }: { stay: Stay; canOpenChat: boolean }) {
  const t = useTranslations("house.page");
  const link = stay.accommodationStatus === "locked" ? stay.accommodationLink : undefined;
  if (!link) {
    const vote = openVote(stay, "accommodation");
    const inner = (
      <>
        <span className="flex size-11 items-center justify-center rounded-full bg-ink/6 text-ink">{vote ? <Vote className="size-5" aria-hidden /> : <Home className="size-5" aria-hidden />}</span>
        <p className="mt-auto text-body font-semibold text-ink">{vote ? t("placeVoting") : t("placeWithCrew")}</p>
        <p className="mt-1 text-small text-muted">{vote ? t("placeVoteOptions", { count: vote.options.length }) : t("placeWithCrewHint")}</p>
      </>
    );
    return canOpenChat ? (
      <Link href={`/inbox/${crewThreadId(stay.id)}`} className={cn(TILE, "card-soft p-6 transition-transform duration-150 hover:-translate-y-0.5")}>
        {inner}
      </Link>
    ) : (
      <div className={cn(TILE, "card-soft p-6")}>{inner}</div>
    );
  }
  return <ListingTile stay={stay} link={link} />;
}

function ListingTile({ stay, link }: { stay: Stay; link: string }) {
  const t = useTranslations("house.page");
  const preview = useListingPreview(link, stay.title);
  const amount = useViewerAmount();
  // The place's whole price, not per person: "€2,480 total · 7 nights". No total: no price line.
  const total = stay.totalPrice ? t("placeTotal", { price: amount(stay.totalPrice, stay.currency), nights: stayNights(stay) }) : null;
  const platform = platformOf(link);
  const title = preview?.title ?? stay.title;
  const image = preview?.imageUrl || stay.accommodationPhoto || "";
  return (
    <a href={link} target="_blank" rel="noopener noreferrer" className={cn(TILE, "group card-soft transition-transform duration-150 hover:-translate-y-0.5")}>
      <span className="relative block min-h-28 flex-1 overflow-hidden">
        {image ? (
          <Img src={image} alt="" fill sizes="(min-width: 1100px) 300px, 50vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        ) : (
          // No picture anywhere: the platform's colour, its mark large, the title on it.
          <span className="absolute inset-0 flex flex-col justify-between p-4 text-white" style={{ background: platform.color }}>
            <PlatformMark platform={platform} large />
            <span className="line-clamp-2 text-body font-semibold">{title}</span>
          </span>
        )}
      </span>
      <span className="flex flex-col gap-1.5 p-4">
        {image && <span className="line-clamp-2 text-body font-semibold text-ink">{title}</span>}
        <span className="flex min-w-0 items-center gap-2 text-small text-muted">
          <PlatformMark platform={platform} />
          <span className="truncate">{platform.name}</span>

        </span>
        {total && <span className="truncate text-small text-ink">{total}</span>}
        <span className="glass-panel mt-1 inline-flex h-8 items-center gap-1 self-start rounded-full! px-3 text-small font-semibold text-ink">
          {t("viewListing")}
          <ArrowUpRight className="size-4" aria-hidden />
        </span>
      </span>
    </a>
  );
}

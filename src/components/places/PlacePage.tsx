"use client";

// /places/[id] – a host's own place ("Host from your place", CLAUDE.md "Klare Ziele für alle House-Karten"): only its owner sees it. The photo,
// the name, kind · free rooms · rent, the rental period, the windows opened in it (its Houses, each to the House's private area) and the two ways
// on: "Open a window" while the rental lasts, "Open again" from the newest past window. Anyone else: back to Your houses.
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { use, useEffect } from "react";
import { againHref, windowHref } from "@/components/create/model";
import { Container } from "@/components/layout/Container";
import { MyHouseTile } from "@/components/MyHouseTile";
import { BackLink } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/ActionButton";
import { Img } from "@/components/ui/Img";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { accommodationOf } from "@/config/accommodation";
import { useFormat } from "@/i18n/format";
import { areaHref } from "@/lib/houseTasks";
import { placeById, windowsOf } from "@/lib/ownPlaces";
import { useStore } from "@/lib/store";

export function PlacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("houses.places");
  const format = useFormat();
  const store = useStore();
  const router = useRouter();
  const place = placeById(store, id);
  const mine = Boolean(place && store.currentUserId && place.ownerId === store.currentUserId);
  const ready = store.sessionRestored;
  useEffect(() => {
    if (ready && !mine) router.replace("/your-houses");
  }, [ready, mine, router]);
  if (!ready || !place || !mine) return <PageSkeleton />;

  const today = new Date().toISOString().slice(0, 10);
  const windows = windowsOf(store, place.id);
  const lastPast = windows.filter((w) => w.endDate.slice(0, 10) < today).at(-1);
  const canOpen = place.rentTo > today;
  const kind = accommodationOf(place.accommodationType)?.type.label ?? "";
  return (
    <Container className="explore-width pb-16 pt-8 md:pt-10">
      <BackLink href="/your-houses" className="inline-flex items-center gap-1 text-small font-semibold text-muted transition-colors hover:text-ink">
        <ChevronLeft aria-hidden className="size-4" />
        {t("back")}
      </BackLink>
      <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <span className="relative block aspect-[4/3] overflow-hidden rounded-2xl bg-ink/5">
          {place.photos[0] && <Img src={place.photos[0]} alt="" fill sizes="(min-width: 744px) 40vw, 100vw" className="object-cover" />}
        </span>
        <div className="min-w-0">
          <h1 className="text-h1 text-ink">{place.name}</h1>
          <p className="mt-2 text-body-lg text-muted">
            {t("meta", { kind: kind ? kind.charAt(0).toUpperCase() + kind.slice(1) : place.address.city, rooms: place.freeSpots, rent: format.price(place.monthlyRent, place.currency) })}
          </p>
          <p className="mt-1 text-body text-muted">{t("rental", { range: format.longRange(place.rentFrom, place.rentTo) ?? "" })}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {canOpen && <Button href={windowHref(place.id)}>{t("openWindow")}</Button>}
            {lastPast && (
              <Button variant="secondary" href={againHref(lastPast.id)}>
                {t("openAgain")}
              </Button>
            )}
          </div>
        </div>
      </div>
      <h2 className="mt-12 text-row text-ink">{t("windowsTitle")}</h2>
      {windows.length === 0 ? (
        <p className="mt-3 text-body text-muted">{t("noWindows")}</p>
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-x-(--explore-gap) gap-y-8 sm:grid-cols-2 split:grid-cols-4">
          {windows.map((stay) => (
            <li key={stay.id} className="min-w-0">
              <MyHouseTile stay={stay} href={areaHref(stay)} label={stay.endDate.slice(0, 10) < today ? t("windowPast") : t("windowComing")} />
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}

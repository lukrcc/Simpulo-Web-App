"use client";

// A row of HouseCards on an SEO page ("Starting soon in Lisbon", a guide's fitting Houses): the server picks the candidates (ids, in
// order), the browser keeps the ones that fit today (lib/useNow – the pages are prerendered, so "today" is read here, not on the server)
// and shows at most `max`.
import { HouseCard } from "@/components/HouseCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Shelf } from "@/components/ui/Shelf";
import { EXPLORE_SPACING, STARTING_SOON_DAYS } from "@/config/explore";
import { useNow } from "@/lib/useNow";
import { openSpots } from "@/lib/utils";
import { findUser, getCrew, useStore } from "@/lib/store";

export function SeoHouses({ id, title, ids, empty, when = "upcoming", max, hideIfAll }: { id: string; title: string; ids: readonly string[]; /** Shown when none of them is left */ empty?: string; /** "soon": starting within STARTING_SOON_DAYS with a spot open (the Starting soon collection's rule); "upcoming": not started */ when?: "soon" | "upcoming"; max: number; /** Hide the row when it would show every candidate (it'd repeat the grid above) */ hideIfAll?: boolean }) {
  const store = useStore();
  const now = useNow();
  if (now === null) return null;
  const today = new Date(now).toISOString().slice(0, 10);
  const until = new Date(now + STARTING_SOON_DAYS * 86_400_000).toISOString().slice(0, 10);
  const candidates = ids.flatMap((sid) => store.stays.filter((s) => s.id === sid));
  const fitting = candidates.filter((s) => s.startDate >= today && (when === "upcoming" || (s.startDate <= until && openSpots(s) > 0)));
  const stays = fitting.slice(0, max);
  if (hideIfAll && stays.length === candidates.length) return null;
  if (stays.length === 0 && !empty) return null;
  return (
    <section aria-labelledby={id} className="mt-(--space-section)">
      <SectionHeader variant="explore" id={id} title={title} />
      {stays.length === 0 ? (
        <p className="mt-4 text-body text-muted">{empty}</p>
      ) : (
        <Shelf variant="flat" top={EXPLORE_SPACING.headContent}>
          {stays.map((stay) => (
            <div key={stay.id} className="explore-slide shrink-0">
              <HouseCard variant="shelf" stay={stay} host={findUser(store, stay.hostId)} crew={getCrew(store, stay)} />
            </div>
          ))}
        </Shelf>
      )}
    </section>
  );
}

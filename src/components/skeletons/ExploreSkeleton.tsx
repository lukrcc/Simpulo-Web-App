import { EXPLORE_GRID } from "@/config/explore";
import { Container } from "@/components/layout/Container";
import { StageBand } from "@/components/ui/StageBand";
import { Bone, SkeletonRoot } from "./Bone";
import { CardSkeleton } from "./CardSkeleton";

const CARDS = 8;
const CHIPS = 6;

/** Explore: Spotlight block, section title and the card grid (phones: the chip row on top). */
export function ExploreSkeleton() {
  return (
    <SkeletonRoot>
      {/* Phones only: the chip row (on desktop the bar is under Open Houses' title). */}
      <div className="relative md:hidden">
        <Container className="flex h-(--filter-row-h) items-center gap-2 overflow-hidden">
          {Array.from({ length: CHIPS }, (_, i) => (
            <Bone key={i} className="h-9 w-20 shrink-0" />
          ))}
        </Container>
      </div>
      {/* Same shape as the Spotlight: a rounded card in the 16px / 32px gutter. */}
      {/* From lg on the stage, like the Spotlight, so the header is transparent from the first paint. */}
      <StageBand from="lg">
        <div className="page-container pt-[calc(12px+var(--safe-top))] md:pt-8">
          <div className="h-[60dvh] min-h-110 rounded-3xl bg-ink/5 md:h-160 md:min-h-0" />
        </div>
      </StageBand>
      <Container className="explore-width">
        <div className="mt-12 space-y-2">
          <Bone className="h-9 w-48 rounded-xl" />
          <Bone className="h-4 w-40" />
        </div>
        <div className={`mt-6 ${EXPLORE_GRID}`}>
          {Array.from({ length: CARDS }, (_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </Container>
    </SkeletonRoot>
  );
}

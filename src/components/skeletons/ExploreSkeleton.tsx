import { Container } from "@/components/layout/Container";
import { Bone, SkeletonRoot } from "./Bone";
import { CardSkeleton } from "./CardSkeleton";

const CARDS = 8;
const CHIPS = 6;

/** Explore: the header's filter row (chips), Spotlight block, section title and the card grid. */
export function ExploreSkeleton() {
  return (
    <SkeletonRoot>
      {/* The filter row: same height and line as the real one, so nothing jumps when the feed arrives. */}
      <div className="relative after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-line">
        <Container className="flex h-(--filter-row-h) items-center gap-2 overflow-hidden">
          {Array.from({ length: CHIPS }, (_, i) => (
            <Bone key={i} className="h-9 w-20 shrink-0" />
          ))}
        </Container>
      </div>
      {/* Same shape as the Spotlight: a rounded card in the 16px / 32px gutter. */}
      <div className="mx-auto max-w-[1600px] px-4 pt-[calc(12px+env(safe-area-inset-top))] md:px-8 md:pt-6">
        <div className="h-[60dvh] min-h-110 rounded-[28px] bg-ink/5 md:h-[64vh] md:min-h-130" />
      </div>
      <Container>
        <div className="mt-12 space-y-2">
          <Bone className="h-9 w-48 rounded-xl" />
          <Bone className="h-4 w-40" />
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: CARDS }, (_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </Container>
    </SkeletonRoot>
  );
}

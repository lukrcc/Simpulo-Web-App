import { Container } from "@/components/layout/Container";
import { Bone, SkeletonRoot } from "./Bone";
import { CardSkeleton } from "./CardSkeleton";

const CARDS = 8;
const CHIPS = 6;

/** Explore: Spotlight block, section title, vibe chips and the card grid. */
export function ExploreSkeleton() {
  return (
    <SkeletonRoot>
      {/* Same shape as the Spotlight: a rounded card in the 16px / 32px gutter. */}
      <div className="mx-auto max-w-[1600px] px-4 pt-[calc(12px+env(safe-area-inset-top))] md:px-8 md:pt-6">
        <div className="h-[60dvh] min-h-110 rounded-[28px] bg-black/5 md:h-[64vh] md:min-h-130" />
      </div>
      <Container>
        <div className="mt-12 space-y-2">
          <Bone className="h-9 w-48 rounded-xl" />
          <Bone className="h-4 w-40" />
        </div>
        <div className="mt-5 flex gap-2 overflow-hidden">
          {Array.from({ length: CHIPS }, (_, i) => (
            <Bone key={i} className="h-9 w-20 shrink-0" />
          ))}
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

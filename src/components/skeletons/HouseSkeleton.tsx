import { Container } from "@/components/layout/Container";
import { Bone, SkeletonRoot } from "./Bone";

/** House page: the stage, the four facts, the first section. */
export function HouseSkeleton() {
  return (
    <SkeletonRoot>
      <Container className="pt-4 md:pt-8">
        <div className="h-[clamp(420px,60vh,640px)] rounded-3xl bg-ink/5" />
        <div className="card-grid mt-8 [--card-cols:4] [--card-min:220px]">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="space-y-2">
              <Bone className="h-3 w-16" />
              <Bone className="h-4 w-32" />
            </div>
          ))}
        </div>
        <div className="mt-(--space-section) space-y-3">
          <Bone className="h-3 w-32" />
          <Bone className="h-6 w-2/3 max-w-[640px]" />
          <Bone className="h-6 w-1/2 max-w-[480px]" />
        </div>
      </Container>
    </SkeletonRoot>
  );
}

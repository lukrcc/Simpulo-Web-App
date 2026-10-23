import { Container } from "@/components/layout/Container";
import { Bone, SkeletonRoot } from "./Bone";

/** House page: host gallery, title + facts and text in the 7/12 column, side cards in the 5/12 column (lg). */
export function HouseSkeleton() {
  return (
    <SkeletonRoot>
      <Container className="md:pt-10 lg:grid lg:grid-cols-12 lg:gap-8">
        <div className="min-w-0 lg:col-span-7">
          <div className="-mx-4 aspect-4/5 bg-black/5 md:mx-0 md:aspect-video md:rounded-4xl lg:aspect-3/2 lg:rounded-[28px]" />
          <div className="pt-6">
            <Bone className="h-8 w-3/4 rounded-xl" />
            <Bone className="mt-3 h-4 w-1/2" />
            <div className="mt-4 flex gap-2">
              {Array.from({ length: 4 }, (_, i) => (
                <Bone key={i} className="size-9" />
              ))}
            </div>
          </div>
          <div className="mt-10 space-y-2">
            <Bone className="h-5 w-40" />
            <Bone className="mt-4 h-4" />
            <Bone className="h-4" />
            <Bone className="h-4 w-5/6" />
            <Bone className="h-4 w-2/3" />
          </div>
          <div className="mt-10 aspect-8/5 rounded-[24px] bg-black/5" />
        </div>
        <div className="hidden space-y-6 lg:col-span-5 lg:block">
          <div className="space-y-3 rounded-[24px] bg-white p-6">
            <Bone className="h-7 w-1/2" />
            <Bone className="h-4 w-2/3" />
            <Bone className="mt-6 h-12" />
          </div>
          <div className="flex items-center gap-4 rounded-[24px] bg-white p-6">
            <Bone className="size-14 shrink-0" />
            <div className="flex-1 space-y-2">
              <Bone className="h-5 w-1/3" />
              <Bone className="h-4 w-1/2" />
            </div>
          </div>
        </div>
      </Container>
    </SkeletonRoot>
  );
}

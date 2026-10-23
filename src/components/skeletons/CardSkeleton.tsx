import { Bone } from "./Bone";

/** Same footprint as a StayCard: 4:5 photo tile with title and place lines at the bottom. */
export function CardSkeleton() {
  return (
    <div className="relative aspect-4/5 overflow-hidden rounded-[28px] bg-black/5">
      <div className="absolute inset-x-0 bottom-0 space-y-2 px-5 pb-8">
        <Bone className="h-6 w-3/4 bg-black/5" />
        <Bone className="h-4 w-1/2 bg-black/5" />
        <Bone className="mt-4 h-8 w-24 bg-black/5" />
      </div>
    </div>
  );
}

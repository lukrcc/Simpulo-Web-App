import { SkeletonRoot } from "./Bone";
import { ChatSkeleton } from "./ChatSkeleton";

/** Chat page (below lg): same viewport-filling frame as ThreadView, with the chat skeleton inside. */
export function ThreadSkeleton() {
  return (
    <SkeletonRoot className="h-[calc(100dvh-5.5rem-env(safe-area-inset-bottom))] md:h-[calc(100dvh-var(--header-h))]">
      <div className="mx-auto flex h-full w-full max-w-3xl flex-col md:pt-6">
        <ChatSkeleton />
      </div>
    </SkeletonRoot>
  );
}

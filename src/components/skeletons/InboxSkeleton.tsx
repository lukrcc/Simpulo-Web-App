import { useTranslations } from "next-intl";
import { MasterDetail } from "@/components/layout/MasterDetail";
import { SkeletonRoot } from "./Bone";
import { ChatSkeleton } from "./ChatSkeleton";
import { ThreadListSkeleton } from "./ThreadListSkeleton";

/** Messages: list column on every size, the chat panel next to it from lg up. */
export function InboxSkeleton() {
  const t = useTranslations("meta.pages");
  return (
    <MasterDetail
      title={t("messages")}
      list={
        <SkeletonRoot>
          <ThreadListSkeleton />
        </SkeletonRoot>
      }
      detail={
        <div className="h-full animate-pulse" aria-hidden>
          <ChatSkeleton className="rounded-[24px] bg-white" />
        </div>
      }
      detailFill
    />
  );
}

import { LockOpen } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { crewThreadId, mockLinkPreview } from "@/lib/mock-extras";
import type { Stay } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LinkPreviewCard } from "./LinkPreviewCard";

interface AccommodationSectionProps {
  stay: Stay;
  /** Number of links shared in the crew chat */
  chatLinkCount?: number;
  /** Crew members get a shortcut into the chat */
  canOpenChat?: boolean;
  compact?: boolean;
  /** Inside a card: 96px thumbnail row, no inner frame */
  inCard?: boolean;
}

/** Locked → preview of the booked place; otherwise the crew is still deciding. */
export function AccommodationSection({ stay, chatLinkCount, canOpenChat = false, compact = false, inCard = false }: AccommodationSectionProps) {
  const t = useTranslations("house.accommodationSection");
  const preview = stay.accommodationStatus === "locked" ? mockLinkPreview(stay) : null;

  if (preview && stay.accommodationLink) {
    return <LinkPreviewCard href={stay.accommodationLink} preview={preview} layout={inCard ? "row" : compact ? "compact" : "card"} />;
  }

  return (
    <div className={cn("flex items-start gap-3 bg-page", compact ? "rounded-xl px-3 py-2" : "rounded-2xl p-4")}>
      <LockOpen className={cn("shrink-0 text-zinc-500", compact ? "mt-px size-4" : "mt-0.5 size-5")} />
      <div className="text-sm text-neutral-700">
        <p>
          <span className="font-medium text-ink">{t("crewDecides")}</span>
          {chatLinkCount !== undefined && ` · ${t("chatLinks", { count: chatLinkCount })}`}
        </p>
        {canOpenChat && (
          <Link href={`/inbox/${crewThreadId(stay.id)}`} className="mt-1 inline-block font-medium text-ink underline underline-offset-2 hover:text-zinc-600">
            {t("openCrewChat")}
          </Link>
        )}
      </div>
    </div>
  );
}

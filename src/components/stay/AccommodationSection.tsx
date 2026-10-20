import { LockOpen } from "lucide-react";
import Link from "next/link";
import { crewThreadId, mockLinkPreview } from "@/lib/mock-extras";
import type { Stay } from "@/lib/types";
import { cn, pluralize } from "@/lib/utils";
import { LinkPreviewCard } from "./LinkPreviewCard";

interface AccommodationSectionProps {
  stay: Stay;
  /** Number of links shared in the crew chat */
  chatLinkCount?: number;
  /** Crew members get a shortcut into the chat */
  canOpenChat?: boolean;
  compact?: boolean;
}

/** Locked → preview of the booked place; otherwise the crew is still deciding. */
export function AccommodationSection({ stay, chatLinkCount, canOpenChat = false, compact = false }: AccommodationSectionProps) {
  const preview = stay.accommodationStatus === "locked" ? mockLinkPreview(stay) : null;

  if (preview && stay.accommodationLink) {
    return <LinkPreviewCard href={stay.accommodationLink} preview={preview} compact={compact} />;
  }

  return (
    <div className={cn("flex items-start gap-3 bg-accent-soft", compact ? "rounded-xl px-3 py-2" : "rounded-2xl p-4")}>
      <LockOpen className={cn("shrink-0 text-accent", compact ? "mt-px size-4" : "mt-0.5 size-5")} />
      <div className="text-sm text-neutral-700">
        <p>
          <span className="font-medium text-ink">Crew decides together</span>
          {chatLinkCount !== undefined &&
            ` – ${chatLinkCount > 0 ? `${pluralize(chatLinkCount, "link")} in the chat` : "no links in the chat yet"}`}
        </p>
        {canOpenChat && (
          <Link href={`/inbox/${crewThreadId(stay.id)}`} className="mt-1 inline-block font-medium text-accent hover:underline">
            Open crew chat
          </Link>
        )}
      </div>
    </div>
  );
}

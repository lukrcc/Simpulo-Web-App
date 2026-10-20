import { ExternalLink } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Img } from "@/components/ui/Img";
import type { LinkPreview } from "@/lib/mock-extras";

interface LinkPreviewCardProps {
  href: string;
  preview: LinkPreview;
  /** Thumbnail row instead of a large image, e.g. for the chat header */
  compact?: boolean;
}

export function LinkPreviewCard({ href, preview, compact = false }: LinkPreviewCardProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-white p-2">
        <Img src={preview.imageUrl} alt="" width={48} height={48} className="size-12 shrink-0 rounded-lg object-cover" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{preview.title}</p>
          <p className="truncate text-xs text-neutral-500">{preview.domain}</p>
        </div>
        <a href={href} target="_blank" rel="noopener noreferrer" className={buttonClass("dark", "sm", "h-8 px-3 text-xs")}>
          Open
        </a>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-100">
      <div className="relative aspect-video bg-neutral-100">
        <Img src={preview.imageUrl} alt="" fill sizes="(min-width: 768px) 700px, 100vw" className="object-cover" />
      </div>
      <div className="flex items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 font-medium">{preview.title}</p>
          <p className="mt-0.5 truncate text-sm text-neutral-500">{preview.domain}</p>
        </div>
        <a href={href} target="_blank" rel="noopener noreferrer" className={buttonClass("dark", "sm")}>
          Open
          <ExternalLink className="size-3.5" />
        </a>
      </div>
    </div>
  );
}

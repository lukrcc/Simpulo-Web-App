import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { buttonClass } from "@/components/ui/button";
import { Img } from "@/components/ui/Img";
import type { LinkPreview } from "@/lib/mock-extras";

interface LinkPreviewCardProps {
  href: string;
  preview: LinkPreview;
  /**
   * "card": large image on top. "compact": 48px thumbnail row, e.g. for the chat header.
   * "row": 96px thumbnail, no frame – for inside a card (House page side column).
   */
  layout?: "card" | "compact" | "row";
}

export function LinkPreviewCard({ href, preview, layout = "card" }: LinkPreviewCardProps) {
  const t = useTranslations("house.linkPreview");
  if (layout === "row") {
    return (
      <div className="flex items-center gap-4">
        <Img src={preview.imageUrl} alt={preview.title} width={96} height={96} className="size-24 shrink-0 rounded-2xl object-cover" />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 font-medium leading-snug">{preview.title}</p>
          <p className="mt-0.5 truncate text-sm text-zinc-500">{preview.domain}</p>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-ink underline underline-offset-2 hover:text-zinc-600"
          >
            {t("open")}
            <ExternalLink className="size-3.5" />
          </a>
        </div>
      </div>
    );
  }

  if (layout === "compact") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-white p-2">
        <Img src={preview.imageUrl} alt={preview.title} width={48} height={48} className="size-12 shrink-0 rounded-lg object-cover" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{preview.title}</p>
          <p className="truncate text-xs text-neutral-500">{preview.domain}</p>
        </div>
        <a href={href} target="_blank" rel="noopener noreferrer" className={buttonClass("dark", "sm", "h-8 px-3 text-xs")}>
          {t("open")}
        </a>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-100 bg-white">
      <div className="relative aspect-video bg-neutral-100">
        <Img src={preview.imageUrl} alt={preview.title} fill sizes="(min-width: 768px) 700px, 100vw" className="object-cover" />
      </div>
      <div className="flex items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 font-medium">{preview.title}</p>
          <p className="mt-0.5 truncate text-sm text-neutral-500">{preview.domain}</p>
        </div>
        <a href={href} target="_blank" rel="noopener noreferrer" className={buttonClass("dark", "sm")}>
          {t("open")}
          <ExternalLink className="size-3.5" />
        </a>
      </div>
    </div>
  );
}

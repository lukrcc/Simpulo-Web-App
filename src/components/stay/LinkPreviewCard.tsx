import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { buttonStyles } from "@/components/ui/ActionButton";
import { Img } from "@/components/ui/Img";
import type { LinkPreview } from "@/lib/links";

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
        {preview.imageUrl && <Img src={preview.imageUrl} alt={preview.title} width={96} height={96} className="size-24 shrink-0 rounded-2xl object-cover" />}
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 font-medium leading-snug">{preview.title}</p>
          <p className="mt-0.5 truncate text-small text-muted">{preview.domain}</p>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonStyles("tertiary", "md", "mt-2")}
          >
            {t("open")}
            <ExternalLink aria-hidden />
          </a>
        </div>
      </div>
    );
  }

  if (layout === "compact") {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-2">
        {preview.imageUrl && <Img src={preview.imageUrl} alt={preview.title} width={48} height={48} className="size-12 shrink-0 rounded-lg object-cover" />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-medium">{preview.title}</p>
          <p className="truncate text-small text-muted">{preview.domain}</p>
        </div>
        <a href={href} target="_blank" rel="noopener noreferrer" className={buttonStyles("secondary", "md")}>
          {t("open")}
        </a>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <div className="relative aspect-video bg-bg">
        {preview.imageUrl && <Img src={preview.imageUrl} alt={preview.title} fill sizes="(min-width: 768px) 700px, 100vw" className="object-cover" />}
      </div>
      <div className="flex items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 font-medium">{preview.title}</p>
          <p className="mt-0.5 truncate text-small text-muted">{preview.domain}</p>
        </div>
        <a href={href} target="_blank" rel="noopener noreferrer" className={buttonStyles("secondary", "md")}>
          {t("open")}
          <ExternalLink aria-hidden />
        </a>
      </div>
    </div>
  );
}

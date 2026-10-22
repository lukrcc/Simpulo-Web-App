import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CarouselControlsProps {
  count: number;
  active: number;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (index: number) => void;
  /** Disable ‹ / › at the ends (non-wrapping carousels) */
  canPrev?: boolean;
  canNext?: boolean;
  /** Used in the button labels, e.g. "Previous House" */
  itemLabel?: string;
  className?: string;
}

/** The ‹ dots › pill under a carousel. */
export function CarouselControls({
  count,
  active,
  onPrev,
  onNext,
  onSelect,
  canPrev = true,
  canNext = true,
  itemLabel,
  className,
}: CarouselControlsProps) {
  const t = useTranslations("common.ui.carousel");
  const item = itemLabel ?? t("defaultItem");
  return (
    <div className={cn("flex justify-center", className)}>
      <div className="inline-flex h-9 items-center gap-1 rounded-full bg-white px-1.5 md:h-10 md:px-2">
        <ControlButton label={t("previous", { item })} disabled={!canPrev} onClick={onPrev}>
          <ChevronLeft className="size-4" />
        </ControlButton>
        <div className="flex items-center gap-1.5 px-1.5">
          {Array.from({ length: count }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={t("goTo", { item, index: i + 1 })}
              aria-current={i === active}
              onClick={() => onSelect(i)}
              className={cn(
                "h-2 rounded-full transition-all duration-250",
                i === active ? "w-6 bg-ink" : "w-2 bg-zinc-300 hover:bg-zinc-400",
              )}
            />
          ))}
        </div>
        <ControlButton label={t("next", { item })} disabled={!canNext} onClick={onNext}>
          <ChevronRight className="size-4" />
        </ControlButton>
      </div>
    </div>
  );
}

function ControlButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-7 items-center justify-center rounded-full text-ink transition-colors hover:bg-zinc-100 disabled:text-zinc-300 disabled:hover:bg-transparent md:size-8"
    >
      {children}
    </button>
  );
}

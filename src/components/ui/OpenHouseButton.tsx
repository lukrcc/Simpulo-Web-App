import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * The "Open a House." pill (header, empty states): dark with the wordmark's orange dot.
 * Hover: lighter, 2px wider each side, and the dot pulses once.
 */
export function OpenHouseButton({ className }: { className?: string }) {
  const t = useTranslations("common.ui.openHouse");
  return (
    <Link
      href="/create"
      className={cn(
        "group inline-flex h-10 items-center whitespace-nowrap rounded-full bg-ink px-5 text-sm font-medium text-white outline-none",
        "transition-[background-color,padding,transform] duration-200 hover:bg-[#2A2A30] hover:px-[22px] active:scale-[0.98]",
        "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-page",
        className,
      )}
    >
      {t("label")}
      <span aria-hidden className="inline-block origin-[50%_75%] text-accent motion-safe:group-hover:animate-dot-pulse">
        .
      </span>
    </Link>
  );
}

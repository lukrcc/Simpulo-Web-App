import { Plus } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * Shared by every "Open a House" control (this pill and the round mobile "+" buttons). All of its look lives in
 * `.open-house-btn` (globals.css) – ink outline on white, dark on hover, .97 when pressed – so no background or
 * colour classes here. Only the focus outline comes from Tailwind, in ink too: no orange on this button.
 */
export const openHouseClass =
  "open-house-btn outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ink";

/** The plus of every "Open a House" control: 16px, stroke 2, in the text colour (white on hover). */
export function OpenHousePlus() {
  return <Plus className="size-4 shrink-0" strokeWidth={2} aria-hidden />;
}

/** The "Open a House" pill (header): plus + label, 36px tall. */
export function OpenHouseButton({ className }: { className?: string }) {
  const t = useTranslations("common.ui.openHouse");
  return (
    <Link href="/create" className={cn(openHouseClass, className)}>
      <OpenHousePlus />
      {t("label")}
    </Link>
  );
}

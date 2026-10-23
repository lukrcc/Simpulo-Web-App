import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface LanguageChipsProps {
  languages: string[];
  /** "glass" for use on top of photos */
  variant?: "light" | "glass";
  /** Small 13px chips on a single line (overflow is clipped) – compact profile card */
  compact?: boolean;
  className?: string;
}

export function LanguageChips({ languages, variant = "light", compact = false, className }: LanguageChipsProps) {
  const t = useTranslations("common.ui.languageChips");
  if (languages.length === 0) return null;
  return (
    <ul aria-label={t("label")} className={cn("flex gap-1.5", compact ? "flex-nowrap overflow-hidden" : "flex-wrap", className)}>
      {languages.map((language) => (
        <li
          key={language}
          className={cn(
            "shrink-0 rounded-full",
            compact ? "px-2.5 py-0.5 text-[13px]" : "px-3 py-1 text-sm",
            variant === "glass"
              ? "border border-white/20 bg-white/15 text-xs font-medium text-white backdrop-blur-md"
              : "bg-neutral-100 text-ink",
          )}
        >
          {language}
        </li>
      ))}
    </ul>
  );
}

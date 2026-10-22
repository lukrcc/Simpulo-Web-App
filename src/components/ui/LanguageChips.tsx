import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface LanguageChipsProps {
  languages: string[];
  /** "glass" for use on top of photos */
  variant?: "light" | "glass";
  className?: string;
}

export function LanguageChips({ languages, variant = "light", className }: LanguageChipsProps) {
  const t = useTranslations("common.ui.languageChips");
  if (languages.length === 0) return null;
  return (
    <ul aria-label={t("label")} className={cn("flex flex-wrap gap-1.5", className)}>
      {languages.map((language) => (
        <li
          key={language}
          className={cn(
            "rounded-full px-3 py-1 text-sm",
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

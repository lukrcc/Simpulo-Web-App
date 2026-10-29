import Link from "next/link";
import { useTranslations } from "next-intl";

export function Logo() {
  const t = useTranslations("nav");
  return (
    <Link href="/" aria-label={t("home")} className="flex flex-col leading-none">
      <span className="text-2xl font-bold tracking-tight text-ink">
        simpulo<span className="text-accent">.</span>
      </span>
      {/* Hidden while the header is compact (globals.css). */}
      <span className="logo-tagline mt-1 text-[11px] text-neutral-500">{t("tagline")}</span>
    </Link>
  );
}

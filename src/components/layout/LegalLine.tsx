import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * "Impressum · Privacy · Terms" in one small line (12px, muted, no underline, hover ink) – wherever a page has no footer: Open a House
 * (under Back/Next), the Messages list, Your houses, the profile from 1100px, Settings on phones and the installed app.
 */
export function LegalLine({ align = "start", className }: { align?: "start" | "center"; className?: string }) {
  const t = useTranslations("footer");
  const links = [
    { href: "/impressum", label: t("links.impressum") },
    { href: "/privacy", label: t("links.privacy") },
    { href: "/terms", label: t("links.terms") },
  ];
  return (
    <nav aria-label={t("legalLabel")} className={cn("flex flex-wrap items-center gap-x-1.5 text-eyebrow font-normal normal-case tracking-normal text-muted", align === "center" && "justify-center", className)}>
      {links.map(({ href, label }, i) => (
        <span key={href} className="flex items-center gap-1.5">
          {i > 0 && <span aria-hidden>·</span>}
          <Link href={href} className="transition-colors duration-150 hover:text-ink">
            {label}
          </Link>
        </span>
      ))}
    </nav>
  );
}

import Link from "next/link";
import { useTranslations } from "next-intl";
import { FOOTER_LEGAL } from "@/config/footer";
import { cn } from "@/lib/utils";

/**
 * "Impressum · Privacy · Terms · Cookies" in one small line (12px, muted, no underline, hover ink) – wherever a page has no footer: Open a House
 * (under Back/Next), the Messages list, Your houses, the profile from 1100px, Settings on phones and the installed app.
 */
export function LegalLine({ align = "start", className }: { align?: "start" | "center"; className?: string }) {
  const t = useTranslations("footer");
  // The one legal list (config/footer.ts): Impressum · Privacy · Terms · Cookies.
  const links = FOOTER_LEGAL.flatMap((l) => (l.href && !l.hidden ? [{ href: l.href, label: t(`links.${l.key}` as "links.privacy") }] : []));
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

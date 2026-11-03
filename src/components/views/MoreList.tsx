"use client";

import { ChevronDown, ChevronRight, Info, Mail, Megaphone, Scale, Smartphone, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { GET_THE_APP_HREF, LEGAL_LINKS } from "@/components/layout/secondaryLinks";
import { ListRow } from "@/components/ui/ListRow";
import { cn } from "@/lib/utils";

/** Labels: keys under footer.links. */
const MORE_LINKS: ReadonlyArray<{ href: string; labelKey: "getTheApp" | "howSimpuloWorks" | "hostWithCommunity" | "contact"; icon: LucideIcon }> = [
  { href: GET_THE_APP_HREF, labelKey: "getTheApp", icon: Smartphone },
  { href: "/how-it-works", labelKey: "howSimpuloWorks", icon: Info },
  { href: "/host", labelKey: "hostWithCommunity", icon: Megaphone },
  { href: "/contact", labelKey: "contact", icon: Mail },
];

const rowClass = "block w-full px-4 text-left transition-colors active:bg-bg";
const chevron = <ChevronRight className="size-4 text-muted" aria-hidden />;

/** Mobile-only grouped list on /profile – the desktop footer covers the same links. */
export function MoreList() {
  const [legalOpen, setLegalOpen] = useState(false);
  const t = useTranslations("footer");
  const tCommon = useTranslations("common");

  return (
    <section className="mt-10 md:hidden">
      <h2 className="mb-2 px-1 text-eyebrow uppercase text-muted">{tCommon("more")}</h2>
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
        {MORE_LINKS.map(({ href, labelKey, icon: Icon }) => (
          <li key={href}>
            <Link href={href} className={rowClass}>
              <ListRow lead={<Icon aria-hidden />} title={t(`links.${labelKey}`)} action={chevron} />
            </Link>
          </li>
        ))}
        <li>
          <button
            type="button"
            aria-expanded={legalOpen}
            aria-controls="more-legal"
            onClick={() => setLegalOpen((open) => !open)}
            className={rowClass}
          >
            <ListRow
              lead={<Scale aria-hidden />}
              title={t("links.legal")}
              action={<ChevronDown className={cn("size-4 text-muted transition-transform", legalOpen && "rotate-180")} aria-hidden />}
            />
          </button>
          {legalOpen && (
            <ul id="more-legal" className="divide-y divide-line border-t border-line bg-bg/60">
              {LEGAL_LINKS.map(({ href, labelKey }) => (
                <li key={href}>
                  {/* An empty lead keeps the titles on the parent row's text axis. */}
                  <Link href={href} className={rowClass}>
                    <ListRow lead={null} title={t(`links.${labelKey}`)} action={chevron} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </li>
      </ul>
    </section>
  );
}

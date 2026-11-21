"use client";

// The large footer's Places and Themes (CLAUDE.md "Footer"): computed from the Houses and the platform phase (lib/footerLinks.ts), each list
// ending in "All places →" / "All themes →". The first render uses what the server rendered (the live data, phase "live" – useStore and
// usePlatformPhase), then the browser's: no hydration difference.
import Link from "next/link";
import { useTranslations } from "next-intl";
import { FOOTER_ALL } from "@/config/footer";
import { usePlatformPhase } from "@/config/platform";
import { footerPlaces, footerThemes } from "@/lib/footerLinks";
import { useStore } from "@/lib/store";
import { FooterColumn } from "./FooterColumn";

export function FooterDiscover({ linkClass }: { linkClass: string }) {
  const t = useTranslations("footer.large");
  const tVibe = useTranslations("common.vibes");
  const { stays } = useStore();
  const phase = usePlatformPhase();
  const places = footerPlaces(stays, phase);
  const themes = footerThemes(stays, phase);
  return (
    <>
      <FooterColumn title={t("columns.places")}>
        <ul data-footer-places>
          {places.map((p) => (
            <li key={p.slug}>
              <Link href={`/co-living/${p.slug}`} className={linkClass}>
                {p.name}
              </Link>
            </li>
          ))}
          <li>
            <Link href={FOOTER_ALL.places} className={linkClass}>
              {t("allPlaces")}
            </Link>
          </li>
        </ul>
      </FooterColumn>
      <FooterColumn title={t("columns.themes")}>
        <ul data-footer-themes>
          {themes.map((v) => (
            <li key={v}>
              <Link href={`/themes/${v}`} className={linkClass}>
                {tVibe(v)}
              </Link>
            </li>
          ))}
          <li>
            <Link href={FOOTER_ALL.themes} className={linkClass}>
              {t("allThemes")}
            </Link>
          </li>
        </ul>
      </FooterColumn>
    </>
  );
}

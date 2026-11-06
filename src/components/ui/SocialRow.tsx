import { useTranslations } from "next-intl";
import type { CSSProperties, MouseEvent } from "react";
import { MAX_SOCIAL_LINKS, socialHandle, socialUrl } from "@/lib/socialLinks";
import type { SocialPlatform, User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SOCIAL_ICONS } from "./socialIcons";

const sizes = {
  // The profile and host cards: 36px circles, 18px icons.
  md: { button: "size-9", icon: "size-[18px]" },
  sm: { button: "size-[30px]", icon: "size-3.5" },
} as const;

// Social buttons often sit on top of card links – keep their clicks from bubbling up.
const stop = (e: MouseEvent) => e.stopPropagation();

interface SocialRowProps {
  user: Pick<User, "name" | "socials">;
  size?: keyof typeof sizes;
  className?: string;
}

/**
 * The host's public links, in the order they added them (at most 4): surface circles with a line border and the
 * platform's mark in its brand colour (website: the globe in ink; Kick: on an ink circle). Hover: the circle takes a
 * 10 % tint of that colour. Each opens in a new tab. Nothing without links.
 */
export function SocialRow({ user, size = "md", className }: SocialRowProps) {
  const t = useTranslations("common.ui.socialRow");
  const links = (user.socials ?? []).slice(0, MAX_SOCIAL_LINKS);
  if (links.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {links.map((link) => {
        const { icon: Icon, brand, hex, onInk } = SOCIAL_ICONS[link.platform];
        const label = brand ?? t("website");
        return (
          <a
            key={`${link.platform}-${link.value}`}
            href={socialUrl(link)}
            target="_blank"
            rel="noopener"
            onClick={stop}
            aria-label={t("onNetwork", { name: user.name.split(" ")[0], network: label })}
            style={{ "--brand": hex ?? "var(--ink)", "--circle": onInk ? "var(--ink)" : "var(--surface)" } as CSSProperties}
            className={cn(
              // Hover: the circle takes a 10 % tint of the brand colour; the icon stays as it is.
              "flex shrink-0 items-center justify-center rounded-full bg-(--circle) shadow-[0_1px_3px_rgba(0,0,0,0.08)] text-(--brand) transition-colors hover:bg-[color-mix(in_srgb,var(--brand)_10%,var(--circle))]",
              sizes[size].button,
            )}
          >
            <Icon className={sizes[size].icon} color="currentColor" />
          </a>
        );
      })}
    </div>
  );
}

/** Each platform's tile: its brand colour, Instagram its gradient; Kick's green with a dark mark, a website in ink. */
const TILE: Record<SocialPlatform, { background: string; icon: string }> = {
  instagram: { background: "linear-gradient(45deg, #F58529, #DD2A7B 50%, #8134AF)", icon: "#fff" },
  tiktok: { background: "#000", icon: "#fff" },
  youtube: { background: "#FF0000", icon: "#fff" },
  x: { background: "#000", icon: "#fff" },
  twitch: { background: "#9146FF", icon: "#fff" },
  kick: { background: "#53FC18", icon: "#221E1B" },
  website: { background: "var(--ink)", icon: "#fff" },
};

/** A person's links as app tiles, 36px, 8px apart: each opens in a new tab; the tooltip (and its label) is "@handle on Platform". */
export function SocialTiles({ user, className }: { user: Pick<User, "name" | "socials">; className?: string }) {
  const t = useTranslations("common.ui.socialRow");
  const links = (user.socials ?? []).slice(0, MAX_SOCIAL_LINKS);
  if (links.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {links.map((link) => {
        const { icon: Icon, brand } = SOCIAL_ICONS[link.platform];
        const tile = TILE[link.platform];
        return (
          <a
            key={`${link.platform}-${link.value}`}
            href={socialUrl(link)}
            target="_blank"
            rel="noopener"
            onClick={stop}
            aria-label={t("handleOn", { handle: socialHandle(link), network: brand ?? t("website") })}
            style={{ background: tile.background, color: tile.icon }}
            className="relative flex size-9 shrink-0 items-center justify-center rounded-[10px] transition-[translate,box-shadow,scale] duration-150 hover:-translate-y-0.5 hover:shadow-[0_4px_10px_rgba(0,0,0,0.15)] active:scale-95"
          >
            <Icon className="size-5" color="currentColor" />
          </a>
        );
      })}
    </div>
  );
}

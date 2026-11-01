import { useTranslations } from "next-intl";
import type { CSSProperties, MouseEvent } from "react";
import { MAX_SOCIAL_LINKS, socialUrl } from "@/lib/socialLinks";
import type { User } from "@/lib/types";
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
 * platform's mark in ink – in its brand colour on hover. Each opens in a new tab. Nothing without links.
 */
export function SocialRow({ user, size = "md", className }: SocialRowProps) {
  const t = useTranslations("common.ui.socialRow");
  const links = (user.socials ?? []).slice(0, MAX_SOCIAL_LINKS);
  if (links.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {links.map((link) => {
        const { icon: Icon, brand, hex } = SOCIAL_ICONS[link.platform];
        const label = brand ?? t("website");
        return (
          <a
            key={`${link.platform}-${link.value}`}
            href={socialUrl(link)}
            target="_blank"
            rel="noopener"
            onClick={stop}
            aria-label={t("onNetwork", { name: user.name.split(" ")[0], network: label })}
            title={label}
            style={{ "--brand": hex ? `#${hex.replace(/^#/, "")}` : "var(--ink)" } as CSSProperties}
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors hover:text-(--brand)",
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

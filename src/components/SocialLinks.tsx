"use client";

import { useTranslations } from "next-intl";
import type { MouseEvent } from "react";
import { SOCIAL_ICONS } from "@/components/ui/socialIcons";
import { MAX_SOCIAL_LINKS, socialHandle, socialUrl } from "@/lib/socialLinks";
import type { SocialLink, User } from "@/lib/types";
import { cn } from "@/lib/utils";

/** A handle longer than this is cut with "…". */
const MAX_HANDLE = 18;
const shortHandle = (handle: string) => (handle.length > MAX_HANDLE ? `${handle.slice(0, MAX_HANDLE - 1)}…` : handle);

const FULL = {
  /** On the page and light panels: a 1px edge ink 10 % */
  light: "border border-ink/10 text-ink hover:bg-ink/5",
  /** On Ember: a cream 8 % surface, cream text */
  dark: "bg-[#F4EEE7]/8 text-[#F4EEE7] hover:bg-[#F4EEE7]/14",
} as const;

const ICONS = {
  light: "bg-ink/6 text-ink/80 hover:bg-ink/10 hover:text-ink",
  dark: "bg-[#F4EEE7]/8 text-[#F4EEE7]/85 hover:bg-[#F4EEE7]/14 hover:text-[#F4EEE7]",
  /** On a photo (a card): IconButton onImage's glass */
  image: "bg-[rgba(20,18,16,0.28)] text-white/90 backdrop-blur-[12px] backdrop-saturate-[1.4] hover:bg-[rgba(20,18,16,0.42)]",
} as const;

/**
 * A person's social links, everywhere the same (at most 4, in the order saved on the profile; each opens in a new tab):
 * - `full` (the profile's head, the host column of the House page): capsules 36px – the mark 16px + the handle (14px, at most 18 characters,
 *   then "…"; a website its domain without protocol and www). Light: a 1px edge ink 10 %; on Ember: cream 8 %, cream text. They wrap.
 * - `icons` (cards, lists, crew, chat): only the marks, 32px circles; tooltip and label "{Platform} · {handle}".
 * Never the platform's name as text. `nested`: inside a card's link – buttons that open the link instead of anchors (no link in a link).
 */
export function SocialLinks({
  user,
  variant = "full",
  tone = "light",
  nested = false,
  className,
}: {
  user: Pick<User, "socials">;
  variant?: "full" | "icons";
  tone?: "light" | "dark" | "image";
  nested?: boolean;
  className?: string;
}) {
  const t = useTranslations("common.ui.socialRow");
  const links = (user.socials ?? []).slice(0, MAX_SOCIAL_LINKS);
  if (links.length === 0) return null;
  const label = (link: SocialLink) => `${SOCIAL_ICONS[link.platform].brand ?? t("website")} · ${socialHandle(link)}`;

  return (
    <div className={cn("flex items-center gap-2", variant === "full" ? "flex-wrap" : "shrink-0", className)}>
      {links.map((link) => {
        const { icon: Icon } = SOCIAL_ICONS[link.platform];
        const full = variant === "full";
        const style = full
          ? cn("press inline-flex h-9 max-w-full items-center gap-2 rounded-full px-3.5 transition-colors duration-150", FULL[tone === "dark" ? "dark" : "light"])
          : cn("press flex size-8 shrink-0 items-center justify-center rounded-full transition-colors duration-150", ICONS[tone]);
        const body = (
          <>
            <Icon className="size-4 shrink-0" color="currentColor" />
            {full && <span className="truncate text-nav">{shortHandle(socialHandle(link))}</span>}
          </>
        );
        const key = `${link.platform}-${link.value}`;
        // A capsule shows its handle: the label adds the platform for screen readers; no tooltip on a button with text.
        const aria = label(link);
        if (nested) {
          return (
            <button
              key={key}
              type="button"
              aria-label={aria}
              onClick={(e: MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(socialUrl(link), "_blank", "noopener");
              }}
              className={style}
            >
              {body}
            </button>
          );
        }
        return (
          <a key={key} href={socialUrl(link)} target="_blank" rel="noopener" aria-label={aria} onClick={(e) => e.stopPropagation()} className={style}>
            {body}
          </a>
        );
      })}
    </div>
  );
}

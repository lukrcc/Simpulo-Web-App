"use client";

import { useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";
import type { MouseEvent } from "react";
import { BrandMark, SOCIAL_ICONS } from "@/components/ui/socialIcons";
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
  dark: "bg-ink/8 text-ink hover:bg-ink/14",
} as const;

const ICONS = {
  light: "bg-ink/6 text-ink/80 hover:bg-ink/10 hover:text-ink",
  dark: "bg-ink/8 text-ink/85 hover:bg-ink/14 hover:text-ink",
  /** On a photo (a card): IconButton onImage's glass */
  image: "bg-(--image-glass) text-on-image/90 backdrop-blur-[12px] backdrop-saturate-[1.4] hover:bg-(--image-glass-hover)",
} as const;

/**
 * A person's social links, everywhere the same (at most 4, in the order saved on the profile; each opens in a new tab):
 * - `full` (the profile's head, the host column of the House page): capsules 36px – the mark 16px + the handle (14px, at most 18 characters,
 *   then "…"; a website its domain without protocol and www). Light: a 1px edge ink 10 %; on Ember: cream 8 %, cream text. They wrap.
 * - `icons` (cards, lists, crew, chat): only the marks, 32px circles; tooltip and label "{Platform} · {handle}".
 * - `rows` (the profile's About & Find me): rows of 48px – the mark in its own colour in a white 36px circle, the handle (or domain), ↗.
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
  variant?: "full" | "icons" | "rows";
  tone?: "light" | "dark" | "image";
  nested?: boolean;
  className?: string;
}) {
  const t = useTranslations("common.ui.socialRow");
  const links = (user.socials ?? []).slice(0, MAX_SOCIAL_LINKS);
  if (links.length === 0) return null;
  const label = (link: SocialLink) => `${SOCIAL_ICONS[link.platform].brand ?? t("website")} · ${socialHandle(link)}`;

  if (variant === "rows") {
    return (
      <ul className={cn("flex flex-col", className)}>
        {links.map((link) => {
          return (
            <li key={`${link.platform}-${link.value}`}>
              <a href={socialUrl(link)} target="_blank" rel="noopener" aria-label={label(link)} className="group -mx-2 flex h-12 items-center gap-3 rounded-xl px-2 text-ink transition-colors duration-150 hover:bg-ink/5">
                {/* The mark in its own colour: a white circle 36px, a 1px edge ink 6 %, the mark 20px. */}
                <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full border border-ink/6 bg-plate">
                  <BrandMark platform={link.platform} className="size-5" />
                </span>
                <span className="min-w-0 flex-1 truncate text-body">{socialHandle(link)}</span>
                <ArrowUpRight aria-hidden className="size-4 shrink-0 text-muted transition-colors group-hover:text-ink" />
              </a>
            </li>
          );
        })}
      </ul>
    );
  }

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
            {/* On Ember (the House page's host column) the mark in its own colour, in a small white circle; elsewhere monochrome. */}
            {full && tone === "dark" ? (
              <span className="relative -ml-1.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-plate">
                <BrandMark platform={link.platform} className="size-3.5" />
              </span>
            ) : (
              <Icon className="size-4 shrink-0" color="currentColor" />
            )}
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

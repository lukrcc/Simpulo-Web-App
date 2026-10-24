"use client";

import { Phone, Video } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType, CSSProperties } from "react";
import { SiDiscord, SiSignal, SiTelegram, SiWhatsapp } from "react-icons/si";
import { canSeePrivateContacts, useStore } from "@/lib/store";
import type { PrivateContacts, User } from "@/lib/types";
import { useIsAppleDevice } from "@/lib/useIsAppleDevice";
import { cn } from "@/lib/utils";

type IconComponent = ComponentType<{ className?: string; style?: CSSProperties }>;

export interface Channel {
  key: keyof PrivateContacts;
  icon: IconComponent;
  /** Glyph colour on the white circle – the brand colour, or ink for the plain phone/FaceTime glyphs */
  color: string;
  href: (value: string) => string;
}

const digits = (value: string) => value.replace(/[^\d+]/g, "");

// Order = display order.
/** Crew-only channels in display order – also the icons on Edit profile. */
export const CONTACT_CHANNELS: readonly Channel[] = [
  { key: "whatsapp", icon: SiWhatsapp, color: "#25D366", href: (v) => `https://wa.me/${digits(v).replace(/^\+/, "")}` },
  { key: "telegram", icon: SiTelegram, color: "#26A5E4", href: (v) => `https://t.me/${v.replace(/^@/, "")}` },
  { key: "signal", icon: SiSignal, color: "#3A76F0", href: (v) => `https://signal.me/#p/${digits(v)}` },
  // Discord has no reliable deep link for a username – the app opens and the user can search it.
  { key: "discord", icon: SiDiscord, color: "#5865F2", href: () => "https://discord.com/app" },
  { key: "phone", icon: Phone, color: "#1E1E22", href: (v) => `tel:${digits(v)}` },
  { key: "facetime", icon: Video, color: "#1E1E22", href: (v) => `facetime:${v.includes("@") ? v : digits(v)}` },
];

const sizes = {
  md: { button: "size-9", icon: "size-4" },
  sm: { button: "size-[30px]", icon: "size-3.5" },
  /** 28px – compact headers */
  xs: { button: "size-7", icon: "size-3.5" },
} as const;

interface CrewContactsProps {
  user: User;
  size?: keyof typeof sizes;
  className?: string;
}

/**
 * The user's crew-only channels (WhatsApp, Telegram, Signal, Discord, phone, FaceTime). Renders nothing – not
 * even a placeholder – unless the viewer shares an accepted crew with them (canSeePrivateContacts).
 * FaceTime only shows on Apple devices.
 */
export function CrewContacts({ user, size = "md", className }: CrewContactsProps) {
  const store = useStore();
  const t = useTranslations("common.ui.crewContacts");
  const apple = useIsAppleDevice();
  if (!canSeePrivateContacts(store, store.currentUserId, user.id)) return null;

  const contacts = user.privateContacts ?? {};
  const links = CONTACT_CHANNELS.filter(({ key }) => contacts[key] && (key !== "facetime" || apple));
  if (links.length === 0) return null;

  const firstName = user.name.split(" ")[0];
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {links.map(({ key, icon: Icon, color, href }) => {
        const value = contacts[key] ?? "";
        return (
          <a
            key={key}
            href={href(value)}
            target={key === "phone" || key === "facetime" ? undefined : "_blank"}
            rel="noopener noreferrer"
            aria-label={t(`label.${key}`, { name: firstName })}
            title={`${t(`channel.${key}`)} · ${value}`}
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full bg-white shadow-sm shadow-black/15 ring-1 ring-black/5 transition-transform hover:scale-105",
              sizes[size].button,
            )}
          >
            <Icon className={sizes[size].icon} style={{ color }} />
          </a>
        );
      })}
    </div>
  );
}

/** Whether CrewContacts would render anything for this viewer – for callers that add a label or divider. */
export function useHasVisibleCrewContacts(user: User | undefined): boolean {
  const store = useStore();
  const apple = useIsAppleDevice();
  if (!user || !canSeePrivateContacts(store, store.currentUserId, user.id)) return false;
  const contacts = user.privateContacts ?? {};
  return CONTACT_CHANNELS.some(({ key }) => contacts[key] && (key !== "facetime" || apple));
}

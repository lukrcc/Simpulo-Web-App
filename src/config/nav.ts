// The navigation's icons (Lucide): the phones' tab bar and the desktop header (its filled forms: header/FilledNavIcons.tsx).
import { Compass, House, Lightbulb, MapPin, Megaphone, MessageCircle, User, type LucideIcon } from "lucide-react";

/** Keyed by the nav item's label key (src/components/layout/nav.ts). */
export const NAV_ICONS = {
  explore: Compass,
  whereNext: MapPin,
  /** "Your houses" */
  houses: House,
  messages: MessageCircle,
  /** Phones' tab bar only – on desktop Profile is in the avatar menu */
  profile: User,
  // Logged out
  host: Megaphone,
  howItWorks: Lightbulb,
} as const satisfies Record<string, LucideIcon>;

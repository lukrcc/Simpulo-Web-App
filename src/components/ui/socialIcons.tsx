import { SiInstagram, SiKick, SiTiktok, SiTwitch, SiX, SiYoutube } from "@icons-pack/react-simple-icons";
import { Globe } from "lucide-react";
import type { ComponentType } from "react";
import type { SocialPlatform } from "@/lib/types";

/**
 * Each platform's mark – brand icons from Simple Icons (@icons-pack/react-simple-icons), lucide's globe for a website
 * – its brand name (null: the website, translated where shown) and its brand colour (null: a website, in ink).
 * `onInk`: a colour too light for a surface circle (Kick's green) – its circle is ink instead.
 */
export const SOCIAL_ICONS: Record<SocialPlatform, { icon: ComponentType<{ className?: string; color?: string }>; brand: string | null; hex: string | null; onInk?: boolean }> = {
  instagram: { icon: SiInstagram, brand: "Instagram", hex: "#E4405F" },
  tiktok: { icon: SiTiktok, brand: "TikTok", hex: "#000000" },
  youtube: { icon: SiYoutube, brand: "YouTube", hex: "#FF0000" },
  twitch: { icon: SiTwitch, brand: "Twitch", hex: "#9146FF" },
  kick: { icon: SiKick, brand: "Kick", hex: "#53FC18", onInk: true },
  x: { icon: SiX, brand: "X", hex: "#000000" },
  website: { icon: Globe, brand: null, hex: null },
};

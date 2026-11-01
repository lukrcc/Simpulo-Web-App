import {
  SiInstagram,
  SiInstagramHex,
  SiKick,
  SiKickHex,
  SiTiktok,
  SiTiktokHex,
  SiTwitch,
  SiTwitchHex,
  SiX,
  SiXHex,
  SiYoutube,
  SiYoutubeHex,
} from "@icons-pack/react-simple-icons";
import { Globe } from "lucide-react";
import type { ComponentType } from "react";
import type { SocialPlatform } from "@/lib/types";

/**
 * Each platform's mark – brand icons from Simple Icons (@icons-pack/react-simple-icons), lucide's globe for a website
 * – its brand name (null: the website, translated where shown) and its brand colour (from Simple Icons; none for a
 * website).
 */
export const SOCIAL_ICONS: Record<SocialPlatform, { icon: ComponentType<{ className?: string; color?: string }>; brand: string | null; hex: string | null }> = {
  instagram: { icon: SiInstagram, brand: "Instagram", hex: SiInstagramHex },
  tiktok: { icon: SiTiktok, brand: "TikTok", hex: SiTiktokHex },
  youtube: { icon: SiYoutube, brand: "YouTube", hex: SiYoutubeHex },
  twitch: { icon: SiTwitch, brand: "Twitch", hex: SiTwitchHex },
  kick: { icon: SiKick, brand: "Kick", hex: SiKickHex },
  x: { icon: SiX, brand: "X", hex: SiXHex },
  website: { icon: Globe, brand: null, hex: null },
};

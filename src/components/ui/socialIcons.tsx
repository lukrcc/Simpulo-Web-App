import { SiInstagram, SiKick, SiTiktok, SiTwitch, SiX, SiYoutube } from "@icons-pack/react-simple-icons";
import { Globe } from "lucide-react";
import { useId, type ComponentType } from "react";
import type { SocialPlatform } from "@/lib/types";

type IconProps = { className?: string; color?: string };

/**
 * LinkedIn's mark, drawn here (Simple Icons no longer carries it): a rounded square with "in" cut out – solid, 24 × 24, in the text's
 * colour like the other marks.
 */
function LinkedInMark({ className, color = "currentColor" }: IconProps) {
  const mask = useId();
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <mask id={mask}>
        <rect x="1.5" y="1.5" width="21" height="21" rx="4" fill="#fff" />
        <circle cx="7.3" cy="7.2" r="1.6" fill="#000" />
        <rect x="5.9" y="9.6" width="2.8" height="8.6" fill="#000" />
        <path d="M10.6 9.6h2.7v1.3c.5-.9 1.6-1.5 2.9-1.5 2.2 0 3.3 1.3 3.3 3.8v5h-2.8v-4.5c0-1.2-.5-1.9-1.5-1.9s-1.8.7-1.8 2v4.4h-2.8z" fill="#000" />
      </mask>
      <rect x="1.5" y="1.5" width="21" height="21" rx="4" fill={color} mask={`url(#${mask})`} />
    </svg>
  );
}

/** lucide's globe at the line weight that matches the solid marks at 16px. */
function WebsiteMark({ className, color = "currentColor" }: IconProps) {
  return <Globe className={className} color={color} strokeWidth={2} aria-hidden />;
}

/**
 * Each platform's mark – monochrome, always in the text's colour (currentColor), all on the same 24 × 24 box: brand marks from Simple Icons
 * (@icons-pack/react-simple-icons), LinkedIn drawn here, lucide's globe for a website – and its name (null: the website, translated where
 * shown). The names are only for labels and tooltips, never shown as text beside the mark.
 */
export const SOCIAL_ICONS: Record<SocialPlatform, { icon: ComponentType<IconProps>; brand: string | null }> = {
  instagram: { icon: SiInstagram, brand: "Instagram" },
  tiktok: { icon: SiTiktok, brand: "TikTok" },
  youtube: { icon: SiYoutube, brand: "YouTube" },
  twitch: { icon: SiTwitch, brand: "Twitch" },
  kick: { icon: SiKick, brand: "Kick" },
  x: { icon: SiX, brand: "X" },
  linkedin: { icon: LinkedInMark, brand: "LinkedIn" },
  website: { icon: WebsiteMark, brand: null },
};

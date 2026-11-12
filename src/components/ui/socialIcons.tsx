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
  // Only letters and digits: url(#…) breaks on the colons and guillemets useId may produce.
  const mask = `m${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
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
 * Each platform's mark, all on the same 24 × 24 box: brand marks from Simple Icons (@icons-pack/react-simple-icons), LinkedIn drawn here,
 * lucide's globe for a website – its name (null: the website, translated where shown; only for labels and tooltips, never as text beside the
 * mark) and its colour. Monochrome (currentColor) on photos and in small icon rows; in their own colour via `BrandMark`.
 */
export const SOCIAL_ICONS: Record<SocialPlatform, { icon: ComponentType<IconProps>; brand: string | null; color: string }> = {
  instagram: { icon: SiInstagram, brand: "Instagram", color: "instagram" },
  tiktok: { icon: SiTiktok, brand: "TikTok", color: "#000000" },
  youtube: { icon: SiYoutube, brand: "YouTube", color: "#FF0000" },
  twitch: { icon: SiTwitch, brand: "Twitch", color: "#9146FF" },
  kick: { icon: SiKick, brand: "Kick", color: "#53FC18" },
  x: { icon: SiX, brand: "X", color: "#000000" },
  linkedin: { icon: LinkedInMark, brand: "LinkedIn", color: "#0A66C2" },
  website: { icon: WebsiteMark, brand: null, color: "#221E1B" },
};

/**
 * A mark in its own colour (`color`: the brand's; Instagram its gradient) – for the light places that have the room: the profile's
 * "Find me" rows and the host column of the House page, each in a white circle. On photos (cards) the marks stay white and monochrome.
 */
export function BrandMark({ platform, className }: { platform: SocialPlatform; className?: string }) {
  const gradient = `g${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const { icon: Icon, color } = SOCIAL_ICONS[platform];
  if (color !== "instagram") return <Icon className={className} color={color} />;
  return (
    <>
      <svg aria-hidden width="0" height="0" className="absolute">
        <defs>
          <linearGradient id={gradient} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FEDA75" />
            <stop offset="30%" stopColor="#FA7E1E" />
            <stop offset="55%" stopColor="#D62976" />
            <stop offset="80%" stopColor="#962FBF" />
            <stop offset="100%" stopColor="#4F5BD5" />
          </linearGradient>
        </defs>
      </svg>
      <Icon className={className} color={`url(#${gradient})`} />
    </>
  );
}

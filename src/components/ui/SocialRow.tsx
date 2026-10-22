import { Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType, CSSProperties, MouseEvent } from "react";
import { FaLinkedin } from "react-icons/fa6";
import { SiInstagram, SiKick, SiThreads, SiTiktok, SiTwitch, SiX, SiYoutube } from "react-icons/si";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

type IconComponent = ComponentType<{ className?: string; color?: string; style?: CSSProperties }>;

interface SocialNetwork {
  key: keyof Pick<User, "instagram" | "tiktok" | "youtube" | "twitch" | "kick" | "linkedin" | "x" | "threads" | "website">;
  /** Brand name – null for the generic website link, which is translated */
  label: string | null;
  color: string;
  icon: IconComponent;
  href: (value: string) => string;
  /** Dark circle instead of white (for brand colours that need it) */
  dark?: boolean;
}

// Order = display order. Simple Icons dropped LinkedIn, so that one comes from Font Awesome (same package).
/** Handles may be stored with or without a leading "@". */
const handle = (h: string) => h.replace(/^@/, "");

const NETWORKS: readonly SocialNetwork[] = [
  { key: "instagram", label: "Instagram", color: "#E4405F", icon: SiInstagram, href: (h) => `https://instagram.com/${handle(h)}` },
  { key: "tiktok", label: "TikTok", color: "#000000", icon: SiTiktok, href: (h) => `https://www.tiktok.com/@${handle(h)}` },
  { key: "youtube", label: "YouTube", color: "#FF0000", icon: SiYoutube, href: (h) => `https://www.youtube.com/@${handle(h)}` },
  { key: "twitch", label: "Twitch", color: "#9146FF", icon: SiTwitch, href: (h) => `https://www.twitch.tv/${handle(h)}` },
  // Kick's neon green needs a dark circle to stay readable.
  { key: "kick", label: "Kick", color: "#53FC18", icon: SiKick, href: (h) => `https://kick.com/${handle(h)}`, dark: true },
  { key: "linkedin", label: "LinkedIn", color: "#0A66C2", icon: FaLinkedin, href: (h) => `https://www.linkedin.com/in/${handle(h)}` },
  { key: "x", label: "X", color: "#000000", icon: SiX, href: (h) => `https://x.com/${handle(h)}` },
  { key: "threads", label: "Threads", color: "#000000", icon: SiThreads, href: (h) => `https://www.threads.net/@${handle(h)}` },
  { key: "website", label: null, color: "#1E1E22", icon: Globe, href: (url) => url },
];

const sizes = {
  md: { button: "size-9", icon: "size-4" },
  sm: { button: "size-[30px]", icon: "size-3.5" },
} as const;

// Social buttons often sit on top of card links – keep their clicks from bubbling up.
const stop = (e: MouseEvent) => e.stopPropagation();

interface SocialRowProps {
  user: User;
  /** Max number of icons */
  max?: number;
  size?: keyof typeof sizes;
  className?: string;
}

/** Round white buttons with brand-colored icons – only for the networks the user has. */
export function SocialRow({ user, max, size = "md", className }: SocialRowProps) {
  const t = useTranslations("common.ui.socialRow");
  const links = NETWORKS.flatMap((network) => {
    const value = user[network.key];
    return value ? [{ ...network, label: network.label ?? t("website"), url: network.href(value) }] : [];
  }).slice(0, max);

  if (links.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {links.map(({ key, label, color, icon: Icon, url, dark }) => (
        <a
          key={key}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={stop}
          aria-label={t("onNetwork", { name: user.name.split(" ")[0], network: label })}
          title={label}
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full shadow-sm shadow-black/15 ring-1 ring-black/5 transition-transform hover:scale-105",
            dark ? "bg-ink" : "bg-white",
            sizes[size].button,
          )}
        >
          <Icon className={sizes[size].icon} style={{ color }} />
        </a>
      ))}
    </div>
  );
}

import { Globe } from "lucide-react";
import type { ComponentType } from "react";
import { SiInstagram, SiKick, SiTiktok, SiTwitch, SiYoutube } from "react-icons/si";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

type CardNetwork = "instagram" | "tiktok" | "youtube" | "twitch" | "kick" | "website";

/** The host's public profiles shown on cards, in this order – never privateContacts. */
const CARD_NETWORKS: readonly { key: CardNetwork; icon: ComponentType<{ className?: string; strokeWidth?: number }> }[] = [
  { key: "instagram", icon: SiInstagram },
  { key: "tiktok", icon: SiTiktok },
  { key: "youtube", icon: SiYoutube },
  { key: "twitch", icon: SiTwitch },
  { key: "kick", icon: SiKick },
  // Simple Icons has no generic website mark; lucide's globe, a touch heavier so it matches the filled brand marks.
  { key: "website", icon: Globe },
];
const MAX_ICONS = 3;

/**
 * Up to three small white icons for the host's public socials, "+N" for the rest – on a card's photo, beside the
 * crew. Decorative: not links (the card opens the House; the profile has the links). Nothing when there are none.
 */
export function HostSocialIcons({ host, className }: { host: Pick<User, CardNetwork>; className?: string }) {
  const networks = CARD_NETWORKS.filter(({ key }) => host[key]?.trim());
  if (networks.length === 0) return null;
  const rest = networks.length - MAX_ICONS;
  return (
    <span aria-hidden data-host-socials className={cn("flex shrink-0 items-center gap-2.5 text-white/85", className)}>
      {networks.slice(0, MAX_ICONS).map(({ key, icon: Icon }) => (
        <Icon key={key} className="size-3.5" {...(key === "website" ? { strokeWidth: 2.5 } : {})} />
      ))}
      {rest > 0 && <span className="text-xs font-medium leading-none">+{rest}</span>}
    </span>
  );
}

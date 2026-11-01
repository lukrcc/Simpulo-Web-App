import { MAX_SOCIAL_LINKS } from "@/lib/socialLinks";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SOCIAL_ICONS } from "./socialIcons";

const MAX_ICONS = 3;

/**
 * Up to three small white icons for the host's public links (in their order), "+N" for the rest – on a card's photo,
 * beside the crew. Decorative: not links (the card opens the House; the profile has the links). Nothing without links.
 */
export function HostSocialIcons({ host, className }: { host: Pick<User, "socials">; className?: string }) {
  const links = (host.socials ?? []).slice(0, MAX_SOCIAL_LINKS);
  if (links.length === 0) return null;
  const rest = links.length - MAX_ICONS;
  return (
    <span aria-hidden data-host-socials className={cn("flex shrink-0 items-center gap-2.5 text-white/85", className)}>
      {links.slice(0, MAX_ICONS).map((link) => {
        const Icon = SOCIAL_ICONS[link.platform].icon;
        return <Icon key={`${link.platform}-${link.value}`} className="size-3.5" color="currentColor" />;
      })}
      {rest > 0 && <span className="text-xs font-medium leading-none">+{rest}</span>}
    </span>
  );
}

import { useTranslations } from "next-intl";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PersonPhoto } from "./PersonPhoto";

const MAX_MEMBERS = 3;

/**
 * Card crew row: host first (thin orange ring), then accepted members (up to 3, then "+N").
 * 28px avatars, overlapping by 8px, white 2px borders – no numbers. Host alone → "Just opened".
 */
export function CrewAvatars({ host, members }: { host: User; members: User[] }) {
  const t = useTranslations("common.ui.crewAvatars");
  const shown = members.slice(0, MAX_MEMBERS);
  const rest = members.length - shown.length;
  const avatar = "size-7 border-2 border-white";

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center -space-x-2">
        <PersonPhoto src={host.photos[0]} alt={host.name} size={28} className={cn(avatar, "ring-[1.5px] ring-accent")} />
        {shown.map((member) => (
          <PersonPhoto key={member.id} src={member.photos[0]} alt={member.name} size={28} className={avatar} />
        ))}
        {rest > 0 && (
          <span className="glass-dark flex size-7 items-center justify-center rounded-full border-2 border-white text-[10px] font-semibold">
            +{rest}
          </span>
        )}
      </div>
      {members.length === 0 && <span className="text-sm text-white/70">{t("justOpened")}</span>}
    </div>
  );
}

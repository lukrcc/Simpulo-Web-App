import type { Stay, User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CrewLine } from "./CrewLine";
import { PersonPhoto } from "./PersonPhoto";

const MAX_MEMBERS = 3;

/**
 * Card crew row: host first (thin ink ring), then accepted members (up to 3, then "+N").
 * 28px avatars, overlapping by 8px, white 2px borders, then how many are in (CrewLine).
 */
export function CrewAvatars({ host, members, stay }: { host: User; members: User[]; stay: Pick<Stay, "spotsTotal" | "spotsFilled" | "spotsInvited" | "spotsReserved"> }) {
  const shown = members.slice(0, MAX_MEMBERS);
  const rest = members.length - shown.length;
  const avatar = "size-7 border-2 border-surface";

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="flex shrink-0 items-center -space-x-2">
        <PersonPhoto src={host.photos[0]} alt={host.name} size={28} className={cn(avatar, "ring-[1.5px] ring-ink")} />
        {shown.map((member) => (
          <PersonPhoto key={member.id} src={member.photos[0]} alt={member.name} size={28} className={avatar} />
        ))}
        {rest > 0 && (
          <span className="glass-dark flex size-7 items-center justify-center rounded-full border-2 border-surface text-small font-semibold">
            +{rest}
          </span>
        )}
      </div>
      <CrewLine stay={stay} onDark className="min-w-0 truncate" />
    </div>
  );
}

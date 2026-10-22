import Link from "next/link";
import { AvatarStack } from "@/components/ui/Avatar";
import type { Stay, User } from "@/lib/types";
import { pluralize } from "@/lib/utils";

/** Host first, then accepted guests. */
export function CrewSection({ stay, crew }: { stay: Stay; crew: User[] }) {
  const spotsLeft = Math.max(0, stay.spotsTotal - stay.spotsFilled);

  return (
    <div className="flex items-center gap-4">
      <AvatarStack users={crew} size="md" max={6} linked />
      <div className="min-w-0">
        <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm">
          {crew.map((member) => (
            <Link key={member.id} href={`/u/${member.id}`} className="hover:underline">
              <span className="font-medium">{member.name.split(" ")[0]}</span>{" "}
              <span className="text-neutral-500">{member.country}</span>
              {member.id === stay.hostId && <span className="ml-1 text-xs font-medium text-accent">Host</span>}
            </Link>
          ))}
        </p>
        <p className="mt-0.5 text-sm font-medium text-accent">
          {spotsLeft > 0 ? `+${pluralize(spotsLeft, "spot")} left` : "Crew complete"}
        </p>
        <p className="text-sm text-zinc-500">Up to {pluralize(stay.spotsTotal, "person", "people")}</p>
      </div>
    </div>
  );
}

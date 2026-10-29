import { StayCard } from "@/components/StayCard";
import { getCrew, getUser } from "@/lib/data/stays";
import type { Stay } from "@/lib/types";

/**
 * Server-rendered grid of plain House cards (landing pages, similar Houses): host and crew come from the data layer,
 * so the cards are in the HTML crawlers get. Same breakpoints as the Explore grid.
 */
export async function HouseGrid({ stays }: { stays: Stay[] }) {
  const cards = await Promise.all(stays.map(async (stay) => ({ stay, host: await getUser(stay.hostId), crew: await getCrew(stay) })));
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3 min-[90rem]:grid-cols-4">
      {cards.map(({ stay, host, crew }) => (
        <StayCard key={stay.id} stay={stay} host={host} crew={crew} />
      ))}
    </div>
  );
}

import { HouseCard } from "@/components/HouseCard";
import { getCrew, getUser } from "@/lib/data/stays";
import type { Stay } from "@/lib/types";
import { HOUSE_GRID } from "@/config/explore";

/**
 * Server-rendered grid of plain House cards (landing pages, similar Houses): host and crew come from the data layer,
 * so the cards are in the HTML crawlers get. Same breakpoints as the Explore grid.
 */
export async function HouseGrid({ stays }: { stays: Stay[] }) {
  const cards = await Promise.all(stays.map(async (stay) => ({ stay, host: await getUser(stay.hostId), crew: await getCrew(stay) })));
  return (
    <div className={HOUSE_GRID}>
      {cards.map(({ stay, host, crew }) => (
        <HouseCard key={stay.id} stay={stay} host={host} crew={crew} />
      ))}
    </div>
  );
}

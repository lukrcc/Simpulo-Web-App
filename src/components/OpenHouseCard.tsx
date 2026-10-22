import Link from "next/link";

/** Last tile of the feed grid: same size as a House card, invites people to open their own. */
export function OpenHouseCard() {
  return (
    <Link
      href="/create"
      className="group flex aspect-4/5 flex-col items-center justify-center rounded-[28px] bg-ink p-8 text-center outline-none transition-transform duration-300 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-page md:hover:scale-[1.02]"
    >
      <p className="text-white/70">Nothing for your dates?</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-white">
        Open your own House<span className="text-accent">.</span>
      </p>
      <span className="mt-6 inline-flex h-10 items-center rounded-full bg-white px-6 text-sm font-semibold text-ink transition-colors group-hover:bg-white/90">
        Start
      </span>
    </Link>
  );
}

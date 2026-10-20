import Link from "next/link";
import { LEGAL_LINKS, SECONDARY_LINKS } from "./secondaryLinks";

/** Desktop-only footer; on mobile the same links live in the "More" list on /profile. */
export function Footer() {
  return (
    <footer className="hidden border-t border-neutral-100 md:block">
      <div className="mx-auto flex max-w-[1600px] items-start justify-between gap-8 px-8 py-10 text-sm text-zinc-500">
        <div>
          <p className="text-base font-bold tracking-tight text-ink">
            simpulo<span className="text-accent">.</span>
          </p>
          <p className="mt-1 text-xs">Share a place. Find your people.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap justify-end gap-x-6 gap-y-2">
          {[...SECONDARY_LINKS, ...LEGAL_LINKS].map(({ href, label }) => (
            <Link key={href} href={href} className="transition-colors hover:text-ink">
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

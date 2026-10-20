import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" aria-label="Simpulo – home" className="flex flex-col leading-none">
      <span className="text-2xl font-bold tracking-tight text-ink">
        simpulo<span className="text-accent">.</span>
      </span>
      <span className="mt-1 text-[11px] text-neutral-500">Share a place. Find your people.</span>
    </Link>
  );
}

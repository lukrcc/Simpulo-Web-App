"use client";

import { ChevronDown, ChevronRight, Info, Mail, Scale, Smartphone, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { LEGAL_LINKS } from "@/components/layout/secondaryLinks";
import { cn } from "@/lib/utils";

const MORE_LINKS: ReadonlyArray<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/install", label: "Get the app on your phone", icon: Smartphone },
  { href: "/how-it-works", label: "How Simpulo works", icon: Info },
  { href: "/contact", label: "Contact", icon: Mail },
];

const rowClass = "flex w-full items-center gap-3 px-4 py-3.5 text-left text-[15px] transition-colors active:bg-neutral-50";

/** Mobile-only grouped list on /profile – the desktop footer covers the same links. */
export function MoreList() {
  const [legalOpen, setLegalOpen] = useState(false);

  return (
    <section className="mt-10 md:hidden">
      <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">More</h2>
      <ul className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-100">
        {MORE_LINKS.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link href={href} className={rowClass}>
              <Icon className="size-5 text-zinc-500" aria-hidden />
              <span className="flex-1">{label}</span>
              <ChevronRight className="size-4 text-zinc-400" aria-hidden />
            </Link>
          </li>
        ))}
        <li>
          <button
            type="button"
            aria-expanded={legalOpen}
            aria-controls="more-legal"
            onClick={() => setLegalOpen((open) => !open)}
            className={rowClass}
          >
            <Scale className="size-5 text-zinc-500" aria-hidden />
            <span className="flex-1">Legal</span>
            <ChevronDown className={cn("size-4 text-zinc-400 transition-transform", legalOpen && "rotate-180")} aria-hidden />
          </button>
          {legalOpen && (
            <ul id="more-legal" className="border-t border-neutral-100 bg-neutral-50/60">
              {LEGAL_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className={cn(rowClass, "pl-12")}>
                    <span className="flex-1">{label}</span>
                    <ChevronRight className="size-4 text-zinc-400" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </li>
      </ul>
    </section>
  );
}

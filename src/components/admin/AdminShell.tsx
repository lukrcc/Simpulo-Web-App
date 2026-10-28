"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Container } from "@/components/layout/Container";
import { cn } from "@/lib/utils";

const ADMIN_NAV = [
  { href: "/admin/growth", key: "growth" },
  { href: "/admin/houses", key: "houses" },
] as const;

/** Frame of the admin pages: a quiet "Admin · mock data" pill and the two sections. Must render inside Suspense. */
export function AdminShell({ title, intro, aside, children }: { title: string; intro?: string; aside?: ReactNode; children: ReactNode }) {
  const t = useTranslations("growth.admin");
  const pathname = usePathname();
  return (
    <Container page>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">{t("devOnly")}</span>
        <nav className="flex gap-1">
          {ADMIN_NAV.map(({ href, key }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn("rounded-full px-3 py-1 text-sm font-medium transition-colors", active ? "bg-white text-ink" : "text-zinc-500 hover:text-ink")}
              >
                {t(`nav.${key}`)}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {intro && <p className="mt-2 text-zinc-500">{intro}</p>}
        </div>
        {aside}
      </div>
      <div className="mt-8">{children}</div>
    </Container>
  );
}

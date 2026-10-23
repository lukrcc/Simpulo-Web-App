import { useFormatter, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Container } from "./Container";

interface ContentPageProps {
  title: string;
  intro?: string;
  /** Legal pages: 720px measure, 16px body, a "Last updated" line under the title (YYYY-MM-DD). */
  updated?: string;
  children: ReactNode;
}

/** Simple reading layout for secondary pages (About, Legal, …). */
export function ContentPage({ title, intro, updated, children }: ContentPageProps) {
  const t = useTranslations("legal");
  const format = useFormatter();
  const legal = updated !== undefined;
  return (
    <Container page width={legal ? "full" : "text"}>
      <article className={cn(legal && "max-w-180")}>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
        {updated && (
          <p className="mt-2 text-sm text-neutral-500">
            {t("lastUpdated", { date: format.dateTime(new Date(updated), { dateStyle: "long" }) })}
          </p>
        )}
        {intro && <p className="mt-3 text-lg leading-relaxed text-neutral-600">{intro}</p>}
        <div className={cn("mt-8 leading-relaxed text-neutral-700", legal ? "space-y-10 text-base" : "space-y-4")}>
          {children}
        </div>
      </article>
    </Container>
  );
}

/** Small amber pill marking copy that still needs a (legal) review. */
export function DraftPill() {
  const t = useTranslations("legal");
  return (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
      {t("draft")}
    </span>
  );
}

interface LegalSectionProps {
  id: string;
  title: string;
  children: ReactNode;
}

/** One h2 section of a legal page – every body carries the draft pill until the text is reviewed. */
export function LegalSection({ id, title, children }: LegalSectionProps) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24">
      <h2 id={`${id}-title`} className="text-xl font-bold tracking-tight text-ink md:text-2xl">
        {title}
      </h2>
      <div className="mt-3">
        <DraftPill />
      </div>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

/** Bulleted points inside a legal section. */
export function LegalList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5 marker:text-neutral-400">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

/** Highlights placeholder copy that must be replaced before launch. */
export function TodoNote({ children }: { children: ReactNode }) {
  const t = useTranslations("footer.pages");
  return (
    <p className="rounded-xl border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
      {t("todo")} {children}
    </p>
  );
}

/** Shared "Last updated" date of the legal pages (YYYY-MM-DD) – bump it with every reviewed change. */
export const LEGAL_UPDATED = "2026-10-23";

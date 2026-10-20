import type { ReactNode } from "react";

interface ContentPageProps {
  title: string;
  intro?: string;
  children: ReactNode;
}

/** Simple reading layout for secondary pages (About, Legal, …). */
export function ContentPage({ title, intro, children }: ContentPageProps) {
  return (
    <article className="mx-auto max-w-2xl px-4 pt-8 md:px-6 md:pt-14">
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
      {intro && <p className="mt-3 text-lg leading-relaxed text-neutral-600">{intro}</p>}
      <div className="mt-8 space-y-4 leading-relaxed text-neutral-700">{children}</div>
    </article>
  );
}

/** Highlights placeholder copy that must be replaced before launch. */
export function TodoNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
      TODO: {children}
    </p>
  );
}

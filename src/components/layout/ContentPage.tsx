import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Container } from "./Container";

interface ContentPageProps {
  title: string;
  intro?: string;
  children: ReactNode;
}

/** Simple reading layout for secondary pages (About, Legal, …). */
export function ContentPage({ title, intro, children }: ContentPageProps) {
  return (
    <Container page width="text">
      <article>
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
      {intro && <p className="mt-3 text-lg leading-relaxed text-neutral-600">{intro}</p>}
      <div className="mt-8 space-y-4 leading-relaxed text-neutral-700">{children}</div>
      </article>
    </Container>
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

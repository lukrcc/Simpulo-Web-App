import type { ReactNode } from "react";
import { Container } from "./Container";

interface ContentPageProps {
  title: string;
  intro?: string;
  children: ReactNode;
}

/** Simple reading layout for secondary pages (Contact …). The legal pages have their own: components/legal/LegalPage.tsx. */
export function ContentPage({ title, intro, children }: ContentPageProps) {
  return (
    <Container page width="text">
      <article>
        <h1 className="text-h2 md:text-h1">{title}</h1>
        {intro && <p className="mt-3 text-body-lg leading-relaxed text-muted">{intro}</p>}
        <div className="mt-8 space-y-4 leading-relaxed text-ink">{children}</div>
      </article>
    </Container>
  );
}

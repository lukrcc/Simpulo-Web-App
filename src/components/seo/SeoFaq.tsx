import { JsonLd } from "./JsonLd";

/** A short FAQ on an SEO page: the questions as an accordion (thin lines), and the same as FAQPage structured data. */
export function SeoFaq({ id, title, items }: { id: string; title: string; items: readonly { q: string; a: string }[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby={id} className="mt-(--space-section) max-w-[720px]">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: items.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })) }} />
      <h2 id={id} className="text-h2 text-ink">
        {title}
      </h2>
      <ul className="mt-4 border-t border-ink/10">
        {items.map((item) => (
          <li key={item.q} className="border-b border-ink/10">
            <details className="group py-4">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-body-lg font-semibold text-ink">
                {item.q}
                <span aria-hidden className="text-muted transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-2 max-w-[640px] text-body text-muted">{item.a}</p>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}

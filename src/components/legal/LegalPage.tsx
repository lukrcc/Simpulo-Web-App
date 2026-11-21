// The one layout of every legal page (CLAUDE.md "Rechtsseiten"): /impressum · /privacy · /terms · /cancellation · /cookies · /safety ·
// /community-guidelines. The words come from content/legal/<slug>.<lang>.md (lib/legal), never from code. Reading width, the title with
// "Version · Last updated" under it, the draft note while no lawyer has reviewed the text, a table of contents for long texts (4+
// sections; beside the text from 1100px, above it below), and the EN/DE switch once a German file exists.
import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Container } from "@/components/layout/Container";
import { legalDoc, legalVersions, type LegalSlug } from "@/lib/legal/load";
import type { Block, Inline, LegalDoc } from "@/lib/legal/parse";
import { pageMetadata } from "@/lib/seo";
import { LegalVersions } from "./LegalVersions";

/** Metadata from the file's header (title, description). */
export function legalMetadata(slug: LegalSlug): Metadata {
  const { meta } = legalDoc(slug);
  return pageMetadata({ title: meta.title, description: meta.description, path: `/${slug}`, type: "article" });
}

/** A company field still to fill: a clearly marked gap, never a made-up value. */
async function Gap({ field }: { field: string }) {
  const t = await getTranslations("legal");
  return (
    <mark data-legal-gap={field} className="rounded-md border border-dashed border-accent/50 bg-(--warn-bg) px-1.5 py-0.5 font-medium text-(--warn-text)">
      [{t("gap", { field })}]
    </mark>
  );
}

function Parts({ parts }: { parts: Inline[] }) {
  return parts.map((p, i) => {
    if (p.kind === "bold") return <strong key={i} className="font-semibold text-ink">{p.text}</strong>;
    if (p.kind === "gap") return <Gap key={i} field={p.field} />;
    if (p.kind === "link")
      return p.href.startsWith("/") ? (
        <Link key={i} href={p.href} className="font-semibold text-ink underline underline-offset-4 hover:no-underline">
          {p.text}
        </Link>
      ) : (
        <a key={i} href={p.href} className="font-semibold text-ink underline underline-offset-4 hover:no-underline" rel="noopener noreferrer" target="_blank">
          {p.text}
        </a>
      );
    return <span key={i}>{p.text}</span>;
  });
}

/** The blocks; each heading starts a <section> (anchor = the heading's id). */
function Body({ blocks }: { blocks: Block[] }) {
  const lead: Block[] = [];
  const sections: { id: string; title: string; blocks: Block[] }[] = [];
  for (const b of blocks) {
    if (b.kind === "heading") sections.push({ id: b.id, title: b.text, blocks: [] });
    else (sections.at(-1)?.blocks ?? lead).push(b);
  }
  const render = (b: Block, i: number): ReactNode =>
    b.kind === "table" ? (
      // Phones: the table scrolls in its own box, the page never sideways.
      <div key={i} className="-mx-1 overflow-x-auto px-1">
        <table className="w-full min-w-[520px] border-collapse text-left text-body">
          <thead>
            <tr className="border-b border-ink/10 align-bottom">
              {b.head.map((cell, j) => (
                <th key={j} scope="col" className="py-2 pr-4 text-small font-semibold text-muted">
                  <Parts parts={cell} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {b.rows.map((row, r) => (
              <tr key={r} className="border-b border-ink/8 align-top">
                {row.map((cell, j) => (
                  <td key={j} className={j === 0 ? "py-3 pr-4 font-mono text-small text-ink" : "py-3 pr-4 text-ink"}>
                    <Parts parts={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : b.kind === "list" ? (
      <ul key={i} className="list-disc space-y-2 pl-5 marker:text-muted">
        {b.items.map((item, j) => (
          <li key={j}>
            <Parts parts={item} />
          </li>
        ))}
      </ul>
    ) : b.kind === "paragraph" ? (
      <p key={i}>
        <Parts parts={b.parts} />
      </p>
    ) : null;
  return (
    <div className="space-y-10 text-body leading-relaxed text-ink">
      {lead.length > 0 && <div className="space-y-3 text-body-lg text-muted">{lead.map(render)}</div>}
      {sections.map((s) => (
        <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="scroll-mt-[calc(var(--header-total)+24px)]">
          <h2 id={`${s.id}-title`} className="text-h2 text-ink">
            {s.title}
          </h2>
          <div className="mt-3 space-y-3">{s.blocks.map(render)}</div>
        </section>
      ))}
    </div>
  );
}

/** One language version: the head (title, version, date, draft note), the contents and the text. */
async function Version({ doc, lang }: { doc: LegalDoc; lang: string }) {
  const t = await getTranslations("legal");
  const format = await getFormatter();
  const headings = doc.blocks.filter((b): b is Extract<Block, { kind: "heading" }> => b.kind === "heading");
  const toc = headings.length >= 4;
  return (
    <div lang={lang} data-legal-draft={doc.meta.draft || undefined} className={toc ? "split:grid split:grid-cols-[minmax(0,680px)_minmax(180px,240px)] split:gap-16" : undefined}>
      <article className="max-w-[680px]">
        <h1 className="text-h1 text-ink">{doc.meta.title}</h1>
        <p className="mt-3 text-small text-muted" data-legal-meta>
          {t("version", { version: doc.meta.version })} · {t("lastUpdated", { date: format.dateTime(new Date(`${doc.meta.updated}T12:00:00Z`), { dateStyle: "long", timeZone: "UTC" }) })}
        </p>
        {doc.meta.draft && (
          <p role="note" data-legal-draft-note className="mt-4 rounded-xl border border-dashed border-accent/50 bg-(--warn-bg) px-4 py-3 text-body text-(--warn-text)">
            <strong className="font-semibold">{t("draft")}</strong> · {t("draftText")}
          </p>
        )}
        {toc && (
          <nav aria-label={t("contents")} className="mt-8 split:hidden">
            <TocList headings={headings} title={t("contents")} />
          </nav>
        )}
        <div className="mt-10">
          <Body blocks={doc.blocks} />
        </div>
      </article>
      {toc && (
        <nav aria-label={t("contents")} className="hidden split:block">
          <div className="sticky top-[calc(var(--header-total)+32px)]">
            <TocList headings={headings} title={t("contents")} />
          </div>
        </nav>
      )}
    </div>
  );
}

function TocList({ headings, title }: { headings: { id: string; text: string }[]; title: string }) {
  return (
    <>
      <p className="text-eyebrow uppercase text-muted">{title}</p>
      <ol className="mt-3 flex flex-col">
        {headings.map((h) => (
          <li key={h.id}>
            <a href={`#${h.id}`} className="flex min-h-9 items-center text-body text-muted hover:text-ink">
              {h.text}
            </a>
          </li>
        ))}
      </ol>
    </>
  );
}

export async function LegalPage({ slug }: { slug: LegalSlug }) {
  const t = await getTranslations("legal");
  const versions = legalVersions(slug);
  return (
    <Container page>
      <div data-legal-page={slug} className="pb-8">
        <LegalVersions
          label={t("language")}
          versions={versions.map((v) => ({ lang: v.lang, label: t(`langs.${v.lang}`), node: <Version doc={v.doc} lang={v.lang} /> }))}
        />
      </div>
    </Container>
  );
}

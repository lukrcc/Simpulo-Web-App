"use client";

// Admin › Vision › Der Hof: the zoom ?block=hof – the drawing of the five sizes, then the parts a–k as cards (a click opens one:
// ?block=hof.<id>) – and one part in depth: its points as capsules, groups, a compact table (the rules with their status like the
// hypotheses: a dot and "offen"), the cycle, the sentence, what is set apart, a note, and where the topic continues (references, no copies).
// Blocks instead of paragraphs (CLAUDE.md "Lesbarkeit im Admin"). Every text from config/vision-hof.ts.
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HOF, type HofPart } from "@/config/vision-hof";
import { cn } from "@/lib/utils";
import { StatusDot } from "../AdminCharts";
import { PatternScales } from "./PatternScales";
import { HofBranches, HofTogether } from "./VisionDiagrams";
import { goVision } from "@/lib/admin/visionNav";

type Part = (typeof HOF.parts)[number];

/** A part's one-line hint on its card: its sentence, else what is set apart, its first points, its cycle, its groups, its table. */
function hintOf(part: HofPart): string {
  if (part.sentence) return part.sentence;
  if (part.highlight) return part.highlight;
  if (part.points) return part.points.slice(0, 3).join(" · ");
  if (part.cycle) return [...part.cycle.steps, part.cycle.back].join(" → ");
  if (part.groups) return part.groups.map((g) => g.title).join(" · ");
  if (part.table) return `${part.table.rows.length} × ${part.table.head[0]}`;
  return "";
}

export function HofParts({ onOpen }: { onOpen: (id: Part["id"]) => void }) {
  return (
    <>
      {/* On top: where everything comes together, and the six branches of Der Hof. */}
      <HofTogether />
      <HofBranches onOpenPart={(part) => onOpen(part as Part["id"])} />
      <PatternScales />
      <h2 className="mb-3 mt-(--adm-section) text-small font-semibold text-(--adm-label)">{HOF.text.parts}</h2>
      <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3" data-hof-parts>
        {HOF.parts.map((part) => (
          <li key={part.id}>
            <button
              type="button"
              onClick={() => onOpen(part.id)}
              data-hof-part={part.id}
              className="flex h-full w-full items-start gap-3 rounded-xl border border-ink/8 bg-(--adm-block) px-4 py-3 text-left transition-colors duration-150 hover:bg-(--adm-block-hover)"
            >
              <span className="mt-0.5 w-4 shrink-0 text-small text-ink/50">{part.letter}</span>
              <span className="min-w-0 flex-1 leading-normal">
                <span className="block text-adm-block text-ink">{part.title}</span>
                <span className="mt-0.5 line-clamp-2 block text-small text-ink/60">{hintOf(part)}</span>
              </span>
              <ArrowRight aria-hidden className="mt-1 size-4 shrink-0 text-ink/40" />
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function Capsules({ points }: { points: readonly string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {points.map((p) => (
        <li key={p} className="inline-flex min-h-8 items-center rounded-full bg-ink/6 px-3 py-1 text-small leading-normal text-ink">
          {p}
        </li>
      ))}
    </ul>
  );
}

export function HofPartView({ part }: { part: HofPart }) {
  return (
    <article data-hof-detail className="flex max-w-5xl flex-col gap-(--adm-section)">
      {part.id === "muster" && <PatternScales />}
      {part.highlight && <p className="max-w-3xl rounded-xl border border-ink/20 bg-(--adm-block) px-4 py-3 text-adm-block leading-normal text-ink">{part.highlight}</p>}
      {part.points && <Capsules points={part.points} />}
      {part.groups && (
        <div className="grid gap-x-8 gap-y-(--adm-inner) md:grid-cols-2 xl:grid-cols-3">
          {part.groups.map((g) => (
            <section key={g.title} className="min-w-0">
              <h3 className="mb-2 text-small font-semibold text-(--adm-label)">{g.title}</h3>
              <Capsules points={g.points} />
            </section>
          ))}
        </div>
      )}
      {part.cycle && (
        <ol className="flex flex-wrap items-center gap-2" aria-label={part.cycle.steps.join(" → ")}>
          {part.cycle.steps.map((step, i) => (
            <li key={step} className="flex items-center gap-2">
              <span className="inline-flex h-8 items-center rounded-full border border-ink/20 px-3 text-small text-ink">{step}</span>
              <ArrowRight aria-hidden className="size-4 text-ink/40" />
              {i === part.cycle!.steps.length - 1 && <span className="inline-flex h-8 items-center rounded-full border border-dashed border-ink/25 px-3 text-small text-ink/70">{part.cycle!.back}</span>}
            </li>
          ))}
        </ol>
      )}
      {part.table && (
        // Compact; on narrow screens it scrolls inside its own box.
        <div className="max-w-full overflow-x-auto overscroll-x-contain">
          <table className="w-full min-w-[520px] text-left text-small">
            <thead className="text-(--adm-label)">
              <tr className="border-b border-ink/8">
                {part.table.head.map((h) => (
                  <th key={h} className="px-3 pl-0 font-medium">
                    {h}
                  </th>
                ))}
                {part.table.status && <th className="px-3 pr-0 font-medium">{HOF.text.status}</th>}
              </tr>
            </thead>
            <tbody>
              {part.table.rows.map((row) => (
                <tr key={row[0]} className="border-b border-ink/8">
                  {row.map((cell, i) => (
                    <td key={i} className={cn("px-3 pl-0 leading-normal", i === 0 ? "font-semibold text-ink" : "text-ink/80")}>
                      {cell}
                    </td>
                  ))}
                  {part.table!.status && (
                    // Like the hypotheses in Algorithmus: an open one – the amber dot and its word.
                    <td className="px-3 pr-0">
                      <span className="inline-flex items-center gap-2 text-ink">
                        <StatusDot status="warning" />
                        {part.table!.status}
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {part.sentence && <p className="max-w-3xl text-adm-block leading-normal text-ink">{part.sentence}</p>}
      {part.note && <p className="text-small text-ink/60">{part.note}</p>}
      {part.links && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-ink/60">
          {HOF.text.continues}
          {part.links.map((l) =>
            l.href ? (
              <Link
                key={l.label}
                href={l.href}
                // A Vision block (?block=…) stays inside Vision's own navigation.
                onClick={l.href.startsWith("?") ? (e) => (e.preventDefault(), goVision(l.href!)) : undefined}
                className="inline-flex items-center gap-1 font-semibold text-ink hover:underline"
              >
                {l.label}
                <ArrowRight aria-hidden className="size-3.5" />
              </Link>
            ) : (
              <span key={l.label} className="text-ink/60">
                {HOF.text.lab}
              </span>
            ),
          )}
        </p>
      )}
    </article>
  );
}

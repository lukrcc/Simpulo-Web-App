// The legal texts (content/legal/*.md, CLAUDE.md "Rechtsseiten"). Called by next.config.ts on every production build, and on its own:
// `npx tsx scripts/check-legal.ts`.
//  - Every legal page has its English file with a complete header – otherwise the build stops.
//  - A draft (draft: true, not yet reviewed by a lawyer) must not go live: a production build with the preview gate off (= the launch,
//    config/preview.ts) stops while any page is still a draft. Before the launch the drafts are only listed (and shown in Admin's launch
//    checklist).
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { ADDRESS_FIELDS, COMPANY, hasBusinessAddress } from "../src/config/company";
import { CONSENT_DOCS } from "../src/config/consent";
import { PREVIEW_GATE } from "../src/config/preview";
import { STORAGE } from "../src/config/storage";
import { LEGAL_LANGS, LEGAL_PAGES } from "../src/lib/legal/pages";
import { parseMeta } from "../src/lib/legal/parse";

export interface LegalStatus {
  slug: string;
  lang: string;
  version: string;
  updated: string;
  draft: boolean;
}

/** Every legal file's header, and the problems (missing file, broken header). */
export function legalStatus(root = process.cwd()): { files: LegalStatus[]; problems: string[] } {
  const files: LegalStatus[] = [];
  const problems: string[] = [];
  for (const slug of LEGAL_PAGES) {
    for (const lang of LEGAL_LANGS) {
      const rel = `content/legal/${slug}.${lang}.md`;
      const file = path.join(root, rel);
      if (!existsSync(file)) {
        if (lang === "en") problems.push(`${rel} fehlt.`);
        continue;
      }
      try {
        const { meta } = parseMeta(readFileSync(file, "utf8"), rel);
        files.push({ slug, lang, version: meta.version, updated: meta.updated, draft: meta.draft });
      } catch (e) {
        problems.push((e as Error).message);
      }
    }
  }
  // What people agree to (config/consent.ts) must be the version that's on the page – otherwise the agreement records a wrong version.
  for (const [kind, doc] of Object.entries(CONSENT_DOCS)) {
    const file = files.find((f) => f.slug === doc.file && f.lang === "en");
    if (file && file.version !== doc.version) problems.push(`config/consent.ts ${kind}: Version ${doc.version}, aber content/legal/${doc.file}.en.md hat ${file.version} – beide gleich setzen.`);
  }
  // Everything stored for real users (config/storage.ts, scope product) is on the cookies page – and nothing there is unlisted.
  const cookiesFile = path.join(root, "content/legal/cookies.en.md");
  if (existsSync(cookiesFile)) {
    const text = readFileSync(cookiesFile, "utf8");
    const listed = new Set([...text.matchAll(/^\|\s*([^|\s]+)\s*\|/gm)].map((m) => m[1]).filter((n) => n !== "Name" && !/^-+$/.test(n)));
    const product = STORAGE.filter((e) => e.scope === "product");
    for (const e of product) if (!listed.has(e.name)) problems.push(`Speicher ${e.name} (config/storage.ts) fehlt in der Tabelle von content/legal/cookies.en.md.`);
    for (const name of listed) if (!product.some((e) => e.name === name)) problems.push(`content/legal/cookies.en.md nennt ${name}, config/storage.ts nicht (scope product).`);
    for (const e of STORAGE) if (!e.necessary) problems.push(`Nicht notwendige Speicherung ${e.name}: nur nach Entscheidung von Lukas – dann ist ein Consent-Banner Pflicht.`);
  }
  return { files, problems };
}

/** Live = a production build of the real app with the preview gate off. */
function goingLive(): boolean {
  const mode = process.env.NEXT_PUBLIC_APP_MODE ?? "production";
  return mode === "production" && !PREVIEW_GATE;
}

/** For next.config.ts: throws (the build stops) on a broken file, and on any draft when the build goes live. */
export function assertLegal(root = process.cwd()) {
  const { files, problems } = legalStatus(root);
  const drafts = files.filter((f) => f.draft);
  if (goingLive() && drafts.length) problems.push(`Entwurf darf nicht live gehen (Anwalt prüfen, dann draft: false): ${drafts.map((d) => `${d.slug}.${d.lang}.md`).join(", ")}`);
  // The imprint needs a real business address before the public site goes live (config/company.ts).
  if (goingLive() && !hasBusinessAddress()) problems.push(`Impressum ohne Geschäftsadresse darf nicht live gehen: ${ADDRESS_FIELDS.filter((k) => !COMPANY[k]).map((k) => `company.${k}`).join(", ")} in src/config/company.ts eintragen`);
  if (problems.length) throw new Error(`Rechtstexte:\n  ${problems.join("\n  ")}`);
  if (drafts.length) console.warn(`Rechtstexte: ${drafts.length} Entwürfe (vor dem Launch prüfen lassen) – ${drafts.map((d) => d.slug).join(", ")}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const { files, problems } = legalStatus();
  for (const f of files) console.log(`${f.slug}.${f.lang}.md  v${f.version}  ${f.updated}${f.draft ? "  ENTWURF" : ""}`);
  if (problems.length) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
}

// Reads the legal texts from content/legal (server, at build time – the pages are prerendered). One file per page and language.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseLegal, type LegalDoc } from "./parse";
import { LEGAL_LANGS, type LegalLang, type LegalSlug } from "./pages";
import { LEGAL_VALUES } from "./values";

export { LEGAL_PAGES, type LegalSlug } from "./pages";

const DIR = path.join(process.cwd(), "content", "legal");

/** Every language version of a page that exists, English first. */
export function legalVersions(slug: LegalSlug): { lang: LegalLang; doc: LegalDoc }[] {
  return LEGAL_LANGS.flatMap((lang) => {
    const file = path.join(DIR, `${slug}.${lang}.md`);
    if (!existsSync(file)) return [];
    return [{ lang, doc: parseLegal(readFileSync(file, "utf8"), LEGAL_VALUES, `content/legal/${slug}.${lang}.md`) }];
  });
}

/** The English version (metadata, title). */
export function legalDoc(slug: LegalSlug): LegalDoc {
  const en = legalVersions(slug).find((v) => v.lang === "en");
  if (!en) throw new Error(`content/legal/${slug}.en.md fehlt`);
  return en.doc;
}

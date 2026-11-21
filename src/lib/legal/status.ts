// The legal texts' state for Admin's launch checklist (read on the server, passed to the client): which page is still a draft, and which
// company fields (config/company.ts) are still empty. The build check (scripts/check-legal.ts) stops a live build on a draft.
import { companyGaps, type Company } from "@/config/company";
import { legalVersions, LEGAL_PAGES, type LegalSlug } from "./load";

export interface LegalChecklist {
  pages: { slug: LegalSlug; lang: string; title: string; version: string; updated: string; draft: boolean }[];
  companyGaps: (keyof Company)[];
}

export function legalChecklist(): LegalChecklist {
  return {
    pages: LEGAL_PAGES.flatMap((slug) => legalVersions(slug).map(({ lang, doc }) => ({ slug, lang, title: doc.meta.title, version: doc.meta.version, updated: doc.meta.updated, draft: doc.meta.draft }))),
    companyGaps: companyGaps(),
  };
}

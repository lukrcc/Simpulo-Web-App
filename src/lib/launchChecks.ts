// Admin › System › Launch – what only the server can see (read in app/admin/platform/page.tsx, passed to the client): the legal texts'
// state, the preview gate, whether a Stripe key is set (never its value), whether DEMO_ALWAYS_ON still stands anywhere in the source, and
// the width test's last report (test-results/breiten/bericht.md). Nothing secret leaves the server – only yes/no and counts. Server only
// (node:fs) – imported by the admin page, never by a client component.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { PREVIEW_GATE } from "@/config/preview";
import { APP_MODE } from "@/lib/appMode";
import { legalChecklist } from "@/lib/legal/status";
import { PAYMENTS_PROVIDER } from "@/lib/payments";

export interface LaunchFacts {
  appMode: string;
  previewGate: boolean;
  /** true: the constant still stands somewhere in src · false: not found · null: the source isn't there to look (a deployed build) */
  demoAlwaysOn: boolean | null;
  stripe: { provider: string; keySet: boolean };
  legal: { drafts: string[]; companyGaps: string[] };
  /** The width test's last report: its time and the errors in it – null when it never ran here */
  widthTest: { at: string | null; errors: number } | null;
}

/** Whether a constant is still defined or assigned in the source (`const X`, `X =`, `X:`) – words in texts (i18n) don't count. */
function sourceDefines(dir: string, name: string): boolean | null {
  if (!existsSync(dir)) return null;
  const pattern = new RegExp(`(?:const|let|var)\\s+${name}\\b|\\b${name}\\s*[:=](?!=)`);
  const walk = (d: string): boolean =>
    readdirSync(d).some((f) => {
      const p = join(d, f);
      if (statSync(p).isDirectory()) return !p.endsWith(join("lib", "i18n")) && walk(p);
      // This file names it on purpose (it looks for it) – skip itself.
      return /\.(ts|tsx|mjs)$/.test(p) && !p.endsWith("launchChecks.ts") && pattern.test(readFileSync(p, "utf8"));
    });
  return walk(dir);
}

function widthTest(): LaunchFacts["widthTest"] {
  const file = join(process.cwd(), "test-results", "breiten", "bericht.md");
  if (!existsSync(file)) return null;
  const text = readFileSync(file, "utf8");
  // The summary table: "| Seite | Fehler | …" – the second column per row.
  const errors = [...text.matchAll(/^\| [^|]+ \| (\d+) \|/gm)].reduce((n, m) => n + Number(m[1]), 0);
  const at = /Server: .*? · (\d{4}-\d{2}-\d{2} \d{2}:\d{2})/.exec(text)?.[1] ?? null;
  return { at, errors };
}

export function launchFacts(): LaunchFacts {
  const legal = legalChecklist();
  return {
    appMode: APP_MODE,
    previewGate: PREVIEW_GATE,
    demoAlwaysOn: sourceDefines(join(process.cwd(), "src"), "DEMO_ALWAYS_ON"),
    stripe: { provider: PAYMENTS_PROVIDER, keySet: Boolean(process.env.STRIPE_SECRET_KEY) },
    legal: { drafts: [...new Set(legal.pages.filter((p) => p.draft).map((p) => p.slug))], companyGaps: legal.companyGaps.map(String) },
    widthTest: widthTest(),
  };
}

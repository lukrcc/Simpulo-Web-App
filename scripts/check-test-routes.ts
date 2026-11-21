// The width test's route list against the pages that exist (Regel: jede neue oder geänderte Seite in config/test-routes.ts eintragen).
// Called by next.config.ts on every production build (`next build`), and on its own: `npx tsx scripts/check-test-routes.ts`.
// A page in src/app that the list doesn't name fails the build: "Neue Seite /xyz nicht im Breiten-Test". So does an entry whose page is
// gone, and a dynamic route that the test would open without an example.
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { TEST_ROUTES } from "../src/config/test-routes";
import { footerHrefs, hiddenFooterLinks } from "../src/config/footer";

const PAGE_FILES = new Set(["page.tsx", "page.ts", "page.jsx", "page.js", "page.mdx"]);

/** Every page route under src/app: route groups "(x)" and parallel slots "@x" don't count, private folders "_x" hold no routes. */
export function appRoutes(appDir: string): string[] {
  const routes: string[] = [];
  const walk = (dir: string, segments: string[]) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) {
        if (name.startsWith("_") || name.startsWith("@") || name === "api") continue;
        walk(full, name.startsWith("(") && name.endsWith(")") ? segments : [...segments, name]);
      } else if (PAGE_FILES.has(name)) {
        routes.push(`/${segments.join("/")}`);
      }
    }
  };
  walk(appDir, []);
  return [...new Set(routes)].sort();
}

/** The problems, one sentence each (German, for the build log); empty when the list is complete. */
export function testRouteProblems(appDir: string): string[] {
  const existing = new Set(appRoutes(appDir));
  const listed = new Set(TEST_ROUTES.map((r) => r.route));
  const problems: string[] = [];
  for (const route of existing) if (!listed.has(route)) problems.push(`Neue Seite ${route} nicht im Breiten-Test – in src/config/test-routes.ts eintragen.`);
  for (const route of listed) if (!existing.has(route)) problems.push(`Seite ${route} gibt es nicht mehr – aus src/config/test-routes.ts entfernen.`);
  for (const r of TEST_ROUTES) {
    if (!r.skip && r.route.includes("[") && !r.example) problems.push(`Dynamische Seite ${r.route} braucht ein Demo-Beispiel (example) in src/config/test-routes.ts.`);
  }
  // The footers link only to pages that exist (config/footer.ts): a dynamic segment ([city], [slug]) matches any value.
  const patterns = [...existing].map((route) => new RegExp(`^${route.replace(/\[[^\]]+\]/g, "[^/]+")}$`));
  for (const href of footerHrefs()) {
    const pathOnly = href.split(/[?#]/)[0] || "/";
    if (!patterns.some((re) => re.test(pathOnly))) problems.push(`Footer-Link ${href} führt auf keine Seite – in src/config/footer.ts mit hidden ausblenden oder die Seite bauen.`);
  }
  const keys = TEST_ROUTES.map((r) => r.key);
  for (const key of new Set(keys.filter((k, i) => keys.indexOf(k) !== i))) problems.push(`Schlüssel „${key}“ steht doppelt in src/config/test-routes.ts.`);
  return problems;
}

/** For next.config.ts: throws (the build stops) with every problem listed. */
export function assertTestRoutes(root = process.cwd()) {
  const problems = testRouteProblems(path.join(root, "src", "app"));
  if (problems.length) throw new Error(`Breiten-Test unvollständig:\n  ${problems.join("\n  ")}`);
}

// Run on its own: print and exit 1 on problems.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const problems = testRouteProblems(path.join(process.cwd(), "src", "app"));
  if (problems.length) {
    console.error(`Breiten-Test unvollständig:\n  ${problems.join("\n  ")}`);
    process.exit(1);
  }
  console.log(`Breiten-Test: alle ${appRoutes(path.join(process.cwd(), "src", "app")).length} Seiten eingetragen.`);
  const hidden = hiddenFooterLinks();
  console.log(hidden.length ? `Footer: ausgeblendet – ${hidden.map((l) => `${l.key} (${l.hidden})`).join(", ")}` : `Footer: alle ${footerHrefs().length} Links führen auf bestehende Seiten, keiner ausgeblendet.`);
}

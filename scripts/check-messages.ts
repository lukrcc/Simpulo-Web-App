// Every text key the code asks for exists (CLAUDE.md "Texte und Sprachen": check:messages muss grün sein). `npm run check:messages`, and
// after every compile-only build (`npm run build:check`). Missing keys are what next-intl reports at runtime as MISSING_MESSAGE.
//  - Finds every translator: `const t = useTranslations("ns")` / `getTranslations("ns" | { namespace: "ns" })` (the namespace may be a
//    template – its `${…}` parts match any key), and the full-key helper `tEn("ns.key")`.
//  - Finds every call on it: t("key"), t.rich / t.markup / t.raw("key"), and template keys t(`a.${x}.b`) – a `${…}` matches any segment
//    (or part of one), so a template is fine when at least one key fits it. Keys only asked through t.has("…") are optional.
//  - Checks them against the one source of words: admin keys (admin.*) against lib/i18n/admin.de.ts (German, the admin), everything else
//    against lib/i18n/en.ts (English, the product).
// Static keys are type-checked too (src/global.d.ts); this catches what the types can't – template keys and casts (`as "…"`).
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import en from "../src/lib/i18n/en";
import { ADMIN_DE } from "../src/lib/i18n/admin.de";

type Tree = { [key: string]: unknown };
const SOURCES: { label: string; prefix: string; tree: Tree }[] = [
  { label: "de (admin.de.ts)", prefix: "admin", tree: { admin: ADMIN_DE } },
  { label: "en (en.ts)", prefix: "", tree: en as unknown as Tree },
];
const sourceOf = (key: string) => (key === "admin" || key.startsWith("admin.") ? SOURCES[0] : SOURCES[1]);

/** A key pattern's segments as regexes (`${…}` → any text within the segment). */
function segmentsOf(pattern: string): RegExp[] {
  // Each `${…}` (its expression may hold dots and braces) becomes one wildcard mark before the key is split at its dots.
  let flat = "";
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === "$" && pattern[i + 1] === "{") {
      let depth = 1;
      i += 2;
      while (i < pattern.length && depth > 0) {
        if (pattern[i] === "{") depth++;
        else if (pattern[i] === "}") depth--;
        i++;
      }
      i--;
      flat += "\u0000";
    } else flat += pattern[i];
  }
  return flat.split(".").map((seg) => new RegExp(`^${seg.split("\u0000").map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*")}$`));
}
/** Whether some leaf (a string) or – for a namespace – some subtree matches the pattern. */
function exists(tree: Tree, pattern: string, leaf: boolean): boolean {
  const segs = segmentsOf(pattern);
  const walk = (node: unknown, i: number): boolean => {
    if (i === segs.length) return leaf ? typeof node === "string" : typeof node === "object" && node !== null;
    if (typeof node !== "object" || node === null) return false;
    return Object.entries(node as Tree).some(([k, v]) => segs[i].test(k) && walk(v, i + 1));
  };
  return walk(tree, 0);
}

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) return name === "node_modules" ? [] : files(p);
    return /\.(tsx?|mts)$/.test(name) && !name.endsWith(".d.ts") ? [p] : [];
  });
}

/** A string or template literal at the start of `s` (the quote included) → its text, or null. */
function literal(s: string): string | null {
  const m = /^(["'`])((?:\\.|(?!\1)[^\\])*)\1/.exec(s);
  return m ? m[2] : null;
}

export interface Missing {
  file: string;
  line: number;
  key: string;
  source: string;
}

export function missingMessages(root = process.cwd()): { missing: Missing[]; checked: number } {
  const missing: Missing[] = [];
  let checked = 0;
  for (const file of files(path.join(root, "src"))) {
    if (file.includes(`${path.sep}lib${path.sep}i18n${path.sep}`) && /(en|admin\.de)\.ts$/.test(file)) continue;
    const text = readFileSync(file, "utf8");
    if (!/useTranslations|getTranslations|tEn\(/.test(text)) continue;
    const lineOf = (index: number) => text.slice(0, index).split("\n").length;
    // Translators in the order they're declared; a call belongs to the latest declaration of its name before it.
    const decls: { name: string; ns: string; at: number }[] = [];
    const declRe = /(?:const|let)\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*([^)]*)\)/g;
    for (let m; (m = declRe.exec(text)); ) {
      const arg = m[2].trim();
      let ns: string | null = "";
      if (arg) {
        const direct = literal(arg);
        const inObject = /namespace\s*:\s*(["'`][^"'`]*["'`])/.exec(arg);
        ns = direct ?? (inObject ? literal(inObject[1]) : null);
      }
      if (ns === null) continue; // a namespace from a variable – can't be checked
      decls.push({ name: m[1], ns, at: m.index });
      checked++;
      if (ns && !exists(sourceOf(ns).tree, ns, false)) missing.push({ file, line: lineOf(m.index), key: `${ns} (Namespace)`, source: sourceOf(ns).label });
    }
    // A translator handed in as a parameter: `t: ReturnType<typeof useTranslations<"ns">>`.
    for (let m, re = /(\w+)\s*:\s*ReturnType<typeof\s+(?:useTranslations|getTranslations)<\s*(["'`][^"'`]*["'`])\s*>>/g; (m = re.exec(text)); ) {
      const ns = literal(m[2]);
      if (ns !== null) decls.push({ name: m[1], ns, at: m.index });
    }
    decls.sort((a, b) => a.at - b.at);
    const check = (key: string, at: number, leaf = true) => {
      // A line that marks its key as optional (a config decides whether the words exist): `// check-messages: optional`.
      const lineText = text.slice(text.lastIndexOf("\n", at) + 1, text.indexOf("\n", at) === -1 ? undefined : text.indexOf("\n", at));
      const before = text.slice(text.lastIndexOf("\n", text.lastIndexOf("\n", at) - 1) + 1, at);
      if (/check-messages: optional/.test(lineText) || /check-messages: optional/.test(before)) return;
      checked++;
      const src = sourceOf(key);
      if (!exists(src.tree, key, leaf)) missing.push({ file, line: lineOf(at), key, source: src.label });
    };
    for (const { name } of decls.filter((d, i, all) => all.findIndex((x) => x.name === d.name) === i)) {
      const callRe = new RegExp(`(?<![\\w.])${name}(\\.(?:rich|markup|raw|has))?\\(\\s*(["'\`])`, "g");
      for (let m; (m = callRe.exec(text)); ) {
        if (m[1] === ".has") continue; // asking whether it exists – optional by design
        const key = literal(text.slice(m.index + m[0].length - 1));
        if (key === null) continue;
        const decl = decls.filter((d) => d.name === name && d.at < m!.index).at(-1);
        if (!decl) continue;
        // t.raw may return a list or an object (example lists, CSV heads) – any node counts.
        check(decl.ns ? `${decl.ns}.${key}` : key, m.index, m[1] !== ".raw");
      }
    }
    // The full-key helper outside React.
    for (let m, re = /(?<![\w.])tEn\(\s*(["'`])/g; (m = re.exec(text)); ) {
      const key = literal(text.slice(m.index + m[0].length - 1));
      if (key !== null) check(key, m.index);
    }
  }
  return { missing, checked };
}

if (process.argv[1]?.endsWith("check-messages.ts")) {
  const { missing, checked } = missingMessages();
  if (missing.length) {
    console.error(`✗ check:messages – ${missing.length} fehlende Texte (von ${checked} geprüften Schlüsseln):`);
    for (const m of missing) console.error(`  ${m.source}: ${m.key}  ←  ${path.relative(process.cwd(), m.file)}:${m.line}`);
    process.exit(1);
  }
  console.log(`✓ check:messages – alle ${checked} Schlüssel vorhanden (Admin de, Produkt en).`);
}

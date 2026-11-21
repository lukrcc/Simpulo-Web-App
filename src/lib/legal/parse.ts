// The legal texts' small markdown (content/legal/*.md, README there): a header between "---" lines, then "## Heading {#anchor}",
// paragraphs, "- " lists, **bold**, [link](/path) and {{values}} from the config. No dependency, no HTML from the file – the page renders
// the blocks below as React (components/legal/LegalPage.tsx). Pure: no fs here (the build check reads the header with it too).

export interface LegalMeta {
  title: string;
  description: string;
  version: string;
  /** YYYY-MM-DD */
  updated: string;
  /** Not yet reviewed by a lawyer */
  draft: boolean;
}

/** One piece of a line: text, bold text, a link, or a value from the config ("gap": a company field still to fill). */
export type Inline = { kind: "text"; text: string } | { kind: "bold"; text: string } | { kind: "link"; text: string; href: string } | { kind: "gap"; field: string };

export type Block =
  | { kind: "heading"; id: string; text: string }
  | { kind: "paragraph"; parts: Inline[] }
  | { kind: "list"; items: Inline[][] }
  /** "| a | b |" lines: the first is the head, the "|---|" line under it is skipped */
  | { kind: "table"; head: Inline[][]; rows: Inline[][][] };

export interface LegalDoc {
  meta: LegalMeta;
  blocks: Block[];
}

/** Values for {{key}}: a number or text, or null for a company field that is still empty (then a marked gap). */
export type LegalValues = Record<string, string | number | null>;

/** The header: "key: value" lines between the two "---". Throws when a field is missing – the build stops on it. */
export function parseMeta(source: string, file = "legal text"): { meta: LegalMeta; body: string } {
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(source.replace(/\r\n/g, "\n"));
  if (!match) throw new Error(`${file}: Kopf (---) fehlt`);
  const fields: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const at = line.indexOf(":");
    if (at > 0) fields[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  for (const key of ["title", "description", "version", "updated", "draft"]) if (!(key in fields)) throw new Error(`${file}: „${key}“ fehlt im Kopf`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fields.updated)) throw new Error(`${file}: „updated“ muss YYYY-MM-DD sein`);
  const meta: LegalMeta = { title: fields.title, description: fields.description, version: fields.version, updated: fields.updated, draft: fields.draft === "true" };
  return { meta, body: source.replace(/\r\n/g, "\n").slice(match[0].length) };
}

/** Fill {{key}} with its value; a null value becomes a marker the inline parser turns into a gap. Unknown keys are an error. */
function fill(text: string, values: LegalValues, file: string): string {
  return text.replace(/\{\{(\??)([\w.]+)\}\}/g, (_, optional: string, key: string) => {
    if (optional) return "";
    if (!(key in values)) throw new Error(`${file}: unbekannter Wert {{${key}}}`);
    const value = values[key];
    return value === null ? `\u0000${key}\u0000` : String(value);
  });
}

/** **bold**, [text](href) and gaps in one line. */
function inline(text: string): Inline[] {
  const parts: Inline[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)|\u0000([\w.]+)\u0000/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) parts.push({ kind: "text", text: text.slice(last, m.index) });
    if (m[1] !== undefined) parts.push({ kind: "bold", text: m[1] });
    else if (m[2] !== undefined) parts.push({ kind: "link", text: m[2], href: m[3] });
    else parts.push({ kind: "gap", field: m[4] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ kind: "text", text: text.slice(last) });
  return parts;
}

/** A line with {{?key}} is left out while that value is empty (optional company fields). */
function keepLine(line: string, values: LegalValues): boolean {
  const optional = [...line.matchAll(/\{\{\?([\w.]+)\}\}/g)].map((m) => m[1]);
  return optional.every((key) => values[key] !== null && values[key] !== undefined);
}

export function parseLegal(source: string, values: LegalValues, file = "legal text"): LegalDoc {
  const { meta, body } = parseMeta(source, file);
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  let table: string[] = [];
  const cells = (row: string) => row.trim().replace(/^\||\|$/g, "").split("|").map((c) => inline(fill(c, values, file).trim()));
  const flush = () => {
    if (paragraph.length) blocks.push({ kind: "paragraph", parts: inline(fill(paragraph.join(" "), values, file).trim()) });
    if (list.length) blocks.push({ kind: "list", items: list.map((item) => inline(fill(item, values, file).trim())) });
    if (table.length) {
      const [head, ...rest] = table;
      blocks.push({ kind: "table", head: cells(head), rows: rest.filter((r) => !/^\|?\s*:?-{3,}/.test(r.trim())).map(cells) });
    }
    paragraph = [];
    list = [];
    table = [];
  };
  for (const raw of body.split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flush();
      continue;
    }
    if (!keepLine(line, values)) continue;
    const heading = /^##\s+(.+?)\s*\{#([\w-]+)\}$/.exec(line);
    if (heading) {
      flush();
      blocks.push({ kind: "heading", id: heading[2], text: heading[1] });
    } else if (line.startsWith("## ")) {
      throw new Error(`${file}: Überschrift ohne Anker {#…}: ${line}`);
    } else if (line.trimStart().startsWith("|")) {
      if (paragraph.length || list.length) flush();
      table.push(line);
    } else if (line.startsWith("- ")) {
      if (paragraph.length || table.length) flush();
      list.push(line.slice(2));
    } else {
      if (list.length || table.length) flush();
      paragraph.push(line.trim());
    }
  }
  flush();
  const kept = blocks.filter((b) => b.kind !== "paragraph" || b.parts.length > 0);
  // A heading left without content (all its lines optional and empty) goes too.
  return { meta, blocks: kept.filter((b, i) => b.kind !== "heading" || (kept[i + 1] !== undefined && kept[i + 1].kind !== "heading")) };
}

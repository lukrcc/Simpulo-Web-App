// The notification catalogue against the code (CLAUDE.md "Benachrichtigungen"): for each event in config/notifications.ts, where it is
// triggered – one of its in-app lines (messages.notify.<key>) written somewhere, or notify()/notifyByEmail() called with its id, or an arc
// step that maps to it. Prints the events without a trigger, and every entry whose `trigger` says otherwise than the code.
//   npx tsx scripts/check-notifications.ts
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { ARC_STEP_EVENT, CATALOG_IDS, EVENT_OF, NOTIFY_CATALOG, type CatalogId } from "../src/config/notifications";

const SKIP = ["src/config/activity.ts", "src/config/notifications.ts", "src/lib/data/notifications.ts", "src/lib/i18n/", "src/app/dev/emails/", "src/lib/mock", "src/i18n/", "src/lib/notify/"];
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(p) ? [p] : [];
  });
}
const sources = files("src").filter((f) => !SKIP.some((s) => f.startsWith(s))).map((f) => ({ f, text: readFileSync(f, "utf8") }));

/** The function or reducer case a line sits in ("requestToJoin", "settlePayments"). */
function enclosing(lines: string[], i: number): string | null {
  for (let j = i; j >= 0; j--) {
    const m = /^\s*case "(\w+)":/.exec(lines[j]) ?? /^\s*(?:export )?(?:async )?function (\w+)\(/.exec(lines[j]) ?? /^\s*(?:const|let) (\w+) = useCallback/.exec(lines[j]) ?? /^ {4}(\w+)\([^)]*\) \{$/.exec(lines[j]);
    if (m) return m[1];
  }
  return null;
}

/** "file › function" for every place that triggers the event – seeded mock history (mock…) doesn't count. */
export function triggersOf(id: CatalogId): string[] {
  const keys = Object.keys(EVENT_OF).filter((k) => EVENT_OF[k as keyof typeof EVENT_OF] === id);
  const found = new Set<string>();
  for (const { f, text } of sources) {
    const lines = text.split("\n");
    lines.forEach((line, i) => {
      // `key:` / `key =` only in the store (elsewhere they are display maps); notice: in the deadline flows (config/policies).
      const writer = /notifyInApp\(|inAppRecords\(|records\(|notice:|notify\(/.test(line) || (f.endsWith("lib/store.tsx") && /key:|key = /.test(line));
      const writesKey = writer && keys.some((k) => new RegExp(`["'\`]${k}["'\`]`).test(line)) && !/TASK_NOTIFICATIONS|KEY_TYPE|EVENT_OF|notifyKey:/.test(line);
      const callsId = new RegExp(`notify(ByEmail)?\\([^)]*["']${id}["']`).test(line);
      if (!writesKey && !callsId) return;
      // The deadline flows and "Remind" are configured in config/policies and fired by lib/deadlines + the store's applyDeadlineEvents.
      const fn = f.endsWith("config/policies.ts") ? "DEADLINES / MANUAL_REMINDERS → store › applyDeadlineEvents" : enclosing(lines, i);
      if (fn?.startsWith("mock")) return;
      found.add(`${f.replace("src/", "")}${fn ? ` › ${fn}` : ""}`);
    });
  }
  // Arc steps: useArcEmails sends every emailing step through ARC_STEP_EVENT (else "arcStep").
  if (id === "arcStep" || Object.values(ARC_STEP_EVENT).includes(id)) {
    const arc = sources.find((s) => s.f.endsWith("stay/ArcParts.tsx") && s.text.includes("ARC_STEP_EVENT"));
    if (arc) found.add("components/stay/ArcParts.tsx › useArcEmails");
  }
  return [...found];
}

const rows = CATALOG_IDS.map((id) => ({ id, declared: NOTIFY_CATALOG[id].trigger, found: triggersOf(id) }));
const none = rows.filter((r) => r.found.length === 0);
console.log(`Catalogue: ${rows.length} events`);
console.log(`\nWithout a trigger in the code (${none.length}):`);
for (const r of none) console.log(`  - ${r.id}${r.declared ? `   ⚠ catalogue says: ${r.declared}` : ""}`);
const claimed = rows.filter((r) => r.found.length > 0 && r.declared === null);
if (claimed.length) {
  console.log(`\nTriggered, but the catalogue says "no trigger" (${claimed.length}):`);
  for (const r of claimed) console.log(`  - ${r.id}: ${r.found.join(", ")}`);
}
console.log(`\nWhere each is triggered:`);
for (const r of rows.filter((r) => r.found.length)) console.log(`  ${r.id}: ${r.found.join(", ")}`);
if (process.argv.includes("--strict") && (none.some((r) => r.declared) || claimed.length)) process.exit(1);

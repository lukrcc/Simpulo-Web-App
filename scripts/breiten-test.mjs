// Automatic width test (CLAUDE.md "Responsive" › Prüfmatrix): every page of the list at every width of the matrix, a screenshot each and four
// checks, a report in Markdown and a short summary in the terminal. It changes nothing in the app.
//
//   npm run test:breiten                          → test-results/breiten/<breite>/<seite>.png + test-results/breiten/bericht.md
//   BASE_URL=http://localhost:3000 npm run test:breiten
//   SEITEN=explore,admin-houses BREITEN=393,1470 npm run test:breiten   (only some pages / widths)
//   KERN=1 npm run test:breiten                   (only the main pages, `core` in src/config/test-routes.ts)
//
// The pages come from src/config/test-routes.ts – every page of the app; the production build fails when one is missing there. Runs with tsx
// (the list and the profile ids are TypeScript).
//
// Server: uses one already answering on BASE_URL (default http://localhost:3000). If none answers, it starts `next dev` on port 3124 itself in
// the demo mode (NEXT_PUBLIC_APP_MODE=demo) with a one-time random demo password it makes up for that run (never printed, never stored), and
// stops it again at the end. A running server in the demo mode asks for its password: give it as DEMO_PASSWORD in the environment – it is only
// typed into the password page, never logged.
//
// Logged in as the mock user u1 (Lukas: host, guest and admin). Headless Chromium, light mode, the platform phase "live".
//
// Checks per page and width:
//   1 Seitlicher Überlauf  – the page is wider than the window (scrollWidth > clientWidth).
//   2 Text unter Leisten   – visible text covered by a fixed or sticky bar (header, tab bar, booking bar, save bars), at the top of the page and
//                            scrolled to the end.
//   3 Klickflächen < 44 px – touch widths only (phones and tablets): links, buttons, tabs and switches whose hit area (with the invisible
//                            44px ::after of globals.css) is below 44 × 44.
//   4 Admin-Seitenleiste   – the admin's side list must never scroll (scrollHeight > clientHeight).
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { TEST_ROUTES } from "../src/config/test-routes.ts";
import { profileIdOf } from "../src/lib/privacy.ts";

const OUT = "test-results/breiten";
const OWN_PORT = 3124;
let base = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** The widths of the check matrix (CLAUDE.md "Responsive"), each with the height of a matching device. */
const WIDTHS = [
  { width: 375, height: 812, kind: "Telefon" },
  { width: 393, height: 852, kind: "Telefon" },
  { width: 430, height: 932, kind: "Telefon" },
  { width: 744, height: 1133, kind: "Tablet hochkant" },
  { width: 820, height: 1180, kind: "Tablet hochkant" },
  { width: 1024, height: 1366, kind: "Tablet hochkant" },
  { width: 1133, height: 744, kind: "Tablet quer / kleiner Laptop" },
  { width: 1180, height: 820, kind: "Tablet quer / kleiner Laptop" },
  { width: 1366, height: 1024, kind: "Tablet quer / kleiner Laptop" },
  { width: 1470, height: 956, kind: "Laptop" },
  { width: 1710, height: 1112, kind: "Laptop" },
  { width: 1920, height: 1080, kind: "Groß" },
  { width: 2560, height: 1440, kind: "Groß" },
];
/** Touch: phones and tablets (upright and lying) – the 44px rule applies there. */
const isTouch = (w) => w.kind.startsWith("Telefon") || w.kind.startsWith("Tablet");

/**
 * The pages: every route of src/config/test-routes.ts that isn't skipped (the build checks that list against src/app). "{profile:u2}" in an
 * example becomes that user's profile id; action "request" opens the request dialog after loading. KERN=1: only the main pages (core).
 */
const PAGES = TEST_ROUTES.filter((r) => !r.skip && (process.env.KERN !== "1" || r.core)).map((r) => ({
  key: r.key,
  label: r.label,
  route: (r.example ?? r.route).replace(/\{profile:(\w+)\}/g, (_, id) => profileIdOf(id)),
  after: r.action === "request" ? openRequest : undefined,
}));
const SKIPPED = TEST_ROUTES.filter((r) => r.skip);

async function openRequest(page) {
  await page.getByRole("button", { name: /request to join/i }).filter({ visible: true }).first().click({ timeout: 10_000 });
  await page.getByRole("dialog").first().waitFor({ state: "visible", timeout: 10_000 });
}

const pick = (list, env, key) => {
  const wanted = process.env[env]?.split(",").map((s) => s.trim()).filter(Boolean);
  return wanted?.length ? list.filter((item) => wanted.includes(String(item[key]))) : list;
};

async function reachable(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(60_000), redirect: "manual" });
    return res.status < 500;
  } catch {
    return false;
  }
}

/** Uses a server on BASE_URL, or starts `next dev` in the demo mode with a one-time password. Returns { stop, password }. */
async function ensureServer() {
  if (await reachable(base)) {
    console.log(`Nutze den laufenden Server auf ${base}`);
    return { stop: () => {}, password: process.env.DEMO_PASSWORD ?? null };
  }
  base = `http://localhost:${OWN_PORT}`;
  const password = randomBytes(18).toString("base64url");
  console.log(`Kein Server gefunden – starte next dev (Demo-Modus) auf ${base} …`);
  const child = spawn("npx", ["next", "dev", "-p", String(OWN_PORT)], {
    env: { ...process.env, NEXT_PUBLIC_APP_MODE: "demo", DEMO_PASSWORD: password },
    stdio: "ignore",
    detached: true,
  });
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    if (await reachable(base)) return { stop: () => process.kill(-child.pid, "SIGTERM"), password };
    await new Promise((r) => setTimeout(r, 2000));
  }
  process.kill(-child.pid, "SIGTERM");
  throw new Error("Der Server ist nicht innerhalb von 3 Minuten gestartet.");
}

/** A fresh context for one width: touch for phones and tablets, light mode, logged in as u1, no one-time hints. */
async function newContext(browser, w) {
  const touch = isTouch(w);
  const context = await browser.newContext({
    viewport: { width: w.width, height: w.height },
    deviceScaleFactor: 1,
    hasTouch: touch,
    isMobile: touch,
    locale: "en-US",
    colorScheme: "light",
  });
  await context.addInitScript(() => {
    try {
      localStorage.setItem("simpulo:mock-user", "u1");
      localStorage.removeItem("simpulo:phase");
      localStorage.setItem("simpulo:currency-hint", "1");
    } catch {}
  });
  return context;
}

/** The demo's password page: when a route lands on /preview, it types the password once (never logged). */
async function passGate(page, password) {
  if (!new URL(page.url()).pathname.startsWith("/preview")) return true;
  if (!password) return false;
  await page.locator("input[type=password], input[name=password]").first().fill(password);
  await Promise.all([page.waitForURL((url) => !url.pathname.startsWith("/preview"), { timeout: 30_000 }), page.keyboard.press("Enter")]);
  return true;
}

const settle = async (page, ms = 1200) => {
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(ms);
};

/** The four checks, in the page. Returns { overflow, covered[], small[], adminNavScroll }. */
async function measure(page, touch) {
  const check = (touchWidth) => {
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const visible = (el) => {
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) return false;
      if (el.closest("[aria-hidden='true'], [inert], .sr-only")) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw;
    };
    const describe = (el) => {
      const text = (el.getAttribute("aria-label") || el.textContent || el.getAttribute("placeholder") || el.tagName).trim().replace(/\s+/g, " ");
      return text.slice(0, 50) || el.tagName.toLowerCase();
    };

    // 1 Sideways overflow.
    const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;

    // 2 Text under fixed or sticky bars: bars = fixed/sticky elements at the top or bottom edge, less than 40 % of the window high, not dialogs.
    const bars = [...document.querySelectorAll("body *")].filter((el) => {
      const cs = getComputedStyle(el);
      if (cs.position !== "fixed" && cs.position !== "sticky") return false;
      if (el.closest("[role=dialog]") || !visible(el)) return false;
      const r = el.getBoundingClientRect();
      const atEdge = r.top <= 1 || r.bottom >= vh - 1 || (cs.position === "sticky" && r.top <= 120);
      return atEdge && r.height < vh * 0.4 && r.width > vw * 0.5;
    });
    const covered = [];
    if (bars.length) {
      const texts = [...document.querySelectorAll("main *, footer *")].filter((el) => {
        if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return false;
        if (el.closest("[role=dialog]") || bars.some((bar) => bar.contains(el) || el.contains(bar))) return false;
        return visible(el);
      });
      for (const el of texts) {
        const r = el.getBoundingClientRect();
        const bar = bars.find((b) => {
          const br = b.getBoundingClientRect();
          const overlapX = Math.min(r.right, br.right) - Math.max(r.left, br.left);
          const overlapY = Math.min(r.bottom, br.bottom) - Math.max(r.top, br.top);
          return overlapX > 4 && overlapY > 4;
        });
        if (!bar) continue;
        // Covered only when the bar really lies on top at the text's centre.
        const x = Math.min(vw - 1, Math.max(0, (r.left + r.right) / 2));
        const y = Math.min(vh - 1, Math.max(0, (Math.max(r.top, bar.getBoundingClientRect().top) + Math.min(r.bottom, bar.getBoundingClientRect().bottom)) / 2));
        const top = document.elementFromPoint(x, y);
        if (top && bar.contains(top) && !el.contains(top)) covered.push(describe(el));
        if (covered.length >= 8) break;
      }
    }

    // 3 Hit areas below 44px on touch widths (the invisible ::after of globals.css counts).
    const small = [];
    if (touchWidth) {
      for (const el of document.querySelectorAll("a[href], button, [role=button], [role=tab], [role=switch], summary, input[type=checkbox], input[type=radio]")) {
        if (!visible(el) || el.disabled) continue;
        const r = el.getBoundingClientRect();
        const after = getComputedStyle(el, "::after");
        const hasAfter = after.content !== "none" && after.content !== "normal" && after.position === "absolute";
        const w = Math.max(r.width, hasAfter ? parseFloat(after.width) || 0 : 0);
        const h = Math.max(r.height, hasAfter ? parseFloat(after.height) || 0 : 0);
        if (w < 43.5 || h < 43.5) small.push(`${describe(el)} (${Math.round(w)}×${Math.round(h)})`);
      }
    }

    // 4 The admin's side list never scrolls.
    const nav = document.querySelector("[data-admin-nav]");
    const adminNavScroll = nav && visible(nav) ? nav.scrollHeight - nav.clientHeight > 1 : null;

    return { overflow, covered, small, adminNavScroll };
  };
  const top = await page.evaluate(check, touch);
  // Scrolled to the end: what the bottom bars might cover.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(400);
  const end = await page.evaluate(check, touch);
  await page.evaluate(() => window.scrollTo(0, 0));
  return {
    overflow: Math.max(top.overflow, end.overflow),
    covered: [...new Set([...top.covered, ...end.covered])],
    small: [...new Set([...top.small, ...end.small])],
    adminNavScroll: top.adminNavScroll,
  };
}

async function run() {
  const widths = pick(WIDTHS, "BREITEN", "width");
  const pages = pick(PAGES, "SEITEN", "key");
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const { stop, password } = await ensureServer();
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const w of widths) {
      mkdirSync(`${OUT}/${w.width}`, { recursive: true });
      const context = await newContext(browser, w);
      const page = await context.newPage();
      console.log(`\n${w.width} × ${w.height} (${w.kind})`);
      for (const p of pages) {
        const result = { page: p, width: w, errors: [], notes: [] };
        try {
          await page.goto(base + p.route, { waitUntil: "domcontentloaded", timeout: 90_000 });
          const gated = new URL(page.url()).pathname.startsWith("/preview");
          if (!(await passGate(page, password))) throw new Error("Passwortseite – DEMO_PASSWORD fehlt in der Umgebung");
          if (gated) await page.goto(base + p.route, { waitUntil: "domcontentloaded", timeout: 90_000 });
          await settle(page);
          if (p.after) await p.after(page);
          await page.waitForTimeout(400);
          const m = await measure(page, isTouch(w));
          if (m.overflow > 0) result.errors.push(`Seitlicher Überlauf: ${m.overflow}px`);
          if (m.covered.length) result.errors.push(`Text unter Leisten: ${m.covered.slice(0, 5).join(" · ")}`);
          if (m.small.length) result.errors.push(`Klickflächen < 44px (${m.small.length}): ${m.small.slice(0, 5).join(" · ")}`);
          if (m.adminNavScroll) result.errors.push("Admin-Seitenleiste scrollbar");
          await page.screenshot({ path: `${OUT}/${w.width}/${p.key}.png`, fullPage: true });
        } catch (error) {
          result.errors.push(`Nicht geprüft: ${String(error.message ?? error).split("\n")[0]}`);
          await page.screenshot({ path: `${OUT}/${w.width}/${p.key}.png` }).catch(() => {});
        }
        results.push(result);
        console.log(`  ${result.errors.length ? "✗" : "✓"} ${p.label}${result.errors.length ? ` – ${result.errors.length} Fehler` : ""}`);
      }
      await context.close();
    }
  } finally {
    await browser.close();
    stop();
  }

  // The report.
  const lines = [
    "# Breiten-Test",
    "",
    `Server: ${base} · ${new Date().toISOString().slice(0, 16).replace("T", " ")} · angemeldet als u1 · hell`,
    "",
    "Prüfungen: seitlicher Überlauf · Text unter festen Leisten · Klickflächen unter 44 px (nur Touch-Breiten) · Admin-Seitenleiste scrollbar.",
    "",
    "## Zusammenfassung",
    "",
    "| Seite | Fehler | Breiten mit Fehlern |",
    "|---|---|---|",
  ];
  for (const p of pages) {
    const mine = results.filter((r) => r.page === p);
    const count = mine.reduce((n, r) => n + r.errors.length, 0);
    lines.push(`| ${p.label} | ${count} | ${mine.filter((r) => r.errors.length).map((r) => r.width.width).join(", ") || "–"} |`);
  }
  if (SKIPPED.length) {
    lines.push("", "Nicht geöffnet (in src/config/test-routes.ts begründet):", "");
    for (const r of SKIPPED) lines.push(`- ${r.route} – ${r.skip}`);
  }
  lines.push("", "## Einzeln", "");
  for (const w of widths) {
    lines.push(`### ${w.width} × ${w.height} · ${w.kind}`, "");
    for (const r of results.filter((x) => x.width === w)) {
      lines.push(`- **${r.page.label}** ([Bild](${w.width}/${r.page.key}.png)): ${r.errors.length ? "" : "ok"}`);
      for (const e of r.errors) lines.push(`  - ${e}`);
    }
    lines.push("");
  }
  writeFileSync(`${OUT}/bericht.md`, lines.join("\n"));

  // The terminal summary: errors per page.
  console.log("\nFehler pro Seite:");
  let total = 0;
  for (const p of pages) {
    const count = results.filter((r) => r.page === p).reduce((n, r) => n + r.errors.length, 0);
    total += count;
    console.log(`  ${String(count).padStart(3)}  ${p.label}`);
  }
  console.log(`\nGesamt: ${total} · Bericht: ${OUT}/bericht.md · Bilder: ${OUT}/<breite>/<seite>.png`);
  // In GitHub Actions: one warning per page with errors (shown on the run's summary page).
  if (process.env.GITHUB_ACTIONS) {
    for (const p of pages) {
      const count = results.filter((r) => r.page === p).reduce((n, r) => n + r.errors.length, 0);
      if (count) console.log(`::warning title=Breiten-Test::${p.label}: ${count} Fehler (Bericht im Artefakt breiten-test)`);
    }
  }
  process.exitCode = total > 0 ? 1 : 0;
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

// Full-page screenshots of the whole site, for showing the current state (e.g. to a planning chat). It changes nothing in the app.
//
//   node scripts/screenshots.mjs              → screenshots/ (numbered PNGs) + screenshots/INDEX.md
//   BASE_URL=http://localhost:3000 node scripts/screenshots.mjs
//
// Uses a dev server that is already running on BASE_URL (default http://localhost:3000). If none answers, it starts `next dev` on port 3123
// itself (NEXT_PUBLIC_APP_MODE=dev) and stops it again at the end. Headless Chromium, desktop width 1440px, the platform phase "live" (the full mock data)
// (localStorage simpulo:phase; "live" is the default). Logged-in views use the mock users via ?as=<id> (tab-scoped login): u1 Lukas (host and guest), u17 Noah
// (guest). Every step runs on its own: a step that fails is noted in INDEX.md and the run goes on.
import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const OUT = "screenshots";
const WIDTH = 1440;
const HEIGHT = 900;
const OWN_PORT = 3123;
let base = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

// Sample ids from the mock data (src/lib/mock.ts, mock-houses-extra.ts, mock-growth.ts, lib/collections.ts).
const SAMPLE = {
  house: { id: "s31", slug: "surf-coach-house-ericeira" }, // visitor view: João's Surf Coach House Ericeira
  hostHouse: "s1", // Fitness House Canggu – hosted by u1, with open requests
  payHouse: "s22", // IRL House Bangkok – u1 is accepted, the crew is complete, payment due
  thread: "t-s1", // the crew chat of Fitness House Canggu
  user: "u2", // Mara
  city: "lisbon",
  collection: "last-spot",
  claimToken: "demo-run-club",
  inviteToken: "sample-invite", // invite tokens only live in the browser: this one shows the "expired" state
  group: "hosting",
};

const shots = [];
const failures = [];
let counter = 0;

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

async function reachable(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    return res.status < 500;
  } catch {
    return false;
  }
}

/** Starts `next dev` when nothing answers on BASE_URL; returns a stop function. */
async function ensureServer() {
  if (await reachable(base)) {
    console.log(`Using the running server at ${base}`);
    return () => {};
  }
  base = `http://localhost:${OWN_PORT}`;
  console.log(`No server found – starting next dev on ${base} …`);
  const child = spawn("npx", ["next", "dev", "-p", String(OWN_PORT)], { env: { ...process.env, NEXT_PUBLIC_APP_MODE: "dev" }, stdio: "ignore", detached: true });
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    if (await reachable(base)) return () => process.kill(-child.pid, "SIGTERM");
    await new Promise((r) => setTimeout(r, 2000));
  }
  process.kill(-child.pid, "SIGTERM");
  throw new Error("The dev server didn't start within 3 minutes.");
}

/** A fresh browser context: desktop width, the "full" data state, nothing else stored. */
async function newPage(browser) {
  const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1, locale: "en-US" });
  await context.addInitScript(() => {
    try {
      // The phase "live" (the full data) is the default: no stored phase.
      localStorage.removeItem("simpulo:phase");
      // The one-time hints (currency) would cover the pages.
      localStorage.setItem("simpulo:currency-hint", "1");
    } catch {}
  });
  const page = await context.newPage();
  return { context, page };
}

const settle = async (page, ms = 1200) => {
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(ms);
};

/** One screenshot: numbered, a speaking name, the route and one sentence for INDEX.md. */
async function shot(page, name, route, description, { fullPage = true } = {}) {
  counter += 1;
  const file = `${String(counter).padStart(2, "0")}-${slugify(name)}.png`;
  await page.screenshot({ path: `${OUT}/${file}`, fullPage });
  shots.push({ file, route, description });
  console.log(`  ✓ ${file}`);
}

/** Opens a route and takes its screenshot; a 4xx/5xx or Next's 404 page counts as not reachable. */
async function visit(page, route, name, description) {
  try {
    const res = await page.goto(base + route, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await settle(page);
    const notFound = await page.locator("text=/This page could not be found|404/").first().isVisible().catch(() => false);
    const status = res?.status() ?? 0;
    if (status >= 400 || notFound) {
      failures.push({ route, reason: status >= 400 ? `HTTP ${status}` : "404 page" });
      await shot(page, `${name}-nicht-erreichbar`, route, `NOT REACHABLE (${status >= 400 ? `HTTP ${status}` : "404 page"}): ${description}`);
      return false;
    }
    await shot(page, name, route, description);
    return true;
  } catch (error) {
    failures.push({ route, reason: String(error.message ?? error).split("\n")[0] });
    console.log(`  ✗ ${route}: ${String(error.message ?? error).split("\n")[0]}`);
    return false;
  }
}

/** A step inside a flow: on failure it's noted and the flow goes on. */
async function step(label, fn) {
  try {
    await fn();
  } catch (error) {
    const reason = String(error.message ?? error).split("\n")[0];
    failures.push({ route: label, reason });
    console.log(`  ✗ ${label}: ${reason}`);
  }
}

async function run() {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const stop = await ensureServer();
  const browser = await chromium.launch({ headless: true });
  try {
    // ── 1. All routes ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log("Routes, logged out");
    {
      const { context, page } = await newPage(browser);
      const routes = [
        ["/", "startseite-besucher", "Explore as a logged-out visitor: header bar, Spotlight, grid and dark bands."],
        ["/explore", "explore-besucher", "The same Explore under /explore."],
        [`/house/${SAMPLE.house.slug}`, "house-oeffentlich", "The public, indexable House page of Surf Coach House Ericeira."],
        [`/co-living/${SAMPLE.city}`, "stadtseite-lisbon", "SEO city page: co-living in Lisbon with its open Houses."],
        [`/collections/${SAMPLE.collection}`, "collection-last-spot", "A collection page: Houses with one spot left."],
        ["/faq", "faq", "The FAQ with the Joining / Hosting tabs."],
        ["/about", "about", "About Simpulo."],
        ["/safety", "safety", "Safety page."],
        ["/cancellation", "cancellation", "The cancellation rules (draft)."],
        ["/contact", "contact", "Contact page."],
        ["/impressum", "impressum", "Impressum."],
        ["/privacy", "privacy", "Privacy policy."],
        ["/terms", "terms", "Terms."],
        ["/get", "get-the-app", "Getting the app on your phone (QR on desktop)."],
        ["/welcome", "welcome", "Welcome page."],
        [`/invite/${SAMPLE.inviteToken}`, "einladung", "An invite link – this sample token shows the expired state."],
        [`/claim/${SAMPLE.claimToken}`, "claim-house", "A House prepared for a creator, to claim."],
        ["/demo-login", "demo-login", "The demo password page (only used in demo mode)."],
      ];
      for (const [route, name, description] of routes) await visit(page, route, name, description);
      await context.close();
    }

    console.log("Routes, logged in as u1 (host and guest)");
    {
      const { context, page } = await newPage(browser);
      await page.goto(`${base}/explore?as=u1`, { waitUntil: "domcontentloaded", timeout: 90_000 });
      await settle(page);
      const routes = [
        ["/explore", "explore-eingeloggt", "Explore logged in as Lukas: greeting in the Spotlight, Your people are going."],
        ["/your-houses", "your-houses", "Your houses: Up next, Needs you, Coming up, the Payouts strip and the rows."],
        [`/your-houses/all/${SAMPLE.group}`, "your-houses-alle-hosting", "See all: every House you host, as a grid."],
        ["/your-houses/payouts", "payouts", "Payouts: dark earnings strip, Top Host, chart and table."],
        [`/h/${SAMPLE.hostHouse}`, "house-als-host", "Fitness House Canggu from its host's side."],
        [`/h/${SAMPLE.hostHouse}/manage`, "house-verwalten", "Managing the House (host): stepper, current step, capsules."],
        [`/your-houses/${SAMPLE.hostHouse}/edit`, "house-bearbeiten", "Editing the House."],
        [`/h/${SAMPLE.payHouse}`, "house-als-mitglied", "IRL House Bangkok as an accepted member (pay step)."],
        [`/h/${SAMPLE.house.id}`, "house-als-besucher", "Surf Coach House Ericeira as a visitor: bento tiles and action strip."],
        ["/messages", "messages", "Messages: the chat list."],
        [`/messages/${SAMPLE.thread}`, "chat-thread", "A House chat (Fitness House Canggu)."],
        ["/profile", "eigenes-profil", "Your own profile with the quick tiles."],
        [`/u/${SAMPLE.user}`, "fremdes-profil", "Someone else's profile (Mara)."],
        ["/people", "your-people", "Your people: everyone you lived with."],
        ["/saved", "saved", "Saved Houses."],
        ["/settings", "settings", "Settings (Account)."],
        ["/settings/profile", "edit-profile", "Edit profile with the live preview."],
        ["/settings/payouts", "settings-payouts", "Settings › Payments & payouts."],
        ["/admin/houses", "admin-houses", "Admin: Houses."],
        ["/admin/houses/new", "admin-house-neu", "Admin: a new House."],
        ["/admin/growth", "admin-growth", "Admin: growth."],
        ["/admin/support", "admin-support", "Admin: support cases."],
        ["/dev/emails", "dev-emails", "Dev: email previews."],
        ["/dev/stripe-onboarding", "dev-stripe-onboarding", "Dev: the simulated payout onboarding."],
        ["/dev/identity-check", "dev-identity-check", "Dev: the simulated identity check."],
      ];
      for (const [route, name, description] of routes) await visit(page, route, name, description);
      await context.close();
    }

    // ── 2. Flows ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log("Flow 1: logged-out visitor – start, login, sign-up");
    {
      const { context, page } = await newPage(browser);
      await step("Flow 1", async () => {
        await page.goto(base + "/", { waitUntil: "domcontentloaded", timeout: 90_000 });
        await settle(page);
        await shot(page, "ablauf1-startseite", "/", "Flow 1 · The start page as a logged-out visitor.", { fullPage: false });
        // One login button (the person icon in the bar) – there is no separate sign-up: the same sheet signs in and creates the account.
        await page.locator("[data-site-header] [data-header-avatar]").click();
        await page.waitForTimeout(800);
        await shot(page, "ablauf1-login", "/ (Auth-Sheet)", "Flow 1 · The login sheet: Apple, Google, email.", { fullPage: false });
        await page.getByPlaceholder(/you@email\.com/i).fill("new.person@example.com");
        await page.waitForTimeout(300);
        await shot(page, "ablauf1-registrierung", "/ (Auth-Sheet)", "Flow 1 · Sign-up: a new email in the same sheet (no separate sign-up).", { fullPage: false });
        await page.getByRole("button", { name: /^continue$/i }).last().click();
        await page.waitForTimeout(1500);
        await shot(page, "ablauf1-nach-continue", "/ (Auth-Sheet)", "Flow 1 · After Continue: in dev the mock login signs you in straight away (as the default user), no email is sent.", { fullPage: false });
      });
      await context.close();
    }

    console.log("Flow 2: guest – open a House, request to join, sent");
    {
      const { context, page } = await newPage(browser);
      await step("Flow 2", async () => {
        await page.goto(`${base}/explore?as=u17`, { waitUntil: "domcontentloaded", timeout: 90_000 });
        await settle(page);
        await page.goto(`${base}/h/${SAMPLE.house.id}`, { waitUntil: "domcontentloaded" });
        await settle(page);
        await shot(page, "ablauf2-haus-oeffnen", `/h/${SAMPLE.house.id}`, "Flow 2 · Guest (Noah) opens Surf Coach House Ericeira.", { fullPage: false });
        await page.locator("[data-house-strip]").getByRole("button", { name: /request to join/i }).click();
        await page.waitForTimeout(900);
        await shot(page, "ablauf2-request-to-join", `/h/${SAMPLE.house.id}`, "Flow 2 · The Request to join dialog.", { fullPage: false });
        await page.getByRole("dialog").locator("textarea").fill("Hi João! Intermediate surfer, happy to be filmed. Would love to join.");
        // The first request asks for the date of birth (18+).
        const birth = page.getByRole("dialog").locator("input[type=date]");
        if (await birth.isVisible().catch(() => false)) await birth.fill("1996-05-14");
        await page.waitForTimeout(300);
        await shot(page, "ablauf2-nachricht", `/h/${SAMPLE.house.id}`, "Flow 2 · The request with a short message (and the date of birth, asked on the first request).", { fullPage: false });
        await page.getByRole("button", { name: /send request/i }).click();
        await page.waitForTimeout(1200);
        await shot(page, "ablauf2-anfrage-gesendet", `/h/${SAMPLE.house.id}`, "Flow 2 · Request sent – the confirmation.", { fullPage: false });
        await page.waitForTimeout(2500);
        await settle(page, 600);
        await shot(page, "ablauf2-haus-nach-anfrage", `/h/${SAMPLE.house.id}`, "Flow 2 · The House page after the request (member view: Requested).", { fullPage: false });
      });
      await context.close();
    }

    console.log("Flow 3: host – own House, accept a request");
    {
      const { context, page } = await newPage(browser);
      await step("Flow 3", async () => {
        await page.goto(`${base}/explore?as=u1`, { waitUntil: "domcontentloaded", timeout: 90_000 });
        await settle(page);
        await page.goto(`${base}/h/${SAMPLE.hostHouse}`, { waitUntil: "domcontentloaded" });
        await settle(page);
        await shot(page, "ablauf3-eigenes-haus", `/h/${SAMPLE.hostHouse}`, "Flow 3 · Host (Lukas) opens his own House.", { fullPage: false });
        await page.goto(`${base}/h/${SAMPLE.hostHouse}/manage?focus=requests`, { waitUntil: "domcontentloaded" });
        await settle(page, 1500);
        await shot(page, "ablauf3-anfragen", `/h/${SAMPLE.hostHouse}/manage?focus=requests`, "Flow 3 · The open requests – this House is full, so Accept only takes people onto the waitlist.", { fullPage: false });
        await page.getByRole("button", { name: /^accept$/i }).first().click();
        await page.waitForTimeout(1200);
        await shot(page, "ablauf3-angenommen", `/h/${SAMPLE.hostHouse}/manage?focus=requests`, "Flow 3 · After Accept: the toast confirms the person is on the waitlist.", { fullPage: false });
      });
      await context.close();
    }

    console.log("Flow 4: crew complete – payment to confirmation");
    {
      const { context, page } = await newPage(browser);
      await step("Flow 4", async () => {
        await page.goto(`${base}/explore?as=u1`, { waitUntil: "domcontentloaded", timeout: 90_000 });
        await settle(page);
        await page.goto(`${base}/h/${SAMPLE.payHouse}`, { waitUntil: "domcontentloaded" });
        await settle(page);
        await shot(page, "ablauf4-zahlung-faellig", `/h/${SAMPLE.payHouse}`, "Flow 4 · Crew complete: the member view with Pay your share.", { fullPage: false });
        await page.goto(`${base}/h/${SAMPLE.payHouse}?focus=pay`, { waitUntil: "domcontentloaded" });
        await settle(page, 1800);
        await shot(page, "ablauf4-bezahl-sheet", `/h/${SAMPLE.payHouse}?focus=pay`, "Flow 4 · The pay sheet: share, fees, Apple Pay / Google Pay, card.", { fullPage: false });
        await page.getByRole("dialog").getByRole("button", { name: /^pay\s/i }).last().click();
        // The mock answers in 0.6–1.5s: wait for the confirmation (or an error) instead of the spinner.
        await page.getByText(/you're in|declined|try another card/i).first().waitFor({ timeout: 15_000 }).catch(() => {});
        await page.waitForTimeout(600);
        await shot(page, "ablauf4-bestaetigung", `/h/${SAMPLE.payHouse}?focus=pay`, "Flow 4 · After paying: the confirmation.", { fullPage: false });
        await page.keyboard.press("Escape");
        await settle(page, 800);
        await shot(page, "ablauf4-haus-bezahlt", `/h/${SAMPLE.payHouse}`, "Flow 4 · The House page after paying.", { fullPage: false });
      });
      await context.close();
    }

    console.log("Flow 5: Open a House, start to end");
    {
      const { context, page } = await newPage(browser);
      await step("Flow 5", async () => {
        await page.goto(`${base}/explore?as=u1`, { waitUntil: "domcontentloaded", timeout: 90_000 });
        await settle(page);
        await page.goto(`${base}/create`, { waitUntil: "domcontentloaded" });
        await settle(page, 1500);
        // Each step: answer it the simple way (the first choice, a place, a month, a crew size, a price, a cover), screenshot, Next.
        for (let i = 1; i <= 10; i++) {
          const main = page.locator("main");
          await answerStep(page, main);
          await page.waitForTimeout(500);
          await shot(page, `ablauf5-schritt-${i}`, "/create", `Flow 5 · Open a House, step ${i}.`, { fullPage: false });
          const publish = page.getByRole("button", { name: /^open house$/i });
          if (await publish.isVisible().catch(() => false)) {
            await publish.click();
            await page.waitForTimeout(2500);
            await settle(page, 800);
            await shot(page, "ablauf5-veroeffentlicht", "/create", "Flow 5 · Published: Fill your House.", { fullPage: false });
            const notNow = page.getByRole("button", { name: /not now/i });
            if (await notNow.isVisible().catch(() => false)) {
              await notNow.click();
              await page.waitForTimeout(1200);
              await shot(page, "ablauf5-house-ist-offen", "/create", "Flow 5 · Your House is open – copy link, story image.", { fullPage: false });
            }
            break;
          }
          const next = page.getByRole("button", { name: /^(next|skip for now|continue)$/i }).last();
          if (!(await next.isEnabled().catch(() => false))) throw new Error(`step ${i}: Next is not enabled`);
          await next.click();
          await page.waitForTimeout(700);
        }
      });
      await context.close();
    }

    console.log("Flow 6: the Dev menu");
    {
      const { context, page } = await newPage(browser);
      await step("Flow 6", async () => {
        await page.goto(`${base}/explore?as=u1`, { waitUntil: "domcontentloaded", timeout: 90_000 });
        await settle(page);
        await page.getByRole("button", { name: /open dev tools/i }).first().click();
        await page.waitForTimeout(800);
        await shot(page, "ablauf6-dev-menue", "/explore (Dev-Menü)", "Flow 6 · The Dev menu: Account, Scenario, Data & look.", { fullPage: false });
      });
      await context.close();
    }
  } finally {
    await browser.close();
    stop();
  }

  // ── INDEX.md ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const lines = [
    "# Screenshots",
    "",
    `Taken ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC from ${base} · desktop ${WIDTH}px · phase “live” (full mock data) · \`node scripts/screenshots.mjs\``,
    "",
    "| # | File | Route | What you see |",
    "|---|---|---|---|",
    ...shots.map((s, i) => `| ${i + 1} | [${s.file}](${s.file}) | \`${s.route}\` | ${s.description} |`),
    "",
    failures.length ? "## Not reachable / failed" : "## All routes and steps reachable",
    "",
    ...failures.map((f) => `- \`${f.route}\` – ${f.reason}`),
    "",
  ];
  writeFileSync(`${OUT}/INDEX.md`, lines.join("\n"));
  console.log(`\n${shots.length} screenshots in ${OUT}/ · ${failures.length} not reachable / failed`);
  for (const f of failures) console.log(`  - ${f.route}: ${f.reason}`);
}

/** One Open a House step, answered the simple way: while Next is still disabled, give the step what it asks for – a place, the first choice
 *  of each unanswered group (category, place mode, month, crew size, cover, title), a plain number for a price. */
async function answerStep(page, main) {
  const next = () => page.getByRole("button", { name: /^next$/i }).last();
  const ready = async () => (await next().isVisible().catch(() => false)) && (await next().isEnabled().catch(() => false));
  // The left column only (the preview card on the right is no form).
  const form = page.locator("body");
  for (let round = 0; round < 6 && !(await ready()); round++) {
    // A place search: type a city and take the first hit.
    const place = main.locator("input[role=combobox], input[type=search], input[placeholder*='city' i], input[placeholder*='where' i], input[placeholder*='search' i]").first();
    if ((await place.isVisible().catch(() => false)) && !(await place.inputValue().catch(() => ""))) {
      await place.fill("Lisbon");
      await page.waitForTimeout(900);
      await page.getByRole("option").first().click().catch(() => {});
      await page.waitForTimeout(500);
      continue;
    }
    // Numbers (price, budget): a plain amount in the first empty field only – the optional ones (host fee) stay empty.
    let filled = false;
    for (const input of await main.locator("input[inputmode=numeric], input[inputmode=decimal], input[type=number]").all()) {
      if (!(await input.isVisible().catch(() => false)) || (await input.inputValue().catch(() => ""))) continue;
      await input.fill("1200").catch(() => {});
      filled = true;
      break;
    }
    if (filled) {
      await page.waitForTimeout(400);
      continue;
    }
    // The first group that has nothing chosen yet: its first option.
    let clicked = false;
    for (const group of await form.locator("[role=group], [role=radiogroup]").all()) {
      if (!(await group.isVisible().catch(() => false))) continue;
      const chosen = await group.locator("[aria-pressed=true], [aria-checked=true], [data-chip-active]").count();
      if (chosen > 0) continue;
      const option = group.locator("button:not([disabled]), [role=radio]").first();
      if (!(await option.isVisible().catch(() => false))) continue;
      await option.click().catch(() => {});
      clicked = true;
      break;
    }
    if (!clicked) break;
    await page.waitForTimeout(500);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

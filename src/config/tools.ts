// Admin › System › Tools: the external services Simpulo runs on, as links only – NEVER credentials, keys or passwords here (Regel). The
// names and the one line of purpose are admin texts (lib/i18n/admin.de.ts platform.tools.items.<id>); a service whose address isn't known
// yet has `url: null` and is not shown. Direct links into those services (a payment in Stripe, a user in Firestore) only exist for real
// ids in production – in dev and demo (mock data) they are never shown.
import { APP_MODE } from "@/lib/appMode";

/** The Firebase project (console URLs only – no keys). */
export const FIREBASE_PROJECT_ID = "simpulo-7c099";

/**
 * The Firestore collections the direct links open. TODO(backend): set to the real names once the Firestore schema stands.
 */
export const FIRESTORE_COLLECTIONS = { users: "users", houses: "houses" } as const;

/** Which Stripe dashboard the direct links open – "test" until Stripe is live (Admin › System › Launch-Vorbereitung › „Stripe live“). */
export const STRIPE_DASHBOARD_MODE: "test" | "live" = "test";

export type ToolGroup = "firebase" | "money" | "code" | "delivery" | "later";
export const TOOL_GROUPS: readonly ToolGroup[] = ["firebase", "money", "code", "delivery", "later"];

export type ToolIcon = "flame" | "database" | "users" | "storage" | "logs" | "server" | "card" | "bank" | "code" | "eye" | "mail" | "globe" | "chart";

export interface Tool {
  id: "console" | "firestore" | "auth" | "storage" | "functionLogs" | "appHosting" | "stripeTest" | "stripeLive" | "qonto" | "github" | "preview" | "mail" | "domain" | "analytics";
  group: ToolGroup;
  icon: ToolIcon;
  /** null: not known yet – hidden */
  url: string | null;
}

const firebase = (path: string) => `https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/${path}`;

export const TOOLS: readonly Tool[] = [
  { id: "console", group: "firebase", icon: "flame", url: firebase("overview") },
  { id: "firestore", group: "firebase", icon: "database", url: firebase("firestore") },
  { id: "auth", group: "firebase", icon: "users", url: firebase("authentication/users") },
  { id: "storage", group: "firebase", icon: "storage", url: firebase("storage") },
  { id: "functionLogs", group: "firebase", icon: "logs", url: firebase("functions/logs") },
  { id: "appHosting", group: "firebase", icon: "server", url: firebase("apphosting") },
  { id: "stripeTest", group: "money", icon: "card", url: "https://dashboard.stripe.com/test/dashboard" },
  { id: "stripeLive", group: "money", icon: "card", url: "https://dashboard.stripe.com/dashboard" },
  { id: "qonto", group: "money", icon: "bank", url: "https://app.qonto.com/" },
  { id: "github", group: "code", icon: "code", url: "https://github.com/lukrcc/Simpulo-Web-App" },
  // The preview behind the password page (config/preview.ts) – its address from the environment; unset: hidden.
  { id: "preview", group: "code", icon: "eye", url: process.env.NEXT_PUBLIC_PRODUCTION_URL || null },
  // E-mails go out through Resend (CLAUDE.md „Teilen und E-Mail“).
  { id: "mail", group: "delivery", icon: "mail", url: "https://resend.com/emails" },
  // TODO: the domain registrar – not decided yet, hidden until its address is set.
  { id: "domain", group: "delivery", icon: "globe", url: null },
  // Statistics without cookies (config/analytics.ts, PostHog EU) – off until the founders switch it on.
  { id: "analytics", group: "later", icon: "chart", url: "https://eu.posthog.com/" },
];

export const toolUrl = (id: Tool["id"]) => TOOLS.find((t) => t.id === id)?.url ?? null;

// ── Direct links (only real ids in production) ──────────────────────────────────────────────────────────────────────────────────

const STRIPE_ID: Record<StripeObject, RegExp> = {
  payment: /^pi_[A-Za-z0-9]{10,}$/,
  transfer: /^tr_[A-Za-z0-9]{10,}$/,
  payout: /^po_[A-Za-z0-9]{10,}$/,
  account: /^acct_[A-Za-z0-9]{10,}$/,
};
const STRIPE_PATH: Record<StripeObject, string> = { payment: "payments", transfer: "connect/transfers", payout: "payouts", account: "connect/accounts" };
export type StripeObject = "payment" | "transfer" | "payout" | "account";

/** A Stripe object in the dashboard ("In Stripe öffnen", "Stripe-Konto") – null without a real id or outside production (mock). */
export function stripeUrl(kind: StripeObject, id: string | null | undefined): string | null {
  if (APP_MODE !== "production" || !id || !STRIPE_ID[kind].test(id)) return null;
  return `https://dashboard.stripe.com/${STRIPE_DASHBOARD_MODE === "test" ? "test/" : ""}${STRIPE_PATH[kind]}/${id}`;
}

/** A document in Firestore ("In Firebase öffnen") – only a real Firebase id (20+ letters and digits) in production, never a mock id. */
export function firebaseDocUrl(kind: keyof typeof FIRESTORE_COLLECTIONS, id: string | null | undefined): string | null {
  if (APP_MODE !== "production" || !id || !/^[A-Za-z0-9]{20,}$/.test(id)) return null;
  return firebase(`firestore/databases/-default-/data/~2F${FIRESTORE_COLLECTIONS[kind]}~2F${id}`);
}

/** The functions' log ("Protokoll öffnen" at system errors) – only in production, where errors are real. */
export function errorLogUrl(): string | null {
  return APP_MODE === "production" ? firebase("functions/logs") : null;
}

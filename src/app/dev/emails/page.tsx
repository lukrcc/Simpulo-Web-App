import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Container } from "@/components/layout/Container";
import { ALWAYS_ON, CATALOG_IDS, EVENT_OF, NOTIFY_CATALOG, type CatalogId } from "@/config/notifications";
import { ChatDigestEmail } from "@/emails/ChatDigestEmail";
import { DailyDigestEmail } from "@/emails/DailyDigestEmail";
import { MagicLinkEmail } from "@/emails/MagicLinkEmail";
import { NotificationEmail } from "@/emails/NotificationEmail";
import { WeeklyDigestEmail } from "@/emails/WeeklyDigestEmail";
import type { NotifyEventKey } from "@/lib/data/notifications";
import { catalogText } from "@/lib/notify";
import { PRIVATE_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = { title: "Emails", robots: PRIVATE_ROBOTS };

/** Sample values for every placeholder the notification texts use. */
const SAMPLE = { name: "Aisha", title: "Fitness House Canggu", date: "Nov 7", price: "€528", count: 2, place: "Lisbon", hours: 48, days: 12, amount: "€480", preview: "See you at 6 at the gym!", open: 2, from: "Aisha", to: "Sofia", host: "Tom", spots: 2 };
const HOUSE = "Fitness Canggu";
const ORIGIN = "https://simpulo.app";
/** These emails carry three similar Houses under the text (NotifyBridge fills them from the data). */
const WITH_SIMILAR: readonly CatalogId[] = ["guestRemoved", "requestDeclined", "requestExpired"];
const SIMILAR = [
  { title: "Surf Coach House Ericeira", meta: "Mar 3 · Ericeira", href: "/house/surf-coach-house-ericeira" },
  { title: "Crypto Builders House Lisbon", meta: "Apr 6 · Lisbon", href: "/house/crypto-builders-house-lisbon" },
  { title: "Fitness House Canggu", meta: "Feb 1 · Canggu", href: "/house/fitness-house-canggu-feb" },
];
const TIMING: Record<string, string> = { instant: "Email right away · never bundled", daily: "Email in the daily bundle", unreadAfter: "Email only if unread after 60 min, collected", weekly: "Email in the weekly summary", optIn: "Email only with opt-in, in the daily bundle" };

/**
 * /dev/emails (dev only, CLAUDE.md "Benachrichtigungen"): the catalogue (config/notifications.ts) – every event with its trigger, recipient,
 * channels, group, whether it's mandatory, what push and the lock screen show – and every email rendered on the one layout, with sample
 * values. Then the bundles (the day, chat, the week) and the sign-in link. Nothing is sent.
 */
export default async function EmailsPage() {
  const t = await getTranslations("messages.notify");
  const keysOf = (id: CatalogId) => (Object.keys(EVENT_OF) as NotifyEventKey[]).filter((k) => EVENT_OF[k] === id);
  const sample = (id: CatalogId) => {
    const key = keysOf(id)[0];
    try {
      return key ? t(key, SAMPLE) : undefined;
    } catch {
      return undefined;
    }
  };
  const missing = CATALOG_IDS.filter((id) => NOTIFY_CATALOG[id].trigger === null);
  const bundles: Array<{ key: string; note: string; node: ReactNode }> = [
    {
      key: "daily bundle",
      note: "Everything of a day that isn't money or a deadline – one email",
      node: <DailyDigestEmail origin={ORIGIN} items={[{ headline: catalogText("dayAfter", HOUSE).subject, href: "/your-houses" }, { headline: catalogText("albumReady", HOUSE).subject, href: "/your-houses" }, { headline: catalogText("newHouse").subject, href: "/explore" }]} />,
    },
    {
      key: "chat (collected)",
      note: "Only if unread after 60 min, collected",
      node: <ChatDigestEmail origin={ORIGIN} messages={[{ from: "Aisha", chat: "Fitness House Canggu", text: "See you at 6 at the gym!" }, { from: "Tom", chat: "Fitness House Canggu", text: "Who's bringing the speaker?" }]} />,
    },
    {
      key: "weekly summary",
      note: "New Houses near your searches",
      node: <WeeklyDigestEmail origin={ORIGIN} houses={[{ title: "Surf House Ericeira", meta: "March 2027 · Ericeira", href: "/house/surf-coach-house-ericeira" }, { title: "Remote Work House Lisbon", meta: "April 2027 · Lisbon", href: "/house/crypto-builders-house-lisbon" }]} />,
    },
    { key: "sign-in link", note: "signIn – asked for, no unsubscribe", node: <MagicLinkEmail href="/" origin={ORIGIN} /> },
  ];
  return (
    <Container page className="pb-(--space-section)">
      <p className="rounded-2xl bg-ink/6 px-4 py-3 text-small text-ink">
        Preview only – no email is sent. {CATALOG_IDS.length} events in the catalogue, one layout, no tracking pixels.
      </p>
      <h1 className="mt-8 text-h2 text-ink">Emails and notices</h1>

      <section data-no-trigger className="mt-8">
        <h2 className="text-h3 text-ink">Without a trigger yet ({missing.length})</h2>
        <p className="mt-1 text-small text-muted">In the catalogue with their words, not sent by any code yet.</p>
        <p className="mt-2 text-body text-ink">{missing.join(" · ")}</p>
      </section>

      <ul data-catalog className="mt-10 grid gap-10 [grid-template-columns:repeat(auto-fill,minmax(min(420px,100%),1fr))]">
        {CATALOG_IDS.map((id) => {
          const e = NOTIFY_CATALOG[id];
          const words = catalogText(id, HOUSE);
          const channels = [e.email && "Email", e.push && "Push", e.inApp && "In-app"].filter(Boolean).join(" · ");
          return (
            <li key={id} data-catalog-entry={id} className="flex min-w-0 flex-col gap-3">
              <div className="flex flex-col gap-1">
                <p className="text-eyebrow uppercase text-ink/55">{id}</p>
                <p className="text-small text-ink">
                  {e.trigger ?? "No trigger yet"} → {e.to}
                </p>
                <p className="text-small text-muted">
                  {channels} · {e.category}
                  {ALWAYS_ON.includes(e.category) ? " (always on)" : ""} · {e.mandatory ? "mandatory" : "can be switched off"}
                </p>
                {e.email && <p className="text-small text-muted">{TIMING[e.email]}</p>}
                {e.push && <p className="text-small text-muted">Lock screen: “Simpulo · {words.short}”</p>}
              </div>
              {e.email ? (
                <div className="overflow-hidden rounded-3xl">
                  <NotificationEmail id={id} house={HOUSE} headline={sample(id)} origin={ORIGIN} houses={WITH_SIMILAR.includes(id) ? SIMILAR : undefined} />
                </div>
              ) : (
                <p className="text-small text-muted">No email.</p>
              )}
            </li>
          );
        })}
      </ul>

      <h2 className="mt-16 text-h3 text-ink">Bundles</h2>
      <ul className="mt-6 grid gap-10 [grid-template-columns:repeat(auto-fill,minmax(min(420px,100%),1fr))]">
        {bundles.map(({ key, note, node }) => (
          <li key={key} className="flex min-w-0 flex-col gap-3">
            <div>
              <p className="text-eyebrow uppercase text-ink/55">{key}</p>
              <p className="mt-1 text-small text-muted">{note}</p>
            </div>
            <div className="overflow-hidden rounded-3xl">{node}</div>
          </li>
        ))}
      </ul>
    </Container>
  );
}

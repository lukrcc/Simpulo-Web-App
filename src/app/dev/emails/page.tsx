import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Container } from "@/components/layout/Container";
import { CHANNELS } from "@/config/notifications";
import { ChatDigestEmail } from "@/emails/ChatDigestEmail";
import { MagicLinkEmail } from "@/emails/MagicLinkEmail";
import { NotificationEmail } from "@/emails/NotificationEmail";
import { WeeklyDigestEmail } from "@/emails/WeeklyDigestEmail";
import type { NotifyEventKey } from "@/lib/data/notifications";
import { EVENT_OF, NotifyEvent } from "@/lib/notify/events";
import { PRIVATE_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = { title: "Emails", robots: PRIVATE_ROBOTS };

/** Sample values for every placeholder the notification texts use. */
const SAMPLE = { name: "Aisha", title: "Fitness House Canggu", date: "Nov 7", price: "€528", count: 2, place: "Lisbon", hours: 48, days: 12, amount: "€480", preview: "See you at 6 at the gym!", open: 2, from: "Aisha", to: "Sofia" };
const ORIGIN = "https://simpulo.app";

/**
 * /dev/emails: the React email templates (src/emails) with sample values – one per kind of notification, the collected chat email, the
 * weekly summary and the sign-in link. Nothing is sent; the backend renders the same components and sends them with Resend.
 */
export default async function EmailsPage() {
  const t = await getTranslations("messages.notify");
  const sampleKey = (event: NotifyEvent) => (Object.keys(EVENT_OF) as NotifyEventKey[]).find((key) => EVENT_OF[key] === event)!;
  const emails: Array<{ key: string; note: string; node: ReactNode }> = [
    ...Object.values(NotifyEvent)
      .filter((event) => CHANNELS[event].email === "instant" || CHANNELS[event].email === "optIn")
      .map((event) => ({
        key: event,
        note: CHANNELS[event].email === "optIn" ? "Only with opt-in" : "Right away · can't be switched off",
        node: <NotificationEmail event={event} text={t(sampleKey(event), SAMPLE)} origin={ORIGIN} />,
      })),
    {
      key: "chat_message",
      note: "Only if unread after 60 min, collected",
      node: (
        <ChatDigestEmail
          origin={ORIGIN}
          messages={[
            { from: "Aisha", chat: "Fitness House Canggu", text: "See you at 6 at the gym!" },
            { from: "Tom", chat: "Fitness House Canggu", text: "Who's bringing the speaker?" },
          ]}
        />
      ),
    },
    {
      key: "house_nearby",
      note: "Weekly summary",
      node: (
        <WeeklyDigestEmail
          origin={ORIGIN}
          houses={[
            { title: "Surf House Ericeira", meta: "March 2027 · Ericeira", href: "/house/surf-coach-house-ericeira" },
            { title: "Remote Work House Lisbon", meta: "April 2027 · Lisbon", href: "/house/crypto-builders-house-lisbon" },
          ]}
        />
      ),
    },
    { key: "magic_link", note: "Sign-in", node: <MagicLinkEmail href="/" origin={ORIGIN} /> },
  ];
  return (
    <Container page className="pb-(--space-section)">
      <p className="rounded-2xl bg-ink/6 px-4 py-3 text-small text-ink">Preview only – no email is sent. {emails.length} templates, one layout.</p>
      <h1 className="mt-8 text-h2 text-ink">Emails</h1>
      <ul className="mt-8 grid gap-8 [grid-template-columns:repeat(auto-fill,minmax(420px,1fr))]">
        {emails.map(({ key, note, node }) => (
          <li key={key} className="flex flex-col gap-3">
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

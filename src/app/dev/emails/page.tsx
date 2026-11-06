import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/layout/Container";
import { KEY_TYPE, type NotifyEventKey } from "@/lib/data/notifications";
import { EMAIL_ACTION, renderEmail, type EmailContent } from "@/lib/emails/render";
import { PRIVATE_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = { title: "Emails", robots: PRIVATE_ROBOTS };

/** Sample values for every placeholder the notification texts use. */
const SAMPLE = { name: "Aisha", title: "Fitness House Canggu", date: "Nov 7", price: "€528", count: 2, place: "Lisbon", hours: 48, days: 12, amount: "€480", preview: "See you at 6 at the gym!", open: 2, from: "Aisha", to: "Sofia", recipients: "", channels: "", text: "" };
const ORIGIN = "https://simpulo.app";

/** /dev/emails: every email the app would send, rendered with sample values. Nothing is sent. */
export default async function EmailsPage() {
  const t = await getTranslations("messages.notify");
  const emails: Array<{ key: string; content: EmailContent }> = [
    {
      key: "magicLink",
      content: {
        subject: "Your sign-in link for Simpulo",
        preheader: "Tap to sign in – the link works for 15 minutes.",
        headline: "Sign in to Simpulo",
        lines: ["Tap the button to sign in. The link works once, for 15 minutes.", "Didn't ask for it? Ignore this email – nothing happens."],
        action: { label: "Sign in", href: "/" },
        footer: "You asked to sign in with this email address.",
      },
    },
    ...(Object.keys(KEY_TYPE) as NotifyEventKey[]).map((key) => {
      const text = t(key, SAMPLE);
      const action = EMAIL_ACTION[KEY_TYPE[key]];
      return {
        key,
        content: { subject: text, preheader: text, headline: text, lines: ["Everything else is on Simpulo."], action: { label: action.label, href: action.path }, footer: "You get this because of your Houses on Simpulo." },
      };
    }),
  ];
  return (
    <Container page className="pb-(--space-section)">
      <p className="rounded-2xl bg-ink/6 px-4 py-3 text-small text-ink">Preview only – no email is sent. {emails.length} templates, one layout.</p>
      <h1 className="mt-8 text-h2 text-ink">Emails</h1>
      <ul className="mt-8 grid gap-8 [grid-template-columns:repeat(auto-fill,minmax(420px,1fr))]">
        {emails.map(({ key, content }) => (
          <li key={key} className="flex flex-col gap-3">
            <div>
              <p className="text-eyebrow uppercase text-ink/55">{key}</p>
              <p className="mt-1 truncate text-body font-semibold text-ink">{content.subject}</p>
            </div>
            <iframe title={key} srcDoc={renderEmail(content, ORIGIN)} className="h-[520px] w-full rounded-3xl border-0 bg-bg" />
          </li>
        ))}
      </ul>
    </Container>
  );
}

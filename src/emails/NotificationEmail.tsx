import { ALWAYS_ON, NOTIFY_CATALOG, type CatalogId } from "@/config/notifications";
import { catalogText } from "@/lib/notify";
import type { EmailHouse } from "@/lib/notify/channels/email";
import { EMAIL_COLORS, EmailLayout, EmailText, unsubscribeHref } from "./EmailLayout";

/**
 * One notification by email – every entry of the catalogue (config/notifications.ts) renders here: the line about it as the headline, the
 * entry's body, its one button. `headline` is the detailed line (the in-app text); without it the subject.
 */
export function NotificationEmail({ id, house, headline, body, href, origin, houses }: { id: CatalogId; house?: string; headline?: string; body?: string; href?: string; origin: string; /** Up to three similar Houses under the text */ houses?: EmailHouse[] }) {
  const entry = NOTIFY_CATALOG[id];
  const words = catalogText(id, house);
  return (
    <EmailLayout preview={words.body} headline={headline ?? words.subject} action={{ label: words.action, href: href ?? entry.path }} origin={origin} unsubscribeHref={unsubscribeHref(entry.category, ALWAYS_ON.includes(entry.category))}>
      <EmailText>{body ?? words.body}</EmailText>
      {houses?.slice(0, 3).map((h) => (
        <p key={h.href} style={{ margin: "0 0 12px", fontSize: 15, lineHeight: 1.5 }}>
          <a href={`${origin}${h.href}`} style={{ color: EMAIL_COLORS.ink, fontWeight: 600, textDecoration: "none" }}>
            {h.title}
          </a>
          <br />
          <span style={{ color: EMAIL_COLORS.muted, fontSize: 13 }}>{h.meta}</span>
        </p>
      ))}
    </EmailLayout>
  );
}

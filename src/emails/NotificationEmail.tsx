import { ALWAYS_ON, NOTIFY_CATALOG, type CatalogId } from "@/config/notifications";
import { catalogText } from "@/lib/notify";
import { EmailLayout, EmailText, unsubscribeHref } from "./EmailLayout";

/**
 * One notification by email – every entry of the catalogue (config/notifications.ts) renders here: the line about it as the headline, the
 * entry's body, its one button. `headline` is the detailed line (the in-app text); without it the subject.
 */
export function NotificationEmail({ id, house, headline, body, href, origin }: { id: CatalogId; house?: string; headline?: string; body?: string; href?: string; origin: string }) {
  const entry = NOTIFY_CATALOG[id];
  const words = catalogText(id, house);
  return (
    <EmailLayout preview={words.body} headline={headline ?? words.subject} action={{ label: words.action, href: href ?? entry.path }} origin={origin} unsubscribeHref={unsubscribeHref(entry.category, ALWAYS_ON.includes(entry.category))}>
      <EmailText>{body ?? words.body}</EmailText>
    </EmailLayout>
  );
}

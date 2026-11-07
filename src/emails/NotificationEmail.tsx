import { CHANNELS } from "@/config/notifications";
import type { NotifyEvent } from "@/lib/notify/events";
import { EmailLayout, EmailText } from "./EmailLayout";
import { EMAIL_ACTION, unsubscribeHref } from "./actions";

/** One notification by email: its line as the headline, one sentence, the action of its kind. */
export function NotificationEmail({ event, text, href, origin }: { event: NotifyEvent; text: string; href?: string; origin: string }) {
  const action = EMAIL_ACTION[event];
  return (
    <EmailLayout preview={text} headline={text} action={{ label: action.label, href: href ?? action.path }} origin={origin} unsubscribeHref={unsubscribeHref(CHANNELS[event].category)}>
      <EmailText>Everything else is on Simpulo.</EmailText>
    </EmailLayout>
  );
}

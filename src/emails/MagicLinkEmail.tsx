import { tEn } from "@/lib/i18n/translate";
import { EmailLayout, EmailText } from "./EmailLayout";

/** The sign-in link – no unsubscribe: you asked for it. */
export function MagicLinkEmail({ href, origin }: { href: string; origin: string }) {
  return (
    <EmailLayout preview={tEn("emails.magicLink.preview")} headline={tEn("emails.magicLink.headline")} action={{ label: tEn("emails.magicLink.action"), href }} origin={origin}>
      <EmailText>{tEn("emails.magicLink.body")}</EmailText>
      <EmailText>{tEn("emails.magicLink.ignore")}</EmailText>
    </EmailLayout>
  );
}

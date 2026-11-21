import { tEn } from "@/lib/i18n/translate";
import { EMAIL_COLORS, EmailLayout, EmailText, unsubscribeHref } from "./EmailLayout";

export interface DigestItem {
  /** The line about it */
  headline: string;
  href: string;
}

/** The daily bundle: everything of one day that isn't money or a deadline, in one email (lib/notify/channels/email › addToDaily). */
export function DailyDigestEmail({ items, origin }: { items: DigestItem[]; origin: string }) {
  const headline = tEn("notifications.digest.headline", { count: items.length });
  return (
    <EmailLayout preview={items.map((i) => i.headline).join(" · ")} headline={headline} action={{ label: tEn("notifications.digest.action"), href: "/your-houses" }} origin={origin} unsubscribeHref={unsubscribeHref("arc", false)}>
      <EmailText>{tEn("notifications.digest.intro")}</EmailText>
      {items.map((item, i) => (
        <p key={i} style={{ margin: "0 0 12px", fontSize: 15, lineHeight: 1.5 }}>
          <a href={`${origin}${item.href}`} style={{ color: EMAIL_COLORS.ink, fontWeight: 600, textDecoration: "none" }}>
            {item.headline}
          </a>
        </p>
      ))}
    </EmailLayout>
  );
}

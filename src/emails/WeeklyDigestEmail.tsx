import { tEn } from "@/lib/i18n/translate";
import { EMAIL_COLORS, EmailLayout, EmailText, unsubscribeHref } from "./EmailLayout";


export interface DigestHouse {
  title: string;
  /** "Mar 2027 · Lisbon" */
  meta: string;
  href: string;
}

/** New Houses near your searches, once a week. */
export function WeeklyDigestEmail({ houses, origin }: { houses: DigestHouse[]; origin: string }) {
  const headline = tEn("emails.weekly.headline", { count: houses.length });
  return (
    <EmailLayout preview={houses.map((h) => h.title).join(" · ")} headline={headline} action={{ label: tEn("emails.weekly.action"), href: "/explore" }} origin={origin} unsubscribeHref={unsubscribeHref("nearby", false)}>
      <EmailText>{tEn("emails.weekly.intro")}</EmailText>
      {houses.map((h) => (
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

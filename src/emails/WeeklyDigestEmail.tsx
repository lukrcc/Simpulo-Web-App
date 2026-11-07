import { EMAIL_COLORS, EmailLayout, EmailText } from "./EmailLayout";
import { unsubscribeHref } from "./actions";

export interface DigestHouse {
  title: string;
  /** "Mar 2027 · Lisbon" */
  meta: string;
  href: string;
}

/** New Houses near your searches, once a week. */
export function WeeklyDigestEmail({ houses, origin }: { houses: DigestHouse[]; origin: string }) {
  const headline = houses.length === 1 ? "A new House near your search" : `${houses.length} new Houses near your searches`;
  return (
    <EmailLayout preview={houses.map((h) => h.title).join(" · ")} headline={headline} action={{ label: "See them on Simpulo", href: "/explore" }} origin={origin} unsubscribeHref={unsubscribeHref("nearby")}>
      <EmailText>This week on Simpulo:</EmailText>
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

// The one email layout (mock – rendered by the backend later, sent with Resend): light warm page, the wordmark, the content on a soft
// card, ONE black button, and a footer with the notification settings, the Impressum, Privacy and – for groups you can switch off – an
// unsubscribe link (always-on emails say why they come instead). Tables and inline styles only: that's what mail clients understand.
// No tracking pixels, no tracked or redirected links, no remote images: every link goes straight to simpulo (CLAUDE.md "Benachrichtigungen").
import { tEn } from "@/lib/i18n/translate";
import type { ReactNode } from "react";

export const EMAIL_COLORS = { page: "#F2F0EB", card: "#FBFAF7", ink: "#221E1B", muted: "#77706A", accent: "#F0633A" } as const;
export const EMAIL_FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Helvetica, Arial, sans-serif";
const C = EMAIL_COLORS;

export interface EmailLayoutProps {
  /** Shown in the inbox list before opening */
  preview: string;
  headline: string;
  children?: ReactNode;
  action: { label: string; href: string };
  /** Absolute origin for every link (https://simpulo.app) */
  origin: string;
  /** Only for groups you can switch off (chat, House tips, nearby, news): "Unsubscribe from these emails" – else the line why it comes */
  unsubscribeHref?: string;
}

/** Groups you can switch off get an unsubscribe link (a signed token from the backend later); the always-on ones don't. */
export function unsubscribeHref(category: string, alwaysOn: boolean): string | undefined {
  return alwaysOn ? undefined : `/settings?unsubscribe=${category}#notifications`;
}

const abs = (origin: string, href: string) => (href.startsWith("http") ? href : `${origin}${href}`);

export function EmailLayout({ preview, headline, children, action, origin, unsubscribeHref }: EmailLayoutProps) {
  return (
    <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ background: C.page, padding: "40px 16px", fontFamily: EMAIL_FONT }}>
      <tbody>
        <tr>
          <td align="center">
            <span style={{ display: "none", maxHeight: 0, overflow: "hidden", opacity: 0 }}>{preview}</span>
            <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ maxWidth: 560 }}>
              <tbody>
                <tr>
                  <td style={{ padding: "0 8px 24px", fontSize: 22, fontWeight: 700, letterSpacing: "-0.5px", color: C.ink }}>
                    {tEn("emails.wordmark")}<span style={{ color: C.accent }}>.</span>
                  </td>
                </tr>
                <tr>
                  <td style={{ background: C.card, borderRadius: 24, padding: 40, boxShadow: "0 1px 2px rgba(0,0,0,0.04),0 8px 24px rgba(0,0,0,0.06)" }}>
                    <h1 style={{ margin: "0 0 16px", fontSize: 24, lineHeight: 1.25, fontWeight: 700, letterSpacing: "-0.4px", color: C.ink }}>{headline}</h1>
                    {children}
                    <table role="presentation" cellPadding={0} cellSpacing={0} style={{ marginTop: 24 }}>
                      <tbody>
                        <tr>
                          <td style={{ borderRadius: 999, background: C.ink }}>
                            <a href={abs(origin, action.href)} style={{ display: "inline-block", padding: "14px 28px", fontSize: 15, fontWeight: 600, color: "#FBFAF7", textDecoration: "none", borderRadius: 999 }}>
                              {action.label}
                            </a>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "24px 8px 0", fontSize: 13, lineHeight: 1.5, color: C.muted }}>
                    {!unsubscribeHref && <p style={{ margin: "0 0 8px" }}>{tEn("emails.always")}</p>}
                    <a href={`${origin}/settings/notifications`} style={{ color: C.muted }}>
                      {tEn("emails.settings")}
                    </a>
                    {" · "}
                    <a href={`${origin}/impressum`} style={{ color: C.muted }}>
                      {tEn("emails.impressum")}
                    </a>
                    {" · "}
                    <a href={`${origin}/privacy`} style={{ color: C.muted }}>
                      {tEn("emails.privacy")}
                    </a>
                    {unsubscribeHref && (
                      <>
                        {" · "}
                        <a href={abs(origin, unsubscribeHref)} style={{ color: C.muted }}>
                          {tEn("emails.unsubscribe")}
                        </a>
                      </>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/** A muted paragraph inside the card. */
export function EmailText({ children }: { children: ReactNode }) {
  return <p style={{ margin: "0 0 12px", fontSize: 15, lineHeight: 1.55, color: C.muted }}>{children}</p>;
}

// Email templates – one calm layout for every notification and the magic link: light, the wordmark, a headline, a few lines, ONE action.
// Plain HTML strings with inline styles and tables (what mail clients understand). Previews at /dev/emails; nothing is sent yet – the
// backend will render these same templates.
import type { NotificationType } from "../data/notifications";

const C = { page: "#F2F0EB", card: "#FBFAF7", ink: "#221E1B", muted: "#77706A", accent: "#F0633A", line: "rgba(34,30,27,0.08)" };
const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Helvetica, Arial, sans-serif";

const escape = (text: string) => text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export interface EmailContent {
  subject: string;
  /** Shown in the inbox list before opening */
  preheader: string;
  headline: string;
  lines: string[];
  action: { label: string; href: string };
  /** Why they got it – small, under the card */
  footer: string;
}

/** The action each kind of notification leads to. */
export const EMAIL_ACTION: Record<NotificationType, { label: string; path: string }> = {
  request_received: { label: "See the request", path: "/your-houses" },
  request_accepted: { label: "Open your House", path: "/your-houses" },
  request_declined: { label: "Find another House", path: "/" },
  crew_full: { label: "Open the House chat", path: "/messages" },
  house_locked: { label: "See the place", path: "/your-houses" },
  payment_due: { label: "Pay your share", path: "/your-houses" },
  new_message: { label: "Reply", path: "/messages" },
  house_opened_in_place: { label: "See the House", path: "/" },
  crew_invite: { label: "See your invite", path: "/your-houses" },
  do_it_again: { label: "Open it again", path: "/your-houses" },
  system: { label: "Open Simpulo", path: "/your-houses" },
};

export function renderEmail(content: EmailContent, origin: string): string {
  const href = content.action.href.startsWith("http") ? content.action.href : `${origin}${content.action.href}`;
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(content.subject)}</title></head>
<body style="margin:0;padding:0;background:${C.page};">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escape(content.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page};padding:40px 16px;font-family:${FONT};">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
      <tr><td style="padding:0 8px 24px;font-size:22px;font-weight:700;letter-spacing:-0.5px;color:${C.ink};">simpulo<span style="color:${C.accent};">.</span></td></tr>
      <tr><td style="background:${C.card};border-radius:24px;padding:40px;box-shadow:0 1px 2px rgba(0,0,0,0.04),0 8px 24px rgba(0,0,0,0.06);">
        <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;font-weight:700;letter-spacing:-0.4px;color:${C.ink};">${escape(content.headline)}</h1>
        ${content.lines.map((line) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:${C.muted};">${escape(line)}</p>`).join("")}
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;"><tr><td style="border-radius:999px;background:${C.ink};">
          <a href="${escape(href)}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;">${escape(content.action.label)}</a>
        </td></tr></table>
      </td></tr>
      <tr><td style="padding:24px 8px 0;font-size:13px;line-height:1.5;color:${C.muted};">${escape(content.footer)}<br><a href="${origin}/settings#notifications" style="color:${C.muted};">Email settings</a> · <a href="${origin}/privacy" style="color:${C.muted};">Privacy</a></td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

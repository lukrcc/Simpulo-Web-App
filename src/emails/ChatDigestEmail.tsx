import { tEn } from "@/lib/i18n/translate";
import { EMAIL_COLORS, EmailLayout } from "./EmailLayout";
import { unsubscribeHref } from "./actions";

export interface DigestMessage {
  from: string;
  chat: string;
  text: string;
}

/** Chat messages still unread an hour later, collected into one email. */
export function ChatDigestEmail({ messages, origin }: { messages: DigestMessage[]; origin: string }) {
  const headline = tEn("emails.chatDigest.headline", { count: messages.length, name: messages[0]?.from ?? "" });
  return (
    <EmailLayout preview={messages[0]?.text ?? headline} headline={headline} action={{ label: tEn("emails.chatDigest.action"), href: "/messages" }} origin={origin} unsubscribeHref={unsubscribeHref("messages")}>
      {messages.map((m, i) => (
        <p key={i} style={{ margin: "0 0 12px", fontSize: 15, lineHeight: 1.5, color: EMAIL_COLORS.ink }}>
          <strong>{m.from}</strong> <span style={{ color: EMAIL_COLORS.muted }}>· {m.chat}</span>
          <br />
          <span style={{ color: EMAIL_COLORS.muted }}>{m.text}</span>
        </p>
      ))}
    </EmailLayout>
  );
}

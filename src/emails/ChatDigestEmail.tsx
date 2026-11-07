import { EMAIL_COLORS, EmailLayout } from "./EmailLayout";
import { unsubscribeHref } from "./actions";

export interface DigestMessage {
  from: string;
  chat: string;
  text: string;
}

/** Chat messages still unread an hour later, collected into one email. */
export function ChatDigestEmail({ messages, origin }: { messages: DigestMessage[]; origin: string }) {
  const headline = messages.length === 1 ? `${messages[0].from} wrote to you` : `${messages.length} unread messages`;
  return (
    <EmailLayout preview={messages[0]?.text ?? headline} headline={headline} action={{ label: "Reply", href: "/messages" }} origin={origin} unsubscribeHref={unsubscribeHref("messages")}>
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

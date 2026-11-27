import { messageType } from "@/lib/store";
import type { Message } from "@/lib/types";

/** Messages from the same sender within this window collapse into one group. */
const GROUP_WINDOW_MS = 5 * 60 * 1000;

/** A gap longer than this between two messages gets a centred time line (CLAUDE.md "Messages: ruhiger Verlauf"). */
const TIME_GAP_MS = 30 * 60 * 1000;

/** Distance (px) from the bottom that still counts as "at the bottom" (auto-scroll, no "new messages" pill). */
export const BOTTOM_THRESHOLD = 80;

export const QUICK_REACTIONS = ["👍", "❤️", "😂", "🔥", "🙌", "👀"] as const;

export const PICKER_EMOJIS = [
  "😀", "😂", "🥹", "😍", "😎", "🤩", "😅", "😉", "🤔", "😴",
  "🥳", "😬", "🙃", "😭", "🤯", "🙏", "👍", "👋", "👏", "🙌",
  "💪", "🤙", "❤️", "🔥", "✨", "🎉", "👀", "💯", "✅", "📍",
  "🏠", "🏖️", "🌴", "🌊", "⛰️", "☀️", "✈️", "🍕", "🍻", "☕",
] as const;

export type ChatRow =
  | { kind: "day"; key: string; day: string }
  | { kind: "unread"; key: string }
  /** A centred grey time – before a message more than 30 min after the one before it (also the first of a day) */
  | { kind: "time"; key: string; at: string }
  /** System and payment lines – centered, never grouped */
  | { kind: "line"; key: string; message: Message }
  /** A Simpulo card of the arc (message.arcStep) – centered, never grouped */
  | { kind: "arc"; key: string; message: Message }
  /** A person's message; first/last mark the edges of a same-sender group */
  | { kind: "message"; key: string; message: Message; first: boolean; last: boolean };

/** UTC calendar day, like the formatters. */
export const dayOf = (iso: string) => iso.slice(0, 10);

const isLine = (message: Message) => {
  const type = messageType(message);
  return type === "system" || message.senderId === "system";
};

/** Day dividers, the "New messages" divider and same-sender groups, in display order. */
export function buildRows(messages: Message[], firstUnreadId: string | null): ChatRow[] {
  const rows: ChatRow[] = [];
  let open: Extract<ChatRow, { kind: "message" }> | null = null;

  messages.forEach((message, i) => {
    const previous = messages[i - 1];
    const newDay = !previous || dayOf(previous.createdAt) !== dayOf(message.createdAt);
    const unread = message.id === firstUnreadId;
    if (newDay) rows.push({ kind: "day", key: `day-${dayOf(message.createdAt)}`, day: dayOf(message.createdAt) });
    if (unread) rows.push({ kind: "unread", key: "unread" });
    // A time line when more than 30 min lie between this message and the one before (either direction – newest first builds from the reversed list).
    if (!previous || Math.abs(new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime()) > TIME_GAP_MS) rows.push({ kind: "time", key: `time-${message.id}`, at: message.createdAt });

    if (message.arcStep) {
      open = null;
      rows.push({ kind: "arc", key: message.id, message });
      return;
    }
    if (isLine(message)) {
      open = null;
      rows.push({ kind: "line", key: message.id, message });
      return;
    }

    const continues =
      open !== null &&
      !newDay &&
      !unread &&
      open.message.senderId === message.senderId &&
      // Either direction (the newest-first chat builds its rows from the reversed list).
      Math.abs(new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime()) <= GROUP_WINDOW_MS;
    if (open && continues) open.last = false;
    const row: Extract<ChatRow, { kind: "message" }> = { kind: "message", key: message.id, message, first: !continues, last: true };
    rows.push(row);
    open = row;
  });
  return rows;
}

/** "1.2 MB" in the active locale. */
export function formatSize(bytes: number, locale: string): string {
  const [value, unit] = bytes >= 1024 * 1024 ? [bytes / 1024 / 1024, "megabyte"] : [Math.max(1, bytes / 1024), "kilobyte"];
  return new Intl.NumberFormat(locale, { style: "unit", unit, unitDisplay: "short", maximumFractionDigits: 1 }).format(value);
}

/** Scroll offset of `el` inside the scroll container `pane`. */
export function offsetIn(pane: HTMLElement, el: HTMLElement): number {
  return el.getBoundingClientRect().top - pane.getBoundingClientRect().top + pane.scrollTop;
}

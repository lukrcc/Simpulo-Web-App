"use client";

// The chat background picker (config/chat-themes.ts): small round previews – the ground with a sliver of each bubble – and a check on the
// chosen one. `threadId`: this chat (with "Same as all chats" to follow the default); null: the default for all chats (Settings › Chats).
// No free colours. Stored on the account via the store (setChatTheme), so it follows the person to every device and only they see it.
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { CHAT_THEME_IDS, CHAT_THEMES, chatThemePreview, type ChatThemeId } from "@/config/chat-themes";
import { useHydrated } from "@/lib/useHydrated";
import { chatThemeOf, settingsOf, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

function Swatch({ id, selected, onPick, label }: { id: ChatThemeId; selected: boolean; onPick: () => void; label: string }) {
  const theme = CHAT_THEMES[id];
  return (
    <button type="button" onClick={onPick} aria-pressed={selected} className="group flex w-16 flex-col items-center gap-2 rounded-xl outline-offset-4">
      {/* The preview: the ground, an others' bubble on the left, yours on the right ("house" carries a hint of a House colour). */}
      <span
        aria-hidden
        className={cn(
          "relative flex size-14 items-center justify-center overflow-hidden rounded-full shadow-[inset_0_0_0_1px_var(--line)] outline-offset-2 transition-[outline-color] duration-150",
          selected ? "outline-2 outline-(--text)" : "outline-2 outline-transparent",
        )}
        style={{ background: chatThemePreview(id) }}
      >
        <span className="absolute top-3.5 left-2.5 h-3 w-6 rounded-full" style={{ background: theme.other }} />
        <span className="absolute right-2.5 bottom-3.5 h-3 w-6 rounded-full" style={{ background: theme.own }} />
        {selected && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-5 items-center justify-center rounded-full" style={{ background: theme.own, color: theme.ownText }}>
              <Check className="size-3" strokeWidth={3} />
            </span>
          </span>
        )}
      </span>
      <span className={cn("text-small", selected ? "text-ink" : "text-muted")}>{label}</span>
    </button>
  );
}

/** The six previews in a row; `value` null = "Same as all chats" (only for one chat). */
export function ChatBackgroundPicker({ threadId, onPicked }: { threadId: string | null; /** After a choice (Settings: "Saved ✓") */ onPicked?: () => void }) {
  const t = useTranslations("messages.chatTheme");
  const store = useStore();
  const settings = settingsOf(store.users.find((u) => u.id === store.currentUserId));
  const own = threadId ? settings.chatThemes?.[threadId] ?? null : settings.chatTheme ?? "house";
  const all = settings.chatTheme ?? "house";
  return (
    <div className="flex flex-col gap-5" data-chat-theme-picker>
      <div className="flex flex-wrap gap-x-3 gap-y-4">
        {CHAT_THEME_IDS.map((id) => (
          <Swatch key={id} id={id} label={t(`names.${id}`)} selected={own === id} onPick={() => { store.setChatTheme(threadId, id); onPicked?.(); }} />
        ))}
      </div>
      {threadId && (
        <button
          type="button"
          aria-pressed={own === null}
          onClick={() => store.setChatTheme(threadId, null)}
          className={cn("self-start text-body", own === null ? "font-semibold text-ink" : "text-muted hover:text-ink")}
        >
          {t("sameAsAll")} · {t(`names.${all}`)}
        </button>
      )}
    </div>
  );
}

/**
 * At the top of the chat's "…": "Chat background" and a row of round dots (28px) – house · cream · stone · mist · sand · night
 * (config/chat-themes.ts). The active one with a ring; a click changes it right away and the menu stays open (not an entry).
 */
export function ChatThemeDots({ threadId }: { threadId: string }) {
  const t = useTranslations("messages.chatTheme");
  const store = useStore();
  const active = chatThemeOf(store, threadId);
  return (
    <div data-chat-theme-dots>
      <p className="mb-2.5 text-small font-semibold text-muted">{t("menu")}</p>
      <div role="radiogroup" aria-label={t("menu")} className="flex items-center gap-2.5">
        {CHAT_THEME_IDS.map((id) => {
          const theme = CHAT_THEMES[id];
          const on = active === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={t(`names.${id}`)}
              onClick={() => store.setChatTheme(threadId, id)}
              className={cn(
                // The ring: an outline 2px off the dot (a second box-shadow class would lose to the first).
                "relative size-7 shrink-0 overflow-hidden rounded-full shadow-[inset_0_0_0_1px_var(--line)] outline-offset-2 transition-[outline-color] duration-150",
                on ? "outline-2 outline-(--text)" : "outline-2 outline-transparent",
              )}
              style={{ background: chatThemePreview(id) }}
            >
              {/* Half of the dot in the own bubble's colour: the ground and the bubble at a glance. */}
              <span aria-hidden className="absolute inset-y-0 right-0 w-1/2" style={{ background: theme.own }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Once per person (the flag on the account: settings.seenHints "chatTheme"): a small bubble at the chat's "…" – gone on a click, never again. */
export function ChatThemeHint() {
  const t = useTranslations("messages.chatTheme");
  const store = useStore();
  const hydrated = useHydrated();
  const me = store.users.find((u) => u.id === store.currentUserId);
  if (!hydrated || !me || settingsOf(me).seenHints?.includes("chatTheme")) return null;
  return (
    <button
      type="button"
      data-chat-theme-hint
      onClick={() => store.markHintSeen("chatTheme")}
      className="tooltip-bubble animate-fade-in absolute right-0 top-full z-30 mt-2 whitespace-nowrap rounded-[10px] px-3 py-2 text-small text-white"
    >
      {/* The small tip pointing up at the "…" */}
      <span aria-hidden className="tooltip-bubble absolute -top-1 right-3.5 size-2.5 rotate-45 rounded-[2px]" />
      <span className="relative">{t("hint")}</span>
    </button>
  );
}

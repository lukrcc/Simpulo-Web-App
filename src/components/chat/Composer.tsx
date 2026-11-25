"use client";

import { useFormatLocale } from "@/i18n/formatLocale";
import { ArrowUp, FileText, Paperclip, Reply, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type ClipboardEvent, type KeyboardEvent } from "react";
import { LinkPreviewCard } from "@/components/stay/LinkPreviewCard";
import { IconButton } from "@/components/ui/IconButton";
import { previewForUrl } from "@/lib/data";
import { useStore } from "@/lib/store";
import type { Attachment } from "@/lib/types";
import { cn, findUrls } from "@/lib/utils";
import { formatSize } from "./chatUtils";
import { EmojiPicker } from "./EmojiPicker";
import { MEDIA } from "@/config/breakpoints";

/** Up to five lines (16px type, 22px lines) and the field's inner padding – four on phones (< 744px), the keyboard takes the rest. */
const MAX_HEIGHT = 5 * 22 + 16;
const MAX_HEIGHT_PHONE = 4 * 22 + 16;

interface PendingFile {
  file: File;
  /** Object URL – the preview now, the attachment's url once sent */
  url: string;
}

export interface ReplyDraft {
  id: string;
  name: string;
  text: string;
}

interface ComposerProps {
  threadId: string;
  placeholder: string;
  replyTo: ReplyDraft | null;
  onCancelReply: () => void;
  /** Instead of the store's sendMessage (Simpulo Support: a follow-up to the ticket); text only */
  onSend?: (text: string) => void;
}

/**
 * Paperclip (photos, PDFs), emoji, auto-growing textarea, send. Enter sends, Shift+Enter adds a line.
 * Pasting a link previews it above the textarea before sending.
 */
export function Composer({ threadId, placeholder, replyTo, onCancelReply, onSend }: ComposerProps) {
  const t = useTranslations("messages.thread");
  const locale = useFormatLocale();
  const { sendMessage } = useStore();
  const [text, setText] = useState("");
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [pastedUrl, setPastedUrl] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, window.matchMedia(MEDIA.phone).matches ? MAX_HEIGHT_PHONE : MAX_HEIGHT)}px`;
  }, [text]);

  useEffect(() => {
    if (replyTo) textareaRef.current?.focus();
  }, [replyTo]);

  // A draft left for this chat (the Crew page's "Say hi": "Hi, I'm Lukas – "): taken once, the field focused at its end.
  useEffect(() => {
    const key = `simpulo:draft:${threadId}`;
    let draft: string | null = null;
    try {
      draft = sessionStorage.getItem(key);
      if (draft) sessionStorage.removeItem(key);
    } catch {
      // no draft
    }
    if (!draft) return;
    const value = draft;
    queueMicrotask(() => {
      setText(value);
      const el = textareaRef.current;
      if (el) {
        el.focus();
        requestAnimationFrame(() => el.setSelectionRange(value.length, value.length));
      }
    });
  }, [threadId]);

  const canSend = text.trim() !== "" || files.length > 0;
  // The preview only while the pasted link is still in the text.
  const preview = pastedUrl && text.includes(pastedUrl) ? pastedUrl : null;

  function send() {
    if (!canSend) return;
    const attachments: Attachment[] = files.map(({ file, url }) => ({
      kind: file.type.startsWith("image/") ? "image" : "file",
      url,
      name: file.name,
      size: file.size,
    }));
    if (onSend) {
      if (text.trim()) onSend(text.trim());
    } else sendMessage(threadId, text, { ...(attachments.length > 0 && { attachments }), ...(replyTo && { replyToId: replyTo.id }) });
    setText("");
    setFiles([]);
    setPastedUrl(null);
    if (replyTo) onCancelReply();
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Not while an IME is composing (e.g. Japanese input confirms with Enter).
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
    if (e.key === "Escape" && replyTo) onCancelReply();
  }

  function onPaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const url = findUrls(e.clipboardData.getData("text"))[0];
    if (url) setPastedUrl(url);
  }

  function onFiles(e: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []).map((file) => ({ file, url: URL.createObjectURL(file) }));
    setFiles((current) => [...current, ...picked]);
    // Same file again → change fires again.
    e.target.value = "";
  }

  function removeFile(url: string) {
    URL.revokeObjectURL(url);
    setFiles((current) => current.filter((f) => f.url !== url));
  }

  function insertEmoji(emoji: string) {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    setText(text.slice(0, start) + emoji + text.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  }

  return (
    <div>
      {replyTo && (
        <div className="mb-2 flex items-center gap-2 rounded-2xl bg-ink/5 py-1.5 pl-3 pr-1.5">
          <Reply className="size-4 shrink-0 text-muted" aria-hidden />
          <div className="min-w-0 flex-1 border-l-2 border-ink/20 pl-2 text-small">
            <p className="font-semibold text-ink">{t("replyingTo", { name: replyTo.name })}</p>
            <p className="truncate text-muted">{replyTo.text}</p>
          </div>
          <IconButton size="xs" onClick={onCancelReply} aria-label={t("cancelReply")}>
            <X className="size-4" />
          </IconButton>
        </div>
      )}

      {preview && (
        <div className="relative mb-2 max-w-[420px]">
          <LinkPreviewCard href={preview} preview={previewForUrl(preview)} layout="compact" />
          <button
            type="button"
            onClick={() => setPastedUrl(null)}
            aria-label={t("removePreview")}
            className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-surface shadow-(--shadow-sm) text-ink hover:bg-bg"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {files.length > 0 && (
        <ul className="mb-2 flex gap-2 overflow-x-auto pb-1 pt-2">
          {files.map(({ file, url }) => (
            <li key={url} className="relative shrink-0">
              {file.type.startsWith("image/") ? (
                // Local blob: URL – nothing for next/image to optimize.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt={file.name} className="size-16 rounded-xl object-cover" />
              ) : (
                <div className="flex h-16 w-48 items-center gap-2 rounded-xl bg-surface shadow-(--shadow-sm) px-3">
                  <FileText className="size-5 shrink-0 text-muted" aria-hidden />
                  <div className="min-w-0">
                    <p className="truncate text-small font-medium">{file.name}</p>
                    <p className="text-small text-muted">{formatSize(file.size, locale)}</p>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => removeFile(url)}
                aria-label={t("removeAttachment", { name: file.name })}
                className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-surface shadow-(--shadow-sm) text-ink hover:bg-bg"
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        // A flat line (CLAUDE.md "Messenger – flaches Eingabefeld"): no capsule, no edge, no fill – the fine line to the messages is the
        // frame's (ThreadFrame); 52px, it grows to five lines.
        // CLAUDE.md "Messages: Kopf oben, Schreibleiste unten": a capsule field – filled, no edge, a fine graphite ring on focus.
        className="composer-field flex min-h-13 items-end gap-1 rounded-[26px] bg-(--composer-fill) px-1.5 py-[5px] transition-shadow focus-within:shadow-[0_0_0_1.5px_var(--text)]"
      >
        <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple hidden onChange={onFiles} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label={t("attach")}
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-ink/60 hover:bg-ink/5 hover:text-ink"
        >
          <Paperclip className="size-[18px]" />
        </button>
        <EmojiPicker onPick={insertEmoji} />
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          placeholder={placeholder}
          aria-label={t("messageLabel")}
          className="ml-1 min-h-10 min-w-0 flex-1 resize-none bg-transparent px-1 py-2 text-input text-ink outline-none placeholder:text-ink/45"
        />
        {/* The chat's one main action, 40px: empty grey and disabled; with something to send the action orange (--brand-action, "join in")
            with a white arrow (an icon: 3 : 1 is enough). Enter sends, Shift+Enter a new line. */}
        <button
          type="submit"
          disabled={!canSend}
          aria-label={t("send")}
          className={cn(
            "ml-1 flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-inverse transition-[background-color,color,transform] hover:opacity-90 active:scale-95",
            "disabled:pointer-events-none disabled:bg-ink/8 disabled:text-ink/35",
          )}
        >
          <ArrowUp className="size-[18px]" strokeWidth={2.25} />
        </button>
      </form>
    </div>
  );
}

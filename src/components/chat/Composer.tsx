"use client";

import { ArrowUp, FileText, Paperclip, Reply, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type ClipboardEvent, type KeyboardEvent } from "react";
import { LinkPreviewCard } from "@/components/stay/LinkPreviewCard";
import { mockPreviewForUrl } from "@/lib/mock-extras";
import { useStore } from "@/lib/store";
import type { Attachment } from "@/lib/types";
import { cn, findUrls } from "@/lib/utils";
import { formatSize } from "./chatUtils";
import { EmojiPicker } from "./EmojiPicker";

/** Textarea grows to 6 lines (20px each) plus its 10px top/bottom padding, then scrolls. */
const MAX_HEIGHT = 6 * 20 + 20;

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
}

/**
 * Paperclip (photos, PDFs), emoji, auto-growing textarea, send. Enter sends, Shift+Enter adds a line.
 * Pasting a link previews it above the textarea before sending.
 */
export function Composer({ threadId, placeholder, replyTo, onCancelReply }: ComposerProps) {
  const t = useTranslations("messages.thread");
  const locale = useLocale();
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
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [text]);

  useEffect(() => {
    if (replyTo) textareaRef.current?.focus();
  }, [replyTo]);

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
    sendMessage(threadId, text, { ...(attachments.length > 0 && { attachments }), ...(replyTo && { replyToId: replyTo.id }) });
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
    <div className="shrink-0 bg-[#F0EEEA] px-3 pt-1.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] md:px-4">
      {replyTo && (
        <div className="mb-2 flex items-center gap-2 rounded-2xl bg-white py-1.5 pl-3 pr-1.5 shadow-[0_1px_1px_rgba(0,0,0,0.06)]">
          <Reply className="size-4 shrink-0 text-zinc-400" aria-hidden />
          <div className="min-w-0 flex-1 border-l-[3px] border-accent pl-2 text-xs">
            <p className="font-semibold text-ink">{t("replyingTo", { name: replyTo.name })}</p>
            <p className="truncate text-zinc-500">{replyTo.text}</p>
          </div>
          <button type="button" onClick={onCancelReply} aria-label={t("cancelReply")} className="rounded-full p-1.5 text-zinc-500 hover:bg-zinc-100">
            <X className="size-4" />
          </button>
        </div>
      )}

      {preview && (
        <div className="relative mb-2 max-w-[420px]">
          <LinkPreviewCard href={preview} preview={mockPreviewForUrl(preview)} layout="compact" />
          <button
            type="button"
            onClick={() => setPastedUrl(null)}
            aria-label={t("removePreview")}
            className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-ink text-white shadow"
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
                <div className="flex h-16 w-48 items-center gap-2 rounded-xl bg-white px-3 shadow-[0_1px_1px_rgba(0,0,0,0.06)]">
                  <FileText className="size-5 shrink-0 text-zinc-500" aria-hidden />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{file.name}</p>
                    <p className="text-[11px] text-zinc-500">{formatSize(file.size, locale)}</p>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => removeFile(url)}
                aria-label={t("removeAttachment", { name: file.name })}
                className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-ink text-white shadow"
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
        className="flex items-end gap-1"
      >
        <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple hidden onChange={onFiles} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label={t("attach")}
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-zinc-500 hover:bg-black/5 hover:text-ink"
        >
          <Paperclip className="size-5" />
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
          className="ml-1 min-h-10 min-w-0 flex-1 resize-none rounded-[20px] bg-white px-4 py-2.5 text-sm leading-5 shadow-[0_1px_1px_rgba(0,0,0,0.06)] outline-none ring-1 ring-transparent transition-shadow placeholder:text-zinc-400 focus:ring-black/15"
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label={t("send")}
          className={cn(
            "ml-1 flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-white transition-[background-color,color,transform] hover:bg-[#2A2A30] active:scale-95",
            "disabled:pointer-events-none disabled:bg-black/10 disabled:text-zinc-400",
          )}
        >
          <ArrowUp className="size-5" strokeWidth={2.25} />
        </button>
      </form>
    </div>
  );
}

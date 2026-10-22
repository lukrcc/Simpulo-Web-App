"use client";

import { Smile } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { PICKER_EMOJIS } from "./chatUtils";

/** Smiley button with a small popover grid of emoji; picking one keeps the popover open for more. */
export function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  const t = useTranslations("messages.thread");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("emoji")}
        aria-expanded={open}
        className={cn("flex size-10 items-center justify-center rounded-full hover:bg-zinc-100", open ? "text-ink" : "text-zinc-500")}
      >
        <Smile className="size-5" />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={t("emoji")}
          className="absolute bottom-full left-0 z-40 mb-2 grid w-[288px] grid-cols-8 gap-0.5 rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl"
        >
          {PICKER_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              // Keep the textarea's focus and selection, so the emoji lands at the cursor.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onPick(emoji)}
              className="flex size-8 items-center justify-center rounded-lg text-xl hover:bg-zinc-100"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

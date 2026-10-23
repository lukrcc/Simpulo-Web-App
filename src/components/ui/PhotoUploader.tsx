"use client";

import { ImagePlus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { cn } from "@/lib/utils";
import { Img } from "./Img";

const DEFAULT_SLOTS = 3;
const slotLabel = (slot: number) => (slot === 0 ? "slotFace" : "slotActivity");

interface PhotoUploaderProps {
  /** Filled slots in order (no gaps); [0] is the face photo. */
  photos: string[];
  onChange: (photos: string[]) => void;
  /** Number of slots (3 in the create stepper, 5 on Edit profile) */
  slots?: number;
  /** "profile": "Face" under the first slot, "Add photo" on empty ones, all slots in one row */
  labels?: "stepper" | "profile";
}

const isObjectUrl = (url: string) => url.startsWith("blob:");

/**
 * 4:5 photo slots (three by default): tap to pick (or replace), × to remove, drag to reorder on desktop.
 * Mock: files are only read via URL.createObjectURL and kept in state – nothing is uploaded.
 */
export function PhotoUploader({ photos, onChange, slots = DEFAULT_SLOTS, labels = "stepper" }: PhotoUploaderProps) {
  const profile = labels === "profile";
  const t = useTranslations("common.ui.photoUploader");
  const inputRef = useRef<HTMLInputElement>(null);
  /** Which slot the file picker was opened for. */
  const targetSlot = useRef(0);
  const [dragFrom, setDragFrom] = useState<number | null>(null);

  function pick(slot: number) {
    targetSlot.current = slot;
    inputRef.current?.click();
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again
    if (!file) return;
    const url = URL.createObjectURL(file);
    const next = [...photos];
    const slot = targetSlot.current;
    if (slot < next.length) {
      if (isObjectUrl(next[slot])) URL.revokeObjectURL(next[slot]);
      next[slot] = url; // replace
    } else {
      next.push(url); // fill the next free slot
    }
    onChange(next.slice(0, slots));
  }

  function remove(slot: number) {
    if (isObjectUrl(photos[slot])) URL.revokeObjectURL(photos[slot]);
    onChange(photos.filter((_, i) => i !== slot));
  }

  function drop(e: DragEvent, slot: number) {
    e.preventDefault();
    if (dragFrom === null) return;
    const to = Math.min(slot, photos.length - 1);
    if (to !== dragFrom) {
      const next = [...photos];
      const [moved] = next.splice(dragFrom, 1);
      next.splice(to, 0, moved);
      onChange(next);
    }
    setDragFrom(null);
  }

  return (
    <div>
      <div className={cn("grid gap-3", profile ? (slots === 1 ? "grid-cols-1" : "grid-cols-5") : cn("grid-cols-3", slots > 3 && "sm:grid-cols-5"))}>
        {Array.from({ length: slots }, (_, slot) => {
          const src = photos[slot];
          return (
            <div
              key={slot}
              onDragOver={(e) => dragFrom !== null && e.preventDefault()}
              onDrop={(e) => drop(e, slot)}
              className="min-w-0"
            >
              <div
                draggable={Boolean(src)}
                onDragStart={() => setDragFrom(slot)}
                onDragEnd={() => setDragFrom(null)}
                className={cn(
                  "group relative aspect-4/5 overflow-hidden rounded-2xl",
                  src ? "cursor-grab bg-neutral-200 active:cursor-grabbing" : "border-2 border-dashed",
                  !src && (slot === 0 ? "border-accent/60 bg-accent-soft/50" : "border-neutral-300 bg-white"),
                  dragFrom === slot && "opacity-50",
                )}
              >
                {src ? (
                  <>
                    <Img src={src} alt={t(slotLabel(slot))} fill sizes="200px" className="pointer-events-none object-cover" />
                    <button
                      type="button"
                      onClick={() => pick(slot)}
                      aria-label={t("replace", { index: slot + 1 })}
                      className="absolute inset-0"
                    />
                    <button
                      type="button"
                      onClick={() => remove(slot)}
                      aria-label={t("remove", { index: slot + 1 })}
                      className="glass-dark absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full"
                    >
                      <X className="size-3.5" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => pick(slot)}
                    className="flex size-full flex-col items-center justify-center gap-1.5 p-2 text-center text-zinc-500"
                  >
                    <ImagePlus className={cn("size-6", slot === 0 && "text-accent")} aria-hidden />
                    <span className="text-xs font-medium">{profile ? t("addPhoto") : t(slotLabel(slot))}</span>
                    {slot === 0 && !profile && <span className="text-[10px] uppercase tracking-wide text-accent">{t("required")}</span>}
                  </button>
                )}
              </div>
              {profile && slot === 0 && <p className="mt-1.5 text-center text-xs font-medium text-zinc-500">{t("face")}</p>}
            </div>
          );
        })}
      </div>
      {!profile && photos.length > 1 && <p className="mt-2 hidden text-xs text-zinc-500 md:block">{t("reorderHint")}</p>}
      <input ref={inputRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
    </div>
  );
}

"use client";

// The House's album (CLAUDE.md "Moments-Reiter als Album"): photos and short clips from the crew in a grid, full screen with who added it;
// only the crew sees it. Uploading cleans location data (EXIF/GPS) first and asks for consent – two separate ticks: everyone in it is okay
// with the crew seeing it (required) and Simpulo may use it for its own posts (optional, off). Anyone of the crew in a photo can take it out
// with one tap ("Remove me"), no reason asked.
import { ChevronLeft, ChevronRight, ImagePlus, Images, Play, Plus, X } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/ActionButton";
import { Avatar } from "@/components/ui/Avatar";
import { Checkbox } from "@/components/ui/Checkbox";
import { EmptyState } from "@/components/ui/EmptyState";
import { Img } from "@/components/ui/Img";
import { lockScroll } from "@/components/ui/ModalOverlay";
import { ModalFooter, Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { MEMORY_POLICY } from "@/config/memories";
import { ReportSheet } from "@/components/safety/ReportSheet";
import { track } from "@/lib/analytics";
import { arcDateLabel, useArcNow } from "@/lib/arc";
import { albumOf } from "@/lib/memories";
import { cleanClip, cleanPhoto, clipSeconds, putMedia, useMemorySrc } from "@/lib/memoryMedia";
import { findUser, useStore } from "@/lib/store";
import type { HouseMemory, Stay } from "@/lib/types";
import { cn } from "@/lib/utils";

/** The album of a House for the person looking (only the crew), at the arc's now (the Dev menu's House day). */
export function useAlbum(stay: Stay) {
  const store = useStore();
  const now = useArcNow(stay);
  return albumOf(store, stay, now);
}

function Media({ memory, className, controls = false }: { memory: HouseMemory; className?: string; controls?: boolean }) {
  const src = useMemorySrc(memory);
  if (!src) return <span className={cn("block bg-ink/6", className)} />;
  if (memory.kind === "clip") return <video src={src} className={className} controls={controls} playsInline muted={!controls} preload="metadata" />;
  return <Img src={src} alt="" fill sizes="(min-width: 744px) 25vw, 50vw" className={className} />;
}

/** One square in the grid. */
function Tile({ memory, onOpen, label }: { memory: HouseMemory; onOpen: () => void; label: string }) {
  return (
    <button type="button" onClick={onOpen} aria-label={label} className="relative block aspect-square w-full overflow-hidden rounded-2xl bg-ink/6">
      <Media memory={memory} className="absolute inset-0 size-full object-cover" />
      {memory.kind === "clip" && (
        <span aria-hidden className="absolute right-2 bottom-2 flex size-8 items-center justify-center rounded-full bg-stage/60 text-stage-text">
          <Play className="size-4" />
        </span>
      )}
    </button>
  );
}

/** Full screen (the question deck's dark ground – its tokens, [data-question-deck]): the photo or clip, who added it and when; ‹ › and arrow keys; the uploader removes it, anyone else of the crew "Remove me". */
function Viewer({ stay, list, index, onIndex, onClose, onReport }: { stay: Stay; list: HouseMemory[]; index: number; onIndex: (i: number) => void; onClose: () => void; /** Someone else's photo: report it (the viewer closes first – the sheet sits below it) */ onReport: (memory: HouseMemory) => void }) {
  const t = useTranslations("house.album");
  const store = useStore();
  const showToast = useToast();
  const memory = list[index];
  useEffect(() => {
    const unlock = lockScroll();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") onIndex(Math.min(list.length - 1, index + 1));
      else if (e.key === "ArrowLeft") onIndex(Math.max(0, index - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => {
      unlock();
      window.removeEventListener("keydown", onKey);
    };
  }, [index, list.length, onClose, onIndex]);
  if (!memory || typeof document === "undefined") return null;
  const by = findUser(store, memory.userId);
  const mine = memory.userId === store.currentUserId;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={t("title")} data-album-viewer data-question-deck className="fixed inset-0 z-80 flex flex-col bg-stage text-stage-text">
      <div className="flex items-center justify-between gap-4 px-(--page-margin) pt-[calc(var(--safe-top)+16px)]">
        <div className="flex min-w-0 items-center gap-3">
          {by && <Avatar user={by} size="sm" />}
          <div className="min-w-0">
            <p className="truncate text-body font-semibold">{t("addedBy", { name: by?.name.split(" ")[0] ?? "" })}</p>
            <p className="text-small text-stage-text/70">{arcDateLabel(stay, Date.parse(memory.at), false)}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            size="sm"
            variant="creamOutline"
            onClick={() => {
              store.removeMemory(memory);
              track("memory_removed", { house: stay.id, by: mine ? "uploader" : "pictured" });
              showToast(mine ? t("removedOwn") : t("removedMe"));
              if (list.length <= 1) onClose();
              else onIndex(Math.max(0, Math.min(index, list.length - 2)));
            }}
          >
            {mine ? t("remove") : t("removeMe")}
          </Button>
          {!mine && (
            <Button size="sm" variant="creamOutline" onClick={() => onReport(memory)}>
              {t("report")}
            </Button>
          )}
          <button type="button" onClick={onClose} aria-label={t("close")} className="flex size-11 items-center justify-center rounded-full bg-stage-text/10 hover:bg-stage-text/16">
            <X aria-hidden className="size-5" />
          </button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center gap-4 px-(--page-margin) py-6">
        <button type="button" onClick={() => onIndex(index - 1)} disabled={index === 0} aria-label={t("previous")} className="flex size-12 shrink-0 items-center justify-center rounded-full bg-stage-text/10 disabled:opacity-30 max-md:hidden">
          <ChevronLeft aria-hidden className="size-6" />
        </button>
        <div className="relative h-full w-full max-w-[min(100%,1100px)]">
          <Media key={memory.id} memory={memory} controls className="absolute inset-0 size-full object-contain" />
        </div>
        <button type="button" onClick={() => onIndex(index + 1)} disabled={index === list.length - 1} aria-label={t("next")} className="flex size-12 shrink-0 items-center justify-center rounded-full bg-stage-text/10 disabled:opacity-30 max-md:hidden">
          <ChevronRight aria-hidden className="size-6" />
        </button>
      </div>
      <p className="pb-[calc(var(--safe-bottom)+16px)] text-center text-small text-stage-text/70">
        {t("counter", { n: index + 1, total: list.length })} · {mine ? t("crewOnly") : t("removeHint")}
      </p>
    </div>,
    document.body,
  );
}

/** Moments › Album: the grid (newest last), full screen on a tap, "Add photos" – or the empty state. */
export function AlbumSection({ stay }: { stay: Stay }) {
  const t = useTranslations("house.album");
  const store = useStore();
  const list = useAlbum(stay);
  const [open, setOpen] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [reporting, setReporting] = useState<HouseMemory | null>(null);
  return (
    <section id="moments-album" aria-labelledby="album-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="album-title" className="text-subhead text-ink">
          {t("title")}
          {list.length > 0 && <span className="ml-3 text-body font-medium text-muted">{list.length}</span>}
        </h2>
        {list.length > 0 && (
          <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>
            <Plus aria-hidden />
            {t("add")}
          </Button>
        )}
      </div>
      {list.length === 0 ? (
        <EmptyState
          icon={Images}
          title={t("empty")}
          description={t("emptyText")}
          action={
            <Button onClick={() => setAdding(true)}>
              <ImagePlus aria-hidden />
              {t("addFirst")}
            </Button>
          }
        />
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(140px,100%),1fr))] gap-3">
          {list.map((m, i) => (
            <li key={m.id}>
              <Tile memory={m} onOpen={() => setOpen(i)} label={t("open", { name: findUser(store, m.userId)?.name.split(" ")[0] ?? "" })} />
            </li>
          ))}
        </ul>
      )}
      <p className="text-small text-muted">{t("crewOnly")}</p>
      {open !== null && (
        <Viewer
          stay={stay}
          list={list}
          index={open}
          onIndex={setOpen}
          onClose={() => setOpen(null)}
          onReport={(memory) => {
            setOpen(null);
            setReporting(memory);
          }}
        />
      )}
      {/* Report a photo: the admin sees only this photo (its file), never the album. */}
      <ReportSheet
        open={reporting !== null}
        onClose={() => setReporting(null)}
        target={{ kind: "memory", id: reporting?.id ?? "" }}
        name={reporting ? findUser(store, reporting.userId)?.name.split(" ")[0] : undefined}
        extra={reporting ? { subjectId: reporting.userId, stayId: stay.id, ...(reporting.src && { memorySrc: reporting.src }) } : undefined}
      />
      <UploadSheet stay={stay} open={adding} onClose={() => setAdding(false)} />
    </section>
  );
}

interface Picked {
  key: string;
  file: File;
  kind: "photo" | "clip";
  preview: string;
}

/**
 * Add to the album: pick photos and clips (location data is removed before anything is kept), then two separate ticks – everyone in it is
 * okay with the crew seeing it (required) · Simpulo may use it for its own posts (optional, off).
 */
export function UploadSheet({ stay, open, onClose }: { stay: Stay; open: boolean; onClose: () => void }) {
  const t = useTranslations("house.album");
  const store = useStore();
  const showToast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<Picked[]>([]);
  const [consent, setConsent] = useState(false);
  const [use, setUse] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    for (const p of picked) URL.revokeObjectURL(p.preview);
    setPicked([]);
    setConsent(false);
    setUse(false);
    setError(null);
  };
  const close = () => {
    reset();
    onClose();
  };
  const add = async (files: FileList | null) => {
    if (!files) return;
    setError(null);
    const next: Picked[] = [];
    for (const file of Array.from(files)) {
      const kind = file.type.startsWith("video/") ? "clip" : "photo";
      if (kind === "clip") {
        if (file.size > MEMORY_POLICY.maxClipMb * 1_000_000) {
          setError(t("clipTooBig", { mb: MEMORY_POLICY.maxClipMb }));
          continue;
        }
        const secs = await clipSeconds(file).catch(() => Infinity);
        if (secs > MEMORY_POLICY.maxClipSeconds) {
          setError(t("clipTooLong", { seconds: MEMORY_POLICY.maxClipSeconds }));
          continue;
        }
      }
      next.push({ key: `${file.name}-${file.size}-${file.lastModified}`, file, kind, preview: URL.createObjectURL(file) });
    }
    setPicked((list) => [...list, ...next.filter((n) => !list.some((p) => p.key === n.key))]);
  };
  const upload = async () => {
    setBusy(true);
    const items: HouseMemory[] = [];
    let failed = 0;
    for (const p of picked) {
      try {
        // Location data off before anything is kept (EXIF/GPS; clips: the location boxes).
        const clean = p.kind === "photo" ? await cleanPhoto(p.file) : await cleanClip(p.file);
        const id = `m-${stay.id}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        await putMedia(id, clean);
        items.push({ id, houseId: stay.id, userId: store.currentUserId!, kind: p.kind, at: new Date().toISOString(), crewConsent: true, simpuloUse: use });
      } catch {
        failed++;
      }
    }
    setBusy(false);
    if (items.length) {
      store.addMemories(items);
      // Signals only (data points memory.*): how many, which kind, the consent for Simpulo's posts.
      track("memory_uploaded", { house: stay.id, photos: items.filter((i) => i.kind === "photo").length, clips: items.filter((i) => i.kind === "clip").length, simpuloUse: use });
      showToast(t("added", { count: items.length }));
    }
    if (failed) {
      setError(t("failed", { count: failed }));
      for (const p of picked) URL.revokeObjectURL(p.preview);
      setPicked([]);
      return;
    }
    close();
  };

  return (
    <Sheet open={open} onClose={close} title={t("addTitle")} subtitle={t("addSubtitle")}>
      <input ref={input} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => void add(e.target.files).finally(() => (e.target.value = ""))} />
      {picked.length === 0 ? (
        <button type="button" onClick={() => input.current?.click()} className="flex w-full flex-col items-center justify-center gap-2 rounded-[20px] border border-dashed border-ink/20 px-6 py-10 text-center hover:bg-ink/4">
          <ImagePlus aria-hidden className="size-6 text-muted" />
          <span className="text-body font-semibold text-ink">{t("choose")}</span>
          <span className="text-small text-muted">{t("chooseHint", { seconds: MEMORY_POLICY.maxClipSeconds })}</span>
        </button>
      ) : (
        <ul className="grid grid-cols-4 gap-2">
          {picked.map((p) => (
            <li key={p.key} className="relative aspect-square overflow-hidden rounded-xl bg-ink/6">
              {p.kind === "clip" ? <video src={p.preview} muted playsInline className="size-full object-cover" /> : <Img src={p.preview} alt="" fill sizes="120px" className="object-cover" />}
              <button
                type="button"
                aria-label={t("unpick")}
                onClick={() => {
                  URL.revokeObjectURL(p.preview);
                  setPicked((list) => list.filter((x) => x.key !== p.key));
                }}
                className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-stage/60 text-stage-text"
                data-tap="none"
              >
                <X aria-hidden className="size-3.5" />
              </button>
            </li>
          ))}
          <li>
            <button type="button" onClick={() => input.current?.click()} aria-label={t("chooseMore")} className="flex aspect-square w-full items-center justify-center rounded-xl border border-dashed border-ink/20 text-muted hover:bg-ink/4">
              <Plus aria-hidden className="size-5" />
            </button>
          </li>
        </ul>
      )}
      <p className="mt-3 text-small text-muted">{t("location")}</p>
      <div className="mt-5 flex flex-col gap-1">
        <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2">
          <Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
          <span className="text-body text-ink">
            {t("consentCrew")} <span className="text-small text-muted">· {t("required")}</span>
          </span>
        </label>
        <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2">
          <Checkbox checked={use} onChange={(e) => setUse(e.target.checked)} className="mt-0.5" />
          <span className="text-body text-ink">
            {t("consentSimpulo")} <span className="text-small text-muted">· {t("optional")}</span>
          </span>
        </label>
        <p className="text-small text-muted">{t("removeInfo")}</p>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-small text-danger">
          {error}
        </p>
      )}
      <ModalFooter onCancel={close} className="mt-6">
        <Button disabled={!consent || picked.length === 0 || busy} onClick={() => void upload()}>
          {busy ? t("uploading") : t("upload", { count: picked.length })}
        </Button>
      </ModalFooter>
    </Sheet>
  );
}

/** In the cards of the last evening and the day after: "Add 3 photos to the album" (one line, its own sheet). */
export function AlbumAsk({ stay }: { stay: Stay }) {
  const t = useTranslations("house.album");
  const [adding, setAdding] = useState(false);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/8 pt-3">
      <span className="text-small text-ink">{t("ask", { count: MEMORY_POLICY.askFor })}</span>
      <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
        <ImagePlus aria-hidden />
        {t("add")}
      </Button>
      <UploadSheet stay={stay} open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}

/** "Your album is ready": six photos as a preview and the way to the album (the card a day after the day after, and Me). */
export function AlbumReady({ stay }: { stay: Stay }) {
  const t = useTranslations("house.album");
  const list = useAlbum(stay);
  if (list.length === 0) return <p className="text-body text-muted">{t("empty")}</p>;
  const preview = list.filter((m) => m.kind === "photo").slice(-MEMORY_POLICY.preview);
  return (
    <div className="flex flex-col gap-3">
      <ul className="grid grid-cols-3 gap-1.5">
        {preview.map((m) => (
          <li key={m.id} className="relative aspect-square overflow-hidden rounded-xl bg-ink/6">
            <Media memory={m} className="absolute inset-0 size-full object-cover" />
          </li>
        ))}
      </ul>
      <Link href={`/h/${stay.id}?tab=moments#moments-album`} className="text-body font-semibold text-ink underline-offset-4 hover:underline">
        {t("see", { count: list.length })} →
      </Link>
    </div>
  );
}

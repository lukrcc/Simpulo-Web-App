"use client";

// House Memories' files in this browser (until there is a storage backend – TODO(storage): upload to the House's private folder, only the
// crew can read it) and the cleaning on upload: location data (EXIF/GPS) never leaves the device.
import { useEffect, useState } from "react";
import { MEMORY_POLICY } from "@/config/memories";
import type { HouseMemory } from "./types";

const DB = "simpulo-memories";
const STORE = "media";

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putMedia(id: string, blob: Blob): Promise<void> {
  const d = await db();
  await new Promise<void>((resolve, reject) => {
    const tx = d.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getMedia(id: string): Promise<Blob | null> {
  try {
    const d = await db();
    return await new Promise((resolve) => {
      const req = d.transaction(STORE, "readonly").objectStore(STORE).get(id);
      req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/** The file to show: the demo's public one, or the upload kept in this browser (null while loading or when it's on another device). */
export function useMemorySrc(memory: Pick<HouseMemory, "id" | "src">): string | null {
  const [local, setLocal] = useState<string | null>(null);
  useEffect(() => {
    if (memory.src) return;
    let url: string | null = null;
    let live = true;
    void getMedia(memory.id).then((blob) => {
      if (!blob || !live) return;
      url = URL.createObjectURL(blob);
      setLocal(url);
    });
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [memory.id, memory.src]);
  return memory.src ?? local;
}

/**
 * A photo, cleaned: drawn again on a canvas (upright, at most maxPhotoPx) and saved as a new JPEG – a re-encoded image carries no EXIF at
 * all, so no GPS, camera or time. Formats the browser can't read (e.g. HEIC outside Safari) fail.
 */
export async function cleanPhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MEMORY_POLICY.maxPhotoPx / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", MEMORY_POLICY.jpegQuality));
}

/** A clip's length in seconds (from its metadata). */
export function clipSeconds(file: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(v.duration);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("video"));
    };
    v.src = url;
  });
}

const enc = (s: string) => [...s].map((c) => c.charCodeAt(0));
const XYZ = [0xa9, ...enc("xyz")];
const LOCI = enc("loci");
/** ISO 6709 positions as phones write them ("+52.5200+013.4050+034.000/") */
const ISO6709 = /[+-]\d{2}(?:\.\d+)?[+-]\d{3}(?:\.\d+)?(?:[+-]\d+(?:\.\d+)?)?\//g;

/**
 * A clip, cleaned (MP4 / QuickTime): inside the `moov` box the location boxes (©xyz, loci) are blanked and every ISO 6709 position is
 * set to zeros – the file stays the same length and plays as before. Best effort in the browser; TODO(storage): check again on the server.
 */
export async function cleanClip(file: File): Promise<Blob> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer);
  // Find the top-level moov box.
  let at = 0;
  let moov: [number, number] | null = null;
  while (at + 8 <= bytes.length) {
    let size = view.getUint32(at);
    const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8));
    if (size === 1 && at + 16 <= bytes.length) size = Number(view.getBigUint64(at + 8));
    else if (size === 0) size = bytes.length - at;
    if (size < 8) break;
    if (type === "moov") moov = [at, Math.min(bytes.length, at + size)];
    at += size;
  }
  if (!moov) return file;
  const [from, to] = moov;
  const match = (i: number, sig: number[]) => sig.every((b, k) => bytes[i + k] === b);
  for (let i = from + 4; i < to - 4; i++) {
    if (match(i, XYZ) || match(i, LOCI)) {
      const size = view.getUint32(i - 4);
      if (size > 8 && i - 4 + size <= to) bytes.fill(0, i + 4, i - 4 + size);
    }
  }
  // QuickTime keys/values: the position as text – zeros keep its shape.
  const text = new TextDecoder("latin1").decode(bytes.subarray(from, to));
  for (const m of text.matchAll(ISO6709)) {
    for (let k = 0; k < m[0].length; k++) if (/\d/.test(m[0][k])) bytes[from + m.index! + k] = 0x30;
  }
  return new Blob([bytes], { type: file.type || "video/mp4" });
}

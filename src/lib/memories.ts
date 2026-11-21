// House Memories (CLAUDE.md "Moments-Reiter als Album"): the one place for who sees what in a House's album. Only the crew sees it; a
// removed photo never comes back; nothing here is analysed – Simpulo only counts (data points memory.*). Same rules on the server once
// there is one.
import { MEMORIES_PERK } from "@/config/memories";
import { APP_MODE } from "./appMode";
import { getCrew, type StoreData } from "./store";
import type { HouseMemory, Stay } from "./types";

const DAY_MS = 86_400_000;
type AlbumData = StoreData & { memories: HouseMemory[] };

function hashUnit(text: string): number {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return ((h >>> 0) % 10000) / 10000;
}

/**
 * The demo's album (never production): the others of the crew added 0–2 photos each, on a day of the House at 18:00 local (the offset as lib/arc.ts houseOffsetHours) – the House's own
 * photos (no faces invented); about a third approved for Simpulo's posts. Never by the person looking.
 */
function demoMemories(data: StoreData, stay: Stay): HouseMemory[] {
  if (APP_MODE === "production" || !stay.photos?.length) return [];
  const start = Date.parse(`${stay.startDate.slice(0, 10)}T00:00:00Z`);
  const days = Math.max(1, Math.round((Date.parse(`${stay.endDate.slice(0, 10)}T00:00:00Z`) - start) / DAY_MS));
  const crew = getCrew(data, stay).filter((u) => u.id !== data.currentUserId);
  return crew.flatMap((u, ui) => {
    const n = Math.floor(hashUnit(`${u.id}:${stay.id}:mem`) * 3);
    return Array.from({ length: n }, (_, i) => {
      const day = Math.floor(hashUnit(`${u.id}:${stay.id}:mem:${i}`) * days);
      const at = start + day * DAY_MS + (18 - Math.round((stay.lng ?? 0) / 15)) * 3_600_000;
      return {
        id: `mm-${stay.id}-${u.id}-${i}`,
        houseId: stay.id,
        userId: u.id,
        kind: "photo" as const,
        src: stay.photos![(ui * 2 + i) % stay.photos!.length],
        at: new Date(at).toISOString(),
        crewConsent: true as const,
        simpuloUse: hashUnit(`${u.id}:${stay.id}:use:${i}`) < 0.35,
      };
    });
  });
}

/** Every memory of a House (the demo's and the uploaded ones), removed ones included – for the album use albumOf. */
function allOf(data: AlbumData, stay: Stay): HouseMemory[] {
  const own = data.memories.filter((m) => m.houseId === stay.id);
  const known = new Set(own.map((m) => m.id));
  return [...demoMemories(data, stay).filter((m) => !known.has(m.id)), ...own];
}

/** The album as the crew sees it at `now`: added by now, not removed, newest last. Outside the crew: nothing. */
export function albumOf(data: AlbumData, stay: Stay, now: number, viewerId = data.currentUserId): HouseMemory[] {
  if (!viewerId || !getCrew(data, stay).some((u) => u.id === viewerId)) return [];
  return allOf(data, stay)
    .filter((m) => !m.removedAt && Date.parse(m.at) <= now)
    .toSorted((a, b) => a.at.localeCompare(b.at));
}

/**
 * Admin › Marketing › Content: House Memories across all Houses (now) – uploaded and approved for Simpulo's own posts, and the approved
 * ones themselves, newest first. TODO(backend): precomputed stats and the storage's files.
 */
export function memoriesStats(data: AlbumData, now: number) {
  const all = data.stays.flatMap((s) => allOf(data, s)).filter((m) => !m.removedAt && Date.parse(m.at) <= now);
  const approved = all.filter((m) => m.simpuloUse).toSorted((a, b) => b.at.localeCompare(a.at));
  return { uploaded: all.length, approved: approved.length, approvedList: approved };
}

/**
 * The incentive (prepared, MEMORIES_PERK – off): has `userId` shared enough approved material from one House to get the fee advantage on
 * their next one? Always false while the switch is off or the size of the advantage is open.
 */
export function hasMemoriesPerk(data: AlbumData, userId: string): boolean {
  if (!MEMORIES_PERK.enabled || MEMORIES_PERK.discountPercent === null) return false;
  const byHouse = new Map<string, number>();
  for (const m of data.memories) if (m.userId === userId && m.simpuloUse && !m.removedAt) byHouse.set(m.houseId, (byHouse.get(m.houseId) ?? 0) + 1);
  return [...byHouse.values()].some((n) => n >= MEMORIES_PERK.minApproved);
}

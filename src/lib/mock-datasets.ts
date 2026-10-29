// Data volume presets for the mock app (DevSwitcher "Data"): deterministic subsets of the mock data, so every state
// of the app – empty, launch, growing, full – can be seen with the same Houses every time. Lives in the data layer:
// a real backend simply returns what exists, and the UI reacts to the counts, never to the preset name.
import { CURRENT_USER_ID, joinRequests, stays, threads, users, type JoinRequest, type Stay, type Thread, type User } from "./mock";

export const DATASET_PRESETS = ["empty", "launch", "growing", "full"] as const;
export type DatasetPreset = (typeof DATASET_PRESETS)[number];
export const DEFAULT_PRESET: DatasetPreset = "full";

export interface MockDataset {
  stays: Stay[];
  users: User[];
  joinRequests: JoinRequest[];
  threads: Thread[];
}

/** Launch: six Houses across cities and vibes, two of them featured. */
const LAUNCH_IDS = ["s3", "x1", "s30", "s52", "x36", "x10"];
/** Growing: every third published House in data order, 30 in total. */
const GROWING_SIZE = 30;

function staysFor(preset: DatasetPreset): Stay[] {
  if (preset === "full") return stays;
  if (preset === "empty") return [];
  if (preset === "launch") return stays.filter((s) => LAUNCH_IDS.includes(s.id));
  return stays.filter((s) => s.status === "published").filter((_, i) => i % 3 === 0).slice(0, GROWING_SIZE);
}

/**
 * The mock data for a preset: its Houses plus the requests and threads that belong to them. People connected only to
 * hidden Houses (as host, member or requester) are hidden too; everyone else – including the default mock user –
 * stays, so logging in always works.
 */
export function getMockDataset(preset: DatasetPreset): MockDataset {
  if (preset === "full") return { stays, users, joinRequests, threads };
  const kept = staysFor(preset);
  const keptIds = new Set(kept.map((s) => s.id));
  const requests = joinRequests.filter((r) => keptIds.has(r.stayId));
  const connected = (stayIds: Set<string>) =>
    new Set([...stays.filter((s) => stayIds.has(s.id)).map((s) => s.hostId), ...joinRequests.filter((r) => stayIds.has(r.stayId)).map((r) => r.userId)]);
  const everyone = connected(new Set(stays.map((s) => s.id)));
  const visible = connected(keptIds);
  return {
    stays: kept,
    users: users.filter((u) => u.id === CURRENT_USER_ID || visible.has(u.id) || !everyone.has(u.id)),
    joinRequests: requests,
    threads: threads.filter((t) => keptIds.has(t.stayId)),
  };
}

const PRESET_KEY = "simpulo:dataset";

/** The preset chosen in this browser (DevSwitcher); "full" when none, or when storage is unavailable. */
export function readPreset(): DatasetPreset {
  try {
    const saved = localStorage.getItem(PRESET_KEY);
    return DATASET_PRESETS.find((p) => p === saved) ?? DEFAULT_PRESET;
  } catch {
    return DEFAULT_PRESET;
  }
}

export function savePreset(preset: DatasetPreset) {
  try {
    if (preset === DEFAULT_PRESET) localStorage.removeItem(PRESET_KEY);
    else localStorage.setItem(PRESET_KEY, preset);
  } catch {
    // not saved – the next load uses the full data
  }
}

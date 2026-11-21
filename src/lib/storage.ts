// Removes what older builds stored and Simpulo no longer stores (config/storage.ts OBSOLETE_STORAGE). Runs once per page load, in try/catch.
import { OBSOLETE_STORAGE } from "@/config/storage";

export function removeObsoleteStorage() {
  try {
    for (const key of OBSOLETE_STORAGE.localStorage) localStorage.removeItem(key);
    for (const key of OBSOLETE_STORAGE.sessionStorage) sessionStorage.removeItem(key);
    for (const key of Object.keys(sessionStorage)) if (OBSOLETE_STORAGE.sessionPrefixes.some((p) => key.startsWith(p))) sessionStorage.removeItem(key);
  } catch {
    // storage unavailable – nothing to remove
  }
}

"use client";

// Agreements (CLAUDE.md "Zustimmungen", config/consent.ts): what a person agreed to, which version, when – and whether they have to agree
// (again). The one place that compares versions; the store only appends records (store.agree).
import { CONSENT_DOCS, type ConsentKind, type VersionedConsent } from "@/config/consent";
import { useDevSetting } from "./devSettings";
import { settingsOf } from "./store";
import type { ConsentRecord, User } from "./types";

export type ConsentVersions = Record<VersionedConsent, string>;

/** "0.2" → "0.3" (the last number up) – the Dev menu's simulated new version. */
export function nextVersion(version: string): string {
  const parts = version.split(".");
  parts[parts.length - 1] = String(Number(parts.at(-1)) + 1);
  return parts.join(".");
}

/** The versions in force – in dev the Dev menu can simulate a new one (Data & look › Agreements: New Terms · New guidelines). */
export function useConsentVersions(): ConsentVersions {
  const bump = useDevSetting("consentBump");
  const code = bump === "code";
  return {
    terms: bump === "terms" ? nextVersion(CONSENT_DOCS.terms.version) : CONSENT_DOCS.terms.version,
    guestCode: code ? nextVersion(CONSENT_DOCS.guestCode.version) : CONSENT_DOCS.guestCode.version,
    hostCode: code ? nextVersion(CONSENT_DOCS.hostCode.version) : CONSENT_DOCS.hostCode.version,
  };
}

/** Every agreement of a person, newest first. */
export function consentsOf(user: User | undefined): ConsentRecord[] {
  return (settingsOf(user).consents ?? []).toSorted((a, b) => b.at.localeCompare(a.at));
}

/** The latest agreement of a kind. */
export function latestConsent(user: User | undefined, kind: ConsentKind): ConsentRecord | undefined {
  return consentsOf(user).find((c) => c.kind === kind);
}

/**
 * none – never agreed (first time) · outdated – agreed to an older version ("We've updated …") · ok.
 * "age" has no version: once is enough.
 */
export function consentState(user: User | undefined, kind: ConsentKind, versions: ConsentVersions): "none" | "outdated" | "ok" {
  const last = latestConsent(user, kind);
  if (!last) return "none";
  if (kind === "age") return "ok";
  return last.version && compareVersions(last.version, versions[kind]) >= 0 ? "ok" : "outdated";
}

/** "0.10" > "0.9": versions compared number by number. Versions only ever go up – an agreement to a newer one also covers this one. */
export function compareVersions(a: string, b: string): number {
  const x = a.split(".").map(Number);
  const y = b.split(".").map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

/** The records to store when agreeing now (the version in force for each). */
export function consentRecords(kinds: readonly ConsentKind[], versions: ConsentVersions, at: string): ConsentRecord[] {
  return kinds.map((kind) => ({ kind, version: kind === "age" ? null : versions[kind], at }));
}

"use client";

// The agreements (CLAUDE.md "Zustimmungen", config/consent.ts, lib/consent.ts): the Terms (with "I'm 18 or older" the first time), and the
// community guidelines before the first request (guests) or the first House (hosts). Each agreement is stored with its version and time.
// A new version: once more – "We've updated our Terms" at the next visit or login, the guidelines before the next request or House.
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useLayoutEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { Button } from "@/components/ui/ActionButton";
import { Checkbox } from "@/components/ui/Checkbox";
import { ModalFooter, Sheet } from "@/components/ui/Sheet";
import { CONSENT_DOCS, GUEST_CODE_POINTS, HOST_CODE_POINTS, type ConsentKind } from "@/config/consent";
import { PAYMENT_POLICY, REQUEST_POLICY } from "@/config/policies";
import { track } from "@/lib/analytics";
import { clockIso } from "@/lib/clock";
import { consentRecords, consentState, useConsentVersions } from "@/lib/consent";
import { useStore } from "@/lib/store";
import type { User } from "@/lib/types";

const LINK = "font-semibold text-ink underline underline-offset-4 hover:no-underline";

/** A short list with quiet dots (the same in every agreement). */
function Points({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2 text-body text-ink">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-ink/40" />
          {item}
        </li>
      ))}
    </ul>
  );
}

/** Store and signal: the records with today's versions (the signal carries kind and version – nothing else). */
function useAgree() {
  const store = useStore();
  const versions = useConsentVersions();
  return (kinds: ConsentKind[]) => {
    store.agree(consentRecords(kinds, versions, clockIso()));
    for (const kind of kinds) track("consent_given", { kind, version: kind === "age" ? null : versions[kind as Exclude<ConsentKind, "age">] });
  };
}

/** How many Terms steps are open inside other sheets (sign-in in the request sheet …) – the gate then stays away (never two at once). */
let inlineTerms = 0;
const termsListeners = new Set<() => void>();
const subscribeTerms = (l: () => void) => (termsListeners.add(l), () => termsListeners.delete(l));
function useInlineTermsStep(active: boolean) {
  useLayoutEffect(() => {
    if (!active) return;
    inlineTerms += 1;
    termsListeners.forEach((l) => l());
    return () => {
      inlineTerms -= 1;
      termsListeners.forEach((l) => l());
    };
  }, [active]);
}

// ── Terms ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Does this person have to agree to the Terms (again)? */
export function useTermsNeeded(user: User | undefined): "none" | "outdated" | null {
  const versions = useConsentVersions();
  if (!user) return null;
  const state = consentState(user, "terms", versions);
  return state === "ok" ? null : state;
}

export function useTermsTitle(state: "none" | "outdated") {
  const t = useTranslations("consent.terms");
  return state === "outdated" ? t("updatedTitle") : t("firstTitle");
}

/** The Terms step: first time or "updated" with what changed, the link, 18+ when never confirmed, "I agree". */
export function TermsAgreement({ user, onDone, onLater, gate = false }: { user: User; onDone: () => void; onLater?: () => void; gate?: boolean }) {
  const t = useTranslations("consent.terms");
  useInlineTermsStep(!gate);
  const versions = useConsentVersions();
  const agree = useAgree();
  const state = consentState(user, "terms", versions);
  const needsAge = consentState(user, "age", versions) === "none";
  const [adult, setAdult] = useState(false);
  return (
    <div data-consent-step="terms" data-consent-state={state} className="flex flex-col gap-4">
      {state === "outdated" ? (
        <>
          <p className="text-body text-ink">{t("updatedText", { version: versions.terms })}</p>
          <Points items={[t("summary.requests", { hours: REQUEST_POLICY.requestExpiryHours }), t("summary.money"), t("summary.guidelines"), t("summary.account")]} />
        </>
      ) : (
        <p className="text-body text-ink">{t("firstText")}</p>
      )}
      <Link href={CONSENT_DOCS.terms.href} target="_blank" className={`${LINK} self-start text-body`}>
        {t("read")} ↗
      </Link>
      <p className="text-small text-muted">{t.rich("privacy", { privacy: (c: ReactNode) => <Link href="/privacy" target="_blank" className="underline underline-offset-2 hover:text-ink">{c}</Link> })}</p>
      {needsAge && (
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <Checkbox checked={adult} onChange={(e) => setAdult(e.target.checked)} data-consent-adult />
          <span className="text-body text-ink">{t("adult")}</span>
        </label>
      )}
      <ModalFooter onCancel={onLater} cancelLabel={onLater ? t("later") : undefined}>
        <Button
          size="md"
          disabled={needsAge && !adult}
          onClick={() => {
            agree(needsAge ? ["terms", "age"] : ["terms"]);
            onDone();
          }}
        >
          {t("agree")}
        </Button>
      </ModalFooter>
    </div>
  );
}

/**
 * The gate for sessions that didn't come through the sign-in sheet (a returning visit, a new version while signed in): logged in, profile
 * complete, Terms not agreed in their current version → "We've updated our Terms" once. "Not now" closes it for this visit; it comes back
 * at the next one. Rendered by AuthProvider only while the sign-in sheet is closed (that sheet asks itself, before it hands back).
 */
export function TermsGate() {
  const store = useStore();
  const me = store.users.find((u) => u.id === store.currentUserId);
  const needed = useTermsNeeded(store.sessionRestored && me?.photos[0] ? me : undefined);
  const [later, setLater] = useState(false);
  const title = useTermsTitle(needed ?? "outdated");
  const inline = useSyncExternalStore(subscribeTerms, () => inlineTerms, () => 0);
  if (!me || !needed || later || inline > 0) return null;
  return (
    <Sheet open onClose={() => setLater(true)} title={title}>
      <TermsAgreement gate user={me} onDone={() => undefined} onLater={() => setLater(true)} />
    </Sheet>
  );
}

// ── Community guidelines ──────────────────────────────────────────────────────────────────────────────────────────────────────

type CodeKind = "guestCode" | "hostCode";

/** Does this person have to agree to the guidelines (again)? */
export function codeNeeded(user: User | undefined, kind: CodeKind, versions: ReturnType<typeof useConsentVersions>): "none" | "outdated" | null {
  if (!user) return "none";
  const state = consentState(user, kind, versions);
  return state === "ok" ? null : state;
}

export function useCodeTitle(kind: CodeKind, state: "none" | "outdated") {
  const t = useTranslations("consent.code");
  return state === "outdated" ? t("updatedTitle") : kind === "hostCode" ? t("hostTitle") : t("guestTitle");
}

/** The guidelines in short – guests' five points, hosts' with theirs – the link to the full text, "I agree". */
export function CodeAgreement({ kind, state, onDone, onCancel }: { kind: CodeKind; state: "none" | "outdated"; onDone: () => void; onCancel?: () => void }) {
  const t = useTranslations("consent.code");
  const versions = useConsentVersions();
  const agree = useAgree();
  const point = (id: string) => t(`points.${id}` as "points.respect", { hours: PAYMENT_POLICY.hostBookingWindowHours });
  return (
    <div data-consent-step={kind} data-consent-state={state} className="flex flex-col gap-4">
      <p className="text-body text-ink">{state === "outdated" ? t("updatedText", { version: versions[kind] }) : t(kind === "hostCode" ? "hostText" : "guestText")}</p>
      <Points items={GUEST_CODE_POINTS.map(point)} />
      {kind === "hostCode" && (
        <>
          <p className="text-small font-semibold text-muted">{t("hostsToo")}</p>
          <Points items={HOST_CODE_POINTS.map(point)} />
        </>
      )}
      <Link href={CONSENT_DOCS[kind].href} target="_blank" className={`${LINK} self-start text-body`}>
        {t("read")} ↗
      </Link>
      <ModalFooter onCancel={onCancel}>
        <Button
          size="md"
          onClick={() => {
            agree([kind]);
            onDone();
          }}
        >
          {t("agree")}
        </Button>
      </ModalFooter>
    </div>
  );
}

/**
 * The guidelines as a gate outside the request sheet – hosts before the first House they open, guests confirming a friend's request: `gate(userId,
 * then)` runs `then` right away when agreed, else opens the guidelines first and runs it after "I agree". Render `sheet` once.
 */
export function useCodeGate(kind: CodeKind) {
  const store = useStore();
  const versions = useConsentVersions();
  const [pending, setPending] = useState<{ then: () => void; state: "none" | "outdated" } | null>(null);
  const title = useCodeTitle(kind, pending?.state ?? "none");
  const gate = (userId: string, then: () => void) => {
    const state = codeNeeded(store.users.find((u) => u.id === userId), kind, versions);
    if (!state) return then();
    setPending({ then, state });
  };
  const sheet = (
    <Sheet open={pending !== null} onClose={() => setPending(null)} title={title}>
      {pending && (
        <CodeAgreement
          kind={kind}
          state={pending.state}
          onCancel={() => setPending(null)}
          onDone={() => {
            const then = pending.then;
            setPending(null);
            then();
          }}
        />
      )}
    </Sheet>
  );
  return { gate, sheet };
}

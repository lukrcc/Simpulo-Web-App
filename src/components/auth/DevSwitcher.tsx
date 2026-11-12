"use client";

import { Bell, MoreHorizontal, ScrollText } from "lucide-react";
import { CapsuleGroup } from "@/components/ui/CapsuleGroup";
import { useTranslations } from "next-intl";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useState, useSyncExternalStore, type ReactNode } from "react";
import { Button } from "@/components/ui/ActionButton";
import { HOUSE_ROLE_OVERRIDES, setDevSetting, useDevSetting } from "@/lib/devSettings";
import { useFormat } from "@/i18n/format";
import { setFeatureFlag, setHostTypeSim, setPayoutsSim, useFeatureFlag, useHostTypeSim, usePayoutsSim, type HostTypeSim, type PayoutsSim } from "@/lib/featureFlags";
import { APP_MODE } from "@/lib/appMode";
import { devPersonas } from "@/lib/data";
import { PLATFORM_PHASES, setPlatformPhase, usePlatformPhase } from "@/config/platform";
import { computeReminders, type Reminder } from "@/lib/reminders";
import { findUser, getCrew, OPEN_AS_PARAM, resetMockData, useStore } from "@/lib/store";
import { useNotifyLog } from "@/lib/notify/log";
import type { Stay } from "@/lib/types";
import { cn } from "@/lib/utils";

type Role = "host" | "crew" | "pending" | "none";

/** Development only: switch the mock user, see your role on this page, open host/guest tabs, fire reminders. */
export function DevSwitcher() {
  if (APP_MODE !== "dev") return null;
  // usePathname/useSearchParams suspend during prerender – keep that inside this small boundary.
  return (
    <Suspense fallback={null}>
      <DevSwitcherInner />
    </Suspense>
  );
}

/** The House the current route is about: /h/[id] (and its manage page), /house/[slug], or the open chat in Messages. */
function useRouteStay(): Stay | undefined {
  const store = useStore();
  const pathname = usePathname();
  const id = useSearchParams().get("id");
  const [, section, param] = pathname.split("/");
  if (section === "h" && param) return store.stays.find((s) => s.id === param || s.slug === param);
  if (section === "house" && param) return store.stays.find((s) => s.slug === param);
  if (section === "messages") {
    const thread = store.threads.find((t) => t.id === (param ?? id));
    return thread && store.stays.find((s) => s.id === thread.houseId);
  }
  return undefined;
}

const HOST_TYPES: readonly HostTypeSim[] = ["share", "pro"];
const PAYOUTS: readonly PayoutsSim[] = ["ready", "missing", "action"];

/**
 * The Dev panel (dev only, never for users): a light surface 380px, radius 20, scrolling when taller than the window. Head "DEV" and the
 * window's size live; then three sections – Account · Scenario · Data & look – in rows of 44px (label 15px left, the control right), every
 * choice the same small capsule group, on/off as a switch. At the foot "Reset mock data" (confirmed right here), "Reminders · n" and "Log"
 * (on a House's routes also "Open as…"). Everything is kept in this browser.
 */
function DevSwitcherInner() {
  const t = useTranslations("auth.dev");
  const store = useStore();
  const { users, currentUserId, login, logout } = store;
  const stay = useRouteStay();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<"menu" | "scheduled" | "log" | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const hostType = useHostTypeSim();
  const payoutsSim = usePayoutsSim();
  const paymentFails = useFeatureFlag("simulatePaymentFailure");
  const houseRole = useDevSetting("houseRole");
  const installedApp = useDevSetting("installedApp");
  const phase = usePlatformPhase();

  const role: Role | null = !stay || !currentUserId ? null : roleIn(store, stay, currentUserId);
  const reminders = currentUserId ? computeReminders(store, currentUserId) : [];

  function close() {
    setOpen(false);
    setPanel(null);
    setConfirmReset(false);
  }
  const toggle = (next: "menu" | "scheduled" | "log") => setPanel((p) => (p === next ? null : next));
  const footAction = "flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-nav font-medium text-ink/70 hover:bg-ink/5 hover:text-ink aria-pressed:bg-ink/5 aria-pressed:text-ink";

  return (
    // Bottom left, away from toasts, the floating join bar and the sheets on the right; opens upward. Phones: above the tab bar.
    <div className="fixed bottom-[calc(var(--safe-bottom)+96px)] left-4 z-50 flex flex-col items-start gap-2 md:bottom-4">
      {open && (
        <>
          <button type="button" aria-label={t("closePanel")} tabIndex={-1} onClick={close} className="fixed inset-0 cursor-default" />
          <div
            id="dev-switcher-panel"
            className="animate-fade-in relative flex max-h-[calc(100dvh-var(--safe-top)-var(--safe-bottom)-8rem)] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[20px] bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06),0_24px_64px_rgba(0,0,0,0.16)] md:max-h-[calc(100dvh-5rem)]"
          >
            <div className="flex h-11 shrink-0 items-center justify-between px-4">
              <span className="text-eyebrow uppercase text-ink/45">{t("devLabel")}</span>
              <WindowSize />
            </div>
            <div className="scroll-pane min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <DevSection title={t("sectionAccount")}>
                <DevRow label={t("mockUser")}>
                  {/* Whose perspective this page shows – only on routes about one House. */}
                  {role && <span className={cn("shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-small font-medium", ROLE_STYLES[role])}>{t(`role.${role}`)}</span>}
                  <select
                    value={currentUserId ?? ""}
                    onChange={(e) => (e.target.value ? login(e.target.value) : logout())}
                    className="min-w-0 max-w-44 cursor-pointer truncate rounded-full bg-ink/5 px-3 py-1.5 text-nav font-semibold text-ink outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring)"
                    aria-label={t("mockUser")}
                  >
                    <option value="">{t("loggedOut")}</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </DevRow>
                {/* On a House's routes: tabs as its host or a member, and the clock's actions (48 hours, completed). */}
                {stay && (
                  <DevRow label={t("thisHouse")}>
                    <button type="button" onClick={() => toggle("menu")} aria-pressed={panel === "menu"} title={t("more")} className={footAction}>
                      <MoreHorizontal className="size-4" aria-hidden />
                      {t("openAs")}
                    </button>
                  </DevRow>
                )}
              </DevSection>
              <DevSection title={t("sectionScenario")}>
                {devPersonas && (
                  <DevRow label={t("yourHouses")}>
                    <CapsuleGroup
                      size="sm"
                      label={t("yourHouses")}
                      value={(["new", "guest", "host"] as const).find((kind) => devPersonas?.[kind] === currentUserId) ?? null}
                      onChange={(kind) => devPersonas && login(devPersonas[kind])}
                      options={(["new", "guest", "host"] as const).map((value) => ({ value, content: t(`personas.${value}`) }))}
                    />
                  </DevRow>
                )}
                <DevRow label={t("hostType")}>
                  <CapsuleGroup size="sm" label={t("hostType")} value={hostType} onChange={setHostTypeSim} options={HOST_TYPES.map((value) => ({ value, content: t(`hostType_${value}`) }))} />
                </DevRow>
                <DevRow label={t("payouts")}>
                  <CapsuleGroup size="sm" label={t("payouts")} value={payoutsSim} onChange={setPayoutsSim} options={PAYOUTS.map((value) => ({ value, content: t(`payouts_${value}`) }))} />
                </DevRow>
                <DevRow label={t("houseRole")}>
                  <CapsuleGroup size="sm" label={t("houseRole")} value={houseRole} onChange={(value) => setDevSetting("houseRole", value)} options={HOUSE_ROLE_OVERRIDES.map((value) => ({ value, content: t(`houseRole_${value}`) }))} />
                </DevRow>
                <DevRow label={t("paymentFails")}>
                  <DevSwitch label={t("paymentFails")} on={paymentFails} onChange={(on) => setFeatureFlag("simulatePaymentFailure", on)} />
                </DevRow>
              </DevSection>
              <DevSection title={t("sectionData")}>
                {/* The platform phase (config/platform.ts) – with it the mock data set: Pre-launch 3 Houses, Beta 15, Live the full data. A
                    separate "Data" row with more volume steps comes back later. */}
                <DevRow label={t("phase")}>
                  <CapsuleGroup
                    size="sm"
                    label={t("phase")}
                    value={phase}
                    onChange={(next) => {
                      if (next === phase) return;
                      setPlatformPhase(next);
                      window.location.reload();
                    }}
                    options={PLATFORM_PHASES.map((value) => ({ value, content: t(`phases.${value}`) }))}
                  />
                </DevRow>
                <DevRow label={t("installedApp")}>
                  <DevSwitch label={t("installedApp")} on={installedApp} onChange={(on) => setDevSetting("installedApp", on)} />
                </DevRow>
              </DevSection>
              {panel && (
                <div className="border-t border-ink/8">
                  {panel === "menu" ? <OpenAsMenu stay={stay} onDone={close} /> : panel === "log" ? <DeliveryLog /> : <ScheduledPanel reminders={reminders} />}
                </div>
              )}
            </div>
            <div className="flex min-h-15 shrink-0 items-center gap-1 border-t border-ink/8 px-4 py-3">
              {confirmReset ? (
                // The confirmation right here – no browser dialog.
                <>
                  <span className="min-w-0 flex-1 text-nav font-medium text-ink">{t("resetConfirm")}</span>
                  <Button variant="tertiary" size="sm" onClick={() => setConfirmReset(false)}>
                    {t("cancel")}
                  </Button>
                  <Button size="sm" onClick={resetMockData}>
                    {t("resetYes")}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="creamOutline" size="sm" onClick={() => setConfirmReset(true)}>
                    {t("resetMock")}
                  </Button>
                  <span className="flex-1" />
                  {currentUserId && (
                    <button type="button" onClick={() => toggle("scheduled")} aria-pressed={panel === "scheduled"} className={footAction}>
                      <Bell className="size-3.5" aria-hidden />
                      {t("remindersCount", { count: reminders.length })}
                    </button>
                  )}
                  <button type="button" onClick={() => toggle("log")} aria-pressed={panel === "log"} className={footAction}>
                    <ScrollText className="size-3.5" aria-hidden />
                    {t("log")}
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-controls="dev-switcher-panel"
        aria-label={open ? t("closePanel") : t("openPanel")}
        className="glass relative flex size-8 items-center justify-center rounded-full text-small font-semibold text-muted hover:text-ink md:size-9"
      >
        <span className="md:hidden">{t("labelShort")}</span>
        <span className="max-md:hidden">{t("label")}</span>
      </button>
    </div>
  );
}

/** A section: a small label (uppercase, ink 45 %) and a 1px line above it. */
function DevSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-ink/8 pb-2 pt-3">
      <h3 className="px-4 pb-1 text-eyebrow uppercase text-ink/45">{title}</h3>
      {children}
    </section>
  );
}

/** One row: 44px, the label 15px left, the control right-aligned. */
function DevRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 px-4 py-1">
      <span className="shrink-0 text-body text-ink">{label}</span>
      <span className="flex min-w-0 items-center justify-end gap-2">{children}</span>
    </div>
  );
}

/** On/off: on ink, off ink 12 %. */
function DevSwitch({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cn("relative h-6 w-10 shrink-0 rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring)", on ? "bg-ink" : "bg-ink/12")}
    >
      <span aria-hidden className={cn("absolute left-0.5 top-0.5 size-5 rounded-full bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-transform duration-150 motion-reduce:transition-none", on && "translate-x-4")} />
    </button>
  );
}

/** The window's size, live: "1440 × 900". */
function subscribeResize(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}
function WindowSize() {
  const size = useSyncExternalStore(subscribeResize, () => `${window.innerWidth} × ${window.innerHeight}`, () => "");
  return <span className="text-small tabular-nums text-ink/45">{size}</span>;
}

const ROLE_STYLES: Record<Role, string> = {
  host: "bg-bg text-ink",
  crew: "bg-success/10 text-success",
  pending: "bg-(--warn-bg) text-(--warn-text)",
  none: "bg-ink/5 text-muted",
};

function roleIn(store: ReturnType<typeof useStore>, stay: Stay, userId: string): Role {
  if (stay.hostId === userId) return "host";
  const request = store.joinRequests.findLast((r) => r.stayId === stay.id && r.userId === userId);
  if (request?.status === "accepted") return "crew";
  if (request?.status === "pending") return "pending";
  return "none";
}

/** "Open in new tab as {host}" / "…as {first crew member}" – each tab keeps its own user (?as=, sessionStorage). */
function OpenAsMenu({ stay, onDone }: { stay: Stay | undefined; onDone: () => void }) {
  const t = useTranslations("auth.dev");
  const store = useStore();
  if (!stay) return null;
  const host = findUser(store, stay.hostId);
  const member = getCrew(store, stay).find((u) => u.id !== stay.hostId);

  function open(userId: string) {
    const url = new URL(window.location.href);
    url.searchParams.set(OPEN_AS_PARAM, userId);
    window.open(url.toString(), "_blank", "noopener");
    onDone();
  }

  const item = "block w-full px-4 py-2.5 text-left hover:bg-bg disabled:cursor-default disabled:text-muted disabled:hover:bg-transparent";
  return (
    <div className="py-1">
      {host && (
        <button type="button" onClick={() => open(host.id)} className={item}>
          {t("openAsHost", { name: host.name.split(" ")[0] })}
        </button>
      )}
      <button type="button" disabled={!member} onClick={() => member && open(member.id)} className={item}>
        {member ? t("openAsMember", { name: member.name.split(" ")[0] }) : t("noCrewMember")}
      </button>
      {/* Only for trying things out: not on the page. */}
      {stay.accommodationStatus === "locked" && stay.hostId === store.currentUserId && (
        <button
          type="button"
          onClick={() => {
            void store.unlockAccommodation(stay.id);
            onDone();
          }}
          className={item}
        >
          {t("unlockAccommodation")}
        </button>
      )}
      {stay.accommodationStatus === "locked" && (
        <button
          type="button"
          onClick={() => {
            store.resetPayments(stay.id);
            onDone();
          }}
          className={item}
        >
          {t("resetPayments")}
        </button>
      )}
      {/* What the clock does when the 48 hours are up (payment, or the host's booking). */}
      {(stay.paymentDueAt || stay.allPaidAt) && !stay.bookingConfirmedAt && (
        <button
          type="button"
          onClick={() => {
            store.lapsePaymentWindow(stay.id);
            onDone();
          }}
          className={item}
        >
          {t("lapse48h")}
        </button>
      )}
      {/* What the scheduled job will do after the end date: completed, Crew record written. */}
      {(stay.status === "published" || stay.status === "booked") && (
        <button
          type="button"
          onClick={() => {
            store.completeStay(stay.id);
            onDone();
          }}
          className={item}
        >
          {t("complete")}
        </button>
      )}
    </div>
  );
}

const LOG_MAX = 50;

/**
 * What lib/notify's push and email adapters did in this tab, newest first: who got what, by which channel (the channel table and each
 * person's switches decided it). Real sending is server-side; outside the demo never a toast.
 */
function DeliveryLog() {
  const t = useTranslations("auth.dev");
  const tNotify = useTranslations("messages.notify");
  const tCommon = useTranslations("common");
  const store = useStore();
  const log = useNotifyLog();
  if (log.length === 0) return <p className="px-4 py-4 text-muted">{t("logEmpty")}</p>;
  const LINE = { push: "logPush", email: "logEmail", emailQueued: "logEmailQueued", emailDigest: "logEmailDigest", emailWeekly: "logEmailWeekly" } as const;
  return (
    <ul className="scroll-pane max-h-80">
      {log.slice(0, LOG_MAX).map((entry) => {
        const name = entry.userId === store.currentUserId ? tCommon("you") : (findUser(store, entry.userId)?.name.split(" ")[0] ?? entry.userId);
        return (
          <li key={entry.id} className="px-4 py-2 text-muted">
            {tNotify(LINE[entry.channel], { name, text: entry.text })}
          </li>
        );
      })}
    </ul>
  );
}

/** Computed reminders for the current user; clicking one fires it now (toast + crew chat line if crew-related). */
function ScheduledPanel({ reminders }: { reminders: Reminder[] }) {
  const t = useTranslations("auth.dev");
  const f = useFormat();
  const store = useStore();
  const now = new Date().toISOString();

  return (
    <div>
      {reminders.length === 0 ? (
        <p className="px-4 py-4 text-muted">{t("noReminders")}</p>
      ) : (
        <ul className="scroll-pane max-h-80">
          {reminders.map((reminder) => {
            const stay = store.stays.find((s) => s.id === reminder.stayId);
            const overdue = reminder.due < now;
            return (
              <li key={reminder.id}>
                <button
                  type="button"
                  onClick={() => store.fireReminder(reminder)}
                  title={t("fireNow")}
                  className="flex w-full flex-col gap-0.5 px-4 py-2.5 text-left hover:bg-bg"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-medium text-ink">{t(`types.${reminder.type}`)}</span>
                    <span className={cn("shrink-0 tabular-nums", overdue ? "text-danger" : "text-muted")}>
                      {overdue ? t("overdue") : `${f.day(reminder.due)} ${f.time(reminder.due)}`}
                    </span>
                  </span>
                  <span className="flex items-center justify-between gap-2 text-muted">
                    <span className="truncate">{stay?.title}</span>
                    <span className="shrink-0">
                      {t(`channel.${reminder.channel === "email+push" ? "emailPush" : "email"}`)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

"use client";

import { Bell, MoreHorizontal, ScrollText } from "lucide-react";
import { setHeaderTheme, useHeaderTheme } from "@/lib/headerTheme";
import { useTranslations } from "next-intl";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useState, useSyncExternalStore } from "react";
import { clearViewerCurrency, serverViewerCurrencySnapshot, setViewerCurrency, subscribeViewerCurrency, viewerCurrencySnapshot, type CurrencyCode } from "@/lib/currency";
import { useFormat } from "@/i18n/format";
import { setFeatureFlag, useFeatureFlag, type FeatureFlag } from "@/lib/featureFlags";
import { APP_MODE } from "@/lib/appMode";
import { DATA_STATES, devPersonas, readDataState, saveDataState } from "@/lib/data";
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

/** The House the current route is about: House page, Houses detail/edit, or a chat. */
function useRouteStay(): Stay | undefined {
  const store = useStore();
  const pathname = usePathname();
  const id = useSearchParams().get("id");
  const [, section, param] = pathname.split("/");
  if (section === "house" && param) return store.stays.find((s) => s.slug === param);
  if (section === "my-stays") return store.stays.find((s) => s.id === (param ?? id));
  if (section === "inbox") {
    const thread = store.threads.find((t) => t.id === (param ?? id));
    return thread && store.stays.find((s) => s.id === thread.houseId);
  }
  return undefined;
}

function DevSwitcherInner() {
  const t = useTranslations("auth.dev");
  const store = useStore();
  const { users, currentUserId, login, logout } = store;
  const stay = useRouteStay();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<"menu" | "scheduled" | "log" | null>(null);

  const role: Role | null = !stay || !currentUserId ? null : roleIn(store, stay, currentUserId);
  const reminders = currentUserId ? computeReminders(store, currentUserId) : [];

  function close() {
    setOpen(false);
    setPanel(null);
  }

  const action = "flex h-7 items-center gap-1.5 rounded-full px-2.5 font-medium text-muted hover:bg-ink/5 aria-pressed:bg-ink/5 aria-pressed:text-ink";
  return (
    // Bottom left, away from toasts, the floating join bar, the round "Open a House" and the sheets on the right; opens upward.
    // Phones: above the tab bar.
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+96px)] left-4 z-50 flex flex-col items-start gap-2 md:bottom-4">
      {open && (
        <>
          <button type="button" aria-label={t("closePanel")} tabIndex={-1} onClick={close} className="fixed inset-0 cursor-default" />
          <div
            id="dev-switcher-panel"
            className="animate-fade-in relative w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl bg-surface text-small shadow-xl"
          >
            <div className="flex items-center gap-2 px-4 py-2.5">
              <select
                value={currentUserId ?? ""}
                onChange={(e) => (e.target.value ? login(e.target.value) : logout())}
                className="min-w-0 flex-1 cursor-pointer bg-transparent font-medium text-ink outline-none"
                aria-label={t("mockUser")}
              >
                <option value="">{t("loggedOut")}</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
              {/* Whose perspective this page shows – only on routes about one House. */}
              {role && (
                <span className={cn("shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 font-medium", ROLE_STYLES[role])}>
                  {t(`role.${role}`)}
                </span>
              )}
            </div>
            <FlagSwitch flag="hostPremium" />
            <FlagSwitch flag="simulatePaymentFailure" />
            <FlagSwitch flag="simulateOnboardingActionRequired" />
            <FlagSwitch flag="simulateShareHost" />
            <FlagSwitch flag="simulateHostWithoutPayouts" />
            <HeaderThemeSwitch />
            <DataPreset />
            <ViewerCurrencyPreset />
            <YourHousesPersona />
            <div className="px-4 pb-2.5">
              <button type="button" onClick={resetMockData} className="font-medium text-ink underline-offset-4 hover:underline">
                {t("resetMock")}
              </button>
            </div>
            {(currentUserId || stay) && (
              <div className="flex items-center gap-1 px-2 py-1.5">
                {currentUserId && (
                  <button
                    type="button"
                    onClick={() => setPanel((p) => (p === "scheduled" ? null : "scheduled"))}
                    aria-pressed={panel === "scheduled"}
                    className={action}
                  >
                    <Bell className="size-3.5" />
                    {t("scheduled")} · {reminders.length}
                  </button>
                )}
                <button type="button" onClick={() => setPanel((p) => (p === "log" ? null : "log"))} aria-pressed={panel === "log"} className={action}>
                  <ScrollText className="size-3.5" />
                  {t("log")}
                </button>
                {stay && (
                  <button
                    type="button"
                    onClick={() => setPanel((p) => (p === "menu" ? null : "menu"))}
                    aria-pressed={panel === "menu"}
                    title={t("more")}
                    className={action}
                  >
                    <MoreHorizontal className="size-4" />
                    {t("openAs")}
                  </button>
                )}
              </div>
            )}
            {panel && (
              <div className="">
                {panel === "menu" ? <OpenAsMenu stay={stay} onDone={close} /> : panel === "log" ? <DeliveryLog /> : <ScheduledPanel reminders={reminders} />}
              </div>
            )}
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

/** A feature flag as a switch: hostPremium (host fee, what it includes, "Pro host"). */
function FlagSwitch({ flag }: { flag: FeatureFlag }) {
  const t = useTranslations("auth.dev");
  const on = useFeatureFlag(flag);
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 px-4 py-2.5">
      <span className="font-medium text-ink">{t(flag)}</span>
      <input type="checkbox" checked={on} onChange={(e) => setFeatureFlag(flag, e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className="relative h-5 w-8 shrink-0 rounded-full bg-ink/15 transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-4 after:rounded-full after:bg-surface after:shadow after:transition-transform peer-checked:bg-ink peer-checked:after:translate-x-3 peer-focus-visible:ring-2 peer-focus-visible:ring-ink/25"
      />
    </label>
  );
}

/** "Header: Light / Dark" – the header's theme, a test (src/lib/headerTheme.ts), kept in this browser. */
function HeaderThemeSwitch() {
  const t = useTranslations("auth.dev");
  const theme = useHeaderTheme();
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <span className="font-medium text-ink">{t("headerTheme")}</span>
      <div role="radiogroup" aria-label={t("headerTheme")} className="flex gap-1">
        {(["light", "dark"] as const).map((value) => (
          <button key={value} type="button" role="radio" aria-checked={theme === value} onClick={() => setHeaderTheme(value)} className={cn("rounded-full border-[1.5px] px-2.5 py-0.5 transition-colors", theme === value ? "border-ink font-semibold text-ink" : "border-transparent text-ink/70 hover:bg-ink/5")}>
            {t(`headerTheme_${value}`)}
          </button>
        ))}
      </div>
    </div>
  );
}

/** The mock's data state: Pre-launch · Launch · Full – saved in this browser, applied with a reload. */
function DataPreset() {
  const t = useTranslations("auth.dev");
  const [current] = useState(readDataState);
  return (
    <div className="flex items-center justify-between gap-3 px-4 pb-2.5">
      <span className="font-medium text-ink">{t("data")}</span>
      <div role="radiogroup" aria-label={t("data")} className="flex rounded-full bg-ink/5 p-0.5">
        {DATA_STATES.map((preset) => (
          <button
            key={preset}
            type="button"
            role="radio"
            aria-checked={preset === current}
            onClick={() => {
              if (preset === current) return;
              saveDataState(preset);
              window.location.reload();
            }}
            className="rounded-full px-2 py-1 font-medium text-muted aria-checked:bg-surface aria-checked:text-ink aria-checked:shadow-sm"
          >
            {t(`presets.${preset}`)}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Test the viewer's currency: a pick (saved like the footer's) or Auto (forgets it: cookie, time zone, language, EUR). */
const DEV_CURRENCIES: readonly CurrencyCode[] = ["EUR", "GBP", "USD", "IDR"];
function ViewerCurrencyPreset() {
  const t = useTranslations("auth.dev");
  const { manual, detected } = useSyncExternalStore(subscribeViewerCurrency, viewerCurrencySnapshot, serverViewerCurrencySnapshot);
  return (
    <div className="flex items-center justify-between gap-3 px-4 pb-2.5">
      <span className="font-medium text-ink">{t("viewerCurrency")}</span>
      <div role="radiogroup" aria-label={t("viewerCurrency")} className="flex rounded-full bg-ink/5 p-0.5">
        <button
          type="button"
          role="radio"
          aria-checked={manual === null}
          onClick={clearViewerCurrency}
          className="rounded-full px-2 py-1 font-medium text-muted aria-checked:bg-surface aria-checked:text-ink aria-checked:shadow-sm"
        >
          {t("currencyAuto", { code: detected })}
        </button>
        {DEV_CURRENCIES.map((code) => (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={manual === code}
            onClick={() => setViewerCurrency(code)}
            className="rounded-full px-2 py-1 font-medium text-muted aria-checked:bg-surface aria-checked:text-ink aria-checked:shadow-sm"
          >
            {code}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Your houses builds itself per person: New (nothing yet) · Guest (only joined) · Host. Logs in as the matching mock person. */
function YourHousesPersona() {
  const t = useTranslations("auth.dev");
  const { currentUserId, login } = useStore();
  if (!devPersonas) return null;
  const personas = devPersonas;
  return (
    <div className="flex items-center justify-between gap-3 px-4 pb-2.5">
      <span className="font-medium text-ink">{t("yourHouses")}</span>
      <div role="radiogroup" aria-label={t("yourHouses")} className="flex rounded-full bg-ink/5 p-0.5">
        {(["new", "guest", "host"] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            role="radio"
            aria-checked={personas[kind] === currentUserId}
            onClick={() => login(personas[kind])}
            className="rounded-full px-2 py-1 font-medium text-muted aria-checked:bg-surface aria-checked:text-ink aria-checked:shadow-sm"
          >
            {t(`personas.${kind}`)}
          </button>
        ))}
      </div>
    </div>
  );
}

const ROLE_STYLES: Record<Role, string> = {
  host: "bg-bg text-ink",
  crew: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
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
                    <span className={cn("shrink-0 tabular-nums", overdue ? "text-red-600" : "text-muted")}>
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

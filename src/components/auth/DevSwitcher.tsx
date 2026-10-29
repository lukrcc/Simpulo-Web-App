"use client";

import { Bell, MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useFormat } from "@/i18n/format";
import { setFeatureFlag, useFeatureFlag, type FeatureFlag } from "@/lib/featureFlags";
import { DATASET_PRESETS, readPreset, savePreset } from "@/lib/mock-datasets";
import { computeReminders, type Reminder } from "@/lib/reminders";
import { findUser, getCrew, OPEN_AS_PARAM, useStore } from "@/lib/store";
import type { Stay } from "@/lib/types";
import { cn } from "@/lib/utils";

type Role = "host" | "crew" | "pending" | "none";

/** Development only: switch the mock user, see your role on this page, open host/guest tabs, fire reminders. */
export function DevSwitcher() {
  if (process.env.NODE_ENV !== "development") return null;
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
    return thread && store.stays.find((s) => s.id === thread.stayId);
  }
  return undefined;
}

function DevSwitcherInner() {
  const t = useTranslations("auth.dev");
  const store = useStore();
  const { users, currentUserId, login, logout } = store;
  const stay = useRouteStay();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<"menu" | "scheduled" | null>(null);

  const role: Role | null = !stay || !currentUserId ? null : roleIn(store, stay, currentUserId);
  const reminders = currentUserId ? computeReminders(store, currentUserId) : [];

  function close() {
    setOpen(false);
    setPanel(null);
  }

  const action = "flex h-7 items-center gap-1.5 rounded-full px-2.5 font-medium text-zinc-600 hover:bg-black/5 aria-pressed:bg-black/5 aria-pressed:text-ink";
  return (
    // Mobile: small "D" top-right (no header there for logged-in users), opens downward – never near the bottom CTAs.
    // Desktop: "Dev" bottom-right, the free corner next to the form columns, opens upward.
    <div className="fixed right-4 top-[calc(env(safe-area-inset-top)+72px)] z-50 flex flex-col-reverse items-end gap-2 md:bottom-4 md:top-auto md:flex-col">
      {open && (
        <>
          <button type="button" aria-label={t("closePanel")} tabIndex={-1} onClick={close} className="fixed inset-0 cursor-default" />
          <div
            id="dev-switcher-panel"
            className="animate-fade-in relative w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl bg-white text-xs shadow-xl ring-1 ring-black/5"
          >
            <div className="flex items-center gap-2 border-b border-black/5 px-4 py-2.5">
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
            <DataPreset />
            {(currentUserId || stay) && (
              <div className="flex items-center gap-1 border-t border-black/5 px-2 py-1.5">
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
              <div className="border-t border-black/5">
                {panel === "menu" ? <OpenAsMenu stay={stay} onDone={close} /> : <ScheduledPanel reminders={reminders} />}
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
        className="glass relative flex size-8 items-center justify-center rounded-full text-[11px] font-semibold text-zinc-600 hover:text-ink md:size-9"
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
        className="relative h-5 w-8 shrink-0 rounded-full bg-black/15 transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-4 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-ink peer-checked:after:translate-x-3 peer-focus-visible:ring-2 peer-focus-visible:ring-ink/30"
      />
    </label>
  );
}

/** Mock data volume: Empty · Launch · Growing · Full – saved in this browser, applied with a reload. */
function DataPreset() {
  const t = useTranslations("auth.dev");
  const [current] = useState(readPreset);
  return (
    <div className="flex items-center justify-between gap-3 px-4 pb-2.5">
      <span className="font-medium text-ink">{t("data")}</span>
      <div role="radiogroup" aria-label={t("data")} className="flex rounded-full bg-black/5 p-0.5">
        {DATASET_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            role="radio"
            aria-checked={preset === current}
            onClick={() => {
              if (preset === current) return;
              savePreset(preset);
              window.location.reload();
            }}
            className="rounded-full px-2 py-1 font-medium text-zinc-600 aria-checked:bg-white aria-checked:text-ink aria-checked:shadow-sm"
          >
            {t(`presets.${preset}`)}
          </button>
        ))}
      </div>
    </div>
  );
}

const ROLE_STYLES: Record<Role, string> = {
  host: "bg-accent-soft text-accent",
  crew: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  none: "bg-black/5 text-zinc-500",
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

  const item = "block w-full px-4 py-2.5 text-left hover:bg-neutral-50 disabled:cursor-default disabled:text-zinc-400 disabled:hover:bg-transparent";
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
    </div>
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
        <p className="px-4 py-4 text-zinc-500">{t("noReminders")}</p>
      ) : (
        <ul className="scroll-pane max-h-80 divide-y divide-black/5">
          {reminders.map((reminder) => {
            const stay = store.stays.find((s) => s.id === reminder.stayId);
            const overdue = reminder.due < now;
            return (
              <li key={reminder.id}>
                <button
                  type="button"
                  onClick={() => store.fireReminder(reminder)}
                  title={t("fireNow")}
                  className="flex w-full flex-col gap-0.5 px-4 py-2.5 text-left hover:bg-neutral-50"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-medium text-ink">{t(`types.${reminder.type}`)}</span>
                    <span className={cn("shrink-0 tabular-nums", overdue ? "text-red-600" : "text-zinc-500")}>
                      {overdue ? t("overdue") : `${f.day(reminder.due)} ${f.time(reminder.due)}`}
                    </span>
                  </span>
                  <span className="flex items-center justify-between gap-2 text-zinc-500">
                    <span className="truncate">{stay?.title}</span>
                    <span className="shrink-0">
                      {t(`channel.${reminder.channel === "email+push" ? "emailPush" : "email"}`)}
                      {reminder.chatEvent && ` · ${t("plusChat")}`}
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

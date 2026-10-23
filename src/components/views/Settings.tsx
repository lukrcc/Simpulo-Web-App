"use client";

import { ChevronDown, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { RequireLogin } from "@/components/auth/RequireLogin";
import {
  FormCard,
  FormCards,
  FormContainer,
  FormField,
  FormHeader,
  formInput,
} from "@/components/form/FormLayout";
import { Avatar } from "@/components/ui/Avatar";
import { buttonClass } from "@/components/ui/button";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { findUser, getCurrentUser, settingsOf, useStore } from "@/lib/store";
import type { Currency, NotificationGroup, User } from "@/lib/types";
import { CURRENCIES, cn } from "@/lib/utils";

const GROUPS: readonly NotificationGroup[] = [
  "requests",
  "messages",
  "payments",
  "hostAlerts",
];
/** What has to be typed to delete the account. */
const DELETE_WORD = "DELETE";

const select = cn(formInput, "appearance-none pr-10");

export function Settings() {
  const t = useTranslations("settings");
  return (
    <RequireLogin title={t("loginTitle")}>
      <SettingsGate />
    </RequireLogin>
  );
}

function SettingsGate() {
  const me = getCurrentUser(useStore());
  return me ? <SettingsContent me={me} /> : null;
}

/** /settings – account, notifications, preferences, privacy, danger zone. Everything is mock state in the store. */
function SettingsContent({ me }: { me: User }) {
  const t = useTranslations("settings");
  const store = useStore();
  const router = useRouter();
  const showToast = useToast();
  const [deleting, setDeleting] = useState(false);
  const settings = settingsOf(me);
  const blocked = settings.blockedUserIds
    .map((id) => findUser(store, id))
    .filter((u): u is User => Boolean(u));

  function logOut() {
    store.logout();
    router.push("/");
  }

  return (
    <FormContainer className="pb-10">
      {/* No preview column here – the cards keep a comfortable reading width inside the 1120px container. */}
      <div className="max-w-[720px]">
        <FormHeader title={t("title")} />
        <FormCards>
          <Card title={t("account.title")}>
            <Row label={t("account.email")}>
              <span className="truncate text-sm text-ink">
                {me.email ?? t("account.noEmail")}
              </span>
            </Row>
            <Row label={t("account.signIn")}>
              <span className="text-sm text-ink">
                {t(`account.method.${me.signInMethod ?? "email"}`)}
              </span>
            </Row>
            <div className="pt-2">
              <button
                type="button"
                onClick={logOut}
                className={buttonClass("secondary", "md")}
              >
                {t("account.logOut")}
              </button>
            </div>
          </Card>

          <Card
            title={t("notifications.title")}
            description={t("notifications.description")}
          >
            <div className="grid grid-cols-[minmax(0,1fr)_4rem_4rem] items-center gap-y-1 text-sm">
              <span />
              <span className="text-center text-xs font-medium text-zinc-500">
                {t("notifications.push")}
              </span>
              <span className="text-center text-xs font-medium text-zinc-500">
                {t("notifications.email")}
              </span>
              {GROUPS.map((group) => (
                <div key={group} className="contents">
                  <span className="py-3 font-medium">
                    {t(`notifications.groups.${group}`)}
                  </span>
                  {(["push", "email"] as const).map((channel) => (
                    <span key={channel} className="flex justify-center">
                      <Switch
                        on={settings.notifications[group][channel]}
                        label={t("notifications.toggleLabel", {
                          group: t(`notifications.groups.${group}`),
                          channel: t(`notifications.${channel}`),
                        })}
                        onChange={(on) =>
                          store.setNotification(group, channel, on)
                        }
                      />
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </Card>

          <Card title={t("preferences.title")}>
            <FormField
              label={t("preferences.currency")}
              helper={t("preferences.currencyHelper")}
            >
              <SelectWrap>
                <select
                  className={select}
                  value={me.preferredCurrency ?? ""}
                  onChange={(e) =>
                    store.updateCurrentUser({
                      preferredCurrency: (e.target.value || undefined) as
                        Currency | undefined,
                    })
                  }
                >
                  <option value="">{t("preferences.currencyAuto")}</option>
                  {CURRENCIES.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </SelectWrap>
            </FormField>
            <FormField
              label={t("preferences.language")}
              helper={t("preferences.moreSoon")}
            >
              <SelectWrap>
                <select className={select} value="en" disabled>
                  <option value="en">{t("preferences.english")}</option>
                </select>
              </SelectWrap>
            </FormField>
          </Card>

          <Card
            title={t("privacy.title")}
            description={t("privacy.description")}
          >
            {blocked.length === 0 ? (
              <p className="text-sm text-zinc-500">
                {t("privacy.noneBlocked")}
              </p>
            ) : (
              <ul className="divide-y divide-black/5">
                {blocked.map((user) => (
                  <li key={user.id} className="flex items-center gap-3 py-3">
                    <Avatar user={user} size="md" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {user.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        store.unblockUser(user.id);
                        showToast(t("privacy.unblocked", { name: user.name }));
                      }}
                      className={buttonClass(
                        "secondary",
                        "sm",
                        "min-h-11 sm:min-h-0",
                      )}
                    >
                      {t("privacy.unblock")}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={t("danger.title")} danger>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="max-w-md text-sm text-zinc-600">
                {t("danger.description")}
              </p>
              <button
                type="button"
                onClick={() => setDeleting(true)}
                className="inline-flex h-11 items-center rounded-full border border-red-200 px-5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
              >
                {t("danger.delete")}
              </button>
            </div>
          </Card>
        </FormCards>
      </div>

      <DeleteAccountSheet
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={() => {
          store.deleteAccount();
          showToast(t("danger.deleted"));
          router.push("/");
        }}
      />
    </FormContainer>
  );
}

/** Confirm by typing DELETE – the button stays disabled until it matches exactly. */
function DeleteAccountSheet({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const t = useTranslations("settings.danger");
  const [typed, setTyped] = useState("");
  const ready = typed.trim() === DELETE_WORD;

  return (
    <Sheet
      open={open}
      onClose={() => {
        setTyped("");
        onClose();
      }}
      title={t("sheetTitle")}
    >
      <p className="text-sm leading-relaxed text-neutral-600">
        {t("sheetDescription")}
      </p>
      <div className="mt-5">
        <FormField label={t("typeToConfirm", { word: DELETE_WORD })}>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            className={cn(
              formInput,
              "font-mono tracking-widest focus:ring-red-500/30",
            )}
          />
        </FormField>
      </div>
      <button
        type="button"
        disabled={!ready}
        onClick={onConfirm}
        className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-red-600 px-6 text-base font-semibold text-white transition-colors hover:bg-red-700 disabled:bg-neutral-200 disabled:text-neutral-500"
      >
        <Lock className="size-4" aria-hidden />
        {t("confirm")}
      </button>
    </Sheet>
  );
}

function Card({
  title,
  description,
  danger = false,
  children,
}: {
  title: string;
  description?: string;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <FormCard
      title={title}
      description={description}
      className={cn(danger && "ring-1 ring-red-100")}
    >
      {children}
    </FormCard>
  );
}

/** Native select with our chevron (the browser's arrow is hidden by appearance-none). */
function SelectWrap({ children }: { children: ReactNode }) {
  return (
    <span className="relative block">
      {children}
      <ChevronDown
        className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
        aria-hidden
      />
    </span>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-black/5 pb-3 last:border-0">
      <span className="shrink-0 text-sm text-zinc-500">{label}</span>
      {children}
    </div>
  );
}

/** 44px tap target around a 44×24 switch. */
function Switch({
  on,
  label,
  onChange,
}: {
  on: boolean;
  label: string;
  onChange: (on: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className="flex size-11 items-center justify-center"
    >
      <span
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors",
          on ? "bg-accent" : "bg-neutral-300",
        )}
      >
        <span
          className={cn(
            "absolute left-0 top-0.5 size-5 rounded-full bg-white shadow transition-transform",
            on ? "translate-x-[22px]" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}

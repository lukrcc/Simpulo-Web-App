"use client";

import { ChevronDown, ChevronRight, CreditCard, Download, Lock } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { FormField, formInput } from "@/components/form/FormLayout";
import { Container } from "@/components/layout/Container";
import { Avatar } from "@/components/ui/Avatar";
import { buttonClass } from "@/components/ui/button";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { useFormat } from "@/i18n/format";
import { findUser, getCurrentUser, settingsOf, useStore, type NotificationChannel } from "@/lib/store";
import type { Currency, NotificationGroup, User } from "@/lib/types";
import { CURRENCIES, cn } from "@/lib/utils";

/** The sections, in the side navigation's order – each is also its URL hash (#notifications). */
const SECTIONS = ["account", "profile", "notifications", "payments", "preferences", "privacy"] as const;
type Section = (typeof SECTIONS)[number];

/**
 * The four notification toggles – each one channel of one group. Payment and booking updates aren't here: they always
 * go out (see settingsOf).
 */
const NOTIFICATION_ROWS: ReadonlyArray<{ key: "messages" | "nextStop" | "houseUpdates" | "news"; group: NotificationGroup; channel: Exclude<NotificationChannel, "inApp"> }> = [
  { key: "messages", group: "messages", channel: "push" },
  { key: "nextStop", group: "interests", channel: "push" },
  { key: "houseUpdates", group: "requests", channel: "push" },
  { key: "news", group: "system", channel: "email" },
];

/** ⚠ MOCK: saved cards and wallets (no payment provider yet). */
const MOCK_PAYMENT_METHODS = [
  { id: "pm-1", kind: "card", brand: "Visa", last4: "4242", expires: "08/28" },
  { id: "pm-2", kind: "wallet", brand: "Apple Pay" },
] as const;
/** ⚠ MOCK: the host's payout account. */
const MOCK_PAYOUT_ACCOUNT = { bank: "N26", last4: "1234" };

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

/** The section in the URL hash (#payments); account by default – and on the server, which has no hash. */
function useSection(): Section {
  const hash = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("hashchange", onChange);
      return () => window.removeEventListener("hashchange", onChange);
    },
    () => window.location.hash.slice(1),
    () => "",
  );
  return SECTIONS.find((s) => s === hash) ?? "account";
}

/**
 * /settings – two columns in the page container (the same edges as Explore): the section navigation on the left
 * (220px, sticky under the header; a row of tabs on phones) and the chosen section on the right (up to 720px, left
 * aligned). Everything is mock state in the store.
 */
function SettingsContent({ me }: { me: User }) {
  const t = useTranslations("settings");
  const section = useSection();

  return (
    <Container page className="pb-10">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t("title")}</h1>
      <div className="mt-6 md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-10">
        <nav aria-label={t("title")} className="self-start md:sticky md:top-[calc(var(--header-h)+40px)]">
          <ul className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:flex-col md:px-0">
            {SECTIONS.map((key) => (
              <li key={key} className="shrink-0">
                <a
                  href={`#${key}`}
                  aria-current={section === key ? "page" : undefined}
                  className={cn(
                    "flex h-10 items-center rounded-full px-3 text-[15px] font-medium transition-colors md:rounded-lg",
                    section === key ? "text-ink" : "text-muted hover:text-ink",
                    section === key && "max-md:bg-surface",
                  )}
                >
                  {t(`nav.${key}`)}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-6 max-w-180 space-y-4 md:mt-0">
          {section === "account" && <AccountSection me={me} />}
          {section === "profile" && <ProfileSection />}
          {section === "notifications" && <NotificationsSection me={me} />}
          {section === "payments" && <PaymentsSection me={me} />}
          {section === "preferences" && <PreferencesSection me={me} />}
          {section === "privacy" && <PrivacySection me={me} />}
        </div>
      </div>
    </Container>
  );
}

/** Email (read-only, "Change"), sign-in method, log out – and "Delete account" as a red text link at the bottom. */
function AccountSection({ me }: { me: User }) {
  const t = useTranslations("settings.account");
  const tDanger = useTranslations("settings.danger");
  const store = useStore();
  const router = useRouter();
  const showToast = useToast();
  const [deleting, setDeleting] = useState(false);

  return (
    <Card title={t("title")}>
      <Row label={t("email")}>
        <span className="flex min-w-0 items-center gap-3">
          <span className="truncate text-sm text-ink">{me.email ?? t("noEmail")}</span>
          {/* Mock: no real account system to change it in yet. */}
          <button type="button" onClick={() => showToast(t("changeSoon"))} className="shrink-0 text-sm font-semibold text-ink underline-offset-4 hover:underline">
            {t("change")}
          </button>
        </span>
      </Row>
      <Row label={t("signIn")}>
        <span className="text-sm text-ink">{t(`method.${me.signInMethod ?? "email"}`)}</span>
      </Row>
      <Row label={t("session")}>
        <button
          type="button"
          onClick={() => {
            store.logout();
            router.push("/");
          }}
          className={buttonClass("secondary", "sm")}
        >
          {t("logOut")}
        </button>
      </Row>
      <div className="pt-4">
        <button type="button" onClick={() => setDeleting(true)} className="text-sm font-semibold text-red-600 underline-offset-4 hover:underline">
          {tDanger("delete")}
        </button>
      </div>
      <DeleteAccountSheet
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={() => {
          store.deleteAccount();
          showToast(tDanger("deleted"));
          router.push("/");
        }}
      />
    </Card>
  );
}

/** Only the way to Edit profile – the profile itself is edited there. */
function ProfileSection() {
  const t = useTranslations("settings.profile");
  return (
    <Card title={t("title")}>
      <Link href="/profile/edit" className="-mx-2 flex items-center justify-between gap-4 rounded-lg px-2 py-2 text-sm hover:bg-bg">
        <span>
          <span className="block font-medium text-ink">{t("edit")}</span>
          <span className="block text-muted">{t("text")}</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
      </Link>
    </Card>
  );
}

/** Exactly four toggles; payment and booking updates always go out. */
function NotificationsSection({ me }: { me: User }) {
  const t = useTranslations("settings.notifications");
  const store = useStore();
  const settings = settingsOf(me);
  return (
    <Card title={t("title")} description={t("alwaysSent")}>
      {NOTIFICATION_ROWS.map(({ key, group, channel }) => (
        <Row key={key} label={t(`rows.${key}`)} hint={t(`channels.${channel}`)}>
          <Switch on={settings.notifications[group][channel] !== false} label={t(`rows.${key}`)} onChange={(on) => store.setNotification(group, channel, on)} />
        </Row>
      ))}
    </Card>
  );
}

/** Payment methods and history; hosts also see their payout account and payouts. All mock data. */
function PaymentsSection({ me }: { me: User }) {
  const t = useTranslations("settings.payments");
  const f = useFormat();
  const store = useStore();
  const showToast = useToast();
  const stayOf = (id: string) => store.stays.find((s) => s.id === id);
  const history = store.payments
    .filter((p) => p.userId === me.id && p.status !== "pending")
    .toSorted((a, b) => (b.paidAt ?? "").localeCompare(a.paidAt ?? ""));
  const hosted = store.stays.filter((s) => s.hostId === me.id && s.status !== "draft" && s.status !== "draft_unclaimed");
  // Payouts: what the crew paid into each of the host's locked Houses (shares + host programme; Simpulo's fee isn't theirs).
  const payouts = hosted
    .map((stay) => {
      const paid = store.payments.filter((p) => p.stayId === stay.id && p.userId !== me.id && p.status === "paid");
      return { stay, amount: paid.reduce((sum, p) => sum + p.share + (p.hostFee ?? 0), 0), done: stay.status === "booked" || stay.status === "completed" };
    })
    .filter((p) => p.amount > 0);

  return (
    <>
      <Card title={t("methods")}>
        {MOCK_PAYMENT_METHODS.map((method) => (
          <Row key={method.id} label={method.brand}>
            <span className="flex items-center gap-2 text-sm text-ink">
              <CreditCard className="size-4 text-muted" aria-hidden />
              {method.kind === "card" ? t("cardEnding", { last4: method.last4, expires: method.expires }) : t("wallet")}
            </span>
          </Row>
        ))}
        <div className="pt-4">
          <button type="button" onClick={() => showToast(t("addSoon"))} className={buttonClass("secondary", "sm")}>
            {t("add")}
          </button>
        </div>
      </Card>

      <Card title={t("history")}>
        {history.length === 0 ? (
          <p className="text-sm text-muted">{t("noHistory")}</p>
        ) : (
          history.map((payment) => {
            const stay = stayOf(payment.stayId);
            return (
              <Row key={payment.id} label={stay?.title ?? t("unknownHouse")} hint={payment.paidAt ? f.day(payment.paidAt) : undefined}>
                <span className="text-right text-sm">
                  <span className="block font-medium tabular-nums text-ink">{f.price(payment.total, stay?.currency)}</span>
                  <span className="block text-xs text-muted">{t(`status.${payment.status}`)}</span>
                </span>
              </Row>
            );
          })
        )}
      </Card>

      {hosted.length > 0 && (
        <>
          <Card title={t("payoutAccount")}>
            <Row label={MOCK_PAYOUT_ACCOUNT.bank}>
              <span className="flex items-center gap-3 text-sm text-ink">
                {t("accountEnding", { last4: MOCK_PAYOUT_ACCOUNT.last4 })}
                <button type="button" onClick={() => showToast(t("addSoon"))} className="font-semibold underline-offset-4 hover:underline">
                  {t("change")}
                </button>
              </span>
            </Row>
          </Card>
          <Card title={t("payouts")}>
            {payouts.length === 0 ? (
              <p className="text-sm text-muted">{t("noPayouts")}</p>
            ) : (
              payouts.map(({ stay, amount, done }) => (
                <Row key={stay.id} label={stay.title} hint={f.shortRange(stay.startDate, stay.endDate)}>
                  <span className="text-right text-sm">
                    <span className="block font-medium tabular-nums text-ink">{f.price(amount, stay.currency)}</span>
                    <span className="block text-xs text-muted">{done ? t("paidOut") : t("onHold")}</span>
                  </span>
                </Row>
              ))
            )}
          </Card>
        </>
      )}
    </>
  );
}

function PreferencesSection({ me }: { me: User }) {
  const t = useTranslations("settings.preferences");
  const store = useStore();
  return (
    <Card title={t("title")}>
      <div className="space-y-4">
        <FormField label={t("currency")} helper={t("currencyHelper")}>
          <SelectWrap>
            <select
              className={select}
              value={me.preferredCurrency ?? ""}
              onChange={(e) => store.updateCurrentUser({ preferredCurrency: (e.target.value || undefined) as Currency | undefined })}
            >
              <option value="">{t("currencyAuto")}</option>
              {CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </SelectWrap>
        </FormField>
        <FormField label={t("language")} helper={t("moreSoon")}>
          <SelectWrap>
            <select className={select} value="en" disabled>
              <option value="en">{t("english")}</option>
            </select>
          </SelectWrap>
        </FormField>
      </div>
    </Card>
  );
}

/** Blocked people, and a copy of everything Simpulo holds about you (mock: a JSON file from the store). */
function PrivacySection({ me }: { me: User }) {
  const t = useTranslations("settings.privacy");
  const store = useStore();
  const showToast = useToast();
  const blocked = settingsOf(me).blockedUserIds.map((id) => findUser(store, id)).filter((u): u is User => Boolean(u));

  function downloadData() {
    const data = {
      exportedAt: new Date().toISOString(),
      profile: me,
      housesHosted: store.stays.filter((s) => s.hostId === me.id),
      requests: store.joinRequests.filter((r) => r.userId === me.id),
      payments: store.payments.filter((p) => p.userId === me.id),
      messages: store.threads.flatMap((th) => th.messages.filter((m) => m.senderId === me.id)),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "simpulo-data.json";
    a.click();
    URL.revokeObjectURL(url);
    showToast(t("downloaded"));
  }

  return (
    <>
      <Card title={t("blockedTitle")} description={t("description")}>
        {blocked.length === 0 ? (
          <p className="text-sm text-muted">{t("noneBlocked")}</p>
        ) : (
          blocked.map((user) => (
            <div key={user.id} className="flex items-center gap-3 py-3">
              <Avatar user={user} size="md" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{user.name}</span>
              <button
                type="button"
                onClick={() => {
                  store.unblockUser(user.id);
                  showToast(t("unblocked", { name: user.name }));
                }}
                className={buttonClass("secondary", "sm")}
              >
                {t("unblock")}
              </button>
            </div>
          ))
        )}
      </Card>
      <Card title={t("dataTitle")}>
        <Row label={t("dataLabel")}>
          <button type="button" onClick={downloadData} className={buttonClass("secondary", "sm")}>
            <Download className="size-4" aria-hidden />
            {t("download")}
          </button>
        </Row>
      </Card>
    </>
  );
}

/** Confirm by typing DELETE – the button stays disabled until it matches exactly. */
function DeleteAccountSheet({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) {
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
      <p className="text-sm leading-relaxed text-muted">{t("sheetDescription")}</p>
      <div className="mt-5">
        <FormField label={t("typeToConfirm", { word: DELETE_WORD })}>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            className={cn(formInput, "font-mono tracking-widest focus:ring-red-500/30")}
          />
        </FormField>
      </div>
      <button
        type="button"
        disabled={!ready}
        onClick={onConfirm}
        className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-red-600 px-6 text-base font-semibold text-surface transition-colors hover:bg-red-700 disabled:bg-line disabled:text-muted"
      >
        <Lock className="size-4" aria-hidden />
        {t("confirm")}
      </button>
    </Sheet>
  );
}

/** A section card: surface, line border, 12px radius, an 18px heading; its rows are divided by lines. */
function Card({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-6">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-3 divide-y divide-line">{children}</div>
    </section>
  );
}

/** Native select with our chevron (the browser's arrow is hidden by appearance-none). */
function SelectWrap({ children }: { children: ReactNode }) {
  return (
    <span className="relative block">
      {children}
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
    </span>
  );
}

/** Label (and a muted hint under it) on the left, the control on the right. */
function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 py-2">
      <span className="min-w-0">
        <span className="block truncate text-sm text-ink">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      {children}
    </div>
  );
}

/** 44px tap target around a 44×24 switch. */
function Switch({ on, label, onChange }: { on: boolean; label: string; onChange: (on: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className="flex size-11 shrink-0 items-center justify-center">
      <span className={cn("relative h-6 w-11 rounded-full transition-colors", on ? "bg-ink" : "bg-line")}>
        <span
          className={cn("absolute left-0 top-0.5 size-5 rounded-full bg-surface shadow transition-transform", on ? "translate-x-[22px]" : "translate-x-0.5")}
        />
      </span>
    </button>
  );
}

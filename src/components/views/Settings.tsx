"use client";

import { ChevronRight, CreditCard, Download, Landmark, Lock } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { FormField, formInput } from "@/components/form/FormLayout";
import { Container } from "@/components/layout/Container";
import { Avatar } from "@/components/ui/Avatar";
import { Switch } from "@/components/ui/Switch";
import { Button } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { cardClass } from "@/components/ui/Card";
import { ListRow } from "@/components/ui/ListRow";
import { Select } from "@/components/ui/Select";
import { ModalFooter, Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { useFormat } from "@/i18n/format";
import { OPTIONAL_CATEGORIES } from "@/config/notifications";
import { PRIVACY_DEFAULTS, showsOnHousePages } from "@/config/privacy";
import { findUser, getCurrentUser, settingsOf, useStore, type NotificationChannel } from "@/lib/store";
import type { Currency, NotificationGroup, User } from "@/lib/types";
import { CURRENCIES, cn } from "@/lib/utils";
import { earningsFor } from "@/lib/earnings";
import { IdentityCard } from "@/components/payouts/IdentityCard";
import { PayoutStatusCard } from "@/components/payouts/PayoutSetup";
import { RefundLine } from "@/components/payments/Refund";
import { usePayouts } from "@/lib/payments/usePayouts";

/** The sections, in the side navigation's order – each is also its URL hash (#notifications). */
const SECTIONS = ["account", "profile", "notifications", "payments", "payouts", "verification", "preferences", "privacy"] as const;
type Section = (typeof SECTIONS)[number];

/**
 * The notification switches: Push and Email of each switchable group (config/notifications.ts). Bookings & payments have no switch –
 * they always go out, in the app, by push and by email.
 */
type NotificationKey = `${NotificationGroup}.${NotificationChannel}`;
const NOTIFICATION_ROWS: ReadonlyArray<{ key: NotificationKey; group: NotificationGroup; channel: NotificationChannel }> = OPTIONAL_CATEGORIES.flatMap(({ key, push, email }) => [
  ...(push ? [{ key: `${key}.push` as const, group: key, channel: "push" as const }] : []),
  ...(email ? [{ key: `${key}.email` as const, group: key, channel: "email" as const }] : []),
]);

/** ⚠ MOCK: saved cards and wallets (no payment provider yet). */
const MOCK_PAYMENT_METHODS = [
  { id: "pm-1", kind: "card", brand: "Visa", last4: "4242", expires: "08/28" },
  { id: "pm-2", kind: "wallet", brand: "Apple Pay" },
] as const;

/** What has to be typed to delete the account. */
const DELETE_WORD = "DELETE";


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
 * The page's unsaved changes: notification toggles and the currency. Each entry is only there while it was touched;
 * "Save" commits them all to the store at once.
 */
interface Draft {
  notifications: Partial<Record<NotificationKey, boolean>>;
  /** "" = automatic; undefined = untouched */
  currency?: Currency | "";
}

const EMPTY_DRAFT: Draft = { notifications: {} };

/**
 * /settings – two columns in the page container (the same edges as Explore): the section navigation on the left
 * (220px, sticky under the header; a row of tabs on phones) and the chosen section on the right (up to 720px, left
 * aligned). Everything is mock state in the store.
 */
function SettingsContent({ me }: { me: User }) {
  const t = useTranslations("settings");
  const store = useStore();
  const showToast = useToast();
  const section = useSection();
  // Kept here, above the sections, so switching sections doesn't drop what's unsaved.
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const saved = settingsOf(me).notifications;
  const savedOn = (key: NotificationKey) => {
    const row = NOTIFICATION_ROWS.find((r) => r.key === key)!;
    return saved[row.group][row.channel];
  };
  const dirty =
    NOTIFICATION_ROWS.some(({ key }) => draft.notifications[key] !== undefined && draft.notifications[key] !== savedOn(key)) ||
    (draft.currency !== undefined && draft.currency !== (me.preferredCurrency ?? ""));

  function save() {
    for (const { key, group, channel } of NOTIFICATION_ROWS) {
      const on = draft.notifications[key];
      if (on !== undefined && on !== savedOn(key)) store.setNotification(group, channel, on);
    }
    if (draft.currency !== undefined && draft.currency !== (me.preferredCurrency ?? "")) {
      store.updateCurrentUser({ preferredCurrency: draft.currency || undefined });
    }
    setDraft(EMPTY_DRAFT);
    showToast(t("saved"));
  }

  return (
    <Container page className="pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h2">{t("title")}</h1>
        <div className="flex items-center gap-3">
          {dirty && <span className="text-small text-muted">{t("unsaved")}</span>}
          <Button variant="primary" size="md" disabled={!dirty} onClick={save}>
            {t("save")}
          </Button>
        </div>
      </div>
      <div className="mt-6 md:grid md:grid-cols-[220px_minmax(0,720px)] md:gap-10">
        <nav aria-label={t("title")} className="self-start md:sticky md:top-[calc(var(--header-h)+40px)]">
          <ul className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:flex-col md:px-0">
            {SECTIONS.map((key) => (
              <li key={key} className="shrink-0">
                <a
                  href={`#${key}`}
                  aria-current={section === key ? "page" : undefined}
                  className={cn(
                    "flex h-10 items-center rounded-full px-3 text-body font-medium transition-colors md:rounded-lg",
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
          {section === "notifications" && (
            <NotificationsSection
              isOn={(key) => draft.notifications[key] ?? savedOn(key)}
              onChange={(key, on) => setDraft((d) => ({ ...d, notifications: { ...d.notifications, [key]: on } }))}
            />
          )}
          {section === "payments" && <PaymentsSection me={me} />}
          {section === "payouts" && <PayoutsSection me={me} />}
          {section === "verification" && <VerificationSection />}
          {section === "preferences" && (
            <PreferencesSection currency={draft.currency ?? me.preferredCurrency ?? ""} onCurrencyChange={(currency) => setDraft((d) => ({ ...d, currency }))} />
          )}
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
    <>
      <Card title={t("title")}>
        <li>
          <ListRow
            title={t("email")}
            subtitle={me.email ?? t("noEmail")}
            action={
              // Mock: no real account system to change it in yet.
              <Button variant="tertiary" onClick={() => showToast(t("changeSoon"))}>
                {t("change")}
              </Button>
            }
          />
        </li>
        <li>
          <ListRow title={t("signIn")} subtitle={t(`method.${me.signInMethod ?? "email"}`)} />
        </li>
        <li>
          <ListRow
            title={t("session")}
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  store.logout();
                  router.push("/");
                }}
              >
                {t("logOut")}
              </Button>
            }
          />
        </li>
        <li className="pt-4">
          {/* The one destructive text link of the app – red on purpose. */}
          <button type="button" onClick={() => setDeleting(true)} className="text-body font-semibold text-red-600 underline-offset-4 hover:underline">
            {tDanger("delete")}
          </button>
        </li>
      </Card>
      <DeleteAccountSheet
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={() => {
          store.deleteAccount();
          showToast(tDanger("deleted"));
          router.push("/");
        }}
      />
    </>
  );
}

/** Only the way to Edit profile – the profile itself is edited there. */
function ProfileSection() {
  const t = useTranslations("settings.profile");
  return (
    <Card title={t("title")}>
      <li>
        <Link href="/profile/edit" className="block">
          <ListRow title={t("edit")} subtitle={t("text")} action={<ChevronRight className="size-4 text-muted" aria-hidden />} />
        </Link>
      </li>
    </Card>
  );
}

/** "Bookings & payments – always on", then each switchable group with its Push and Email switches (drafts until Save). */
function NotificationsSection({ isOn, onChange }: { isOn: (key: NotificationKey) => boolean; onChange: (key: NotificationKey, on: boolean) => void }) {
  const t = useTranslations("settings.notifications");
  return (
    <Card title={t("title")}>
      {/* No switch: it wraps instead of being cut off like a row's subtitle. */}
      <li className="py-2">
        <p className="text-body text-ink">{t("alwaysOn")}</p>
        <p className="mt-0.5 max-w-140 text-small text-muted">{t("alwaysOnText")}</p>
      </li>
      {OPTIONAL_CATEGORIES.map(({ key, push, email }) => (
        <li key={key}>
          <ListRow
            title={t(`rows.${key}`)}
            subtitle={t(`notes.${key}`)}
            action={
              <>
                {(["push", "email"] as const).map((channel) =>
                  (channel === "push" ? push : email) ? (
                    <span key={channel} className="flex items-center gap-2">
                      <span className="text-small text-muted">{t(`channels.${channel}`)}</span>
                      <Switch on={isOn(`${key}.${channel}`)} label={`${t(`rows.${key}`)} – ${t(`channels.${channel}`)}`} onChange={(on) => onChange(`${key}.${channel}`, on)} />
                    </span>
                  ) : (
                    // No push for this group: an empty cell of the same width keeps the Email switches in one column.
                    <span key={channel} aria-hidden className="invisible flex items-center gap-2">
                      <span className="text-small">{t(`channels.${channel}`)}</span>
                      <span className="size-11" />
                    </span>
                  ),
                )}
              </>
            }
          />
        </li>
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

  return (
    <>
      <Card title={t("methods")}>
        {MOCK_PAYMENT_METHODS.map((method) => (
          <li key={method.id}>
            <ListRow
              lead={<CreditCard aria-hidden />}
              title={method.brand}
              subtitle={method.kind === "card" ? t("cardEnding", { last4: method.last4, expires: method.expires }) : t("wallet")}
            />
          </li>
        ))}
        <li className="pt-4">
          <Button variant="secondary" onClick={() => showToast(t("addSoon"))}>
            {t("add")}
          </Button>
        </li>
      </Card>

      <Card title={t("history")}>
        {history.length === 0 ? (
          <li className="py-2 text-small text-muted">{t("noHistory")}</li>
        ) : (
          history.map((payment) => {
            const stay = stayOf(payment.stayId);
            return (
              <li key={payment.id}>
                <ListRow
                  title={stay?.title ?? t("unknownHouse")}
                  subtitle={payment.status === "refunded" ? <RefundLine payment={payment} currency={stay?.currency} /> : payment.paidAt ? f.day(payment.paidAt) : undefined}
                  aside={<span className="shrink-0 text-body font-medium tabular-nums text-ink">{f.price(payment.total, stay?.currency)}</span>}
                  action={<Badge>{t(`status.${payment.status}`)}</Badge>}
                />
              </li>
            );
          })
        )}
      </Card>

    </>
  );
}

/**
 * Payouts (Stripe Connect Express): the account's state (set up, being checked, ready, needs one more thing) and what was paid out –
 * the history from the provider (payments.getPayouts), the next one from its balance.
 */
function PayoutsSection({ me }: { me: User }) {
  const t = useTranslations("settings.payments");
  const f = useFormat();
  const store = useStore();
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const earnings = earningsFor(store, me.id, today);
  const records = usePayouts(me.id, earnings);
  return (
    <>
      <PayoutStatusCard />
      <Card title={t("payouts")}>
        {records === null ? (
          <li className="py-2 text-small text-muted">…</li>
        ) : records.length === 0 ? (
          <li className="py-2 text-small text-muted">{t("noPayouts")}</li>
        ) : (
          records.map((payout) => (
            <li key={payout.id}>
              <ListRow
                lead={<Landmark aria-hidden />}
                title={f.day(payout.date)}
                subtitle={t("accountEnding", { last4: payout.account.slice(-4) })}
                aside={<span className="shrink-0 text-body font-medium tabular-nums text-ink">{f.price(payout.amount, payout.currency)}</span>}
                action={<Badge>{payout.status === "paid" ? t("paidOut") : t("scheduled")}</Badge>}
              />
            </li>
          ))
        )}
      </Card>
    </>
  );
}

/** Verification (Stripe Identity), voluntary: why it helps, the state, "Verify with ID". */
function VerificationSection() {
  const t = useTranslations("verification");
  return (
    <>
      <IdentityCard />
      <section className={cardClass}>
        <h2 className="text-body-lg font-semibold text-ink">{t("whyTitle")}</h2>
        <ul className="mt-3 flex flex-col gap-2 text-body text-ink">
          <li>{t("why1")}</li>
          <li>{t("why2")}</li>
          <li>{t("why3")}</li>
        </ul>
        <p className="mt-4 text-small text-muted">{t("voluntary")}</p>
      </section>
    </>
  );
}

/** Currency (a draft until Save) and language (English only for now). */
function PreferencesSection({ currency, onCurrencyChange }: { currency: Currency | ""; onCurrencyChange: (currency: Currency | "") => void }) {
  const t = useTranslations("settings.preferences");
  return (
    <Card title={t("title")}>
      <li className="space-y-4 py-2">
        <FormField label={t("currency")} helper={t("currencyHelper")}>
          <Select value={currency} onChange={(e) => onCurrencyChange(e.target.value as Currency | "")}>
            <option value="">{t("currencyAuto")}</option>
            {CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label={t("language")} helper={t("moreSoon")}>
          <Select value="en" disabled>
            <option value="en">{t("english")}</option>
          </Select>
        </FormField>
      </li>
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

  const privacy = { showOnHousePages: showsOnHousePages(me), showAge: me.privacy?.showAge ?? PRIVACY_DEFAULTS.showAge };
  function setPrivacy(patch: Partial<typeof privacy>) {
    store.updateCurrentUser({ privacy: { ...privacy, ...patch } });
    showToast(t("visibilitySaved"));
  }

  return (
    <>
      {/* Who sees you (config/privacy.ts) – saved right away, like the blocked list below. */}
      <Card title={t("visibilityTitle")}>
        <li className="flex items-start justify-between gap-6 py-2">
          <span className="min-w-0">
            <span className="block text-body text-ink">{t("showOnHousePages")}</span>
            <span className="mt-0.5 block max-w-140 text-small text-muted">{t("showOnHousePagesText")}</span>
          </span>
          <Switch on={privacy.showOnHousePages} label={t("showOnHousePages")} onChange={(on) => setPrivacy({ showOnHousePages: on })} />
        </li>
        <li className="flex items-start justify-between gap-6 py-2">
          <span className="min-w-0">
            <span className="block text-body text-ink">{t("showAge")}</span>
            <span className="mt-0.5 block max-w-140 text-small text-muted">{t("showAgeText")}</span>
          </span>
          <Switch on={privacy.showAge} label={t("showAge")} onChange={(on) => setPrivacy({ showAge: on })} />
        </li>
      </Card>
      <Card title={t("blockedTitle")} description={t("description")}>
        {blocked.length === 0 ? (
          <li className="py-2 text-small text-muted">{t("noneBlocked")}</li>
        ) : (
          blocked.map((user) => (
            <li key={user.id}>
              <ListRow
                lead={<Avatar user={user} size="md" />}
                title={user.name}
                action={
                  <Button
                    variant="tertiary"
                    onClick={() => {
                      store.unblockUser(user.id);
                      showToast(t("unblocked", { name: user.name }));
                    }}
                  >
                    {t("unblock")}
                  </Button>
                }
              />
            </li>
          ))
        )}
      </Card>
      <Card title={t("dataTitle")} description={t("dataLabel")}>
        <li className="pt-4">
          <Button variant="secondary" onClick={downloadData}>
            <Download aria-hidden />
            {t("download")}
          </Button>
        </li>
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
      <p className="text-small leading-relaxed text-muted">{t("sheetDescription")}</p>
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
      <ModalFooter onCancel={onClose} className="mt-5">
<Button variant="primary" size="md" disabled={!ready} onClick={onConfirm}>
        <Lock aria-hidden />
        {t("confirm")}
      </Button>
</ModalFooter>
    </Sheet>
  );
}

/** A section card (cardClass) with an 18px heading; its children are <li> rows, divided by 1px lines. */
function Card({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className={cardClass}>
      <h2 className="text-body-lg font-semibold text-ink">{title}</h2>
      {description && <p className="mt-1 text-small text-muted">{description}</p>}
      <ul className="mt-3">{children}</ul>
    </section>
  );
}



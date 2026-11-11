"use client";

import { Bell, Check, ChevronLeft, ChevronRight, CircleUser, CreditCard, Lock, Plus, Search, Settings2, ShieldCheck, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { FormField } from "@/components/form/FormLayout";
import { Input } from "@/components/ui/Input";
import { Container } from "@/components/layout/Container";
import { currencyLabel, useSetViewerCurrency } from "@/components/layout/CurrencyPicker";
import { LegalLine } from "@/components/layout/LegalLine";
import { PayoutSetupSheet, useStartOnboarding } from "@/components/payouts/PayoutSetup";
import { RefundLine } from "@/components/payments/Refund";
import { IconTile, RowSelect, SettingsGroup, SettingsRow } from "@/components/settings/SettingsList";
import { Button } from "@/components/ui/ActionButton";
import { Avatar } from "@/components/ui/Avatar";
import { listItemStyles } from "@/components/ui/listSelection";
import { ModalFooter, Sheet } from "@/components/ui/Sheet";
import { Switch } from "@/components/ui/Switch";
import { useToast } from "@/components/ui/Toast";
import { OPTIONAL_CATEGORIES, type OptionalCategory } from "@/config/notifications";
import { PRIVACY_DEFAULTS, showsOnHousePages } from "@/config/privacy";
import { useFormat } from "@/i18n/format";
import { CURRENCY_CODES, clearViewerCurrency, currencyName, serverViewerCurrencySnapshot, subscribeViewerCurrency, viewerCurrencySnapshot, type CurrencyCode } from "@/lib/currency";
import { payments } from "@/lib/payments";
import { useIdentity, usePayoutAccount } from "@/lib/payments/hooks";
import { findUser, getCurrentUser, settingsOf, useStore } from "@/lib/store";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

/** The areas, in the side list's order; each is its URL hash (#payments), a page behind one is "#payments/history". */
const SECTIONS = ["account", "payments", "notifications", "privacy", "general"] as const;
type Section = (typeof SECTIONS)[number];
const SUBPAGES = ["payments/history", "general/currency", "general/language"] as const;
type Subpage = (typeof SUBPAGES)[number];

/** Links from before the merge still land in the right place. */
const ALIASES: Record<string, Section> = { payouts: "payments", verification: "payments", preferences: "general", profile: "account" };

/** The areas' line icons: 20px, no tile behind them, the header's stroke (1.75). */
const SECTION_ICONS: Record<Section, LucideIcon> = {
  account: CircleUser,
  payments: CreditCard,
  notifications: Bell,
  privacy: ShieldCheck,
  general: Settings2,
};

/** ⚠ MOCK: saved cards and wallets (no payment provider yet). */
const MOCK_CARDS = [{ id: "pm-1", brand: "Visa", last4: "4242", isDefault: true }] as const;

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

/** Where Settings is: an area and maybe a page behind it – from the hash. Nothing on the server (no hash there) and on the phone's list. */
function useRoute(): { section: Section | null; subpage: Subpage | null } {
  const hash = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("hashchange", onChange);
      window.addEventListener("popstate", onChange);
      return () => {
        window.removeEventListener("hashchange", onChange);
        window.removeEventListener("popstate", onChange);
      };
    },
    () => window.location.hash.slice(1),
    () => "",
  );
  const subpage = SUBPAGES.find((s) => s === hash) ?? null;
  const head = hash.split("/")[0];
  const section = SECTIONS.find((s) => s === head) ?? ALIASES[head] ?? null;
  return { section, subpage };
}

/** Goes to an area or a page behind one ("" = the list), as a history entry – Back goes where you came from. */
function go(hash: string) {
  window.history.pushState(null, "", hash ? `#${hash}` : window.location.pathname + window.location.search);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
  if (window.matchMedia("(max-width: 63.99rem)").matches) window.scrollTo(0, 0);
}

/** Every change is saved at once: this quiet confirmation at the bottom says so. */
function useSaved() {
  const t = useTranslations("settings.ui");
  const showToast = useToast();
  return () => showToast(t("saved"), "done", undefined, { placement: "bottom", ms: 1800 });
}

/**
 * /settings, like the system settings on a Mac: from 1024px ONE block centred in the window, at most 1000px – the side list (260px: the profile
 * card, the five areas as capsules) and, 56px beside it, the chosen area (up to 680px) as grouped lists; 64px under the header. The area's title
 * stands level with the profile card. Below 1024px like iOS: the list first, an area opens as its own view with "‹ Settings". No Save: every
 * change is saved right away ("Saved ✓").
 */
function SettingsContent({ me }: { me: User }) {
  const t = useTranslations("settings");
  const tu = useTranslations("settings.ui");
  const { section, subpage } = useRoute();
  const shown: Section = section ?? "account";

  return (
    <Container className="pb-10 pt-6 md:pt-10 lg:pt-16">
      <h1 className="sr-only">{t("title")}</h1>
      <div className="lg:mx-auto lg:grid lg:max-w-[1000px] lg:grid-cols-[260px_minmax(0,680px)] lg:items-start lg:gap-14">
        {/* The side list – on the phone the first view, gone once an area is open. */}
        <nav aria-label={t("title")} className={cn("lg:sticky lg:top-[calc(var(--header-h)+64px)]", section !== null && "max-lg:hidden")}>
          {/* The profile as its own light card: avatar 56px, name, "Profile & photos", the chevron – to Edit profile. */}
          <Link href="/settings/profile" className="flex min-h-20 items-center gap-3 rounded-2xl bg-(--card) p-3 transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--card)_80%,white)]">
            <Avatar user={me} size="lg" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-body font-semibold text-ink">{me.name}</span>
              <span className="block truncate text-small text-muted">{tu("profileSub")}</span>
            </span>
            <ChevronRight aria-hidden className="size-4 shrink-0 text-ink/40" />
          </Link>
          <ul className="mt-4 flex flex-col gap-1">
            {SECTIONS.map((key) => {
              const selected = shown === key;
              const Icon = SECTION_ICONS[key];
              return (
                <li key={key}>
                  <a
                    href={`#${key}`}
                    aria-current={section === key ? "page" : undefined}
                    className={cn(
                      listItemStyles(selected),
                      "flex h-11 items-center gap-3 px-4 text-body",
                      selected ? "font-semibold text-ink" : "text-ink/70",
                      // The phone's list marks nothing: nothing is open yet.
                      section === null && "max-lg:border-transparent max-lg:font-normal max-lg:text-ink/70",
                    )}
                  >
                    <Icon aria-hidden className="size-5 shrink-0" strokeWidth={1.75} />
                    <span className="min-w-0 flex-1 truncate">{tu(`nav.${key}`)}</span>
                    <ChevronLeft aria-hidden className="size-4 rotate-180 text-ink/30 lg:hidden" />
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className={cn("min-w-0", section === null && "max-lg:hidden")}>
          {/* The phone: back to the list, like iOS. */}
          <button type="button" onClick={() => go("")} className="-ml-1 mb-3 inline-flex items-center gap-0.5 text-body text-ink lg:hidden">
            <ChevronLeft aria-hidden className="size-5" />
            {tu("back")}
          </button>
          {shown === "account" && <AccountArea me={me} />}
          {shown === "payments" && (subpage === "payments/history" ? <PaymentHistory me={me} /> : <PaymentsArea me={me} />)}
          {shown === "notifications" && <NotificationsArea me={me} />}
          {shown === "privacy" && <PrivacyArea me={me} />}
          {shown === "general" && (subpage === "general/currency" ? <CurrencyPage me={me} /> : subpage === "general/language" ? <LanguagePage /> : <GeneralArea me={me} />)}
        </div>
      </div>
      {/* Phones and the installed app: the legal links at the very bottom of Settings too. */}
      <LegalLine align="center" className="mt-10 md:hidden" />
    </Container>
  );
}

/** An area's title (and a page's way back to its area). */
function AreaTitle({ title, back }: { title: string; back?: { label: string; hash: string } }) {
  return (
    // Level with the side list's profile card (80px): the title centred in the same height.
    <div className="mb-6 lg:flex lg:min-h-20 lg:flex-col lg:justify-center">
      {back && (
        <button type="button" onClick={() => go(back.hash)} className="-ml-1 mb-2 inline-flex items-center gap-0.5 self-start text-body text-ink max-lg:hidden">
          <ChevronLeft aria-hidden className="size-5" />
          {back.label}
        </button>
      )}
      <h2 className="text-h2 text-ink">{title}</h2>
    </div>
  );
}

/** "aisha.k@example.com" → "ai•••@example.com": enough to recognise, not to copy. */
function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!domain) return email;
  return `${name.slice(0, 2)}•••@${domain}`;
}

/** ⚠ MOCK: an account that signs in by email always has one – made from the first name when the mock data has none. */
const mockEmailOf = (me: User) => `${me.name.split(" ")[0].toLowerCase().normalize("NFD").replace(/[^a-z]/g, "")}@example.com`;

// ─── Account ───────────────────────────────────────────────────────────────────

function AccountArea({ me }: { me: User }) {
  const t = useTranslations("settings.account");
  const tu = useTranslations("settings.ui");
  const tDanger = useTranslations("settings.danger");
  const store = useStore();
  const router = useRouter();
  const showToast = useToast();
  const [deleting, setDeleting] = useState(false);
  const method = me.signInMethod ?? "email";
  const email = me.email ?? (method === "email" ? mockEmailOf(me) : undefined);
  // ⚠ MOCK: no passkeys yet – "Add" until there is one.
  const passkey = false;
  return (
    <div className="space-y-8">
      <AreaTitle title={tu("nav.account")} />
      <SettingsGroup title={tu("account.groupSignIn")}>
        {/* Mock: no real account system to change it in yet. The address, partly masked; "No email added" only when the sign-in isn't email. */}
        <SettingsRow title={t("email")} value={email ? maskEmail(email) : t("noEmail")} chevron onClick={() => showToast(t("changeSoon"))} />
        <SettingsRow title={t("signIn")} value={t(`method.${method}`)} chevron onClick={() => showToast(t("comesSoon"))} />
        <SettingsRow title={t("passkey")} value={t(passkey ? "passkeyOn" : "passkeyAdd")} chevron onClick={() => showToast(t("comesSoon"))} />
      </SettingsGroup>
      <SettingsGroup title={tu("account.groupDevices")}>
        <SettingsRow
          title={t("session")}
          subtitle={tu("account.thisDeviceSub")}
          control={
            // A small outline capsule (36px), not bold text.
            <Button
              variant="tertiary"
              size="sm"
              className="shadow-[inset_0_0_0_1.5px_var(--ink)]"
              onClick={() => {
                store.logout();
                router.push("/");
              }}
            >
              {t("logOut")}
            </Button>
          }
        />
      </SettingsGroup>
      {/* Its own card at the very bottom, 40px under the last group. */}
      <SettingsGroup className="pt-2">
        <SettingsRow title={tDanger("delete")} danger onClick={() => setDeleting(true)} />
      </SettingsGroup>
      <DeleteAccountSheet
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={() => {
          store.deleteAccount();
          showToast(tDanger("deleted"));
          router.push("/");
        }}
      />
    </div>
  );
}

// ─── Payments & payouts ────────────────────────────────────────────────────────

/** Paying (cards, Apple Pay, add one), getting paid (payout account, identity, payout history), and the way to the payment history. */
function PaymentsArea({ me }: { me: User }) {
  const t = useTranslations("settings.payments");
  const tu = useTranslations("settings.ui.payments");
  const tNav = useTranslations("settings.ui.nav");
  const showToast = useToast();
  const payout = usePayoutAccount();
  const identity = useIdentity();
  const { start: startOnboarding } = useStartOnboarding();
  const router = useRouter();
  const [setupOpen, setSetupOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);

  async function verify() {
    if (verifying) return;
    setVerifying(true);
    router.push(await payments.startIdentityCheck(me.id, "/settings#payments"));
  }

  const payoutRow = (() => {
    const base = { icon: <IconTile><Wallet aria-hidden /></IconTile>, title: tu("payoutAccount"), subtitle: tu("payoutSub") };
    switch (payout.status) {
      case null:
        return <SettingsRow {...base} value="…" />;
      case "none":
        return (
          <SettingsRow
            {...base}
            control={
              <Button variant="secondary" size="sm" onClick={() => setSetupOpen(true)}>
                {tu("setUp")}
              </Button>
            }
          />
        );
      case "pending":
        return <SettingsRow {...base} value={tu("payoutPending")} />;
      case "action_required":
        return <SettingsRow {...base} value={tu("payoutAction")} chevron onClick={() => void startOnboarding()} />;
      case "active":
        return <SettingsRow {...base} value={<CheckedValue>{tu("bank", { last4: payout.last4 ?? "0000" })}</CheckedValue>} />;
    }
  })();

  const identityRow = (() => {
    const base = { icon: <IconTile><ShieldCheck aria-hidden /></IconTile>, title: tu("identity"), subtitle: tu("identitySub") };
    if (identity.status === null) return <SettingsRow {...base} value="…" />;
    if (identity.status === "verified") return <SettingsRow {...base} value={<CheckedValue accent>{tu("verified")}</CheckedValue>} />;
    if (identity.status === "processing") return <SettingsRow {...base} value={tu("checking")} />;
    return <SettingsRow {...base} value={tu("verify")} chevron onClick={verify} />;
  })();

  return (
    <div className="space-y-8">
      <AreaTitle title={tNav("payments")} />
      <SettingsGroup title={tu("groupPaying")}>
        {MOCK_CARDS.map((card) => (
          <SettingsRow key={card.id} icon={<IconTile><CreditCard aria-hidden /></IconTile>} title={tu("card", { brand: card.brand, last4: card.last4 })} value={card.isDefault ? tu("default") : undefined} />
        ))}
        <SettingsRow icon={<IconTile><AppleMark /></IconTile>} title={tu("applePay")} />
        <SettingsRow icon={<IconTile><Plus aria-hidden /></IconTile>} title={tu("add")} onClick={() => showToast(t("addSoon"))} />
      </SettingsGroup>
      <SettingsGroup title={tu("groupGettingPaid")}>
        {payoutRow}
        {identityRow}
        <SettingsRow title={tu("payoutHistory")} chevron href="/your-houses/payouts" />
      </SettingsGroup>
      <SettingsGroup title={tu("groupHistory")}>
        <SettingsRow title={tu("paymentHistory")} chevron onClick={() => go("payments/history")} />
      </SettingsGroup>
      <PayoutSetupSheet open={setupOpen} onClose={() => setSetupOpen(false)} />
    </div>
  );
}

/** "Verified ✓", "Bank ••1234 ✓": the value with its check (accent only for the identity check – the Verified mark). */
function CheckedValue({ children, accent = false }: { children: ReactNode; accent?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      {children}
      <Check aria-hidden className={cn("size-4", accent ? "text-accent" : "text-ink")} strokeWidth={2.5} />
    </span>
  );
}

/** A plain wallet sign for Apple Pay – no Apple logo (not ours to copy). */
function AppleMark() {
  return <Wallet aria-hidden />;
}

/** The payment history, a page of its own behind Payments & payouts. */
function PaymentHistory({ me }: { me: User }) {
  const t = useTranslations("settings.payments");
  const tu = useTranslations("settings.ui.payments");
  const f = useFormat();
  const store = useStore();
  const history = store.payments.filter((p) => p.userId === me.id && p.status !== "pending").toSorted((a, b) => (b.paidAt ?? "").localeCompare(a.paidAt ?? ""));
  return (
    <div className="space-y-8">
      <AreaTitle title={tu("paymentHistory")} back={{ label: tu("backTo"), hash: "payments" }} />
      <SettingsGroup>
        {history.length === 0 ? (
          <SettingsRow title={<span className="text-muted">{t("noHistory")}</span>} />
        ) : (
          history.map((payment) => {
            const stay = store.stays.find((s) => s.id === payment.stayId);
            return (
              <SettingsRow
                key={payment.id}
                title={stay?.title ?? t("unknownHouse")}
                subtitle={payment.status === "refunded" ? <RefundLine payment={payment} currency={stay?.currency} /> : payment.paidAt ? `${f.day(payment.paidAt)} · ${t(`status.${payment.status}`)}` : t(`status.${payment.status}`)}
                value={<span className="tabular-nums text-ink">{f.price(payment.total, stay?.currency)}</span>}
              />
            );
          })
        )}
      </SettingsGroup>
    </div>
  );
}

// ─── Notifications ─────────────────────────────────────────────────────────────

type Delivery = "both" | "push" | "email" | "off";
const deliveryOf = ({ push, email }: { push: boolean; email: boolean }): Delivery => (push && email ? "both" : push ? "push" : email ? "email" : "off");

/** "Bookings & payments" always on (a lock, no control); then one choice per switchable group – push and email in one menu. */
function NotificationsArea({ me }: { me: User }) {
  const t = useTranslations("settings.notifications");
  const tu = useTranslations("settings.ui.notifications");
  const tNav = useTranslations("settings.ui.nav");
  const store = useStore();
  const saved = useSaved();
  const prefs = settingsOf(me).notifications;

  function choose(group: OptionalCategory, next: Delivery) {
    const current = prefs[group];
    const push = next === "both" || next === "push";
    const email = next === "both" || next === "email";
    if (current.push !== push) store.setNotification(group, "push", push);
    if (current.email !== email) store.setNotification(group, "email", email);
    saved();
  }

  return (
    <div className="space-y-8">
      <AreaTitle title={tNav("notifications")} />
      <SettingsGroup>
        <SettingsRow title={tu("alwaysTitle")} subtitle={tu("alwaysSub")} control={<Lock aria-label={tu("alwaysLocked")} className="size-4 shrink-0 text-muted" />} />
      </SettingsGroup>
      <SettingsGroup>
        {OPTIONAL_CATEGORIES.map(({ key, push, email }) => {
          const options: { value: Delivery; label: string }[] =
            push && email
              ? [
                  { value: "both", label: tu("choices.both") },
                  { value: "push", label: tu("choices.push") },
                  { value: "email", label: tu("choices.email") },
                  { value: "off", label: tu("choices.off") },
                ]
              : [
                  { value: "email", label: tu("choices.emailOnly") },
                  { value: "off", label: tu("choices.off") },
                ];
          const value = deliveryOf({ push: push && prefs[key].push, email: email && prefs[key].email });
          return <SettingsRow key={key} title={t(`rows.${key}`)} subtitle={tu(`notes.${key}`)} control={<RowSelect label={t(`rows.${key}`)} value={value} options={options} onChange={(next) => choose(key, next)} />} />;
        })}
      </SettingsGroup>
    </div>
  );
}

// ─── Privacy & safety ──────────────────────────────────────────────────────────

function PrivacyArea({ me }: { me: User }) {
  const t = useTranslations("settings.privacy");
  const tu = useTranslations("settings.ui");
  const store = useStore();
  const showToast = useToast();
  const saved = useSaved();
  const blocked = settingsOf(me).blockedUserIds.map((id) => findUser(store, id)).filter((u): u is User => Boolean(u));
  const privacy = { showOnHousePages: showsOnHousePages(me), showAge: me.privacy?.showAge ?? PRIVACY_DEFAULTS.showAge };
  function setPrivacy(patch: Partial<typeof privacy>) {
    store.updateCurrentUser({ privacy: { ...privacy, ...patch } });
    saved();
  }

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
    <div className="space-y-8">
      <AreaTitle title={tu("nav.privacy")} />
      <SettingsGroup title={t("visibilityTitle")}>
        <SettingsRow title={t("showOnHousePages")} subtitle={t("showOnHousePagesText")} control={<Switch on={privacy.showOnHousePages} label={t("showOnHousePages")} onChange={(on) => setPrivacy({ showOnHousePages: on })} />} />
        <SettingsRow title={t("showAge")} subtitle={t("showAgeText")} control={<Switch on={privacy.showAge} label={t("showAge")} onChange={(on) => setPrivacy({ showAge: on })} />} />
      </SettingsGroup>
      <SettingsGroup title={t("blockedTitle")} footer={t("description")}>
        {blocked.length === 0 ? (
          <SettingsRow title={<span className="text-muted">{tu("privacy.nobody")}</span>} />
        ) : (
          blocked.map((user) => (
            <SettingsRow
              key={user.id}
              icon={<Avatar user={user} size="mini" />}
              title={user.name}
              control={
                <Button
                  variant="tertiary"
                  size="sm"
                  className="-mr-3"
                  onClick={() => {
                    store.unblockUser(user.id);
                    showToast(t("unblocked", { name: user.name }));
                  }}
                >
                  {t("unblock")}
                </Button>
              }
            />
          ))
        )}
      </SettingsGroup>
      <SettingsGroup title={t("dataTitle")} footer={t("dataLabel")}>
        <SettingsRow title={tu("privacy.download")} chevron onClick={downloadData} />
      </SettingsGroup>
    </div>
  );
}

// ─── General ───────────────────────────────────────────────────────────────────

/** The viewer's currency state: their own pick, the profile's, what's detected – and whether it's automatic (neither picked). */
function useCurrencyState(me: User) {
  const { manual, detected } = useSyncExternalStore(subscribeViewerCurrency, viewerCurrencySnapshot, serverViewerCurrencySnapshot);
  const picked = manual ?? me.preferredCurrency ?? null;
  return { automatic: picked === null, current: picked ?? detected, detected };
}

function GeneralArea({ me }: { me: User }) {
  const tu = useTranslations("settings.ui");
  const { automatic, current } = useCurrencyState(me);
  return (
    <div className="space-y-8">
      <AreaTitle title={tu("nav.general")} />
      <SettingsGroup>
        <SettingsRow title={tu("general.currency")} value={automatic ? tu("general.automaticValue", { label: currencyLabel(current) }) : currencyLabel(current)} chevron onClick={() => go("general/currency")} />
        <SettingsRow title={tu("general.language")} value={tu("general.english")} chevron onClick={() => go("general/language")} />
      </SettingsGroup>
    </div>
  );
}

/** The currency, with a search: Automatic first, then every currency; the chosen one checked. A pick saves and goes back. */
function CurrencyPage({ me }: { me: User }) {
  const tu = useTranslations("settings.ui.general");
  const store = useStore();
  const saved = useSaved();
  const pick = useSetViewerCurrency();
  const { automatic, current, detected } = useCurrencyState(me);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const matches = CURRENCY_CODES.filter((code) => !q || code.toLowerCase().includes(q) || currencyName(code).toLowerCase().includes(q));
  const choose = (code: CurrencyCode | null) => {
    if (code === null) {
      store.updateCurrentUser({ preferredCurrency: undefined });
      clearViewerCurrency();
    } else pick(code);
    saved();
    go("general");
  };
  return (
    <div className="space-y-6">
      <AreaTitle title={tu("currency")} back={{ label: tu("backTo"), hash: "general" }} />
      <label className="relative block">
        <span className="sr-only">{tu("search")}</span>
        <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tu("search")} className="bg-(--card) pl-10" />
      </label>
      {!q && (
        <SettingsGroup>
          <SettingsRow title={tu("automatic")} subtitle={tu("automaticSub", { label: currencyLabel(detected) })} control={automatic ? <Check aria-hidden className="size-4 text-ink" strokeWidth={2.5} /> : undefined} onClick={() => choose(null)} />
        </SettingsGroup>
      )}
      <SettingsGroup>
        {matches.length === 0 ? (
          <SettingsRow title={<span className="text-muted">{tu("noMatch")}</span>} />
        ) : (
          matches.map((code) => (
            <SettingsRow
              key={code}
              title={currencyLabel(code)}
              subtitle={currencyName(code)}
              control={!automatic && current === code ? <Check aria-hidden className="size-4 text-ink" strokeWidth={2.5} /> : undefined}
              onClick={() => choose(code)}
            />
          ))
        )}
      </SettingsGroup>
    </div>
  );
}

/** English only, for now. */
function LanguagePage() {
  const tu = useTranslations("settings.ui.general");
  return (
    <div className="space-y-6">
      <AreaTitle title={tu("language")} back={{ label: tu("backTo"), hash: "general" }} />
      <SettingsGroup footer={tu("languageSoon")}>
        <SettingsRow title={tu("english")} control={<Check aria-hidden className="size-4 text-ink" strokeWidth={2.5} />} />
      </SettingsGroup>
    </div>
  );
}

// ─── Delete account ────────────────────────────────────────────────────────────

/** Confirm by typing DELETE – the button stays disabled until it matches exactly. */
function DeleteAccountSheet({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) {
  const t = useTranslations("settings.danger");
  const [typed, setTyped] = useState("");
  const ready = typed.trim() === DELETE_WORD;
  // A fresh start each time it opens: cleared on the way out.
  const close = () => {
    setTyped("");
    onClose();
  };
  return (
    <Sheet open={open} onClose={close} title={t("sheetTitle")}>
      <p className="text-small leading-relaxed text-muted">{t("sheetDescription")}</p>
      <div className="mt-5">
        <FormField label={t("typeToConfirm", { word: DELETE_WORD })}>
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoCapitalize="characters" className="font-mono tracking-widest" />
        </FormField>
      </div>
      <ModalFooter onCancel={close} className="mt-5">
        <Button variant="primary" size="md" disabled={!ready} onClick={onConfirm}>
          <Lock aria-hidden />
          {t("confirm")}
        </Button>
      </ModalFooter>
    </Sheet>
  );
}

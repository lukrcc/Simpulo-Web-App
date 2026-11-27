"use client";

import { hidesPhotoUntilAccepted, hostPageInSearch, hostsPublicly } from "@/lib/privacy";
import { useMyApplication } from "@/components/platform/HostApply";
import { Bell, Check, HelpCircle, Languages, LayoutDashboard, ChevronLeft, CreditCard, Lock, Plus, Search, Settings2, ShieldCheck, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { Input } from "@/components/ui/Input";
import { Container } from "@/components/layout/Container";
import { currencyLabel, useSetViewerCurrency } from "@/components/layout/CurrencyPicker";
import { PayoutSetupSheet, useStartOnboarding } from "@/components/payouts/PayoutSetup";
import { RefundLine } from "@/components/payments/Refund";
import { IconTile, RowSelect, SettingsGroup, SettingsRow } from "@/components/settings/SettingsList";
import { Button } from "@/components/ui/ActionButton";
import { Avatar } from "@/components/ui/Avatar";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { Switch } from "@/components/ui/Switch";
import { useToast } from "@/components/ui/Toast";
import { DEFAULT_QUIET_HOURS, OPTIONAL_CATEGORIES, type OptionalCategory } from "@/config/notifications";
import { listItemStyles } from "@/components/ui/listSelection";
import { PRIVACY_DEFAULTS, showsOnHousePages } from "@/config/privacy";
import { CONSENT_DOCS, CONSENT_KINDS, type ConsentKind } from "@/config/consent";
import { consentsOf } from "@/lib/consent";
import { buildDataExport } from "@/lib/dataExport";
import { DEFAULT_MESSAGE_PERMISSION, MESSAGE_PERMISSIONS, messagePermissionOf } from "@/lib/messagePermission";
import { HostDuties } from "@/components/settings/HostDuties";
import { useFormat } from "@/i18n/format";
import { CURRENCY_CODES, clearViewerCurrency, currencyName, serverViewerCurrencySnapshot, subscribeViewerCurrency, viewerCurrencySnapshot, type CurrencyCode } from "@/lib/currency";
import { setInstallHintsOff, useInstallHintsOff, useIsStandalone } from "@/lib/install";
import { useIsAdmin } from "@/lib/admin/access";
import { SHOW_LANGUAGE_SETTING } from "@/i18n/config";
import { openGetHelp, openShareIdea } from "@/lib/support/feedback";
import { payments } from "@/lib/payments";
import { useIdentity, usePayoutAccount } from "@/lib/payments/hooks";
import { findUser, getCurrentUser, settingsOf, useStore } from "@/lib/store";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SETTINGS_ALIASES, SETTINGS_ENTRIES, SETTINGS_SECTIONS, SETTINGS_SUBPAGES, type SettingsIcon, type SettingsSection, type SettingsSubpage } from "@/config/settings";

/** The rows' small symbols (config/settings.ts names them). */
const ENTRY_ICONS: Record<SettingsIcon, LucideIcon> = {
  bell: Bell,
  shield: ShieldCheck,
  languages: Languages,
  card: CreditCard,
  settings: Settings2,
  help: HelpCircle,
  admin: LayoutDashboard,
};

/** ⚠ MOCK: saved cards and wallets (no payment provider yet). */
const MOCK_CARDS = [{ id: "pm-1", brand: "Visa", last4: "4242", isDefault: true }] as const;

/** /settings (the list) and /settings/<area>[/<page>] (`path`, checked by the route). */
export function Settings({ path = "" }: { path?: string }) {
  const t = useTranslations("settings");
  return (
    <RequireLogin title={t("loginTitle")}>
      <SettingsGate path={path} />
    </RequireLogin>
  );
}

function SettingsGate({ path }: { path: string }) {
  const me = getCurrentUser(useStore());
  return me ? <SettingsContent me={me} path={path} /> : null;
}

/** Every change is saved at once: this quiet confirmation at the bottom says so. */
function useSaved() {
  const t = useTranslations("settings.ui");
  const showToast = useToast();
  return () => showToast(t("saved"), "done", undefined, { placement: "bottom", ms: 1800 });
}

/**
 * /settings like the iPhone's Settings (CLAUDE.md "Settings wie iOS-Einstellungen"): one narrow column (680px) on the page's ground, a big
 * title, grouped lists in rounded white surfaces (graphite in dark mode) – the account card, then the rows of config/settings.ts, then Log out
 * in red on its own. Each area is its own page (/settings/account …) with "‹ Settings" and a big title; a page behind one goes back to it.
 * Old #hash links are taken over. No Save: every change is saved right away ("Saved ✓").
 */
function SettingsContent({ me, path }: { me: User; path: string }) {
  const tu = useTranslations("settings.ui");
  const router = useRouter();
  const isAdmin = useIsAdmin() === true;
  const subpage = (SETTINGS_SUBPAGES as readonly string[]).includes(path) ? (path as SettingsSubpage) : null;
  const section = (SETTINGS_SECTIONS as readonly string[]).find((s) => s === path.split("/")[0]) as SettingsSection | undefined;

  // Links from before the pages (/settings#privacy, #payments/history): onto the page itself.
  useEffect(() => {
    if (path) return;
    const follow = () => {
      const hash = window.location.hash.slice(1);
      if (!hash) return;
      const head = hash.split("/")[0];
      const target = (SETTINGS_SUBPAGES as readonly string[]).includes(hash) ? hash : (SETTINGS_SECTIONS as readonly string[]).includes(head) ? head : SETTINGS_ALIASES[head];
      if (target) router.replace(`/settings/${target}`);
      else window.history.replaceState(null, "", window.location.pathname);
    };
    follow();
    window.addEventListener("hashchange", follow);
    return () => window.removeEventListener("hashchange", follow);
  }, [path, router]);

  return (
    <Container className="settings-page pb-10 pt-6 md:pt-10">
      <div className="mx-auto max-w-[680px]">
        {!section ? (
          <>
            {/* Settings belongs to the Profile tab: "‹ Profile" left in the content (CLAUDE.md "Kopfleiste als Seitenwerkzeug" – the bar's middle stays empty here). */}
            <Link href="/profile" className="-ml-1.5 mb-2 inline-flex min-h-11 items-center gap-0.5 text-body text-ink">
              <ChevronLeft aria-hidden className="size-5" />
              {tu("backProfile")}
            </Link>
            <SettingsHome me={me} isAdmin={isAdmin} />
          </>
        ) : (
          <div className="min-w-0">
            {/* Back one level, like iOS – from a page behind an area to the area, from an area to the list. */}
            <Link href={subpage ? `/settings/${section}` : "/settings"} className="-ml-1.5 mb-2 inline-flex min-h-11 items-center gap-0.5 text-body text-ink">
              <ChevronLeft aria-hidden className="size-5" />
              {subpage ? tu(`nav.${section}`) : tu("back")}
            </Link>
            {section === "account" && <AccountArea me={me} />}
            {section === "payments" && (subpage === "payments/history" ? <PaymentHistory me={me} /> : <PaymentsArea me={me} />)}
            {section === "notifications" && <NotificationsArea me={me} />}
            {section === "language" && <LanguageArea />}
            {section === "privacy" && <PrivacyArea me={me} />}
            {section === "general" && (subpage === "general/currency" ? <CurrencyPage me={me} /> : subpage === "general/language" && SHOW_LANGUAGE_SETTING ? <LanguagePage /> : <GeneralArea me={me} />)}
          </div>
        )}
      </div>
    </Container>
  );
}

/** The list: the account card, the groups of config/settings.ts (Admin only for admins), Log out in red on its own – it asks first. */
function SettingsHome({ me, isAdmin }: { me: User; isAdmin: boolean }) {
  const tu = useTranslations("settings.ui");
  const tm = useTranslations("nav.menu");
  const store = useStore();
  const router = useRouter();
  const showToast = useToast();
  const [confirming, setConfirming] = useState(false);
  const groups = ([2, 3, 4, 5] as const)
    .map((g) => SETTINGS_ENTRIES.filter((e) => e.group === g && (!e.adminOnly || isAdmin)))
    .filter((rows) => rows.length > 0);
  return (
    <nav aria-label={tu("sidebarTitle")}>
      <h1 className="mb-6 text-h1 text-ink">{tu("sidebarTitle")}</h1>
      <div className="space-y-7">
        <SettingsGroup>
          <SettingsRow
            href="/settings/account"
            icon={<Avatar user={me} size="lg" />}
            inset={84}
            title={<span className="text-h3 text-ink">{me.name.split(" ")[0]}</span>}
            subtitle={tu("accountCardSub")}
            chevron
          />
        </SettingsGroup>
        {groups.map((rows) => (
          <SettingsGroup key={rows[0].id}>
            {rows.map((e) => {
              const Icon = ENTRY_ICONS[e.icon];
              return (
                <SettingsRow
                  key={e.id}
                  href={e.href}
                  icon={
                    <IconTile>
                      <Icon aria-hidden strokeWidth={1.75} />
                    </IconTile>
                  }
                  title={tu(e.title as Parameters<typeof tu>[0])}
                  value={e.value ? tu(e.value as Parameters<typeof tu>[0]) : undefined}
                  chevron
                />
              );
            })}
          </SettingsGroup>
        ))}
        {/* Log out: its own group, centred, the system's red, no symbol, no chevron – it asks first. */}
        <SettingsGroup>
          <button type="button" onClick={() => setConfirming(true)} className="flex min-h-13 w-full items-center justify-center px-4 text-body text-(--settings-danger) transition-colors duration-150 hover:bg-ink/4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--focus-ring)">
            {tm("logOut")}
          </button>
        </SettingsGroup>
      </div>
      <ConfirmSheet
        open={confirming}
        title={tu("account.logOutConfirmTitle")}
        description={tu("account.logOutConfirmText")}
        confirmLabel={tm("logOut")}
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          store.logout();
          showToast(tm("loggedOut"));
          router.push("/");
        }}
      />
    </nav>
  );
}

/** An area's big title (iOS's large title). */
function AreaTitle({ title }: { title: string; back?: unknown }) {
  return <h1 className="mb-6 text-h1 text-ink">{title}</h1>;
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
  const tMenu = useTranslations("nav.menu");
  const store = useStore();
  const router = useRouter();
  const showToast = useToast();
  const [confirming, setConfirming] = useState<"one" | "all" | null>(null);
  const method = me.signInMethod ?? "email";
  const email = me.email ?? (method === "email" ? mockEmailOf(me) : undefined);
  // ⚠ MOCK: no passkeys yet – "Add" until there is one.
  const passkey = false;
  const application = useMyApplication();
  const tApply = useTranslations("platform.apply");
  return (
    <div className="space-y-7">
      <AreaTitle title={tu("nav.account")} />
      {/* Profile first – the account card on the list promises "Profile, sign-in & security". */}
      <SettingsGroup>
        <SettingsRow icon={<Avatar user={me} size="sm" />} inset={60} title={tu("profileSub")} chevron href="/settings/profile" />
      </SettingsGroup>
      <SettingsGroup title={tu("account.groupSignIn")}>
        {/* Mock: no real account system to change it in yet. The address, partly masked; "No email added" only when the sign-in isn't email. */}
        <SettingsRow title={t("email")} value={email ? maskEmail(email) : t("noEmail")} chevron onClick={() => showToast(t("changeSoon"))} />
        <SettingsRow title={t("signIn")} value={t(`method.${method}`)} chevron onClick={() => showToast(t("comesSoon"))} />
        <SettingsRow title={t("passkey")} value={t(passkey ? "passkeyOn" : "passkeyAdd")} chevron onClick={() => showToast(t("comesSoon"))} />
      </SettingsGroup>
      {/* Your host application, while you have one: where it stands (→ /apply). */}
      {application && (
        <SettingsGroup title={tApply("accountGroup")}>
          <SettingsRow title={tApply("accountRow")} value={tApply(application.status === "yes" ? "statusYes" : application.status === "no" ? "statusNo" : application.status === "maybe" ? "statusQuestion" : "statusNew")} chevron href="/apply" />
        </SettingsGroup>
      )}
      {/* Devices: a plain list – no big button here; logging out sits at the very bottom. */}
      <SettingsGroup title={tu("account.groupDevices")}>
        <SettingsRow title={t("session")} subtitle={tu("account.thisDeviceSub")} value={tu("account.now")} />
      </SettingsGroup>
      {/* At the very bottom, plain: Log out (this device) and Log out of all devices – each asks first. Deleting the account lives in
          Privacy & safety › Your data. */}
      <SettingsGroup className="pt-2">
        <SettingsRow title={t("logOut")} onClick={() => setConfirming("one")} />
        <SettingsRow title={t("logOutAll")} subtitle={t("logOutAllSub")} onClick={() => setConfirming("all")} />
      </SettingsGroup>
      <ConfirmSheet
        open={confirming !== null}
        title={confirming === "all" ? tu("account.logOutAllConfirmTitle") : tu("account.logOutConfirmTitle")}
        description={confirming === "all" ? tu("account.logOutAllConfirmText") : tu("account.logOutConfirmText")}
        confirmLabel={confirming === "all" ? tu("account.logOutAllConfirm") : t("logOut")}
        onClose={() => setConfirming(null)}
        onConfirm={() => {
          const all = confirming === "all";
          setConfirming(null);
          store.logout();
          showToast(all ? t("loggedOutAll") : tMenu("loggedOut"));
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
  const saved = useSaved();
  const { start: startOnboarding } = useStartOnboarding();
  const router = useRouter();
  const [setupOpen, setSetupOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);

  async function verify() {
    if (verifying) return;
    setVerifying(true);
    router.push(await payments.startIdentityCheck(me.id, "/settings/payments"));
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
    <div className="space-y-7">
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
      {/* Hosts: private or business, and – behind its switch, past the threshold – the tax details (CLAUDE.md "Plattform-Pflichten"). */}
      <HostDuties me={me} onSaved={saved} />
      <SettingsGroup title={tu("groupHistory")}>
        <SettingsRow title={tu("paymentHistory")} chevron href="/settings/payments/history" />
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
    <div className="space-y-7">
      <AreaTitle title={tu("paymentHistory")} />
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


/**
 * Notifications (CLAUDE.md "Settings"): "Requests & bookings" on top – always on, and why; then each group with its channels as three
 * switches (Email · Push · In-app; a channel a group doesn't have isn't offered); House tips' in-app is the arc's cards in the House chat
 * (the same as "Mute Simpulo tips"); quiet hours at the end.
 */
function NotificationsArea({ me }: { me: User }) {
  const t = useTranslations("settings.notifications");
  const tNav = useTranslations("settings.ui.nav");
  const store = useStore();
  const saved = useSaved();
  const settings = settingsOf(me);
  const prefs = settings.notifications;
  const quiet = settings.quietHours ?? DEFAULT_QUIET_HOURS;
  const valueOf = (group: OptionalCategory, channel: "email" | "push" | "inApp") => (group === "arc" && channel === "inApp" ? !settings.arcMuted : prefs[group][channel]);
  function toggle(group: OptionalCategory, channel: "email" | "push" | "inApp", on: boolean) {
    if (group === "arc" && channel === "inApp") store.setArcMuted(!on);
    else store.setNotification(group, channel, on);
    saved();
  }
  return (
    <div className="space-y-7">
      <AreaTitle title={tNav("notifications")} />
      <SettingsGroup>
        <SettingsRow title={t("lockedTitle")} subtitle={t("lockedText")} control={<Lock aria-label={t("lockedTitle")} className="size-4 shrink-0 text-muted" />} />
      </SettingsGroup>
      <SettingsGroup>
        {OPTIONAL_CATEGORIES.map((group) => (
          <div key={group.key} data-notify-group={group.key} className="px-4 py-3.5">
            <p className="text-body text-ink">{t(`rows.${group.key}`)}</p>
            <p className="mt-0.5 text-small text-muted">{t(`notes.${group.key}`)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["email", "push", "inApp"] as const).map((channel) =>
                group[channel] ? (
                  <button
                    key={channel}
                    type="button"
                    aria-pressed={valueOf(group.key, channel)}
                    onClick={() => toggle(group.key, channel, !valueOf(group.key, channel))}
                    className={listItemStyles(valueOf(group.key, channel), "inline-flex min-h-9 items-center gap-1.5 px-4 text-small")}
                  >
                    {valueOf(group.key, channel) && <Check aria-hidden className="size-3.5" />}
                    {t(`channels.${channel}`)}
                  </button>
                ) : (
                  <span key={channel} className="inline-flex min-h-9 items-center px-4 text-small text-muted/70">
                    {t(`channels.${channel}`)} · {t("channels.none")}
                  </span>
                ),
              )}
            </div>
          </div>
        ))}
      </SettingsGroup>
      <SettingsGroup title={t("quietTitle")} footer={t("quietText")}>
        <SettingsRow title={t("quiet")} control={<Switch on={quiet.on} label={t("quiet")} onChange={(on) => (store.setQuietHours({ ...quiet, on }), saved())} />} />
        {quiet.on && (
          <div className="flex flex-wrap items-center gap-4 px-4 py-3">
            <label className="flex items-center gap-2 text-small text-muted">
              {t("quietFrom")}
              <Input type="time" value={quiet.from} onChange={(e) => (store.setQuietHours({ ...quiet, from: e.target.value || quiet.from }), saved())} className="h-10 w-32" />
            </label>
            <label className="flex items-center gap-2 text-small text-muted">
              {t("quietTo")}
              <Input type="time" value={quiet.to} onChange={(e) => (store.setQuietHours({ ...quiet, to: e.target.value || quiet.to }), saved())} className="h-10 w-32" />
            </label>
          </div>
        )}
      </SettingsGroup>
    </div>
  );
}

// ─── Privacy & safety ──────────────────────────────────────────────────────────

/**
 * Agreements (config/consent.ts): what you agreed to, which version, when – the latest of each, linked to its text; earlier versions
 * underneath as the history. Nothing to change here: a new version asks by itself.
 */
function AgreementsGroup({ me }: { me: User }) {
  const t = useTranslations("consent.settings");
  const format = useFormatter();
  // With the year – an agreement is a record.
  const day = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium" });
  const all = consentsOf(me);
  const latest = CONSENT_KINDS.map((kind) => ({ kind, record: all.find((c) => c.kind === kind) }));
  const earlier = all.filter((c) => latest.every((l) => l.record !== c));
  const href = (kind: ConsentKind) => (kind === "age" ? undefined : CONSENT_DOCS[kind].href);
  return (
    <>
      <SettingsGroup title={t("title")}>
        {latest
          // The hosts' guidelines only for someone who agreed to them (hosts).
          .filter((l) => l.kind !== "hostCode" || l.record)
          .map(({ kind, record }) => (
            <SettingsRow
              key={kind}
              title={t(kind)}
              value={!record ? t("never") : record.version ? t("agreed", { version: record.version, date: day(record.at) }) : t("confirmed", { date: day(record.at) })}
              href={href(kind)}
              chevron={Boolean(href(kind))}
            />
          ))}
      </SettingsGroup>
      {earlier.length > 0 && (
        <SettingsGroup title={t("history")}>
          {earlier.map((c) => (
            <SettingsRow key={`${c.kind}-${c.at}`} title={t("historyRow", { doc: t(c.kind), version: c.version ?? "–", date: day(c.at) })} />
          ))}
        </SettingsGroup>
      )}
    </>
  );
}

function PrivacyArea({ me }: { me: User }) {
  const t = useTranslations("settings.privacy");
  const tu = useTranslations("settings.ui");
  const tNotices = useTranslations("notices");
  const store = useStore();
  const showToast = useToast();
  const saved = useSaved();
  const blocked = settingsOf(me).blockedUserIds.map((id) => findUser(store, id)).filter((u): u is User => Boolean(u));
  const privacy = {
    showOnHousePages: showsOnHousePages(me),
    showAge: me.privacy?.showAge ?? PRIVACY_DEFAULTS.showAge,
    hidePhotoUntilAccepted: hidesPhotoUntilAccepted(me),
    hostPageInSearch: hostPageInSearch(me),
    nearby: Boolean(me.privacy?.nearby),
    showPeople: Boolean(me.privacy?.showPeople),
  };
  // The host page switch only for people who host publicly (lib/privacy.ts).
  const hosts = hostsPublicly(store, me.id);
  function setPrivacy(patch: Partial<typeof privacy>) {
    store.updateCurrentUser({ privacy: { ...me.privacy, ...privacy, ...patch } });
    saved();
  }

  const f = useFormat();
  const paused = Boolean(me.privacy?.paused);
  const [pausing, setPausing] = useState(false);
  function setPaused(on: boolean) {
    store.updateCurrentUser({ privacy: { ...me.privacy, paused: on, pausedAt: on ? new Date().toISOString() : undefined } });
    showToast(on ? tu("data.paused") : tu("data.resumed"));
  }

  // Download your data: asked for → "Ready in a few minutes" (the backend emails a link later) → ready (in the mock at once) → the ZIP.
  const [exportState, setExportState] = useState<"idle" | "preparing" | "ready">("idle");
  function requestExport() {
    setExportState("preparing");
    window.setTimeout(() => setExportState("ready"), 900);
  }
  function downloadData() {
    const now = new Date();
    const file = buildDataExport(store, me, now);
    const url = URL.createObjectURL(new Blob([file], { type: "application/zip" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `simpulo-data-${now.toISOString().slice(0, 10)}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(t("downloaded"));
  }
  const messages = messagePermissionOf(me);

  return (
    <div className="space-y-7">
      <AreaTitle title={tu("nav.privacy")} />
      {/* What others see – in plain words, from the switches below. */}
      <SettingsGroup title={tu("privacy.seeTitle")}>
        <SettingsRow
          title={tu("privacy.seeStrangers")}
          subtitle={paused ? tu("privacy.seePaused") : privacy.showOnHousePages ? (privacy.showAge ? tu("privacy.seeStrangersOnAge") : tu("privacy.seeStrangersOn")) : tu("privacy.seeStrangersOff")}
        />
        <SettingsRow title={tu("privacy.seeCrew")} subtitle={tu("privacy.seeCrewText")} />
        <SettingsRow title={tu("privacy.seeHosts")} subtitle={privacy.hidePhotoUntilAccepted ? tu("privacy.seeHostsHidden") : tu("privacy.seeHostsText")} />
      </SettingsGroup>
      <SettingsGroup title={t("visibilityTitle")}>
        <SettingsRow title={t("showOnHousePages")} subtitle={t("showOnHousePagesText")} control={<Switch on={privacy.showOnHousePages} label={t("showOnHousePages")} onChange={(on) => setPrivacy({ showOnHousePages: on })} />} />
        <SettingsRow title={t("showAge")} subtitle={t("showAgeText")} control={<Switch on={privacy.showAge} label={t("showAge")} onChange={(on) => setPrivacy({ showAge: on })} />} />
        <SettingsRow title={t("hidePhoto")} subtitle={t("hidePhotoText")} control={<Switch on={privacy.hidePhotoUntilAccepted} label={t("hidePhoto")} onChange={(on) => setPrivacy({ hidePhotoUntilAccepted: on })} />} />
        {/* Your lists of people on your profile (CLAUDE.md "Profil als Netzwerk-Seite"): private by default. */}
        <SettingsRow title={t("showPeople")} subtitle={t("showPeopleText")} control={<Switch on={privacy.showPeople} label={t("showPeople")} onChange={(on) => setPrivacy({ showPeople: on })} />} />
        {hosts && <SettingsRow title={t("hostPage")} subtitle={t("hostPageText")} control={<Switch on={privacy.hostPageInSearch} label={t("hostPage")} onChange={(on) => setPrivacy({ hostPageInSearch: on })} />} />}
        {/* Nearby (lib/nearby.ts): consent, off by default – only Your people, only when they turned it on too. */}
        <SettingsRow title={t("nearby")} subtitle={t("nearbyText")} control={<Switch on={privacy.nearby} label={t("nearby")} onChange={(on) => setPrivacy({ nearby: on })} />} />
      </SettingsGroup>
      {/* Who can start a direct chat with you (lib/messagePermission.ts) – every chat belongs to a House. */}
      <SettingsGroup footer={tu(`privacy.messagesNote.${messages}`)}>
        <SettingsRow
          title={tu("privacy.messages")}
          control={
            <RowSelect
              label={tu("privacy.messages")}
              value={messages}
              onChange={(v) => {
                store.updateCurrentUser({ privacy: { ...me.privacy, messages: v === DEFAULT_MESSAGE_PERMISSION ? undefined : v } });
                saved();
              }}
              options={MESSAGE_PERMISSIONS.map((value) => ({ value, label: tu(`privacy.messagesOptions.${value}`) }))}
            />
          }
        />
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
      <AgreementsGroup me={me} />
      {/* Simpulo's decisions about you, with the reasons and "Appeal" (CLAUDE.md "Plattform-Pflichten"). */}
      <SettingsGroup>
        <SettingsRow title={tNotices("title")} chevron href="/notices" />
      </SettingsGroup>
      {/* Your data, at the end and plainly named: the download, a pause (hidden, nothing deleted, back any time) and – in red – deleting,
          on its own page that explains it first. */}
      <SettingsGroup title={tu("data.title")}>
        <SettingsRow
          title={tu("data.download")}
          subtitle={exportState === "preparing" ? tu("data.preparing") : exportState === "ready" ? tu("data.ready") : tu("data.downloadSub")}
          control={
            exportState === "ready" ? (
              <Button size="sm" variant="secondary" className="-mr-1" onClick={downloadData}>
                {tu("data.downloadButton")}
              </Button>
            ) : (
              <Button size="sm" variant="tertiary" className="-mr-3" disabled={exportState === "preparing"} onClick={requestExport}>
                {exportState === "preparing" ? tu("data.preparingShort") : tu("data.request")}
              </Button>
            )
          }
        />
        <SettingsRow
          title={tu("data.pause")}
          subtitle={paused ? tu("data.pausedSub", { date: f.day(me.privacy?.pausedAt ?? new Date().toISOString()) }) : tu("data.pauseSub")}
          control={
            paused ? (
              <Button size="sm" variant="secondary" className="-mr-1" onClick={() => setPaused(false)}>
                {tu("data.resume")}
              </Button>
            ) : (
              <Button size="sm" variant="tertiary" className="-mr-3" onClick={() => setPausing(true)}>
                {tu("data.pauseButton")}
              </Button>
            )
          }
        />
        <SettingsRow title={tu("data.delete")} subtitle={tu("data.deleteSub")} danger chevron href="/settings/delete-account" />
      </SettingsGroup>
      <ConfirmSheet
        open={pausing}
        title={tu("data.pauseConfirmTitle")}
        description={tu("data.pauseConfirmText")}
        confirmLabel={tu("data.pauseConfirm")}
        onClose={() => setPausing(false)}
        onConfirm={() => {
          setPausing(false);
          setPaused(true);
        }}
      />
    </div>
  );
}

// ─── Appearance ───────────────────────────────────────────────────────────────

/** Language: English only for now (the account field is ready, i18n/config.ts). */
function LanguageArea() {
  const tu = useTranslations("settings.ui");
  return (
    <div className="space-y-7">
      <AreaTitle title={tu("nav.language")} />
      <SettingsGroup footer={tu("general.languageSoon")}>
        <SettingsRow title={tu("general.english")} control={<Check aria-hidden className="size-4 text-ink" strokeWidth={2.5} />} />
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
  const tFooter = useTranslations("footer");
  const { automatic, current } = useCurrencyState(me);
  const standalone = useIsStandalone();
  const saved = useSaved();
  const hintsOff = useInstallHintsOff();
  return (
    <div className="space-y-7">
      <AreaTitle title={tu("nav.general")} />
      <SettingsGroup>
        <SettingsRow title={tu("general.currency")} value={automatic ? tu("general.automaticValue", { label: currencyLabel(current) }) : currencyLabel(current)} chevron href="/settings/general/currency" />
        {/* Hidden until a second language exists (i18n/config.ts SHOW_LANGUAGE_SETTING); the account field is ready. */}
        {SHOW_LANGUAGE_SETTING && <SettingsRow title={tu("general.language")} value={tu("general.english")} chevron href="/settings/general/language" />}
      </SettingsGroup>
      {/* Your people and – not in the installed app – Get the app, as in the avatar menu (Log out also sits in Account › Devices). */}
      <SettingsGroup>
        <SettingsRow title={tu("general.yourPeople")} chevron href="/people" />
        {!standalone && <SettingsRow title={tu("general.getApp")} chevron href="/get" />}
        {/* The install hint after paying, joining a crew or opening the group chat – at most once a week, off here (lib/install.ts). */}
        {!standalone && (
          <SettingsRow
            title={tu("general.installHints")}
            subtitle={tu("general.installHintsText")}
            control={
              <Switch
                on={!hintsOff}
                label={tu("general.installHints")}
                onChange={(on) => {
                  setInstallHintsOff(!on);
                  saved();
                }}
              />
            }
          />
        )}
      </SettingsGroup>
      {/* Support in two ways – "Get help" (question, something's broken, safety) and "Share an idea" → Admin › Support. */}
      <SettingsGroup>
        <SettingsRow title={tu("general.help")} chevron onClick={openGetHelp} />
        <SettingsRow title={tu("general.idea")} chevron onClick={openShareIdea} />
      </SettingsGroup>
      {/* Legal: Impressum, Privacy, Terms, Cookies, Cancellation, Community guidelines – reachable from every page without a footer (Messages, Admin) via the avatar menu › Settings. */}
      <SettingsGroup title={tu("general.legal")}>
        <SettingsRow title={tFooter("links.impressum")} chevron href="/impressum" />
        <SettingsRow title={tFooter("links.privacy")} chevron href="/privacy" />
        <SettingsRow title={tFooter("links.terms")} chevron href="/terms" />
        <SettingsRow title={tFooter("links.cookies")} chevron href="/cookies" />
        <SettingsRow title={tFooter("links.cancellation")} chevron href="/cancellation" />
        <SettingsRow title={tFooter("links.guidelines")} chevron href="/community-guidelines" />
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
  const router = useRouter();
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
    router.push("/settings/general");
  };
  return (
    <div className="space-y-6">
      <AreaTitle title={tu("currency")} />
      <label className="relative block">
        <span className="sr-only">{tu("search")}</span>
        <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tu("search")} className="bg-(--surface) pl-10" />
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
      <AreaTitle title={tu("language")} />
      <SettingsGroup footer={tu("languageSoon")}>
        <SettingsRow title={tu("english")} control={<Check aria-hidden className="size-4 text-ink" strokeWidth={2.5} />} />
      </SettingsGroup>
    </div>
  );
}

// ─── Delete account ────────────────────────────────────────────────────────────

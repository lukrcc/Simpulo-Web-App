"use client";

import { Bell, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AndroidInstallButton, IosInstallSteps } from "@/components/InstallHint";
import { InstallPromptContext, type OfferInstall } from "@/components/installPromptContext";
import { SimpuloQR } from "@/components/SimpuloQR";
import { Button } from "@/components/ui/ActionButton";
import { IconButton } from "@/components/ui/IconButton";
import { Sheet } from "@/components/ui/Sheet";
import { cardTaskOf } from "@/lib/houseTasks";
import {
  dismissInAppHint,
  inAppHintDismissed,
  isStandalone,
  mayAskForPush,
  mayShowInstallPrompt,
  noteInstallPromptDismissed,
  noteInstallPromptShown,
  notePushAsked,
  requestPush,
  useBrowser,
  useInAppBrowser,
  useInstallPrompt,
  type Browser,
  type InstallTrigger,
} from "@/lib/install";
import { appLink } from "@/lib/links";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const SHOW_DELAY_MS = 600;
/** The first seconds after loading only learn what's already there (restored mock state), they never trigger. */
const ARM_AFTER_MS = 2000;

type Offer = "desktop" | "ios" | "android";
type Open = { sheet: "install"; offer: Offer; trigger: InstallTrigger; hostName?: string } | { sheet: "push"; trigger: InstallTrigger };

/** What this device can be offered: a QR code on a computer, the Safari steps, Chrome's install (only with its event) – or nothing. */
function offerFor(browser: Browser, hasPrompt: boolean): Offer | null {
  if (browser === "desktop") return "desktop";
  if (browser === "ios-safari") return "ios";
  if (browser === "android-chrome" && hasPrompt) return "android";
  return null;
}

/**
 * Getting Simpulo on the phone, offered at the moments it pays off – never on the first visit, never without an action of your own:
 * - after the first sent request: "Get notified when {hostName} answers" (StayDetail calls useOfferInstall),
 * - after an acceptance: "Your crew chat is live – don't miss a message",
 * - when a payment is due: "We'll remind you before your spot expires" (both found in the store, InstallTriggers).
 * At most 3 showings, never again after 2 dismissals, 3 days apart (lib/install.ts). In the installed app the same moments ask for
 * push instead – our own short sheet first, the browser's question only after "Turn on". Plus the in-app browser hint on every page.
 */
export function InstallPromptProvider({ children }: { children: ReactNode }) {
  const browser = useBrowser();
  const prompt = useInstallPrompt();
  const [open, setOpen] = useState<Open | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const device = useRef({ browser, hasPrompt: !!prompt, open: false });
  useEffect(() => {
    device.current = { browser, hasPrompt: !!prompt, open: open !== null };
  });
  useEffect(() => () => clearTimeout(timer.current), []);

  const offerInstall = useCallback<OfferInstall>((trigger, options) => {
    if (device.current.open) return;
    let next: Open | null = null;
    if (isStandalone()) {
      if (mayAskForPush()) next = { sheet: "push", trigger };
    } else {
      const offer = offerFor(device.current.browser, device.current.hasPrompt);
      if (offer && mayShowInstallPrompt()) next = { sheet: "install", offer, trigger, hostName: options?.hostName };
    }
    if (!next) return;
    const show = next;
    clearTimeout(timer.current);
    // Let the sheet that caused it close and its confirmation show first.
    timer.current = setTimeout(() => {
      if (show.sheet === "install") noteInstallPromptShown(show.trigger);
      else notePushAsked(show.trigger);
      setOpen(show);
    }, SHOW_DELAY_MS);
  }, []);

  return (
    <InstallPromptContext.Provider value={offerInstall}>
      {children}
      <InstallTriggers />
      <InAppBrowserHint />
      {open?.sheet === "install" && (
        <InstallSheet
          {...open}
          onClose={(dismissed) => {
            if (dismissed) noteInstallPromptDismissed(open.trigger);
            setOpen(null);
          }}
        />
      )}
      {open?.sheet === "push" && <PushSheet trigger={open.trigger} onClose={() => setOpen(null)} />}
    </InstallPromptContext.Provider>
  );
}

/**
 * Watches the store for the current user's new acceptances and newly due payments. What was already there when the page loaded (or
 * when this user was first seen) only becomes the baseline – each acceptance and each due payment can trigger once.
 */
function InstallTriggers() {
  const store = useStore();
  // Rendered inside the provider, so the context is always there.
  const offer = useContext(InstallPromptContext)!;
  const me = store.currentUserId;
  // Set in an effect (the clock can't be read while rendering – prerender); it runs before the one below.
  const armedAt = useRef(Number.POSITIVE_INFINITY);
  useEffect(() => {
    armedAt.current = Date.now() + ARM_AFTER_MS;
  }, []);
  useEffect(() => {
    if (!me) return;
    const now = new Date().toISOString();
    const accepted = store.joinRequests.filter((r) => r.userId === me && r.status === "accepted").map((r) => `a:${r.id}`);
    const payments = store.stays.filter((s) => cardTaskOf(store, s, now)?.kind === "pay").map((s) => `p:${s.id}`);
    const key = `simpulo:install-seen:${me}`;
    let seen: string[] | null = null;
    try {
      seen = JSON.parse(localStorage.getItem(key) ?? "null") as string[] | null;
    } catch {
      return; // storage blocked: no triggers
    }
    const current = [...accepted, ...payments];
    const fresh = seen ? current.filter((id) => !seen.includes(id)) : [];
    if (fresh.length === 0 && seen) return;
    try {
      localStorage.setItem(key, JSON.stringify([...new Set([...(seen ?? []), ...current])]));
    } catch {
      return;
    }
    if (!seen || Date.now() < armedAt.current) return;
    if (fresh.some((id) => id.startsWith("p:"))) offer("payment");
    else if (fresh.length > 0) offer("accepted");
  }, [store, me, offer]);
  return null;
}

function InstallSheet({ offer, trigger, hostName, onClose }: { offer: Offer; trigger: InstallTrigger; hostName?: string; onClose: (dismissed: boolean) => void }) {
  const t = useTranslations("install");
  const title = trigger === "request" ? t("requestTitle", { name: hostName ?? "" }) : trigger === "accepted" ? t("acceptedTitle") : t("paymentTitle");
  const benefit = trigger === "request" ? t("requestBenefit") : trigger === "accepted" ? t("acceptedBenefit") : t("paymentBenefit");
  return (
    <Sheet open onClose={() => onClose(true)} title={title} subtitle={benefit} lead={<MockNotification android={offer === "android"} />}>
      {offer === "ios" && <IosInstallSteps />}
      {offer === "desktop" && (
        <div className="flex items-center gap-5">
          <SimpuloQR url={appLink()} refParam={`prompt-${trigger}`} size={120} className="shrink-0" />
          <p className="text-body text-ink">{t("desktopScan")}</p>
        </div>
      )}
      <div className={cn("flex items-center gap-3", offer === "android" ? "justify-between" : "mt-8 justify-end")}>
        <Button variant="secondary" onClick={() => onClose(true)}>
          {t("notNow")}
        </Button>
        {offer === "android" && <AndroidInstallButton label={t("addToHome")} onDone={(accepted) => onClose(!accepted)} />}
      </div>
    </Sheet>
  );
}

/** A notification as the phone would show it – iOS (a rounded glass card, time on the right) or Android (app line on top). */
function MockNotification({ android }: { android: boolean }) {
  const t = useTranslations("install");
  // No app icon inside the pages: a plain "s." with the logo's orange dot stands in.
  const icon = (
    <span className={cn("flex size-9 shrink-0 items-center justify-center bg-surface text-logo tracking-tight text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)]", android ? "rounded-full" : "rounded-[9px]")}>
      s<span className="text-accent">.</span>
    </span>
  );
  return (
    <div aria-hidden className="w-[min(340px,calc(100vw-120px))] rounded-[20px] bg-white/65 p-3 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_8px_24px_rgba(40,32,26,0.08)]">
      {android ? (
        <div>
          <div className="flex items-center gap-1.5 text-small text-muted">
            <span className="size-4 shrink-0 overflow-hidden rounded-full">{icon}</span>
            {t("mockApp")} · {t("mockTime")}
          </div>
          <p className="mt-1 truncate text-body text-ink">{t("mockText")}</p>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          {icon}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-small font-semibold text-ink">{t("mockApp")}</span>
              <span className="text-small text-muted">{t("mockTime")}</span>
            </div>
            <p className="truncate text-body text-ink">{t("mockText")}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/** In the installed app: first our own short sheet, the browser's question only after "Turn on". */
function PushSheet({ trigger, onClose }: { trigger: InstallTrigger; onClose: () => void }) {
  const t = useTranslations("install");
  return (
    <Sheet open onClose={onClose} title={t("pushTitle")} subtitle={t("pushText")} lead={<span className="flex size-10 items-center justify-center rounded-full bg-ink/6"><Bell className="size-5 text-ink" aria-hidden /></span>}>
      <div className="flex items-center justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>
          {t("notNow")}
        </Button>
        <Button
          onClick={async () => {
            await requestPush(trigger);
            onClose();
          }}
        >
          {t("pushAllow")}
        </Button>
      </div>
    </Sheet>
  );
}

/** Instagram, TikTok & co. open links in their own browser, which can't install anything: a quiet hint on top, once per session. */
function InAppBrowserHint() {
  const t = useTranslations("install");
  const inApp = useInAppBrowser();
  const browser = useBrowser();
  const [dismissed, setDismissed] = useState(false);
  if (!inApp || dismissed || inAppHintDismissed()) return null;
  const ios = browser.startsWith("ios");
  return (
    <div role="note" data-in-app-hint className="glass-panel fixed inset-x-3 top-[calc(env(safe-area-inset-top)+8px)] z-[65] flex items-center gap-3 rounded-[20px] py-2.5 pl-4 pr-2">
      <div className="min-w-0 flex-1">
        <p className="text-small font-semibold text-ink">{ios ? t("inAppSafari") : t("inAppChrome")}</p>
        <p className="text-small text-muted">{t("inAppHow")}</p>
      </div>
      <IconButton
        size="sm"
        aria-label={t("inAppDismiss")}
        onClick={() => {
          dismissInAppHint();
          setDismissed(true);
        }}
      >
        <X className="size-4" />
      </IconButton>
    </div>
  );
}

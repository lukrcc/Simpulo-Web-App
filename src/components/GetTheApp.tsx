"use client";

import { Bell, ChevronDown, CircleCheck, Download, EllipsisVertical, Share, SquarePlus } from "lucide-react";
import { useState, type MouseEvent, type ReactNode } from "react";
import { SiAndroid, SiApple } from "react-icons/si";
import { buttonClass } from "@/components/ui/button";
import { Img } from "@/components/ui/Img";
import { clearInstallPrompt, useInstallPrompt, useIsStandalone, usePlatform, type Platform } from "@/lib/install";
import { cn } from "@/lib/utils";

type Card = "iphone" | "android";
type OpenCards = Record<Card, boolean>;

/** The detected platform only decides which card starts open – both always stay on the page. */
function defaultOpen(platform: Platform): OpenCards {
  if (platform === "ios") return { iphone: true, android: false };
  if (platform === "android") return { iphone: false, android: true };
  return { iphone: true, android: true };
}

// Anchors sit under the sticky desktop header (64px) – and under the status bar on mobile.
const anchorOffset = "scroll-mt-[env(safe-area-inset-top)] md:scroll-mt-16";

/** "Use Simpulo like an app": store-style buttons plus the iPhone and Android steps. Anchor: #get-the-app. */
export function GetTheApp() {
  const platform = usePlatform();
  const standalone = useIsStandalone();
  const installPrompt = useInstallPrompt();
  /** null until the visitor toggles a card themselves – until then the platform default applies. */
  const [toggled, setToggled] = useState<OpenCards | null>(null);
  const open = toggled ?? defaultOpen(platform);

  function setCard(card: Card, value: boolean) {
    setToggled({ ...open, [card]: value });
  }

  // Android button: install right away when Chrome has offered the prompt, otherwise jump to the steps.
  async function onAndroid(e: MouseEvent) {
    if (!installPrompt) {
      setCard("android", true);
      return;
    }
    e.preventDefault();
    await installPrompt.prompt();
    await installPrompt.userChoice;
    clearInstallPrompt();
  }

  return (
    <section id="get-the-app" className={cn("rounded-3xl bg-white p-6 md:p-8", anchorOffset)}>
      <h2 className="text-2xl font-bold tracking-tight text-ink">Use Simpulo like an app</h2>
      <p className="mt-1 text-zinc-500">No store needed – add it to your home screen and get notified when hosts answer.</p>

      <div className="mt-5 flex flex-wrap gap-3">
        <StoreButton href="#get-the-app-iphone" icon={<SiApple className="size-6" />} platform="iPhone" onClick={() => setCard("iphone", true)} />
        <StoreButton href="#get-the-app-android" icon={<SiAndroid className="size-6" />} platform="Android" onClick={onAndroid} />
      </div>

      {standalone && (
        <p className="mt-5 flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">
          <CircleCheck className="size-5 shrink-0" />
          You&apos;re already using the installed app – nothing else to do.
        </p>
      )}

      <div className="mt-6 space-y-3">
        <PlatformCard id="get-the-app-iphone" title="iPhone" open={open.iphone} onToggle={(value) => setCard("iphone", value)}>
          <ol className="space-y-3">
            <StepCard
              n={1}
              title="Tap Share"
              text="In Safari, tap the Share button in the toolbar."
              illustration={
                <div className="flex h-12 w-full items-center justify-around rounded-xl bg-neutral-100 text-neutral-400">
                  <span className="h-1.5 w-6 rounded-full bg-neutral-300" />
                  <span className="flex size-9 items-center justify-center rounded-full bg-white text-sky-600 shadow ring-2 ring-sky-500">
                    <Share className="size-4" />
                  </span>
                  <span className="h-1.5 w-6 rounded-full bg-neutral-300" />
                </div>
              }
            />
            <StepCard
              n={2}
              title="Add to Home Screen"
              text="Scroll the menu and choose “Add to Home Screen”, then tap Add."
              illustration={
                <div className="flex h-12 w-full items-center justify-between rounded-xl bg-white px-3 text-sm font-medium shadow ring-1 ring-black/5">
                  Add to Home Screen
                  <SquarePlus className="size-5 text-neutral-500" />
                </div>
              }
            />
            <StepCard
              n={3}
              title="Open from the icon"
              text="Start Simpulo from your home screen and allow notifications when it asks."
              illustration={
                <div className="flex h-12 w-full items-center gap-3 rounded-xl bg-neutral-100 px-3">
                  <Img src="/icon-192.png" alt="" width={36} height={36} className="size-9 rounded-[10px]" />
                  <span className="text-sm font-medium">Simpulo</span>
                  <Bell className="ml-auto size-4 text-accent" />
                </div>
              }
            />
          </ol>
        </PlatformCard>

        <PlatformCard id="get-the-app-android" title="Android" open={open.android} onToggle={(value) => setCard("android", value)}>
          <AndroidCard />
        </PlatformCard>
      </div>
    </section>
  );
}

/** One card: Chrome's install prompt when available, otherwise the Chrome menu steps. */
function AndroidCard() {
  const installPrompt = useInstallPrompt();
  const [installed, setInstalled] = useState(false);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    clearInstallPrompt();
    setInstalled(choice.outcome === "accepted");
  }

  return (
    <div className="rounded-2xl border border-neutral-100 bg-white p-4">
      {installed ? (
        <p className="flex items-center gap-2 text-sm text-emerald-800">
          <CircleCheck className="size-5" />
          Simpulo is on your home screen. Open it from there.
        </p>
      ) : installPrompt ? (
        <div className="text-center">
          <button type="button" onClick={install} className={buttonClass("dark", "lg", "w-full sm:w-auto")}>
            <Download className="size-4" />
            Install app
          </button>
          <p className="mt-3 text-sm text-neutral-500">Takes a second – no app store needed.</p>
        </div>
      ) : (
        <ol className="space-y-3 text-sm">
          <li className="flex gap-3">
            <StepNumber n={1} />
            <span>
              In Chrome, tap the menu <EllipsisVertical className="inline size-4 align-text-bottom" aria-label="three dots" /> top right.
            </span>
          </li>
          <li className="flex gap-3">
            <StepNumber n={2} />
            <span>Choose “Install app” (or “Add to Home screen”) and confirm.</span>
          </li>
          <li className="flex gap-3">
            <StepNumber n={3} />
            <span>Open Simpulo from your home screen and allow notifications.</span>
          </li>
        </ol>
      )}
    </div>
  );
}

function PlatformCard({
  id,
  title,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  open: boolean;
  onToggle: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <details
      id={id}
      open={open}
      onToggle={(e) => onToggle(e.currentTarget.open)}
      className={cn("group rounded-2xl bg-neutral-50 p-4", anchorOffset)}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between font-semibold [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="size-5 text-zinc-500 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

function StoreButton({
  href,
  icon,
  platform,
  onClick,
}: {
  href: string;
  icon: ReactNode;
  platform: string;
  onClick?: (e: MouseEvent) => void;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={cn(
        "inline-flex h-14 items-center gap-3 rounded-full bg-ink pl-5 pr-6 text-white outline-none transition-[background-color,transform] duration-200",
        "hover:bg-[#2A2A30] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 active:scale-[0.98]",
      )}
    >
      {icon}
      <span className="flex flex-col leading-tight">
        <span className="text-[11px] text-white/70">Add to</span>
        <span className="text-base font-semibold">{platform}</span>
      </span>
    </a>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">{n}</span>
  );
}

function StepCard({ n, title, text, illustration }: { n: number; title: string; text: string; illustration?: ReactNode }) {
  return (
    <li className="flex items-center gap-4 rounded-2xl border border-neutral-100 bg-white p-4">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">{n}</span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-sm text-neutral-600">{text}</p>
        {illustration && <div className="mt-3">{illustration}</div>}
      </div>
    </li>
  );
}

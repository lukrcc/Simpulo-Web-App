"use client";

import { Bell, CircleCheck, Download, EllipsisVertical, QrCode, Share, SquarePlus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { buttonClass } from "@/components/ui/button";
import { Img } from "@/components/ui/Img";
import { clearInstallPrompt, useInstallPrompt, useIsStandalone, usePlatform } from "@/lib/install";

const INSTALL_URL = "https://simpulo.app/install";

export function InstallGuide() {
  const platform = usePlatform();
  const standalone = useIsStandalone();

  return (
    <div className="mx-auto max-w-2xl px-4 pt-8 md:px-6 md:pt-14">
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Get Simpulo on your phone</h1>
      <p className="mt-3 text-lg leading-relaxed text-neutral-600">
        Add Simpulo to your home screen – it opens like an app and can tell you when a host answers.
      </p>

      <div className="mt-8">
        {/* Platform is only known in the browser; keep the server/hydration render neutral. */}
        {platform === "unknown" && <div className="h-64 animate-pulse rounded-2xl bg-neutral-100" aria-busy="true" />}
        {platform !== "unknown" && standalone && (
          <Done>You&apos;re already using the installed app. Nothing else to do.</Done>
        )}
        {platform === "ios" && !standalone && <IosSteps />}
        {platform === "android" && !standalone && <AndroidInstall />}
        {platform === "desktop" && !standalone && <DesktopNote />}
      </div>
    </div>
  );
}

function IosSteps() {
  return (
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
            <Img src="/icons/icon-192.png" alt="" width={36} height={36} className="size-9 rounded-[10px]" />
            <span className="text-sm font-medium">Simpulo</span>
            <Bell className="ml-auto size-4 text-accent" />
          </div>
        }
      />
    </ol>
  );
}

function AndroidInstall() {
  const prompt = useInstallPrompt();
  const [outcome, setOutcome] = useState<"accepted" | "dismissed" | null>(null);

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    clearInstallPrompt();
    setOutcome(choice.outcome);
  }

  if (outcome === "accepted") return <Done>Simpulo is on your home screen. Open it from there.</Done>;

  if (prompt) {
    return (
      <div className="rounded-2xl border border-neutral-100 p-6 text-center">
        <button type="button" onClick={install} className={buttonClass("dark", "lg", "w-full sm:w-auto")}>
          <Download className="size-4" />
          Install app
        </button>
        <p className="mt-3 text-sm text-neutral-500">Takes a second – no app store needed.</p>
      </div>
    );
  }

  // No prompt available (other browser, already dismissed, or Chrome hasn't offered it yet): manual steps.
  return (
    <ol className="space-y-3">
      <StepCard
        n={1}
        title="Open the Chrome menu"
        text="Tap the three dots in the top-right corner."
        illustration={
          <div className="flex h-12 w-full items-center justify-end rounded-xl bg-neutral-100 px-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-white shadow ring-2 ring-sky-500">
              <EllipsisVertical className="size-4" />
            </span>
          </div>
        }
      />
      <StepCard
        n={2}
        title="Install app"
        text="Choose “Install app” (or “Add to Home screen”) and confirm."
        illustration={
          <div className="flex h-12 w-full items-center justify-between rounded-xl bg-white px-3 text-sm font-medium shadow ring-1 ring-black/5">
            Install app
            <Download className="size-5 text-neutral-500" />
          </div>
        }
      />
      <StepCard n={3} title="Open from the icon" text="Start Simpulo from your home screen and allow notifications." />
    </ol>
  );
}

function DesktopNote() {
  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl border border-neutral-100 p-8 text-center sm:flex-row sm:text-left">
      {/* QR code placeholder – swap for a generated code once the domain is live. */}
      <a
        href={INSTALL_URL}
        className="flex size-36 shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-300 text-neutral-400 transition-colors hover:border-ink hover:text-ink"
      >
        <QrCode className="size-12" />
        <span className="text-xs">QR code</span>
      </a>
      <div>
        <p className="font-semibold">Simpulo works best on your phone.</p>
        <p className="mt-1 text-neutral-600">
          Scan the code or open{" "}
          <a href={INSTALL_URL} className="font-medium text-accent hover:underline">
            simpulo.app/install
          </a>{" "}
          on your phone and follow the steps there.
        </p>
      </div>
    </div>
  );
}

function StepCard({ n, title, text, illustration }: { n: number; title: string; text: string; illustration?: ReactNode }) {
  return (
    <li className="flex items-center gap-4 rounded-2xl border border-neutral-100 p-4">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-sm text-neutral-600">{text}</p>
        {illustration && <div className="mt-3">{illustration}</div>}
      </div>
    </li>
  );
}

function Done({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-emerald-800">
      <CircleCheck className="size-5 shrink-0" />
      {children}
    </p>
  );
}

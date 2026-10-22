"use client";

import { Bell, CircleCheck, EllipsisVertical, Share, SquarePlus, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ComponentType } from "react";
import { SiAndroid, SiApple } from "react-icons/si";
import { useToast } from "@/components/ui/Toast";
import { clearInstallPrompt, useInstallPrompt, useIsStandalone, usePlatform } from "@/lib/install";
import { cn } from "@/lib/utils";

type AppPlatform = "iphone" | "android";

const PLATFORMS: ReadonlyArray<{ value: AppPlatform; icon: ComponentType<{ className?: string }> }> = [
  { value: "iphone", icon: SiApple },
  { value: "android", icon: SiAndroid },
];

/** Step texts: keys under howItWorks.app.steps. */
const STEPS = {
  iphone: [
    { icon: Share, key: "share" },
    { icon: SquarePlus, key: "addToHome" },
    { icon: Bell, key: "notify" },
  ],
  android: [
    { icon: EllipsisVertical, key: "menu" },
    { icon: SquarePlus, key: "install" },
    { icon: Bell, key: "notify" },
  ],
} as const satisfies Record<AppPlatform, ReadonlyArray<{ icon: LucideIcon; key: string }>>;

/**
 * "Use Simpulo like an app" card – the #get-the-app anchor. The segment defaults to the visitor's platform;
 * one CTA follows it. Websites can't trigger "Add to Home Screen" on iOS, so the iPhone CTA points to the
 * Safari step; Android opens Chrome's install prompt when available.
 */
export function GetTheApp({ className }: { className?: string }) {
  const platform = usePlatform();
  const standalone = useIsStandalone();
  const installPrompt = useInstallPrompt();
  const showToast = useToast();
  const t = useTranslations("howItWorks.app");
  /** null until the visitor picks one – until then the detected platform decides. */
  const [picked, setPicked] = useState<AppPlatform | null>(null);
  const selected: AppPlatform = picked ?? (platform === "android" ? "android" : "iphone");

  async function install() {
    if (selected === "iphone") {
      showToast(t("toastIphone"));
      return;
    }
    if (!installPrompt) {
      showToast(t("toastAndroid"));
      return;
    }
    await installPrompt.prompt();
    await installPrompt.userChoice;
    clearInstallPrompt();
  }

  const CtaIcon = selected === "iphone" ? SiApple : SiAndroid;

  return (
    <section
      id="get-the-app"
      // The anchor lands below the header via the global scroll-padding-top (--header-h).
      className={cn("rounded-[28px] bg-white p-8", className)}
    >
      <h2 className="text-xl font-semibold tracking-tight text-ink">{t("title")}</h2>
      <p className="mt-1 text-sm text-zinc-500">{t("intro")}</p>

      {standalone ? (
        <p className="mt-5 flex items-center gap-2 rounded-2xl bg-zinc-100 p-4 text-sm text-ink">
          <CircleCheck className="size-5 shrink-0 text-accent" />
          {t("installed")}
        </p>
      ) : (
        <>
          <div role="tablist" aria-label={t("platform")} className="mt-6 flex gap-1 rounded-full bg-black/5 p-1">
            {PLATFORMS.map(({ value, icon: Icon }) => {
              const active = value === selected;
              return (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setPicked(value)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-full py-2 text-sm font-medium transition-colors",
                    active ? "bg-white text-ink shadow-sm" : "text-zinc-500 hover:text-ink",
                  )}
                >
                  <Icon className="size-4" />
                  {t(`platforms.${value}`)}
                </button>
              );
            })}
          </div>

          <ol className="mt-6 space-y-4">
            {STEPS[selected].map(({ icon: Icon, key }, i) => (
              <li key={key} className="flex items-center gap-3 text-base text-ink">
                <StepNumber n={i + 1} />
                <Icon className="size-4.5 shrink-0 text-zinc-500" aria-hidden />
                <span>{t(`steps.${key}`)}</span>
              </li>
            ))}
          </ol>

          <button
            type="button"
            onClick={install}
            className={cn(
              "mt-7 inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-full bg-ink px-6 text-sm font-semibold text-white outline-none transition-[background-color,transform] duration-200",
              "hover:bg-[#2A2A30] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 active:scale-[0.98]",
            )}
          >
            <CtaIcon className="size-5" />
            {selected === "iphone" ? t("ctaIphone") : t("ctaAndroid")}
          </button>
          <p className="mt-3 text-center text-xs text-zinc-500">{t("desktopHint")}</p>
        </>
      )}
    </section>
  );
}

/** 32px dark number circle with the wordmark's orange dot ("1.") – shared with the steps card on /how-it-works. */
export function StepNumber({ n }: { n: number }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">
      {n}
      <span className="text-accent">.</span>
    </span>
  );
}

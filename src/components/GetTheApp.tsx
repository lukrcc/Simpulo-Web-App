"use client";

import { Bell, CircleCheck, EllipsisVertical, Share, SquarePlus, type LucideIcon } from "lucide-react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useTranslations } from "next-intl";
import { useState, type ComponentType } from "react";
import { SiAndroid, SiApple } from "react-icons/si";
import { Button } from "@/components/ui/ActionButton";
import { cardClass } from "@/components/ui/Card";
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
      className={cn(cardClass, className)}
    >
      <h2 className="text-h3 tracking-tight text-ink">{t("title")}</h2>
      <p className="mt-1 text-small text-muted">{t("intro")}</p>

      {standalone ? (
        <p className="mt-5 flex items-center gap-2 rounded-xl bg-bg p-4 text-body text-ink">
          <CircleCheck className="size-5 shrink-0 text-ink" />
          {t("installed")}
        </p>
      ) : (
        <>
          <SegmentedControl label={t("platform")} className="mt-6" value={selected} onChange={setPicked} options={PLATFORMS.map(({ value }) => ({ value, label: t(`platforms.${value}`) }))} />

          <ol className="mt-6 space-y-4">
            {STEPS[selected].map(({ icon: Icon, key }, i) => (
              <li key={key} className="flex items-center gap-3 text-body text-ink">
                <StepNumber n={i + 1} />
                <Icon className="size-4.5 shrink-0 text-muted" aria-hidden />
                <span>{t(`steps.${key}`)}</span>
              </li>
            ))}
          </ol>

          <Button variant="primary" size="lg" onClick={install} className="mt-7 w-full">
            <CtaIcon />
            {selected === "iphone" ? t("ctaIphone") : t("ctaAndroid")}
          </Button>
          <p className="mt-3 text-center text-small text-muted">{t("desktopHint")}</p>
        </>
      )}
    </section>
  );
}

/** 32px dark number circle with a dot ("1.") – shared with the steps card on /how-it-works. */
export function StepNumber({ n }: { n: number }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-(--select-bg) text-body font-semibold text-ink">
      {n}
      <span className="text-ink">.</span>
    </span>
  );
}

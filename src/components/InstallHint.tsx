"use client";

import { ArrowDown, ArrowUp, CircleCheck, Download, Share, SquarePlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/ActionButton";
import { SimpuloQR } from "@/components/SimpuloQR";
import { clearInstallPrompt, useBrowser, useInstallPrompt, useIsIpad, useIsStandalone } from "@/lib/install";
import { appLink } from "@/lib/links";
import { cn } from "@/lib/utils";

/** The footer's QR (desktop only, in its bottom row): 72px on its cream surface, beside it "Get Simpulo on your phone" and "Scan with your camera" → /get?ref=footer. */
export function FooterInstallHint({ id, size = 72, className }: { id?: string; size?: number; className?: string }) {
  const t = useTranslations("install");
  const browser = useBrowser();
  // Installed already: no hint to install.
  const standalone = useIsStandalone();
  if (browser !== "desktop" || standalone) return null;
  return (
    <div id={id} className={cn("flex items-center gap-4", className)}>
      <SimpuloQR url={appLink()} refParam="footer" size={size} className="shrink-0" />
      <div className="whitespace-nowrap">
        <p className="text-body text-ink">{t("footerTitle")}</p>
        <p className="mt-0.5 text-small text-muted">{t("footerScan")}</p>
      </div>
    </div>
  );
}

/**
 * iPhone/iPad in Safari: three steps with their icons – Share → "Add to Home Screen" → "Add" – and a small arrow nodding towards Safari's
 * Share button (bottom centre on the iPhone, top right on the iPad). No button: a website can't add itself to the home screen.
 */
export function IosInstallSteps({ className, arrow = true }: { className?: string; arrow?: boolean }) {
  const t = useTranslations("install");
  const ipad = useIsIpad();
  const steps = [
    { icon: Share, text: t("iosShare") },
    { icon: SquarePlus, text: t("iosAdd") },
    { icon: CircleCheck, text: t("iosConfirm") },
  ];
  const Arrow = ipad ? ArrowUp : ArrowDown;
  return (
    <div className={className}>
      <ol className="flex flex-col gap-3">
        {steps.map(({ icon: Icon, text }, i) => (
          <li key={text} className="flex items-center gap-3 text-body text-ink">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink/6 text-small font-semibold">{i + 1}</span>
            <Icon className="size-4.5 shrink-0 text-muted" aria-hidden />
            <span>{text}</span>
          </li>
        ))}
      </ol>
      {arrow && (
        // Where Safari's Share button is on this device; it nods (motion-safe only).
        <span
          aria-hidden
          data-ios-arrow
          className={cn(
            "pointer-events-none fixed z-[80] flex size-10 items-center justify-center rounded-full bg-ink/85 text-inverse shadow-[0_6px_16px_rgba(0,0,0,0.18)] motion-safe:animate-bounce",
            ipad ? "right-24 top-3" : "bottom-[calc(var(--safe-bottom)+12px)] left-[calc(50%-20px)]",
          )}
        >
          <Arrow className="size-5" />
        </span>
      )}
    </div>
  );
}

/** Android/Chrome: the black install button, through Chrome's own install prompt (beforeinstallprompt). Nothing without the event. */
export function AndroidInstallButton({ label, onDone, className }: { label: string; onDone?: (accepted: boolean) => void; className?: string }) {
  const prompt = useInstallPrompt();
  if (!prompt) return null;
  return (
    <Button
      variant="primary"
      size="md"
      className={className}
      onClick={async () => {
        await prompt.prompt();
        const choice = await prompt.userChoice;
        clearInstallPrompt();
        onDone?.(choice.outcome === "accepted");
      }}
    >
      <Download aria-hidden />
      {label}
    </Button>
  );
}

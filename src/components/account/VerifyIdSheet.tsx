"use client";

import { BadgeCheck, Camera, IdCard, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { Sheet } from "@/components/ui/Sheet";
import { MOCK_DELAY_MS, useStore } from "@/lib/store";

type Step = "intro" | "checking" | "done";

/** Mock ID check: intro (Stripe, ID + selfie) → a short "checking" → verified. Nothing is uploaded. */
export function VerifyIdSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("common.ui.verifyId");
  const store = useStore();
  const [step, setStep] = useState<Step>("intro");

  function close() {
    onClose();
    // Reset after the sheet has closed, so it doesn't flash back to the intro while animating out.
    setTimeout(() => setStep("intro"), 300);
  }

  async function start() {
    setStep("checking");
    await new Promise((r) => setTimeout(r, MOCK_DELAY_MS * 3));
    store.updateCurrentUser({ verified: true });
    setStep("done");
  }

  return (
    <Sheet open={open} onClose={close} title={t("title")}>
      {step === "done" ? (
        <div className="flex flex-col items-center py-4 text-center">
          <BadgeCheck size={48} strokeWidth={1.75} color="#F0633A" fill="none" aria-hidden />
          <p className="mt-4 text-lg font-semibold">{t("successTitle")}</p>
          <p className="mt-1 text-sm text-zinc-500">{t("successText")}</p>
          <button type="button" onClick={close} className={buttonClass("dark", "lg", "mt-6 w-full")}>
            {t("done")}
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-neutral-600">{t("intro")}</p>
          <ul className="mt-5 space-y-3 text-sm">
            <li className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-page">
                <IdCard className="size-4" aria-hidden />
              </span>
              {t("stepId")}
            </li>
            <li className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-page">
                <Camera className="size-4" aria-hidden />
              </span>
              {t("stepSelfie")}
            </li>
          </ul>
          <button type="button" onClick={start} disabled={step === "checking"} className={buttonClass("dark", "lg", "mt-6 w-full")}>
            {step === "checking" ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {t("checking")}
              </>
            ) : (
              t("start")
            )}
          </button>
          <p className="mt-3 text-center text-xs text-zinc-400">{t("mockNote")}</p>
        </>
      )}
    </Sheet>
  );
}

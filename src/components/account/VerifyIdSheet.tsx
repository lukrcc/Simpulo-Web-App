"use client";

import { BadgeCheck, Camera, IdCard, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/ActionButton";
import { ListRow } from "@/components/ui/ListRow";
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
          <BadgeCheck size={48} strokeWidth={1.75} fill="none" className="text-accent" aria-hidden />
          <p className="mt-4 text-lg font-semibold">{t("successTitle")}</p>
          <p className="mt-1 text-sm text-muted">{t("successText")}</p>
          <Button variant="primary" size="lg" onClick={close} className="mt-6 w-full">
            {t("done")}
          </Button>
        </div>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-muted">{t("intro")}</p>
          <ul className="mt-3 divide-y divide-line">
            <li>
              <ListRow lead={<IdCard aria-hidden />} title={t("stepId")} />
            </li>
            <li>
              <ListRow lead={<Camera aria-hidden />} title={t("stepSelfie")} />
            </li>
          </ul>
          <Button variant="primary" size="lg" onClick={start} disabled={step === "checking"} className="mt-6 w-full">
            {step === "checking" ? (
              <>
                <Loader2 className="animate-spin" aria-hidden />
                {t("checking")}
              </>
            ) : (
              t("start")
            )}
          </Button>
          <p className="mt-3 text-center text-xs text-muted">{t("mockNote")}</p>
        </>
      )}
    </Sheet>
  );
}

"use client";

import { KeyRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { EmailForm } from "@/components/auth/AuthSheet";
import { Button } from "@/components/ui/ActionButton";
import { Sheet } from "@/components/ui/Sheet";
import { useIsStandalone } from "@/lib/install";
import { useStore } from "@/lib/store";

const WELCOMED_KEY = "simpulo:standalone-welcomed";
/** The store restores the login right after mounting: decide only after that. */
const SETTLE_MS = 600;

/**
 * The installed app's first start without a session: one small step – "Welcome back. Sign in to continue." – with a magic link or a passkey,
 * never the whole onboarding. Once per install (localStorage, try/catch); "Not now" closes it for good.
 */
export function StandaloneWelcome() {
  const t = useTranslations("auth.welcome");
  const standalone = useIsStandalone();
  const { currentUserId, users, login } = useStore();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!standalone || currentUserId) return;
    const timer = setTimeout(() => {
      try {
        if (localStorage.getItem(WELCOMED_KEY)) return;
      } catch {
        return;
      }
      setOpen(true);
    }, SETTLE_MS);
    return () => clearTimeout(timer);
  }, [standalone, currentUserId]);

  function done() {
    try {
      localStorage.setItem(WELCOMED_KEY, "1");
    } catch {
      // blocked: it may show again next time
    }
    setOpen(false);
  }

  return (
    <Sheet open={open && !currentUserId} onClose={done} title={t("title")} subtitle={t("subtitle")} focusOverlay>
      <div className="space-y-3">
        <EmailForm onSuccess={done} />
        {/* Mock: the passkey signs in the first mock user (the browser's WebAuthn comes with the backend). */}
        <Button
          variant="secondary"
          className="w-full min-w-0"
          onClick={() => {
            if (users[0]) login(users[0].id);
            done();
          }}
        >
          <KeyRound aria-hidden />
          {t("passkey")}
        </Button>
        <Button variant="tertiary" className="w-full min-w-0" onClick={done}>
          {t("notNow")}
        </Button>
      </div>
    </Sheet>
  );
}

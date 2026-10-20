"use client";

import { BellRing } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { buttonClass } from "@/components/ui/button";
import { Sheet } from "@/components/ui/Sheet";
import { isStandalone } from "@/lib/install";

const SHOWN_KEY = "simpulo:install-nudge-shown";
const SHOW_DELAY_MS = 600;

/** Offers the home-screen install once; call it after a join request with the host's first name. */
type OfferInstall = (hostName: string) => void;

const InstallNudgeContext = createContext<OfferInstall | null>(null);

export function InstallNudgeProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [hostName, setHostName] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const offerInstall = useCallback<OfferInstall>((name) => {
    // Only on phones, only in the browser (not the installed app), and only ever once.
    if (!window.matchMedia("(max-width: 767px)").matches || isStandalone()) return;
    try {
      if (localStorage.getItem(SHOWN_KEY)) return;
      localStorage.setItem(SHOWN_KEY, "1");
    } catch {
      return; // storage blocked (private mode) – better to never show it than to show it every time
    }
    // Let the request sheet close and the toast appear first.
    timer.current = setTimeout(() => setHostName(name), SHOW_DELAY_MS);
  }, []);

  const close = () => setHostName(null);

  return (
    <InstallNudgeContext.Provider value={offerInstall}>
      {children}
      <Sheet open={hostName !== null} onClose={close} title="Stay in the loop">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
            <BellRing className="size-5" />
          </span>
          <p className="text-neutral-700">
            Get notified when {hostName} answers – add Simpulo to your home screen.
          </p>
        </div>
        <div className="mt-6 flex gap-2">
          <button type="button" onClick={close} className={buttonClass("ghost", "lg", "flex-1")}>
            Later
          </button>
          <button
            type="button"
            onClick={() => {
              close();
              router.push("/install");
            }}
            className={buttonClass("dark", "lg", "flex-1")}
          >
            Show me how
          </button>
        </div>
      </Sheet>
    </InstallNudgeContext.Provider>
  );
}

export function useInstallNudge(): OfferInstall {
  const offer = useContext(InstallNudgeContext);
  if (!offer) throw new Error("useInstallNudge must be used inside <InstallNudgeProvider>");
  return offer;
}

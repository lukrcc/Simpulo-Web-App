"use client";

// "Get the app" from the avatar menu: a small centred window – the QR code to /get?src=qr (installs from it are counted), "Open install
// page" and "Print cards" (/get/card). Mounted once in AppShell; opened from anywhere with openGetApp().
import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { SimpuloQR } from "@/components/SimpuloQR";
import { Button } from "@/components/ui/ActionButton";
import { Sheet } from "@/components/ui/Sheet";
import { appQrLink } from "@/lib/links";

let open = false;
const listeners = new Set<() => void>();
const set = (next: boolean) => {
  open = next;
  listeners.forEach((l) => l());
};
export const openGetApp = () => set(true);

function useOpen() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => open,
    () => false,
  );
}

export function GetAppDialog() {
  const t = useTranslations("profile.view.quick");
  const isOpen = useOpen();
  return (
    <Sheet open={isOpen} onClose={() => set(false)} title={t("getApp")} focusOverlay>
      <div className="flex flex-col items-center gap-4 text-center">
        {isOpen && <SimpuloQR url={appQrLink()} size={200} />}
        <p className="text-body text-muted">{t("getAppScan")}</p>
        {/* Its links lead to another page: the window closes with the click. */}
        <div className="mt-2 flex flex-wrap justify-center gap-3" onClickCapture={() => set(false)}>
          <Button variant="secondary" href="/get">
            {t("getAppOpen")}
          </Button>
          <Button variant="secondary" href="/get/card">
            <Printer aria-hidden />
            {t("getAppPrint")}
          </Button>
        </div>
        <p className="max-w-[40ch] text-small text-muted">{t("getAppPrintText")}</p>
      </div>
    </Sheet>
  );
}

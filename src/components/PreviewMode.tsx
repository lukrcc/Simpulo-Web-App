"use client";

import { Eye } from "lucide-react";
import { useTranslations } from "next-intl";
import { createContext, useCallback, useContext, type ReactNode } from "react";
import { useToast } from "@/components/ui/Toast";

/** "Preview as guest": the page renders as a logged-out stranger sees it, and nothing in it changes data. */
const PreviewContext = createContext(false);

export function PreviewProvider({ active, children }: { active: boolean; children: ReactNode }) {
  return <PreviewContext.Provider value={active}>{children}</PreviewContext.Provider>;
}

export function usePreviewMode(): boolean {
  return useContext(PreviewContext);
}

/** Wraps an action that would change data: in a preview it only explains itself instead. */
export function usePreviewGuard() {
  const preview = usePreviewMode();
  const showToast = useToast();
  const t = useTranslations("common.ui.preview");
  return useCallback(
    (action: () => void) => {
      if (preview) showToast(t("noChanges"));
      else action();
    },
    [preview, showToast, t],
  );
}

/** Slim dark bar, sticky right under the header: what you're looking at, and the way out. */
export function PreviewBanner({ message, onExit }: { message: string; onExit: () => void }) {
  const t = useTranslations("common.ui.preview");
  return (
    <div role="status" className="sticky top-(--header-h) z-30 flex h-10 items-center justify-center gap-3 bg-ink px-4 text-sm text-white">
      <Eye className="size-4 shrink-0 text-white/70" aria-hidden />
      <span className="truncate">{message}</span>
      <span aria-hidden className="text-white/40">
        ·
      </span>
      <button type="button" onClick={onExit} className="shrink-0 font-semibold underline underline-offset-2 hover:text-white/80">
        {t("exit")}
      </button>
    </div>
  );
}

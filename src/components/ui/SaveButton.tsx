"use client";

import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MouseEvent } from "react";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { usePreviewGuard } from "@/components/PreviewMode";
import { getCurrentUser, useStore } from "@/lib/store";
import type { Stay } from "@/lib/types";
import { cn } from "@/lib/utils";
import { glassCircle } from "./glass";

interface SaveButtonProps {
  stay: Pick<Stay, "id" | "title">;
  /** "glass" on photos, "outline" on the page background */
  variant?: "glass" | "outline";
  className?: string;
}

/** Heart: saves the House to the user's "Saved" list. Logged out → log in first, then it's saved. */
export function SaveButton({ stay, variant = "glass", className }: SaveButtonProps) {
  const t = useTranslations("common.ui.save");
  const store = useStore();
  const requireAuth = useRequireAuth();
  const guard = usePreviewGuard();
  const saved = getCurrentUser(store)?.savedStayIds?.includes(stay.id) ?? false;

  function toggle(e: MouseEvent) {
    // Cards are links – the heart must not open the House.
    e.preventDefault();
    e.stopPropagation();
    guard(() => requireAuth(() => store.toggleSaved(stay.id), t("loginToSave")));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? t("unsave", { title: stay.title }) : t("save", { title: stay.title })}
      title={saved ? t("saved") : t("saveShort")}
      className={cn(
        variant === "glass"
          ? glassCircle
          : "flex size-10 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-ink transition-colors hover:border-neutral-400",
        className,
      )}
    >
      <Heart className={cn("size-5 transition-transform active:scale-90", saved && "fill-accent text-accent")} />
    </button>
  );
}

"use client";

import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, type MouseEvent } from "react";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { usePreviewGuard } from "@/components/PreviewMode";
import { pressFeedback } from "./pressFeedback";
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

/**
 * Heart: saves the House to the user's "Saved" list (the mock store keeps it per House). Logged out → log in first,
 * then it's saved. A click presses the button in; switching on fills the heart with a short pop, switching off only
 * empties it. Reduced motion: just the fill.
 */
export function SaveButton({ stay, variant = "glass", className }: SaveButtonProps) {
  const t = useTranslations("common.ui.save");
  const store = useStore();
  const requireAuth = useRequireAuth();
  const guard = usePreviewGuard();
  const saved = getCurrentUser(store)?.savedStayIds?.includes(stay.id) ?? false;
  const heartRef = useRef<SVGSVGElement>(null);
  const wasSaved = useRef(saved);

  // The pop plays when the heart turns on – also after logging in first – never on load and never when it turns off.
  useEffect(() => {
    const icon = heartRef.current;
    if (saved && !wasSaved.current && icon) {
      icon.classList.remove("heart-pop");
      void icon.getBoundingClientRect();
      icon.classList.add("heart-pop");
    }
    wasSaved.current = saved;
  }, [saved]);

  function toggle(e: MouseEvent<HTMLButtonElement>) {
    // Cards are links – the heart must not open the House.
    e.preventDefault();
    e.stopPropagation();
    pressFeedback(e.currentTarget);
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
        "press-feedback",
        variant === "glass" ? glassCircle : "flex size-10 shrink-0 items-center justify-center rounded-full bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.08)] text-ink hover:bg-bg",
        className,
      )}
    >
      {/* Off: the outline in the button's colour (white on photos); on: filled in accent – the circle stays as it is. */}
      <Heart ref={heartRef} onAnimationEnd={(e) => e.currentTarget.classList.remove("heart-pop")} className={cn("size-5", saved && "fill-accent text-accent")} />
    </button>
  );
}

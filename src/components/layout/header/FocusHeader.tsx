"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { readDraft } from "@/components/create/model";
import { buttonStyles } from "@/components/ui/ActionButton";
import { useToast } from "@/components/ui/Toast";
import { getCurrentUser, useStore } from "@/lib/store";
import { Container } from "../Container";
import { Logo } from "../Logo";
import { cn } from "@/lib/utils";

/**
 * Open a House is a focus mode: the same bar, only the logo and the way out. The draft saves itself, so leaving costs nothing. Phones
 * (< 768px): a 56px bar in the page's flow, sticking under the status bar's strip, the way out as a round ✕ (the progress runs along its foot,
 * CreateStayForm); no tab bar.
 */
export function FocusHeader({ exit = true }: { exit?: boolean }) {
  const t = useTranslations("create.focus");
  const tDraft = useTranslations("growth.draft");
  const me = getCurrentUser(useStore());
  const showToast = useToast();
  return (
    <header data-site-header data-focus-header className="milk-glass fixed inset-x-0 top-(--band-h) z-40 h-(--header-h) shadow-(--shadow-bar-foot) max-md:sticky max-md:top-(--header-total) max-md:h-14">
      <Container className="flex h-full items-center justify-between">
        <Logo />
        {exit && <Link
          href={me ? "/your-houses" : "/"}
          data-save-exit
          onClick={() => {
            if (readDraft()) showToast(tDraft("savedToast"));
          }}
          aria-label={t("saveExit")}
          className={cn(buttonStyles("tertiary", "md"), "max-md:size-11 max-md:px-0")}
        >
          <span className="max-md:hidden">{t("saveExit")}</span>
          <X aria-hidden className="size-5 md:hidden" />
        </Link>}
      </Container>
    </header>
  );
}

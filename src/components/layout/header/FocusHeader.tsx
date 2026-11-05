"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { readDraft } from "@/components/create/model";
import { buttonStyles } from "@/components/ui/ActionButton";
import { useToast } from "@/components/ui/Toast";
import { getCurrentUser, useStore } from "@/lib/store";
import { Container } from "../Container";
import { Logo } from "../Logo";

/** Open a House is a focus mode: the same bar, only the logo and the way out. The draft saves itself, so leaving costs nothing. */
export function FocusHeader() {
  const t = useTranslations("create.focus");
  const tDraft = useTranslations("growth.draft");
  const me = getCurrentUser(useStore());
  const showToast = useToast();
  return (
    <header data-site-header className="milk-glass fixed inset-x-0 top-(--band-h) z-40 h-16 shadow-[0_1px_0_rgba(0,0,0,0.08)]">
      <Container className="flex h-full items-center justify-between">
        <Logo />
        <Link
          href={me ? "/my-stays" : "/"}
          data-save-exit
          onClick={() => {
            if (readDraft()) showToast(tDraft("savedToast"));
          }}
          className={buttonStyles("tertiary", "md")}
        >
          {t("saveExit")}
        </Link>
      </Container>
    </header>
  );
}

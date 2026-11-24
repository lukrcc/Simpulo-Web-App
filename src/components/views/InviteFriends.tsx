"use client";

import { useTranslations } from "next-intl";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { Container } from "@/components/layout/Container";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/ActionButton";
import { Input } from "@/components/ui/Input";
import { useHydrated } from "@/lib/useHydrated";
import { useToast } from "@/components/ui/Toast";
import { simpuloInviteLink } from "@/lib/links";
import { getCurrentUser, useStore } from "@/lib/store";
import type { User } from "@/lib/types";

/**
 * /invite (CLAUDE.md "Profilseite neu"): your link to Simpulo – `/?ref={you}&src=friend` (lib/links.ts) – shown, to copy, and to share (the
 * system's share sheet where there is one). Calm: a title, one sentence, the link, two buttons.
 */
export function InviteFriends() {
  const t = useTranslations("inviteFriends");
  return (
    <RequireLogin title={t("loginTitle")}>
      <InviteGate />
    </RequireLogin>
  );
}

function InviteGate() {
  const me = getCurrentUser(useStore());
  return me ? <InviteBody me={me} /> : null;
}

function InviteBody({ me }: { me: User }) {
  const t = useTranslations("inviteFriends");
  const tCommon = useTranslations("common");
  const showToast = useToast();
  const url = simpuloInviteLink(me.id);
  // The system's share sheet only where there is one – read after hydration (the server has no navigator).
  const hydrated = useHydrated();
  const canShare = hydrated && typeof navigator.share === "function";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      showToast(t("copied"));
    } catch {
      // no clipboard – the link is on the page to select
    }
  };
  const share = async () => {
    try {
      await navigator.share({ title: "Simpulo", text: t("shareText"), url });
    } catch {
      // closed the share sheet
    }
  };
  return (
    <Container className="pb-16 pt-6 md:pt-10 lg:pt-14">
      <div className="mx-auto max-w-[720px]">
        <BackButton fallback="/profile" label={tCommon("back")} className="mb-4" />
        <h1 className="text-h1 text-ink">{t("title")}</h1>
        <p className="mt-3 max-w-[56ch] text-body-lg text-muted">{t("text")}</p>
        <label className="mt-8 block">
          <span className="text-small text-muted">{t("linkLabel")}</span>
          <Input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="mt-2" />
        </label>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="primary" onClick={copy}>
            {t("copy")}
          </Button>
          {canShare && (
            <Button variant="secondary" onClick={share}>
              {t("share")}
            </Button>
          )}
        </div>
      </div>
    </Container>
  );
}

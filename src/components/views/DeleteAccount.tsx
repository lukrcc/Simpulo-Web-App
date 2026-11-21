"use client";

import { ChevronLeft, Pause } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/ActionButton";
import { BackLink } from "@/components/ui/BackButton";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { getCurrentUser, useStore } from "@/lib/store";

/** What has to be typed to delete the account. */
const DELETE_WORD = "DELETE";

/**
 * /settings/delete-account – reached from Settings › Privacy & safety › Your data › Delete account (CLAUDE.md "Your data"): what happens, in
 * a few lines; pausing as the gentler way (one tap, nothing deleted); then the confirmation by typing DELETE. No hidden ways – this page and
 * the red row are the one way in.
 */
export function DeleteAccount() {
  const t = useTranslations("settings.ui.deletePage");
  const tData = useTranslations("settings.ui.data");
  const tDanger = useTranslations("settings.danger");
  return (
    <RequireLogin title={t("title")}>
      <Container className="pb-16 pt-6 md:pt-10">
        <div className="mx-auto max-w-[640px]">
          <BackLink href="/settings#privacy" className="-ml-1 inline-flex min-h-11 items-center gap-0.5 text-body text-ink">
            <ChevronLeft aria-hidden className="size-5" />
            {t("back")}
          </BackLink>
          <h1 className="mt-4 text-h1 text-ink">{t("title")}</h1>
          <Body t={t} tData={tData} tDanger={tDanger} />
        </div>
      </Container>
    </RequireLogin>
  );
}

function Body({ t, tData, tDanger }: { t: ReturnType<typeof useTranslations<"settings.ui.deletePage">>; tData: ReturnType<typeof useTranslations<"settings.ui.data">>; tDanger: ReturnType<typeof useTranslations<"settings.danger">> }) {
  const store = useStore();
  const me = getCurrentUser(store);
  const router = useRouter();
  const showToast = useToast();
  const [typed, setTyped] = useState("");
  const ready = typed.trim() === DELETE_WORD;
  const paused = Boolean(me?.privacy?.paused);
  return (
    <>
      <h2 className="mt-8 text-h3 text-ink">{t("what")}</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-body text-muted">
        {(["profile", "houses", "messages", "final"] as const).map((key) => (
          <li key={key}>{t(`points.${key}`)}</li>
        ))}
      </ul>

      {/* The gentler way first: pausing hides everything and deletes nothing. */}
      {!paused && (
        <section className="card-soft mt-8 rounded-[24px] p-6">
          <h2 className="text-h3 text-ink">{t("pauseTitle")}</h2>
          <p className="mt-1 text-body text-muted">{t("pauseText")}</p>
          <Button
            variant="secondary"
            size="md"
            className="mt-4"
            onClick={() => {
              if (!me) return;
              store.updateCurrentUser({ privacy: { ...me.privacy, paused: true, pausedAt: new Date().toISOString() } });
              showToast(tData("paused"));
              router.push("/settings#privacy");
            }}
          >
            <Pause aria-hidden />
            {t("pauseButton")}
          </Button>
        </section>
      )}

      <form
        className="mt-10"
        onSubmit={(e) => {
          e.preventDefault();
          if (!ready) return;
          store.deleteAccount();
          showToast(tDanger("deleted"));
          router.push("/");
        }}
      >
        <label htmlFor="delete-word" className="text-small font-semibold text-ink">
          {t("typeToConfirm", { word: DELETE_WORD })}
        </label>
        <Input id="delete-word" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoCapitalize="characters" className="mt-2 font-mono" />
        <Button type="submit" variant="danger" size="md" className="mt-4" disabled={!ready}>
          {t("confirm")}
        </Button>
      </form>
    </>
  );
}

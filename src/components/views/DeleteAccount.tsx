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
import Link from "next/link";
import { deletionBlockers } from "@/lib/accountDeletion";
import { getCurrentUser, useStore } from "@/lib/store";
import { useNow } from "@/lib/useNow";

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
  const paused = Boolean(me?.privacy?.paused);
  const now = useNow();
  const today = now === null ? null : new Date(now).toISOString().slice(0, 10);
  // Not while a House depends on you (lib/accountDeletion.ts): each one with what to do.
  const blockers = me && today ? deletionBlockers(store, me.id, today) : [];
  const ready = typed.trim() === DELETE_WORD && blockers.length === 0;
  return (
    <>
      <h2 className="mt-8 text-h3 text-ink">{t("what")}</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-body text-muted">
        {(["profile", "houses", "messages", "final"] as const).map((key) => (
          <li key={key}>{t(`points.${key}`)}</li>
        ))}
      </ul>

      {/* Your data first: a copy to keep (Settings › Privacy & safety › Your data). */}
      <p className="mt-6 text-body text-muted">
        {t.rich("downloadFirst", { link: (c) => <Link href="/settings#privacy" className="font-semibold text-ink underline underline-offset-4">{c}</Link> })}
      </p>

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

      {blockers.length > 0 && (
        <section data-delete-blocked className="mt-10 rounded-[20px] border border-dashed border-ink/20 p-5">
          <h2 className="text-h3 text-ink">{t("blockedTitle")}</h2>
          <p className="mt-1 text-body text-muted">{t("blockedText")}</p>
          <ul className="mt-4 flex flex-col gap-3">
            {blockers.map((b) => (
              <li key={b.stay.id} className="flex flex-col gap-0.5">
                <Link href={b.role === "host" ? `/h/${b.stay.id}?tab=manage` : `/h/${b.stay.id}?tab=me`} className="text-body font-semibold text-ink underline-offset-4 hover:underline">
                  {b.stay.title}
                </Link>
                <span className="text-small text-muted">{t(`blocked.${b.role}${b.running ? "Running" : ""}` as "blocked.host")}</span>
              </li>
            ))}
          </ul>
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
        <Input id="delete-word" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoCapitalize="characters" className="mt-2 font-mono" disabled={blockers.length > 0} />
        <Button type="submit" variant="danger" size="md" className="mt-4" disabled={!ready}>
          {t("confirm")}
        </Button>
      </form>
    </>
  );
}

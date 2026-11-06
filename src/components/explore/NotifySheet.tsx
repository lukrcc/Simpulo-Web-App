"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { formInput } from "@/components/form/FormLayout";
import { usePreviewGuard } from "@/components/PreviewMode";
import { Button } from "@/components/ui/ActionButton";
import { Checkbox } from "@/components/ui/Checkbox";
import { Sheet } from "@/components/ui/Sheet";
import { isSaved, type SearchDraft } from "@/lib/savedSearches";
import { useStore } from "@/lib/store";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Logged out: an email and the consent to use it, or log in. */
function NotifySheet({ draft, onClose }: { draft: SearchDraft; onClose: () => void }) {
  const t = useTranslations("explore.search.notifySheet");
  const store = useStore();
  const requireAuth = useRequireAuth();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [tried, setTried] = useState(false);
  const emailOk = EMAIL.test(email.trim());

  function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (!emailOk || !consent) return;
    store.saveSearch({ ...draft, email: email.trim().toLowerCase(), consent });
    onClose();
  }

  return (
    <Sheet open onClose={onClose} title={t("title")} subtitle={t("text")}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <div>
          <label htmlFor="notify-email" className="mb-2 block text-body font-medium">
            {t("email")}
          </label>
          <input id="notify-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("emailPlaceholder")} aria-invalid={tried && !emailOk ? true : undefined} className={formInput} />
          {tried && !emailOk && <p className="mt-1.5 text-small text-red-600">{t("emailError")}</p>}
        </div>
        <div>
          <label className="flex cursor-pointer items-center justify-between gap-4">
            <span className="text-body text-ink">{t("consent")}</span>
            <Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          </label>
          <Link href="/privacy" className="mt-1 inline-block text-small text-muted underline underline-offset-4 hover:text-ink">
            {t("privacy")}
          </Link>
          {tried && !consent && <p className="mt-1.5 text-small text-red-600">{t("consentError")}</p>}
        </div>
        <div className="flex items-center justify-between gap-4">
<Button
          variant="tertiary"
          size="md"
          onClick={() => {
            onClose();
            requireAuth((userId) => store.saveSearch({ ...draft, userId, consent: true }), t("login"));
          }}
        >
          {t("loginInstead")}
        </Button>
<Button type="submit" variant="primary" size="md">
          {t("submit")}
        </Button>
</div>
      </form>
    </Sheet>
  );
}

/** "Notify me" for a search: at once with an account, without one after the small sheet (`sheet` has to be rendered). `saved`: it's in. */
export function useSaveSearch(draft: SearchDraft) {
  const store = useStore();
  const guard = usePreviewGuard();
  const [asking, setAsking] = useState(false);
  const me = store.currentUserId;
  const save = () =>
    guard(() => {
      if (!me) return setAsking(true);
      store.saveSearch({ ...draft, userId: me, consent: true });
    });
  return { saved: isSaved(store.savedSearches, draft, me), save, sheet: asking && <NotifySheet draft={draft} onClose={() => setAsking(false)} /> };
}

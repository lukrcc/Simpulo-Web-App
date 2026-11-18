"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useActionState, useEffect } from "react";
import { formInput } from "@/components/form/FormLayout";
import { Button } from "@/components/ui/ActionButton";
import { enterPreview } from "./actions";

export function PreviewForm() {
  const t = useTranslations("preview");
  const next = useSearchParams().get("next") ?? "/";
  const [state, action, pending] = useActionState(enterPreview, { failed: false });
  // A full page load: the proxy sees the new cookie, and the router doesn't keep this page (and its chrome-hiding rule) in the document.
  useEffect(() => {
    if (state.target) window.location.assign(state.target);
  }, [state.target]);
  return (
    <form action={action} className="mt-6 space-y-3">
      <input type="hidden" name="next" value={next} />
      <input type="password" name="password" required autoFocus autoComplete="current-password" aria-label={t("password")} placeholder={t("password")} aria-invalid={state.failed || undefined} className={formInput} />
      {state.failed && (
        <p role="alert" className="text-small text-danger">
          {t("wrong")}
        </p>
      )}
      <Button type="submit" variant="primary" size="md" disabled={pending} className="w-full">
        {t("enter")}
      </Button>
    </form>
  );
}

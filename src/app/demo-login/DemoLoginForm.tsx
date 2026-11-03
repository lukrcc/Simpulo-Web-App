"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useActionState, useEffect } from "react";
import { formInput } from "@/components/form/FormLayout";
import { Button } from "@/components/ui/ActionButton";
import { enterDemo } from "./actions";

export function DemoLoginForm() {
  const t = useTranslations("demo.login");
  const next = useSearchParams().get("next") ?? "/";
  const [state, action, pending] = useActionState(enterDemo, { failed: false });
  // A full page load: the router would keep this page hidden in the document, and its chrome-hiding rule with it (globals.css).
  useEffect(() => {
    if (state.target) window.location.assign(state.target);
  }, [state.target]);
  return (
    <form action={action} className="mt-6 space-y-3">
      <input type="hidden" name="next" value={next} />
      <input type="password" name="password" required autoFocus autoComplete="current-password" aria-label={t("password")} placeholder={t("password")} aria-invalid={state.failed || undefined} className={formInput} />
      {state.failed && (
        <p role="alert" className="text-small text-red-600">
          {t("wrong")}
        </p>
      )}
      <Button type="submit" variant="primary" size="lg" disabled={pending} className="w-full">
        {t("enter")}
      </Button>
    </form>
  );
}

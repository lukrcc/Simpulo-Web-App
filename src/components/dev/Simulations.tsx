"use client";

import { Camera, FlaskConical, IdCard, Upload } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type FormEvent, type ReactNode } from "react";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { FormField, formInput } from "@/components/form/FormLayout";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/ActionButton";
import { mockProvider } from "@/lib/payments/mock";
import { getCurrentUser, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

/** Where to go back to – only a path on this site. */
function useReturn(fallback: string): string {
  const target = useSearchParams().get("return") ?? fallback;
  return target.startsWith("/") && !target.startsWith("//") ? target : fallback;
}

/**
 * The frame of a simulation page: Simpulo's own look, neutral, and a band that says what it is – a stand-in for the provider's page, nothing
 * real happens. Never a copy of Stripe's design.
 */
function SimulationFrame({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  const t = useTranslations("dev.simulation");
  return (
    <Container page width="narrow" className="pb-(--space-section)">
      <p className="flex items-center gap-2 rounded-2xl bg-ink/6 px-4 py-3 text-small text-ink">
        <FlaskConical className="size-4 shrink-0" aria-hidden />
        {t("band")}
      </p>
      <h1 className="mt-8 text-h2 text-ink">{title}</h1>
      <p className="mt-2 text-body text-muted">{intro}</p>
      <div className="mt-8">{children}</div>
    </Container>
  );
}

/** /dev/stripe-onboarding: what Stripe Connect's onboarding would ask – name, birth date, country, IBAN (a test value) – then back. */
export function OnboardingSimulation() {
  const t = useTranslations("dev.simulation");
  return (
    <RequireLogin title={t("loginTitle")}>
      <OnboardingForm />
    </RequireLogin>
  );
}

function OnboardingForm() {
  const t = useTranslations("dev.simulation");
  const router = useRouter();
  const me = getCurrentUser(useStore());
  const back = useReturn("/settings/payouts");
  const [name, setName] = useState(me?.name ?? "");
  const [birth, setBirth] = useState(me?.birthDate ?? "1994-05-14");
  const [country, setCountry] = useState("Germany");
  const [iban, setIban] = useState("DE89 3704 0044 0532 0130 00");
  const [busy, setBusy] = useState(false);
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!me || busy) return;
    setBusy(true);
    mockProvider.submitOnboarding(me.id, iban);
    router.push(back);
  }
  return (
    <SimulationFrame title={t("onboardingTitle")} intro={t("onboardingIntro")}>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <FormField label={t("name")}>
          <input className={formInput} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
        </FormField>
        <FormField label={t("birthDate")}>
          <input className={formInput} type="date" value={birth} onChange={(e) => setBirth(e.target.value)} required />
        </FormField>
        <FormField label={t("country")}>
          <input className={formInput} value={country} onChange={(e) => setCountry(e.target.value)} autoComplete="country-name" required />
        </FormField>
        <FormField label={t("iban")} helper={t("ibanHelper")}>
          <input className={cn(formInput, "tabular-nums")} value={iban} onChange={(e) => setIban(e.target.value)} required />
        </FormField>
        <div className="mt-2">
          <Button type="submit" disabled={busy}>
            {t("submit")}
          </Button>
        </div>
      </form>
    </SimulationFrame>
  );
}

/** /dev/identity-check: what Stripe Identity would ask – a photo of an ID and a selfie (both simulated) – then back. */
export function IdentitySimulation() {
  const t = useTranslations("dev.simulation");
  return (
    <RequireLogin title={t("loginTitle")}>
      <IdentityForm />
    </RequireLogin>
  );
}

function IdentityForm() {
  const t = useTranslations("dev.simulation");
  const router = useRouter();
  const me = getCurrentUser(useStore());
  const back = useReturn("/settings#payments");
  const [document, setDocument] = useState<string | null>(null);
  const [selfie, setSelfie] = useState(false);
  const [busy, setBusy] = useState(false);
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!me || !document || !selfie || busy) return;
    setBusy(true);
    mockProvider.submitIdentity(me.id);
    router.push(back);
  }
  const tile = "flex min-h-40 flex-col items-center justify-center gap-2 rounded-3xl p-6 text-center transition-colors duration-150";
  return (
    <SimulationFrame title={t("identityTitle")} intro={t("identityIntro")}>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={cn(tile, "cursor-pointer", document ? "bg-(--select-bg) shadow-(--select-shadow)" : "bg-ink/5 hover:bg-ink/8")}>
            {document ? <IdCard className="size-6 text-ink" aria-hidden /> : <Upload className="size-6 text-muted" aria-hidden />}
            <span className="text-body font-semibold text-ink">{document ?? t("uploadId")}</span>
            <span className="text-small text-muted">{document ? t("uploaded") : t("uploadHint")}</span>
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => setDocument(e.target.files?.[0]?.name ?? t("sampleId"))} />
          </label>
          <button type="button" onClick={() => setSelfie(true)} className={cn(tile, selfie ? "bg-(--select-bg) shadow-(--select-shadow)" : "bg-ink/5 hover:bg-ink/8")}>
            <span className={cn("flex size-16 items-center justify-center rounded-full", selfie ? "bg-ink text-inverse" : "bg-ink/8 text-muted")}>
              <Camera className="size-6" aria-hidden />
            </span>
            <span className="text-body font-semibold text-ink">{selfie ? t("selfieTaken") : t("selfie")}</span>
          </button>
        </div>
        {!document && (
          <button type="button" onClick={() => setDocument(t("sampleId"))} className="self-start text-small font-semibold text-ink underline-offset-4 hover:underline">
            {t("useSample")}
          </button>
        )}
        <div className="mt-2">
          <Button type="submit" disabled={!document || !selfie || busy}>
            {t("submit")}
          </Button>
        </div>
      </form>
    </SimulationFrame>
  );
}

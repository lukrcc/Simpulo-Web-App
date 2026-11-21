"use client";

// The waitlist's two email links (CLAUDE.md "Warteliste"): /waitlist/confirm?token= (the double opt-in click – only then confirmed) and
// /waitlist/unsubscribe?token= (in every waitlist email – one tap more to be sure, then no more emails). The token is the entry's secret.
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useEffect, useState } from "react";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/ActionButton";
import { confirmWaitlist, unsubscribeWaitlist, waitlistByToken } from "@/lib/admin/store";
import { track } from "@/lib/analytics";
import type { WaitlistEntry } from "@/lib/types";
import { waitlistUnsubscribeHref } from "@/lib/waitlistSignup";

function Frame({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  return (
    <Container className="flex min-h-[60svh] flex-col items-center justify-center py-16 text-center">
      <h1 className="text-h1 text-ink">{title}</h1>
      <p className="mt-3 max-w-[480px] text-body-lg text-muted">{text}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">{children}</div>
    </Container>
  );
}

function Confirm() {
  const t = useTranslations("platform.waitlist");
  const token = useSearchParams().get("token") ?? "";
  // Read after mount (the waitlist lives in this browser – never in the first render).
  const [entry, setEntry] = useState<WaitlistEntry | null | undefined>(undefined);
  useEffect(() => {
    const confirmed = token ? confirmWaitlist(token) : null;
    if (confirmed) track("waitlist_confirmed", {});
    requestAnimationFrame(() => setEntry(confirmed));
  }, [token]);
  if (entry === undefined) return <Frame title="" text="" />;
  if (!entry) return <Frame title={t("unknownTitle")} text={t("unknownText")}><Button href="/explore">{t("explore")}</Button></Frame>;
  if (entry.unsubscribedAt) return <Frame title={t("unsubscribedTitle")} text={t("unsubscribedText")}><Button href="/explore">{t("explore")}</Button></Frame>;
  return (
    <Frame title={t("confirmedTitle")} text={t("confirmedText")}>
      <Button href="/explore">{t("explore")}</Button>
      <Button variant="tertiary" href={waitlistUnsubscribeHref(token)}>
        {t("unsubscribe")}
      </Button>
    </Frame>
  );
}

function Unsubscribe() {
  const t = useTranslations("platform.waitlist");
  const token = useSearchParams().get("token") ?? "";
  const [entry, setEntry] = useState<WaitlistEntry | null | undefined>(undefined);
  useEffect(() => {
    const found = token ? waitlistByToken(token) : null;
    requestAnimationFrame(() => setEntry(found));
  }, [token]);
  if (entry === undefined) return <Frame title="" text="" />;
  if (!entry) return <Frame title={t("unknownTitle")} text={t("unknownText")}><Button href="/explore">{t("explore")}</Button></Frame>;
  if (entry.unsubscribedAt) return <Frame title={t("unsubscribedTitle")} text={t("unsubscribedText")}><Button href="/explore">{t("explore")}</Button></Frame>;
  return (
    <Frame title={t("unsubscribeTitle")} text={t("unsubscribeText")}>
      <Button
        onClick={() => {
          setEntry(unsubscribeWaitlist(token));
          track("waitlist_unsubscribed", {});
        }}
      >
        {t("unsubscribeConfirm")}
      </Button>
      <Button variant="tertiary" href="/explore">
        {t("explore")}
      </Button>
    </Frame>
  );
}

export function WaitlistConfirmPage() {
  return (
    <Suspense>
      <Confirm />
    </Suspense>
  );
}

export function WaitlistUnsubscribePage() {
  return (
    <Suspense>
      <Unsubscribe />
    </Suspense>
  );
}

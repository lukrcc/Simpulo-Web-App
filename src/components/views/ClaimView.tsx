"use client";

import { ExternalLink, SearchX } from "lucide-react";
import Link from "next/link";
import { useMessages, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { use } from "react";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { StepNumber } from "@/components/GetTheApp";
import { Container } from "@/components/layout/Container";
import { StayCard } from "@/components/StayCard";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { linkDomain } from "@/lib/mock-extras";
import { useStore } from "@/lib/store";
import type { Stay, User } from "@/lib/types";

/** /claim/[token] – a House Simpulo prepared from someone's post: preview, then "This is yours – claim it". */
export function ClaimView({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const t = useTranslations("growth.claim");
  const store = useStore();
  const stay = store.stays.find((s) => s.claim?.token === token);

  if (!stay?.claim) {
    return (
      <Container page width="narrow">
        <EmptyState
          icon={SearchX}
          title={t("notFoundTitle")}
          description={t("notFoundText")}
          action={
            <Link href="/" className={buttonClass("dark", "sm")}>
              {t("explore")}
            </Link>
          }
        />
      </Container>
    );
  }

  if (stay.claim.claimedAt) {
    const mine = stay.claim.claimedBy === store.currentUserId;
    return (
      <Container page width="narrow">
        <EmptyState
          title={mine ? t("mineTitle") : t("claimedTitle")}
          description={mine ? t("mineText") : t("claimedText")}
          action={
            <Link href={mine ? `/my-stays/${stay.id}` : "/"} className={buttonClass("dark", "sm")}>
              {mine ? t("openDraft") : t("explore")}
            </Link>
          }
        />
      </Container>
    );
  }

  return <ClaimOffer stay={stay} />;
}

function ClaimOffer({ stay }: { stay: Stay }) {
  const t = useTranslations("growth.claim");
  const messages = useMessages();
  const store = useStore();
  const router = useRouter();
  const requireAuth = useRequireAuth();
  const showToast = useToast();
  const claim = stay.claim!;
  // Until it's claimed the card shows the person it was prepared for (name + photo from the admin form).
  const preparedFor: User = {
    id: `claim-${stay.id}`,
    name: claim.name,
    age: 0,
    country: "",
    city: "",
    languages: [],
    bio: "",
    photos: claim.photoUrl ? [claim.photoUrl] : [],
    verified: false,
    isPro: false,
    canChargeHostFee: false,
  };

  function claimIt() {
    requireAuth(() => {
      store.claimStay(claim.token);
      showToast(t("claimedToast"));
      router.push(`/my-stays/${stay.id}/edit`);
    }, t("loginContext"));
  }

  return (
    <Container page className="lg:grid lg:grid-cols-12 lg:gap-12">
      <div className="lg:col-span-5">
        <div className="mx-auto max-w-[400px]">
          <StayCard stay={stay} host={preparedFor} preview />
        </div>
      </div>
      <div className="mt-8 lg:col-span-7 lg:mt-0 lg:pt-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">{t("eyebrow", { name: claim.name.split(" ")[0] })}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">{t("title")}</h1>
        <p className="mt-3 max-w-xl text-lg leading-relaxed text-neutral-600">{t("intro")}</p>

        {stay.whyText && <p className="mt-6 max-w-xl rounded-2xl bg-white p-5 leading-relaxed text-neutral-700">{stay.whyText}</p>}
        {claim.sourceLink && (
          <a
            href={claim.sourceLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex w-fit items-center gap-1.5 text-sm font-medium text-zinc-600 underline underline-offset-2 hover:text-ink"
          >
            <ExternalLink className="size-3.5" aria-hidden />
            {t("viewPost")} · {linkDomain(claim.sourceLink)}
          </a>
        )}

        <button type="button" onClick={claimIt} className={buttonClass("primary", "lg", "mt-8 w-full sm:w-auto")}>
          {t("claim")}
        </button>

        <ol className="mt-10 max-w-xl space-y-4">
          {messages.growth.claim.steps.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <StepNumber n={i + 1} />
              <div>
                <p className="font-semibold">{step.title}</p>
                <p className="text-sm text-zinc-600">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Container>
  );
}

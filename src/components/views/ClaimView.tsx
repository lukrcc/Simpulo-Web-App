"use client";

import { ExternalLink, SearchX } from "lucide-react";
import { useMessages, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { use } from "react";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { StepNumber } from "@/components/GetTheApp";
import { Container } from "@/components/layout/Container";
import { HouseCard } from "@/components/HouseCard";
import { Button, buttonStyles } from "@/components/ui/ActionButton";
import { cardClass } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { linkDomain } from "@/lib/links";
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
            <Button href="/">{t("explore")}</Button>
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
            <Button href={mine ? `/h/${stay.id}/manage` : "/"}>{mine ? t("openDraft") : t("explore")}</Button>
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
      router.push(`/your-houses/${stay.id}/edit`);
    }, { reason: "open" });
  }

  return (
    <Container page className="split:grid split:grid-cols-12 split:gap-12">
      <div className="split:col-span-5">
        <div className="mx-auto max-w-[400px]">
          <HouseCard stay={stay} host={preparedFor} preview />
        </div>
      </div>
      <div className="mt-8 split:col-span-7 split:mt-0 split:pt-6">
        <p className="text-eyebrow uppercase text-ink/55">{t("eyebrow", { name: claim.name.split(" ")[0] })}</p>
        <h1 className="mt-2 text-h2 md:text-h1">{t("title")}</h1>
        <p className="mt-3 max-w-xl text-body-lg leading-relaxed text-muted">{t("intro")}</p>

        {stay.whyText && <p className={`${cardClass} mt-6 max-w-xl leading-relaxed text-ink`}>{stay.whyText}</p>}
        {claim.sourceLink && (
          <a
            href={claim.sourceLink}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonStyles("tertiary", "md", "mt-3")}
          >
            <ExternalLink aria-hidden />
            {t("viewPost")} · {linkDomain(claim.sourceLink)}
          </a>
        )}

        <Button size="md" onClick={claimIt} className="mt-8 w-full sm:w-auto">
          {t("claim")}
        </Button>

        <ol className="mt-10 max-w-xl space-y-4">
          {messages.growth.claim.steps.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <StepNumber n={i + 1} />
              <div>
                <p className="font-semibold">{step.title}</p>
                <p className="text-small text-muted">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Container>
  );
}

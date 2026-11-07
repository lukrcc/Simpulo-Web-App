"use client";

import { Clock, Link2Off } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { use, useState } from "react";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { Container } from "@/components/layout/Container";
import { HouseCard } from "@/components/HouseCard";
import { Button } from "@/components/ui/ActionButton";
import { useToast } from "@/components/ui/Toast";
import { useFormat } from "@/i18n/format";
import { findUser, getCrew, useStore } from "@/lib/store";
import { firstName } from "@/lib/utils";

const HOUR_MS = 3_600_000;

/**
 * /invite/[token]: the House as the large card, "{Name} invited you · spot held for 47h", "Accept invite". Logged out: the login sheet, then it
 * accepts. Used up, cancelled or past its 48 hours: "This invite has expired" and the way to the House.
 */
export function InviteView({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const t = useTranslations("invitePage");
  const f = useFormat();
  const store = useStore();
  const router = useRouter();
  const requireAuth = useRequireAuth();
  const showToast = useToast();
  const [now] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const invite = store.houseInvites.find((i) => i.token === token);
  const stay = invite && store.stays.find((s) => s.id === invite.houseId);
  const host = stay && findUser(store, stay.hostId);
  const valid = invite && stay && invite.status === "pending" && Date.parse(invite.expiresAt) > now && (!invite.priority || !store.currentUserId || invite.invitedUserId === store.currentUserId);

  if (!invite || !stay || !valid) {
    return (
      <Container page width="narrow" className="pb-(--space-section)">
        <div className="flex flex-col items-start gap-4">
          <span className="flex size-12 items-center justify-center rounded-full bg-ink/6 text-ink">
            <Link2Off className="size-5" aria-hidden />
          </span>
          <h1 className="text-h1 text-ink">{t("expiredTitle")}</h1>
          <p className="max-w-[640px] text-body-lg text-muted">{t("expiredText")}</p>
          <div className="flex flex-wrap gap-2">
            {stay && <Button href={`/house/${stay.slug}`}>{t("seeHouse")}</Button>}
            <Button variant="secondary" href="/">
              {t("explore")}
            </Button>
          </div>
        </div>
      </Container>
    );
  }

  const hours = Math.max(1, Math.ceil((Date.parse(invite.expiresAt) - now) / HOUR_MS));
  function accept() {
    requireAuth(async (userId) => {
      if (!stay || !invite) return;
      if (userId === stay.hostId) return showToast(t("ownHouse"));
      setBusy(true);
      const result = await store.redeemHouseInvite(invite.token);
      setBusy(false);
      if (result === "joined") {
        showToast(t("joinedToast", { title: stay.title }));
        router.push(`/your-houses/${stay.id}`);
      } else showToast(t("invalid"));
    }, { reason: "join", hostName: host?.name.split(" ")[0] });
  }

  return (
    <Container className="pb-(--space-section) pt-8 md:pt-12">
      <div className="grid items-center gap-10 split:grid-cols-[minmax(0,480px)_minmax(0,1fr)] split:gap-(--page-margin)">
        <div className="mx-auto w-full max-w-[480px]">
          <HouseCard stay={stay} host={host} crew={getCrew(store, stay)} />
        </div>
        <div className="flex flex-col items-start gap-5">
          <p className="flex items-center gap-2 text-body-lg text-ink">
            <span className="font-semibold">{invite.priority ? t("searchInvited") : t("invited", { name: host ? firstName(host) : "" })}</span>
            <span className="text-muted">·</span>
            <span className="flex items-center gap-1.5 text-muted">
              <Clock className="size-4" aria-hidden />
              {t("held", { hours })}
            </span>
          </p>
          <h1 className="text-h1 text-ink">{stay.title}</h1>
          <p className="text-body-lg text-muted">
            {f.stayDatesLong(stay)} · {f.placeName(stay)}
          </p>
          <p className="max-w-[560px] text-body text-muted">{t("text")}</p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button onClick={accept} disabled={busy}>
              {t("accept")}
            </Button>
            <Button variant="tertiary" href={`/house/${stay.slug}`}>
              {t("seeHouse")}
            </Button>
          </div>
        </div>
      </div>
    </Container>
  );
}

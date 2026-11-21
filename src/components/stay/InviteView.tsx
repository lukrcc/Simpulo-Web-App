"use client";

import { Clock, Link2Off } from "lucide-react";
import { openWaitlist } from "@/lib/waitlistSignup";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { use, useEffect, useState } from "react";
import { canPay, canReserve, usePlatformPhase } from "@/config/platform";
import { Avatar } from "@/components/ui/Avatar";
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
 * /invite/[token]: on top "{Name} saved you a spot · 47h left" (whoever made the link, counting down live), then the House as the large card and
 * the action of the phase (config/platform.ts): Live "Accept invite" (you're in the crew), Beta "Reserve your spot" (held, nothing paid until
 * launch), Pre-launch "Join the waitlist". Logged out: the login sheet, then it accepts. The referrer (?ref=, the link's maker) is kept on the
 * membership. Used up, cancelled or past its 48 hours: "This invite has expired" and the way to the House.
 */
export function InviteView({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const t = useTranslations("invitePage");
  const f = useFormat();
  const store = useStore();
  const router = useRouter();
  const requireAuth = useRequireAuth();
  const showToast = useToast();
  const [now, setNow] = useState(() => Date.now());
  // The countdown: every 30 seconds (the minutes show in the last hour).
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const phase = usePlatformPhase();
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

  const leftMs = Date.parse(invite.expiresAt) - now;
  const hours = Math.max(1, Math.floor(leftMs / HOUR_MS));
  const left = leftMs < HOUR_MS ? t("leftMinutes", { minutes: Math.max(1, Math.ceil(leftMs / 60_000)) }) : t("left", { hours });
  // Who saved it: the link's maker (host or crew), else the host.
  const inviter = (invite.invitedBy && findUser(store, invite.invitedBy)) || host;
  // The phase decides the action: live joins, beta reserves (no payment), pre-launch only the waitlist.
  const live = canPay(phase);
  const beta = !live && canReserve(phase);
  function joinWaitlist() {
    openWaitlist({ where: stay?.location.city || stay?.city || null, category: stay?.vibe ?? null, month: stay?.startDate.slice(0, 7) ?? null, from: "invite" });
  }
  function accept() {
    requireAuth(async (userId) => {
      if (!stay || !invite) return;
      if (userId === stay.hostId) return showToast(t("ownHouse"));
      setBusy(true);
      const result = await store.redeemHouseInvite(invite.token, { reserveOnly: !live });
      setBusy(false);
      if (result === "joined") {
        showToast(live ? t("joinedToast", { title: stay.title }) : t("reservedToast", { title: stay.title }));
        router.push(`/h/${stay.id}`);
      } else showToast(t("invalid"));
    }, { reason: "join", hostName: host?.name.split(" ")[0] });
  }

  return (
    <Container className="pb-(--space-section) pt-8 md:pt-12">
      {/* On top, first thing: who saved the spot and how long it's held – live. */}
      <p role="status" className="mb-8 flex w-fit max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-full bg-surface py-2 pl-2 pr-4 text-body text-ink shadow-(--shadow-xs)">
        {inviter && !invite.priority && <Avatar user={inviter} size="xs" />}
        <span className="font-semibold">{invite.priority ? t("searchInvited") : t("savedYou", { name: inviter ? firstName(inviter) : "" })}</span>
        <span className="text-muted">·</span>
        <span className="flex items-center gap-1.5 tabular-nums text-muted">
          <Clock className="size-4" aria-hidden />
          {left}
        </span>
      </p>
      <div className="grid items-center gap-10 split:grid-cols-[minmax(0,480px)_minmax(0,1fr)] split:gap-(--page-margin)">
        <div className="mx-auto w-full max-w-[480px]">
          <HouseCard stay={stay} host={host} crew={getCrew(store, stay)} />
        </div>
        <div className="flex flex-col items-start gap-5">
          <h1 className="text-h1 text-ink">{stay.title}</h1>
          <p className="text-body-lg text-muted">
            {f.stayDatesLong(stay)} · {f.placeName(stay)}
          </p>
          <p className="max-w-[560px] text-body text-muted">{live ? t("text") : beta ? t("textBeta") : t("textPrelaunch")}</p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {live || beta ? (
              <Button onClick={accept} disabled={busy}>
                {live ? t("accept") : t("reserve")}
              </Button>
            ) : (
              <Button onClick={joinWaitlist}>{t("waitlist")}</Button>
            )}
            <Button variant="tertiary" href={`/house/${stay.slug}`}>
              {t("seeHouse")}
            </Button>
          </div>
        </div>
      </div>
    </Container>
  );
}

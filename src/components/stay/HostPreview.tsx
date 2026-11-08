"use client";

import { showsAge } from "@/config/privacy";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Anchored } from "@/components/ui/Anchored";
import { buttonStyles } from "@/components/ui/ActionButton";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { HostSocialIcons } from "@/components/ui/HostSocialIcons";
import { PersonPhoto } from "@/components/ui/PersonPhoto";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { useFormat } from "@/i18n/format";
import { profileViewFor } from "@/lib/profilePrivacy";
import { useStore } from "@/lib/store";
import type { User } from "@/lib/types";

const OPEN_DELAY_MS = 400;
const CLOSE_DELAY_MS = 150;
const WIDTH = 320;

/** Hovering with a mouse opens the preview after a moment; leaving both the line and the preview closes it after a moment. */
export function useHoverPreview() {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const later = (next: boolean, ms: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(next), ms);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  return {
    open,
    anchorProps: {
      onPointerEnter: (e: { pointerType: string }) => e.pointerType === "mouse" && later(true, OPEN_DELAY_MS),
      onPointerLeave: () => later(false, CLOSE_DELAY_MS),
    },
    previewProps: {
      onPointerEnter: () => clearTimeout(timer.current),
      onPointerLeave: () => later(false, CLOSE_DELAY_MS),
    },
  };
}

/** Who the host is, in short, without leaving the House: what their profile shows anyone (profileViewFor). What's at zero isn't there. */
export function HostPreview({ host, anchor, ...pointer }: { host: User; anchor: RefObject<HTMLElement | null>; onPointerEnter: () => void; onPointerLeave: () => void }) {
  const t = useTranslations("profile.view");
  const tCard = useTranslations("house.hostCard");
  const format = useFormat();
  const store = useStore();
  const view = profileViewFor(store, host, store.currentUserId, new Date().toISOString().slice(0, 10));
  const numbers = [
    view.hostedCount > 0 && { label: t("trustHosted", { count: view.hostedCount }), value: view.hostedCount },
    view.livedWith.length > 0 && { label: t("trustPeople", { count: view.livedWith.length }), value: view.livedWith.length },
  ].filter((item) => item !== false);
  return (
    <Anchored anchor={anchor} align="start" width={WIDTH}>
      <GlassPanel data-host-preview {...pointer} style={{ width: `min(${WIDTH}px, calc(100vw - 32px))` }} className="animate-fade-in flex flex-col gap-3 rounded-3xl! p-5">
        <div className="flex items-center gap-3">
          <PersonPhoto src={host.photos[0]} alt="" size={56} className="size-14 shrink-0" />
          <div className="min-w-0">
            <p className="flex min-w-0 items-center gap-1 text-body font-semibold text-ink">
              <span className="truncate">{host.name}</span>
              {host.verified && <VerifiedBadge />}
            </p>
            <p className="truncate text-small text-muted">{format.ageAndCountry(host, showsAge(host, store.currentUserId))}</p>
          </div>
        </div>
        {numbers.length > 0 && (
          <dl className="flex gap-6">
            {numbers.map((item) => (
              <div key={item.label}>
                <dt className="text-small text-muted">{item.label}</dt>
                <dd className="text-body font-semibold text-ink">{item.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {host.bio && <p className="line-clamp-2 text-body text-ink">{host.bio}</p>}
        <div className="flex items-center justify-between gap-3">
          <HostSocialIcons host={host} className="text-muted!" />
          <Link href={`/u/${host.id}`} className={buttonStyles("tertiary", "sm", "-mr-4 ml-auto")}>
            {tCard("viewProfile")}
          </Link>
        </div>
      </GlassPanel>
    </Anchored>
  );
}

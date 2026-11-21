"use client";

// "Remind" by hand (config/policies.ts MANUAL_REMINDERS, CLAUDE.md "Fristen"): the guest reminds the host once per request – from 24 hours
// after sending –, the host reminds each guest once to pay. Afterwards the button rests, with one line why (never a second nudge).
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/ActionButton";
import { useToast } from "@/components/ui/Toast";
import { MANUAL_REMINDERS } from "@/config/policies";
import { track } from "@/lib/analytics";
import { useStore } from "@/lib/store";
import type { JoinRequest, Payment } from "@/lib/types";
import { useNow } from "@/lib/useNow";

const HOUR_MS = 3_600_000;

/** The guest: "Remind {host}" on their open request. Before 24 hours: resting, "You can remind {host} from {time}". */
export function RemindHostButton({ request, hostName }: { request: JoinRequest; hostName: string }) {
  const t = useTranslations("deadlines");
  const store = useStore();
  const showToast = useToast();
  const now = useNow();
  if (request.status !== "pending" || now === null) return null;
  const from = Date.parse(request.createdAt) + MANUAL_REMINDERS.guestToHost.afterHours * HOUR_MS;
  const early = now < from;
  const used = Boolean(request.remindedAt);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        size="sm"
        variant="secondary"
        disabled={early || used}
        onClick={() => {
          store.remindHost(request.id);
          track("deadline_remind", { by: "guest" });
          showToast(t("remindedHost", { name: hostName }));
        }}
      >
        {t("remindHost", { name: hostName })}
      </Button>
      <span className="text-small text-muted">{used ? t("remindHostUsed", { name: hostName }) : early ? t("remindHostEarly", { hours: Math.ceil((from - now) / HOUR_MS) }) : t("remindHostOnce")}</span>
    </div>
  );
}

/** The host: "Remind" one guest to pay – once; afterwards "Reminded". */
export function RemindGuestButton({ payment, name }: { payment: Payment; name: string }) {
  const t = useTranslations("deadlines");
  const store = useStore();
  const showToast = useToast();
  const used = Boolean(payment.remindedAt);
  return (
    <Button
      variant="tertiary"
      disabled={used}
      aria-label={used ? t("remindedGuestLabel", { name }) : t("remindGuestLabel", { name })}
      data-tooltip={used ? t("remindGuestUsed") : undefined}
      onClick={() => {
        store.remindGuest(payment.id);
        track("deadline_remind", { by: "host" });
        showToast(t("remindedGuest", { name }));
      }}
    >
      {used ? t("remindedGuestShort") : t("remindGuest")}
    </Button>
  );
}

/** The host: "Remind all" open payments at once – each guest once; when everyone is reminded, it rests. */
export function RemindAllButton({ payments }: { payments: readonly Payment[] }) {
  const t = useTranslations("deadlines");
  const store = useStore();
  const showToast = useToast();
  const open = payments.filter((p) => p.status === "pending" && !p.remindedAt);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        size="md"
        disabled={open.length === 0}
        onClick={() => {
          for (const p of open) store.remindGuest(p.id);
          track("deadline_remind", { by: "host", count: open.length });
          showToast(t("remindedAll", { count: open.length }));
        }}
      >
        {t("remindAll")}
      </Button>
      {open.length === 0 && <span className="text-small text-muted">{t("remindAllUsed")}</span>}
    </div>
  );
}

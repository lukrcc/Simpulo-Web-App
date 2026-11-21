"use client";

// Earnings › "Hosts you brought" (CLAUDE.md "Host wirbt Host") – only while HOST_REFERRAL is switched on: your own link to bring a host
// (/host?ref={you}&src=hostref), and who came through it, how far they got. A share only after their first paid stay, one level only; the
// share and its months are still open – the page says so instead of a number.
import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/ActionButton";
import { PersonPhoto } from "@/components/ui/PersonPhoto";
import { useToast } from "@/components/ui/Toast";
import { HOST_REFERRAL } from "@/config/policies";
import { useFormat } from "@/i18n/format";
import { shareUrl } from "@/lib/growth";
import { hostReferralPath, hostsBroughtBy } from "@/lib/hostReferral";
import { useStore } from "@/lib/store";

export function HostsYouBrought() {
  const t = useTranslations("hostReferral");
  const tCommon = useTranslations("common");
  const f = useFormat();
  const store = useStore();
  const showToast = useToast();
  const [copied, setCopied] = useState(false);
  const me = store.currentUserId;
  if (!HOST_REFERRAL.enabled || !me) return null;
  const link = shareUrl(hostReferralPath, { refUserId: me, channel: "hostref" });
  const brought = hostsBroughtBy(me, store);
  const terms =
    HOST_REFERRAL.sharePercent !== null && HOST_REFERRAL.months !== null ? t("terms", { percent: HOST_REFERRAL.sharePercent, months: HOST_REFERRAL.months }) : t("termsOpen");
  return (
    <section data-hosts-brought aria-labelledby="hosts-brought">
      <h2 id="hosts-brought" className="text-subhead text-ink">
        {t("title")}
      </h2>
      <p className="mt-2 max-w-[60ch] text-body text-muted">{terms}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <p className="min-w-0 break-all text-small text-ink">{link}</p>
        <Button
          size="sm"
          variant="secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link);
              setCopied(true);
            } catch {
              showToast(tCommon("linkCopyFailed"));
            }
          }}
        >
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          {copied ? t("copied") : t("copy")}
        </Button>
      </div>
      {brought.length === 0 ? (
        <p className="mt-6 text-body text-muted">{t("none")}</p>
      ) : (
        <ul className="mt-6 divide-y divide-ink/8">
          {brought.map((b) => (
            <li key={b.user.id} data-brought={b.status} className="flex items-center gap-3 py-3">
              <PersonPhoto src={b.user.photos[0]} alt="" size={40} className="size-10 shrink-0" />
              <span className="min-w-0 flex-1 truncate text-body font-semibold text-ink">{b.user.name.split(" ")[0]}</span>
              <span className="shrink-0 text-small text-muted">{b.status === "paidStay" && b.firstPaidAt ? t("status.paidStay", { date: f.day(b.firstPaidAt) }) : t(`status.${b.status}`)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

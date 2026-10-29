import { useTranslations } from "next-intl";
import type { JoinRequestStatus, PaymentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const styles: Record<JoinRequestStatus | PaymentStatus, string> = {
  accepted: "bg-emerald-50 text-emerald-700",
  paid: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  declined: "bg-neutral-100 text-neutral-500",
  invited: "bg-accent-soft text-accent",
};

export function StatusPill({ status }: { status: JoinRequestStatus | PaymentStatus }) {
  const t = useTranslations("common");
  const label = status === "paid" ? t("paymentStatus.paid") : t(`requestStatus.${status}`);
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", styles[status])}>{label}</span>
  );
}

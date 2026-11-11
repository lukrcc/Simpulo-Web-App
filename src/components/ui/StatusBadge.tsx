import { useTranslations } from "next-intl";
import type { JoinRequestStatus, PaymentStatus } from "@/lib/types";
import { Badge } from "./Badge";

/** A request or payment status as a neutral Badge ("Pending", "Paid", "Invited"…). `className` reaches the Badge (`contents`: the text alone). */
export function StatusBadge({ status, className }: { status: JoinRequestStatus | PaymentStatus; className?: string }) {
  const t = useTranslations("common");
  return <Badge className={className}>{status === "paid" ? t("paymentStatus.paid") : t(`requestStatus.${status}`)}</Badge>;
}

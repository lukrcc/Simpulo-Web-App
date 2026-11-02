import { useTranslations } from "next-intl";
import type { JoinRequestStatus, PaymentStatus } from "@/lib/types";
import { Badge } from "./Badge";

/** A request or payment status as a neutral Badge ("Pending", "Paid", "Invited"…). */
export function StatusBadge({ status }: { status: JoinRequestStatus | PaymentStatus }) {
  const t = useTranslations("common");
  return <Badge>{status === "paid" ? t("paymentStatus.paid") : t(`requestStatus.${status}`)}</Badge>;
}

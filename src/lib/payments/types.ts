// The payments contract's shapes – what Stripe will return later, in Simpulo's own words.
import type { Currency } from "../types";

export type PayoutAccountStatus = "none" | "pending" | "action_required" | "active";
export type IdentityStatus = "none" | "processing" | "verified" | "failed";

export interface PayoutAccount {
  status: PayoutAccountStatus;
  /** The bank's last four digits, once known */
  last4?: string;
}

export interface PaymentIntent {
  id: string;
  houseId: string;
  memberId: string;
  /** What the card is charged: share + host experience + Simpulo's fee */
  amount: number;
  currency: Currency;
  share: number;
  hostFee: number;
  fee: number;
}

export type PaymentMethodInput = { kind: "card"; number: string } | { kind: "apple_pay" } | { kind: "google_pay" };

export interface PaymentResult {
  status: "succeeded" | "declined";
  /** Receipt facts on success */
  method?: { brand: string; last4: string };
}

export interface Receipt {
  paymentId: string;
  amount: number;
  currency: Currency;
  paidAt: string;
  brand: string;
  last4: string;
}

export type RefundReason = "booking_not_confirmed" | "spot_transferred" | "cancelled" | "host_cancelled";

export interface Refund {
  id: string;
  paymentId: string;
  amount: number;
  reason: RefundReason;
  status: "pending" | "succeeded";
  /** How long the bank takes, in days */
  arrivesInDays: [number, number];
}

export interface PayoutRecord {
  id: string;
  date: string;
  amount: number;
  currency: Currency;
  account: string;
  status: "paid" | "scheduled";
}

export interface Balance {
  /** On its way, not paid out yet */
  pending: number;
  currency: Currency;
  next: { date: string; amount: number } | null;
}

/** What the mock derives payouts from (the House data in the store); Stripe has its own records and ignores it. */
export interface PayoutSource {
  payouts: PayoutRecord[];
  next: { date: string; amount: number } | null;
  pending: number;
  currency: Currency;
}

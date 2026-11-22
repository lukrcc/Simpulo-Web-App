// Money rules of a locked House, in the House's currency. Mock only – no real payments.

import { FEE_MODEL } from "@/config/policies";
import { convert, isCurrency } from "@/lib/currency";

/** The guests' service fee: FEE_MODEL.serviceFeePercent of what they pay towards the stay, shown as its own line. */
export const GUEST_FEE_RATE = FEE_MODEL.serviceFeePercent / 100;

/** The optional host fee (a setting in Open a House, off by default) is at most the stay share itself. */
export const HOST_FEE_MAX_RATE = 1;
/** What Simpulo keeps of a host fee (FEE_MODEL.hostFeeCommissionPercent, 10 %); the rent shares pass on in full. */
export const PLATFORM_COMMISSION_RATE = FEE_MODEL.hostFeeCommissionPercent / 100;

/**
 * The guest's service fee on a share, in the House's currency: FEE_MODEL.serviceFeePercent of it, at least FEE_MODEL.minServiceFeeEur
 * (converted) per guest and booking, at most the cap when it is switched on (FEE_MODEL.serviceFeeCap, off today).
 */
export function guestFee(share: number, currency: string = "EUR"): number {
  if (share <= 0) return 0;
  const code = isCurrency(currency) ? currency : "EUR";
  let fee = Math.max(share * GUEST_FEE_RATE, convert(FEE_MODEL.minServiceFeeEur, "EUR", code));
  if (FEE_MODEL.serviceFeeCap.enabled) fee = Math.min(fee, convert(FEE_MODEL.serviceFeeCap.eur, "EUR", code));
  return Math.round(fee);
}

/** The minimum service fee per guest and booking in a currency (FEE_MODEL.minServiceFeeEur converted, rounded). */
export function minimumFee(currency: string = "EUR"): number {
  return Math.round(convert(FEE_MODEL.minServiceFeeEur, "EUR", isCurrency(currency) ? currency : "EUR"));
}

/** Whether the minimum fee applies to a share (the percent alone would be lower) – the pay sheet then names the minimum, not the percent. */
export function isMinimumFee(share: number, currency: string = "EUR"): boolean {
  const code = isCurrency(currency) ? currency : "EUR";
  return share > 0 && share * GUEST_FEE_RATE < convert(FEE_MODEL.minServiceFeeEur, "EUR", code);
}

/**
 * A per-person amount as guests see it everywhere (cards, House page, filters, share images): the share plus the service fee – the total
 * per person including the fee (Regel „Preis inklusive Gebühr“); the host fee stays its own line.
 */
export function withGuestFee(share: number, currency: string = "EUR"): number {
  return share > 0 ? share + guestFee(share, currency) : share;
}

/** The highest host fee a share allows. */
export function maxHostFee(share: number): number {
  return Math.floor(share * HOST_FEE_MAX_RATE);
}

/** What the host keeps of a host programme fee per guest, after Simpulo's commission. */
export function hostProgrammeEarning(fee: number): number {
  return Math.max(0, Math.round(fee * (1 - PLATFORM_COMMISSION_RATE)));
}

/** What one guest's payment is made of, and where it goes. */
export interface PaymentSplit {
  share: number;
  hostFee: number;
  fee: number;
  /** What the guest pays: share + host programme + guest fee */
  total: number;
  /** Simpulo's cut of the host programme */
  commission: number;
  /** Share + 90 % of the host programme */
  hostReceives: number;
  /** What Simpulo earns on this payment: guest fee + commission */
  revenue: number;
}

/**
 * The split of one payment. The host programme is capped at 30 % of the share; `hostFee` 0 (e.g. the host's own
 * share) means a plain stay payment.
 */
export function paymentSplit(share: number, hostFee = 0, currency: string = "EUR"): PaymentSplit {
  const programme = Math.min(Math.max(0, Math.round(hostFee)), maxHostFee(share));
  const fee = guestFee(share, currency);
  const commission = Math.round(programme * PLATFORM_COMMISSION_RATE);
  return {
    share,
    hostFee: programme,
    fee,
    total: share + programme + fee,
    commission,
    hostReceives: share + programme - commission,
    revenue: fee + commission,
  };
}

/** Only hosts allowed to (User.canChargeHostFee – pro hosts, and verified hosts of the original mock) charge a host fee. */
export function canChargeHostFee(host: { canChargeHostFee: boolean } | undefined): boolean {
  return host?.canChargeHostFee === true;
}

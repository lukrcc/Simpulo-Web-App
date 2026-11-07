// Money rules of a locked House, in the House's currency. Mock only – no real payments.

import { FEE_MODEL } from "@/config/policies";

/** The guests' service fee: FEE_MODEL.serviceFeePercent of what they pay towards the stay, shown as its own line. */
export const GUEST_FEE_RATE = FEE_MODEL.serviceFeePercent / 100;

/** The optional host fee (a setting in Open a House, off by default) is at most the stay share itself. */
export const HOST_FEE_MAX_RATE = 1;
/** What Simpulo keeps of a host fee: nothing (FEE_MODEL) – the host gets all of it. */
export const PLATFORM_COMMISSION_RATE = FEE_MODEL.hostCommissionPercent / 100;

export function guestFee(share: number): number {
  if (share <= 0) return 0;
  return Math.round(share * GUEST_FEE_RATE);
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
export function paymentSplit(share: number, hostFee = 0): PaymentSplit {
  const programme = Math.min(Math.max(0, Math.round(hostFee)), maxHostFee(share));
  const fee = guestFee(share);
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

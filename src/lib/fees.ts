// Money rules of a locked House, in the House's currency. Mock only – no real payments.

/** Guest fee: 10 % of the stay share, at least 10 and at most 50. */
export const GUEST_FEE_RATE = 0.1;
export const GUEST_FEE_MIN = 10;
export const GUEST_FEE_MAX = 50;

/** A host programme may add at most 30 % of the stay share per person. */
export const HOST_FEE_MAX_RATE = 0.3;
/** Simpulo keeps 20 % of the host programme; the host gets the other 80 %. */
export const PLATFORM_COMMISSION_RATE = 0.2;

export function guestFee(share: number): number {
  if (share <= 0) return 0;
  return Math.min(Math.max(Math.round(share * GUEST_FEE_RATE), GUEST_FEE_MIN), GUEST_FEE_MAX);
}

/** The highest host programme fee a share allows. */
export function maxHostFee(share: number): number {
  return Math.floor(share * HOST_FEE_MAX_RATE);
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
  /** Share + 80 % of the host programme */
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

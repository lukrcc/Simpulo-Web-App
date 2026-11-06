// The one contract between the app and the payment provider: the mock (dev, demo) or Stripe (production).
// Hosts: Stripe Connect Express (an account each, onboarding on Stripe, payouts to their bank).
// Guests: an embedded payment (PaymentIntent + Payment Element). Identity: Stripe Identity (ID + selfie).
import type { Balance, IdentityStatus, PaymentIntent, PaymentMethodInput, PaymentResult, PayoutAccountStatus, PayoutRecord, PayoutSource, Receipt, Refund, RefundReason } from "./types";

export interface PaymentsAdapter {
  // ── Host: payout account ──
  createPayoutAccount(userId: string): Promise<{ accountId: string }>;
  /** Where the host completes onboarding; they come back to `returnUrl`. */
  getOnboardingLink(userId: string, returnUrl: string): Promise<string>;
  getPayoutAccountStatus(userId: string): Promise<{ status: PayoutAccountStatus; last4?: string }>;
  getPayouts(userId: string, source: PayoutSource): Promise<PayoutRecord[]>;
  getBalance(userId: string, source: PayoutSource): Promise<Balance>;
  // ── Guest: paying a share ──
  createPaymentIntent(houseId: string, memberId: string): Promise<PaymentIntent>;
  confirmPayment(intent: PaymentIntent, method: PaymentMethodInput): Promise<PaymentResult>;
  getReceipt(paymentId: string): Promise<Receipt | null>;
  refund(paymentId: string, amount: number, reason: RefundReason): Promise<Refund>;
  // ── Identity ──
  /** Where the check happens; back to `returnUrl`. */
  startIdentityCheck(userId: string, returnUrl: string): Promise<string>;
  getIdentityStatus(userId: string): Promise<IdentityStatus>;
}

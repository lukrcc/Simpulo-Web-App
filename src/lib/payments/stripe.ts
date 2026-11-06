// Production: Stripe. Not built yet – same signatures as the mock, each method names the Stripe object it will use.
// Secrets stay on the server: these calls go through route handlers / server actions, never the browser's key.
/* eslint-disable @typescript-eslint/no-unused-vars -- the signatures are the contract; the Stripe calls fill them in */
import type { PaymentsAdapter } from "./adapter";
import type { Balance, IdentityStatus, PaymentIntent, PaymentMethodInput, PaymentResult, PayoutAccountStatus, PayoutRecord, PayoutSource, Receipt, Refund, RefundReason } from "./types";

const notYet = (what: string): never => {
  throw new Error(`Stripe adapter: ${what} isn't implemented yet`);
};

export class StripePaymentsAdapter implements PaymentsAdapter {
  async createPayoutAccount(_userId: string): Promise<{ accountId: string }> {
    // TODO: stripe.accounts.create({ type: "express", capabilities: { transfers: { requested: true } }, metadata: { userId } }) – store account.id on the user.
    return notYet("createPayoutAccount");
  }

  async getOnboardingLink(_userId: string, _returnUrl: string): Promise<string> {
    // TODO: stripe.accountLinks.create({ account, type: "account_onboarding", return_url, refresh_url }).url
    return notYet("getOnboardingLink");
  }

  async getPayoutAccountStatus(_userId: string): Promise<{ status: PayoutAccountStatus; last4?: string }> {
    // TODO: stripe.accounts.retrieve(account) – charges_enabled && payouts_enabled → "active"; requirements.currently_due non-empty →
    // "action_required"; details_submitted false → "none"/"pending". last4 from external_accounts.data[0].last4. Keep it fresh with the account.updated webhook.
    return notYet("getPayoutAccountStatus");
  }

  async getPayouts(_userId: string, _source: PayoutSource): Promise<PayoutRecord[]> {
    // TODO: stripe.payouts.list({ limit: 50 }, { stripeAccount: account }) – arrival_date, amount, destination last4, status.
    return notYet("getPayouts");
  }

  async getBalance(_userId: string, _source: PayoutSource): Promise<Balance> {
    // TODO: stripe.balance.retrieve({ stripeAccount: account }) – pending + the next scheduled payout (payouts.list({ status: "pending" })).
    return notYet("getBalance");
  }

  async createPaymentIntent(_houseId: string, _memberId: string): Promise<PaymentIntent> {
    // TODO: stripe.paymentIntents.create({ amount, currency, application_fee_amount: fee, transfer_data: { destination: host account },
    // metadata: { houseId, memberId } }) on the server; the browser gets client_secret for the Payment Element.
    return notYet("createPaymentIntent");
  }

  async confirmPayment(_intent: PaymentIntent, _method: PaymentMethodInput): Promise<PaymentResult> {
    // TODO: browser: stripe.confirmPayment({ elements, redirect: "if_required" }); the server marks the share paid on payment_intent.succeeded.
    return notYet("confirmPayment");
  }

  async getReceipt(_paymentId: string): Promise<Receipt | null> {
    // TODO: stripe.paymentIntents.retrieve(id, { expand: ["latest_charge"] }) – latest_charge.receipt_url, payment_method_details.card.last4/brand.
    return notYet("getReceipt");
  }

  async refund(_paymentId: string, _amount: number, _reason: RefundReason): Promise<Refund> {
    // TODO: stripe.refunds.create({ payment_intent, amount, reverse_transfer: true, refund_application_fee: reason !== "spot_transferred", metadata: { reason } }).
    return notYet("refund");
  }

  async startIdentityCheck(_userId: string, _returnUrl: string): Promise<string> {
    // TODO: stripe.identity.verificationSessions.create({ type: "document", options: { document: { require_matching_selfie: true } }, return_url, metadata: { userId } }).url
    return notYet("startIdentityCheck");
  }

  async getIdentityStatus(_userId: string): Promise<IdentityStatus> {
    // TODO: stripe.identity.verificationSessions.retrieve(id).status – processing / verified / requires_input → "failed"; the identity.verification_session.* webhooks keep it fresh.
    return notYet("getIdentityStatus");
  }
}

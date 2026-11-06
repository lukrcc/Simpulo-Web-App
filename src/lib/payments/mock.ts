// Dev and demo: payments without money. Everything lives in this browser (localStorage), every call takes 600–1500ms, and
// the Dev menu can make things go wrong ("Simulate payment failure", "Simulate onboarding action required").
// The "Stripe" pages it sends people to are Simpulo's own simulations under /dev – never a copy of Stripe.
import { readFeatureFlag } from "../featureFlags";
import type { Currency, Payment } from "../types";
import type { PaymentsAdapter } from "./adapter";
import type { IdentityStatus, PaymentIntent, PayoutAccountStatus, Receipt, Refund } from "./types";

const KEY = "simpulo:payments";
/** Onboarding and the ID check take this long to "come back" from the provider. */
const REVIEW_MS = 3000;

interface MockState {
  accounts: Record<string, { status: PayoutAccountStatus; last4?: string; readyAt?: string; outcome?: "active" | "action_required" }>;
  identity: Record<string, { status: IdentityStatus; readyAt?: string }>;
  receipts: Record<string, Receipt>;
  refunds: Record<string, Refund>;
}

/** What the mock reads from the app's data: the payment records (amounts) and who's verified at the start. */
interface MockSource {
  payments: () => readonly Payment[];
  currencyOf: (houseId: string) => Currency;
  initiallyVerified: (userId: string) => boolean;
}

let source: MockSource | null = null;
/** The store hands the mock its data once it's there (lib/store.tsx). */
export function bindPaymentsMock(next: MockSource) {
  source = next;
}

function load(): MockState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { accounts: {}, identity: {}, receipts: {}, refunds: {}, ...(JSON.parse(raw) as Partial<MockState>) };
  } catch {
    // nothing saved – a fresh start
  }
  return { accounts: {}, identity: {}, receipts: {}, refunds: {} };
}

function save(state: MockState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // not saved – it holds for this visit only
  }
}

const wait = () => new Promise((resolve) => setTimeout(resolve, 600 + Math.round(Math.random() * 900)));
const id = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

class MockPaymentsAdapter implements PaymentsAdapter {
  async createPayoutAccount(userId: string) {
    await wait();
    const state = load();
    state.accounts[userId] ??= { status: "none" };
    save(state);
    return { accountId: `acct_mock_${userId}` };
  }

  async getOnboardingLink(_userId: string, returnUrl: string) {
    await wait();
    return `/dev/stripe-onboarding?return=${encodeURIComponent(returnUrl)}`;
  }

  async getPayoutAccountStatus(userId: string) {
    const state = load();
    const account = state.accounts[userId];
    if (!account) return { status: "none" as const };
    // The review "comes back" a few seconds after submitting.
    if (account.status === "pending" && account.readyAt && account.readyAt <= new Date().toISOString()) {
      account.status = account.outcome ?? "active";
      save(state);
    }
    return { status: account.status, last4: account.last4 };
  }

  async getPayouts(_userId: string, source: { payouts: import("./types").PayoutRecord[] }) {
    await wait();
    return source.payouts;
  }

  async getBalance(_userId: string, source: { pending: number; currency: Currency; next: { date: string; amount: number } | null }) {
    await wait();
    return { pending: source.pending, currency: source.currency, next: source.next };
  }

  async createPaymentIntent(houseId: string, memberId: string): Promise<PaymentIntent> {
    await wait();
    const record = source?.payments().find((p) => p.stayId === houseId && p.userId === memberId && p.status === "pending");
    if (!record) throw new Error("Nothing to pay");
    return { id: id("pi_mock"), houseId, memberId, amount: record.total, currency: source!.currencyOf(houseId), share: record.share, hostFee: record.hostFee ?? 0, fee: record.fee };
  }

  async confirmPayment(intent: PaymentIntent, method: Parameters<PaymentsAdapter["confirmPayment"]>[1]) {
    await wait();
    // Declined: the Dev menu's switch, or a card number starting 0000.
    if (readFeatureFlag("simulatePaymentFailure") || (method.kind === "card" && method.number.replace(/\s/g, "").startsWith("0000"))) return { status: "declined" as const };
    const brand = method.kind === "apple_pay" ? "Apple Pay" : method.kind === "google_pay" ? "Google Pay" : "Visa";
    const last4 = method.kind === "card" ? method.number.replace(/\s/g, "").slice(-4) : "4242";
    const state = load();
    const record = source?.payments().find((p) => p.stayId === intent.houseId && p.userId === intent.memberId);
    if (record) state.receipts[record.id] = { paymentId: record.id, amount: intent.amount, currency: intent.currency, paidAt: new Date().toISOString(), brand, last4 };
    save(state);
    return { status: "succeeded" as const, method: { brand, last4 } };
  }

  async getReceipt(paymentId: string) {
    const receipt = load().receipts[paymentId];
    if (receipt) return receipt;
    // Paid before this browser kept receipts (the mock data): a test card.
    const record = source?.payments().find((p) => p.id === paymentId && p.status === "paid");
    return record ? { paymentId, amount: record.total, currency: source!.currencyOf(record.stayId), paidAt: record.paidAt ?? new Date().toISOString(), brand: "Visa", last4: "4242" } : null;
  }

  async refund(paymentId: string, amount: number, reason: Refund["reason"]) {
    await wait();
    const state = load();
    const refund: Refund = { id: id("re_mock"), paymentId, amount, reason, status: "pending", arrivesInDays: [5, 10] };
    state.refunds[paymentId] = refund;
    save(state);
    return refund;
  }

  async startIdentityCheck(_userId: string, returnUrl: string) {
    await wait();
    return `/dev/identity-check?return=${encodeURIComponent(returnUrl)}`;
  }

  async getIdentityStatus(userId: string) {
    const state = load();
    const check = state.identity[userId];
    if (!check) return source?.initiallyVerified(userId) ? ("verified" as const) : ("none" as const);
    if (check.status === "processing" && check.readyAt && check.readyAt <= new Date().toISOString()) {
      check.status = "verified";
      save(state);
    }
    return check.status;
  }
}

/** The /dev simulation pages: what "Stripe" would have done once the person submitted. */
export const mockProvider = {
  submitOnboarding(userId: string, iban: string) {
    const state = load();
    const digits = iban.replace(/\s/g, "");
    state.accounts[userId] = {
      status: "pending",
      last4: digits.slice(-4) || "1234",
      readyAt: new Date(Date.now() + REVIEW_MS).toISOString(),
      outcome: readFeatureFlag("simulateOnboardingActionRequired") ? "action_required" : "active",
    };
    save(state);
  },
  submitIdentity(userId: string) {
    const state = load();
    state.identity[userId] = { status: "processing", readyAt: new Date(Date.now() + REVIEW_MS).toISOString() };
    save(state);
  },
};

export const mockPayments = new MockPaymentsAdapter();

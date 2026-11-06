// Payments, payouts and identity – one interface, the provider chosen by APP_MODE: the mock in dev and demo, Stripe in production.
// See CLAUDE.md "Zahlungen". Components only talk to `payments`, never to the mock or Stripe directly.
import { APP_MODE } from "../appMode";
import type { PaymentsAdapter } from "./adapter";
import { mockPayments } from "./mock";
import { StripePaymentsAdapter } from "./stripe";

export type PaymentsProvider = "mock" | "stripe";
export const PAYMENTS_PROVIDER: PaymentsProvider = APP_MODE === "production" ? "stripe" : "mock";

export const payments: PaymentsAdapter = PAYMENTS_PROVIDER === "stripe" ? new StripePaymentsAdapter() : mockPayments;

export type { PaymentsAdapter } from "./adapter";
export * from "./types";

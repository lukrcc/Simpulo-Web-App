// The values the legal texts quote ({{key}} in content/legal/*.md) – every number from the config, never typed into a text.
import { COMPANY, type Company } from "@/config/company";
import { PREVIEW_COOKIE_DAYS } from "@/config/preview";
import { DEADLINES, FEE_MODEL, HELP_WINDOW, INVITE_POLICY, MIN_AGE, PAYMENT_POLICY, REPORT_POLICY, REQUEST_POLICY, WAITLIST_POLICY } from "@/config/policies";
import type { LegalValues } from "./parse";

// The privacy requests' address is the general email unless one of its own is set – the same data, not kept twice.
const company = Object.fromEntries((Object.keys(COMPANY) as (keyof Company)[]).map((k) => [`company.${k}`, k === "privacyEmail" ? (COMPANY.privacyEmail ?? COMPANY.email) : COMPANY[k]]));

export const LEGAL_VALUES: LegalValues = {
  ...company,
  "fees.service": FEE_MODEL.serviceFeePercent,
  "fees.hostFee": FEE_MODEL.hostFeeCommissionPercent,
  "request.expiryHours": REQUEST_POLICY.requestExpiryHours,
  "request.reminderHours": DEADLINES.request[0].afterHours,
  "payment.windowHours": PAYMENT_POLICY.paymentWindowHours,
  "payment.bookingHours": PAYMENT_POLICY.hostBookingWindowHours,
  "waitlist.offerHours": WAITLIST_POLICY.offerHours,
  "invite.holdHours": INVITE_POLICY.inviteHoldHours,
  "help.daysBefore": HELP_WINDOW.daysBefore,
  "help.daysAfter": HELP_WINDOW.daysAfter,
  "report.reviewHours": REPORT_POLICY.reviewHours,
  "age.min": MIN_AGE,
  // Cookie lifetimes: lib/theme.ts (one year), src/proxy.ts viewer_country (30 days), config/preview.ts.
  "cookies.themeDays": 365,
  "cookies.countryDays": 30,
  "cookies.previewDays": PREVIEW_COOKIE_DAYS,
};

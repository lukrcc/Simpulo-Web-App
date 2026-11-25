// Admin › System › Plattform-Pflichten (CLAUDE.md "Plattform-Pflichten"): what Simpulo has prepared for a platform's duties, each with its
// status – vorbereitet (built, not switched on or not complete) · aktiv (live in the app) · vom Anwalt geprüft (Lukas sets it after the
// review). Structure only; the German words are in lib/i18n/admin.de.ts admin.platform.duties. Nothing here is legal advice.
import { COMPANY } from "./company";
import { HOST_TAX_INFO } from "./policies";

export type DutyStatus = "prepared" | "active" | "reviewed";

/** Set by Lukas once the lawyer has reviewed a point (then it shows "vom Anwalt geprüft"). */
const REVIEWED_BY_LAWYER: Record<DutyId, boolean> = {
  contentReport: false,
  reasons: false,
  contactPoint: false,
  businessHosts: false,
  taxInfo: false,
};

export type DutyId = "contentReport" | "reasons" | "contactPoint" | "businessHosts" | "taxInfo";

export interface Duty {
  id: DutyId;
  /** Where it lives (a page, a setting) */
  href: string;
  /** Built and switched on in the app */
  live: boolean;
}

export const DUTIES: readonly Duty[] = [
  { id: "contentReport", href: "/report-content", live: true },
  { id: "reasons", href: "/notices", live: true },
  // Live only with an address in config/company.ts.
  { id: "contactPoint", href: "/impressum#contact-point", live: Boolean(COMPANY.contactPoint) },
  { id: "businessHosts", href: "/settings/payments", live: true },
  // Behind its switch (config/policies.ts HOST_TAX_INFO).
  { id: "taxInfo", href: "/settings/payments", live: HOST_TAX_INFO.enabled },
];

export function dutyStatus(duty: Duty): DutyStatus {
  if (REVIEWED_BY_LAWYER[duty.id]) return "reviewed";
  return duty.live ? "active" : "prepared";
}

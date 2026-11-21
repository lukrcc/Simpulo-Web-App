// Statements of reasons (CLAUDE.md "Plattform-Pflichten"): which rule a reason points to – the link in every notice (/notices). Structure
// only; the rule's name is in lib/i18n/en.ts notices.rule.<key>.
import type { ReportReason } from "@/lib/types";

export const RULE_OF_REASON: Record<ReportReason, { key: string; href: string }> = {
  harassment: { key: "respect", href: "/community-guidelines#respect" },
  inappropriate: { key: "respect", href: "/community-guidelines#respect" },
  safety: { key: "safety", href: "/community-guidelines#safety" },
  scam: { key: "money", href: "/community-guidelines#money" },
  privacy: { key: "privacy", href: "/community-guidelines#privacy" },
  illegal: { key: "conduct", href: "/terms#conduct" },
  ip: { key: "conduct", href: "/terms#conduct" },
  other: { key: "guidelines", href: "/community-guidelines" },
};

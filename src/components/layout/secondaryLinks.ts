/** Getting the app: /get, the one page for it (QR on a computer, Safari steps on an iPhone, Chrome install on Android). */
export const GET_THE_APP_HREF = "/get";

export const LEGAL_LINKS = [
  { href: "/impressum", labelKey: "imprint" },
  { href: "/privacy", labelKey: "privacy" },
  { href: "/terms", labelKey: "terms" },
] as const;

export { CONTACT_EMAIL } from "@/config/contact";

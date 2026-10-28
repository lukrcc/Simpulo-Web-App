/** The install guide is a section on How it works. */
export const GET_THE_APP_HREF = "/how-it-works#get-the-app";

/** Footer links (desktop) – the mobile "More" list on /profile covers the same pages. Labels: keys under footer.links. */
export const FOOTER_LINKS = [
  { href: "/how-it-works", labelKey: "howItWorks" },
  { href: GET_THE_APP_HREF, labelKey: "getTheApp" },
  { href: "/host", labelKey: "hostWithCommunity" },
  { href: "/contact", labelKey: "contact" },
  { href: "/imprint", labelKey: "imprint" },
  { href: "/privacy", labelKey: "privacy" },
  { href: "/terms", labelKey: "terms" },
] as const;

export const LEGAL_LINKS = [
  { href: "/imprint", labelKey: "imprint" },
  { href: "/privacy", labelKey: "privacy" },
  { href: "/terms", labelKey: "terms" },
] as const;

export const CONTACT_EMAIL = "hello@simpulo.app";

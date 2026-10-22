/** The install guide is a section on How it works. */
export const GET_THE_APP_HREF = "/how-it-works#get-the-app";

/** Footer links (desktop) – the mobile "More" list on /profile covers the same pages. */
export const FOOTER_LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: GET_THE_APP_HREF, label: "Get the app" },
  { href: "/contact", label: "Contact" },
  { href: "/imprint", label: "Imprint" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;

export const LEGAL_LINKS = [
  { href: "/imprint", label: "Imprint" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;

export const CONTACT_EMAIL = "hello@simpulo.app";

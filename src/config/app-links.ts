/**
 * The native apps' store pages – empty while Simpulo is a web app (PWA). Once one is set, /get sends that platform's visitors straight
 * there (iPhone/iPad → App Store, Android → Play Store).
 */
export const APP_LINKS = {
  appStoreUrl: "",
  playStoreUrl: "",
} as const;

/**
 * Admin › Platform › "Tools": the consoles Simpulo runs on, opened in a new tab. Fill in the real project and repository links – the
 * defaults are the services' start pages. Never secrets here (these are only links).
 */
export const TOOL_LINKS = [
  { key: "firebaseStaging", url: "https://console.firebase.google.com/" },
  { key: "firebaseProduction", url: "https://console.firebase.google.com/" },
  { key: "stripe", url: "https://dashboard.stripe.com/" },
  { key: "analytics", url: "https://analytics.google.com/" },
  { key: "github", url: "https://github.com/" },
] as const;
export type ToolKey = (typeof TOOL_LINKS)[number]["key"];

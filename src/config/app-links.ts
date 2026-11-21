/**
 * Simpulo is a web app – there are no native apps and no store pages. "Get the app" always means /get: installing Simpulo to the home screen
 * as a web app (iPhone/iPad: Safari › Share › Add to Home Screen; Android/desktop: the browser's install).
 */
export const APP_LINKS = {
  /**
   * The short loop video on /get for iPhone (Share → Add to Home Screen → Add), a muted mp4 in public/ (e.g. "/get/ios-install.mp4").
   * Empty: a quiet placeholder frame instead. TODO: record it (screen recording, ~6 s, no sound).
   */
  iosInstallVideo: "",
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

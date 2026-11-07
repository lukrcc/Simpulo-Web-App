/**
 * The native apps' store pages – empty while Simpulo is a web app (PWA). Once one is set, /get sends that platform's visitors straight
 * there (iPhone/iPad → App Store, Android → Play Store).
 */
export const APP_LINKS = {
  appStoreUrl: "",
  playStoreUrl: "",
} as const;

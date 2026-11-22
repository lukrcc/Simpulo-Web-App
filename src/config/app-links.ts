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

// Admin › System › Tools: config/tools.ts (links only, never secrets).

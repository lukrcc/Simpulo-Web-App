/*
 * Where the app runs, from NEXT_PUBLIC_APP_MODE (fixed at build time):
 *   dev         mock data, the Dev menu
 *   demo        mock data fixed on "Full", password, preview band, never indexed
 *   production  the real data source, no mock, no Dev menu
 * Not set: "dev" under `next dev`, else "production" – a deployment never shows mock data by accident.
 */
export type AppMode = "dev" | "demo" | "production";

const configured = process.env.NEXT_PUBLIC_APP_MODE;

export const APP_MODE: AppMode = configured === "dev" || configured === "demo" || configured === "production" ? configured : process.env.NODE_ENV === "development" ? "dev" : "production";

/** The preview band above the header, only in demo (--band-h in globals.css says the same). */
export const BAND_HEIGHT = APP_MODE === "demo" ? 28 : 0;

import { tEn } from "@/lib/i18n/translate";
import type { MetadataRoute } from "next";

/**
 * The web app manifest (served at /manifest.webmanifest; Next links it itself). The app icon is the orbit on black – "any" with its own
 * rounded corners, "maskable" full-bleed for Android's masks. public/icon-1024.png is a large master copy and isn't listed (Simpulo is a web app – no app stores).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Simpulo",
    short_name: "Simpulo",
    description: tEn("og.tagline"),
    start_url: "/",
    display: "standalone",
    background_color: "#111111",
    theme_color: "#111111",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

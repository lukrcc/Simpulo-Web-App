import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import createNextIntlPlugin from "next-intl/plugin";
import { assertTestRoutes } from "./scripts/check-test-routes";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // The Next.js dev indicator sat on top of the left nav rail / DevSwitcher – hide it (errors still surface).
  devIndicators: false,
  // Dev only: other hosts that may load the dev server's JS/HMR (hostnames only – no scheme, no port; `*` = one
  // label). Phones on the LAN, the iPhone hotspot range and Cloudflare quick tunnels.
  allowedDevOrigins: ["*.trycloudflare.com", "192.168.178.*", "172.20.10.*", "192.168.151.196", "10.219.49.*"],
  partialPrefetching: true,
  async redirects() {
    return [
      // The password page of the preview gate and the demo is /preview (old demo links keep working, with ?next=).
      { source: "/demo-login", destination: "/preview", permanent: false },
      // Getting the app: /get.
      { source: "/install", destination: "/get", permanent: false },
      // How it works is gone: the FAQ explains Simpulo (the query, e.g. ?role=host, goes along).
      { source: "/how-it-works", destination: "/help", permanent: true },
      // SEO URLs: House pages moved from /stays/… to /house/…, the imprint to /impressum – old links keep working.
      { source: "/stays/:slug", destination: "/house/:slug", permanent: true },
      { source: "/imprint", destination: "/impressum", permanent: true },
      // Where next is gone: there is one object, the House.
      { source: "/where-next", destination: "/", permanent: true },
      { source: "/destinations", destination: "/", permanent: true },
      { source: "/next", destination: "/", permanent: true },
      // Your houses: /your-houses (overview), /your-houses/[id] (one House), /your-houses/[id]/edit. Older paths keep working.
      // Earnings has its own page.
      { source: "/your-houses", has: [{ type: "query", key: "tab", value: "earnings" }], destination: "/your-houses/payouts", permanent: true },
      { source: "/your-houses/earnings", destination: "/your-houses/payouts", permanent: true },
      // Admin: "Heute" and "Support" became the Posteingang.
      { source: "/admin/today", destination: "/admin/posteingang", permanent: true },
      { source: "/admin/heute", destination: "/admin/posteingang", permanent: true },
      { source: "/admin/support", destination: "/admin/posteingang", permanent: true },
      // The sections are tabs now (one grid).
      // The FAQ became the help center (/help): the old role picks its topic, anchors keep working (the browser keeps the #).
      { source: "/faq", has: [{ type: "query", key: "role", value: "host" }], destination: "/help?cat=hosting", permanent: true },
      { source: "/faq", destination: "/help", permanent: true },
      { source: "/your-houses/hosting", destination: "/your-houses/all/hosting", permanent: true },
      { source: "/your-houses/joined", destination: "/your-houses/all/going", permanent: true },
      // Short links (lib/links.ts): /h/[id] is a page of its own (the House by role); invites and creators are placeholders for now.
      // An invite link from the invite sheet (components/InviteSheet): the code is the invite's token – its page holds the spot for 48h.
      { source: "/i/:code", destination: "/invite/:code", permanent: false },
      // TODO: creator pages.
      { source: "/c/:handle", destination: "/", permanent: false },
      // Hosting is explained in the FAQ (Hosting) – no page of its own.
      // Notifications live in Messages › Updates.
      { source: "/notifications", destination: "/your-houses", permanent: true },
      // The own profile, short: /me.
      { source: "/me", destination: "/profile", permanent: false },
      // Edit profile moved into Settings.
      { source: "/profile/edit", destination: "/settings/profile", permanent: true },
      // Messages was "Chats · Updates": the updates are Your houses' Activity now.
      { source: "/messages", has: [{ type: "query", key: "tab", value: "updates" }], destination: "/your-houses", permanent: true },
      { source: "/houses", destination: "/your-houses", permanent: true },
      { source: "/houses/:id/manage", destination: "/your-houses/:id", permanent: true },
      // The category pages are gone: a category is a filter on Explore.
      { source: "/houses/:slug", destination: "/explore?category=:slug", permanent: true },
      { source: "/my-stays", has: [{ type: "query", key: "id", value: "(?<id>.+)" }], destination: "/your-houses/:id", permanent: true },
      { source: "/my-stays", destination: "/your-houses", permanent: true },
      { source: "/my-stays/:id/edit", destination: "/your-houses/:id/edit", permanent: true },
      { source: "/my-stays/:id", destination: "/your-houses/:id", permanent: true },
      // Messages: /messages and /messages/[threadId].
      // One list for every chat: the old question links go to the chat itself; ?tab= is gone.
      { source: "/messages/q/:threadId", destination: "/messages/:threadId", permanent: true },
      { source: "/inbox", destination: "/messages", permanent: true },
      { source: "/inbox/:threadId", destination: "/messages/:threadId", permanent: true },
    ];
  },
  images: {
    // Keep in sync with OPTIMIZED_HOSTS in src/components/ui/Img.tsx.
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "i.pravatar.cc" },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

// Every production build checks the width test's route list (src/config/test-routes.ts) against the pages that exist: a new page that isn't
// listed stops the build with "Neue Seite /xyz nicht im Breiten-Test" (scripts/check-test-routes.ts).
export default function config(phase: string) {
  if (phase === PHASE_PRODUCTION_BUILD) assertTestRoutes();
  return withNextIntl(nextConfig);
}

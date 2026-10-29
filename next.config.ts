import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

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
  // The install guide lives on How it works now; old links (and bookmarks) still land there.
  async redirects() {
    return [
      { source: "/install", destination: "/how-it-works#get-the-app", permanent: false },
      // SEO URLs: House pages moved from /stays/… to /house/…, the imprint to /impressum – old links keep working.
      { source: "/stays/:slug", destination: "/house/:slug", permanent: true },
      { source: "/imprint", destination: "/impressum", permanent: true },
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

export default withNextIntl(nextConfig);

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Lets phones on the local network open the dev server (http://<mac-ip>:3000).
  allowedDevOrigins: ["192.168.151.196", "172.20.10.*"],
  partialPrefetching: true,
  // The install guide lives on How it works now; old links (and bookmarks) still land there.
  async redirects() {
    return [{ source: "/install", destination: "/how-it-works#get-the-app", permanent: false }];
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

export default nextConfig;

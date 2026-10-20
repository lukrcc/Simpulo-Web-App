import Image, { type ImageProps } from "next/image";

// Keep in sync with images.remotePatterns in next.config.ts.
const OPTIMIZED_HOSTS = new Set(["picsum.photos", "i.pravatar.cc"]);

function isOptimizable(src: string): boolean {
  if (src.startsWith("/")) return true;
  try {
    const url = new URL(src);
    return url.protocol === "https:" && OPTIMIZED_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

type ImgProps = Omit<ImageProps, "src"> & { src: string };

/**
 * next/image that also accepts arbitrary user-provided URLs (e.g. a custom cover image):
 * known hosts are optimized, everything else is passed through unoptimized.
 */
export function Img({ src, alt, unoptimized, ...props }: ImgProps) {
  return <Image src={src} alt={alt} unoptimized={unoptimized ?? !isOptimizable(src)} {...props} />;
}

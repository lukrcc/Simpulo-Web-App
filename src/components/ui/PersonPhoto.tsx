import { User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Img } from "./Img";

interface PersonPhotoProps {
  src: string | undefined;
  alt: string;
  /** Pixel size (square) */
  size: number;
  className?: string;
}

/** A person's round photo – or a gray placeholder for people who haven't added one yet. */
export function PersonPhoto({ src, alt, size, className }: PersonPhotoProps) {
  if (!src) {
    return (
      <span
        role="img"
        aria-label={`${alt} (no photo yet)`}
        style={{ width: size, height: size }}
        className={cn("flex shrink-0 items-center justify-center rounded-full bg-neutral-200 text-neutral-400", className)}
      >
        <UserIcon style={{ width: size * 0.55, height: size * 0.55 }} aria-hidden />
      </span>
    );
  }
  return <Img src={src} alt={alt} width={size} height={size} className={cn("shrink-0 rounded-full object-cover", className)} />;
}

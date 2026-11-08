import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** The wordmark "simpulo." on its own (no link): 20px in sheets, 40px on /get. The app icon never shows inside the pages. */
export function Wordmark({ size = "md", className }: { size?: "md" | "lg"; className?: string }) {
  return (
    <span className={cn(size === "lg" ? "text-logo-lg" : "text-logo", "tracking-tight text-ink", className)}>
      simpulo<span className="text-accent">.</span>
    </span>
  );
}

/** The header's wordmark, 20px/700 – a link home. */
export function Logo({ className }: { className?: string }) {
  const t = useTranslations("nav");
  return (
    <Link href="/" aria-label={t("home")} className={cn("flex self-center justify-self-start", className)}>
      <Wordmark />
    </Link>
  );
}

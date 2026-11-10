import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type LogoSize = "sm" | "md" | "lg";
const SIZE: Record<LogoSize, string> = { sm: "text-logo-sm", md: "text-logo", lg: "text-logo-lg" };

/**
 * The logo: the wordmark "simpulo." in the display face, bold, ink – the dot in the accent orange (the one place that orange dot belongs).
 * md 28px in the headers, sm 22px in the footer, lg 37px on /get and the 404. Not a link (Logo is).
 */
export function Wordmark({ size = "md", className }: { size?: LogoSize; className?: string }) {
  return (
    <span className={cn("whitespace-nowrap text-ink", SIZE[size], className)}>
      simpulo<span className="text-accent">.</span>
    </span>
  );
}

/** The logo as the way home. */
export function Logo({ size = "md", className }: { size?: LogoSize; className?: string }) {
  const t = useTranslations("nav");
  return (
    <Link href="/" aria-label={t("home")} className={cn("flex self-center justify-self-start", className)}>
      <Wordmark size={size} />
    </Link>
  );
}

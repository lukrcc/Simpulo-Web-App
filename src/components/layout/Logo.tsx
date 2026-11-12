import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type LogoSize = "sm" | "bar" | "md" | "lg";
const SIZE: Record<LogoSize, string> = { sm: "text-logo-sm", bar: "text-logo-bar", md: "text-logo", lg: "text-logo-lg" };

/**
 * The logo: the wordmark "simpulo." in Inter Display (Inter at opsz 32), bold 700, ink – the dot in the accent orange (the one place that
 * orange dot belongs). 24px in every header (bar: the site header, the phones' head, Open a House's focus head); sm 22px in the footer, lg
 * 37px on /get and the 404. Not a link (Logo is).
 */
export function Wordmark({ size = "bar", className }: { size?: LogoSize; className?: string }) {
  return (
    <span className={cn("whitespace-nowrap text-ink", SIZE[size], className)}>
      simpulo<span className="text-accent">.</span>
    </span>
  );
}

/** The logo as the way home. */
export function Logo({ size = "bar", className }: { size?: LogoSize; className?: string }) {
  const t = useTranslations("nav");
  return (
    <Link href="/" aria-label={t("home")} className={cn("flex self-center justify-self-start", className)}>
      <Wordmark size={size} />
    </Link>
  );
}

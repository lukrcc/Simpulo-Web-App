import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** The wordmark, 22px/700. */
export function Logo({ className }: { className?: string }) {
  const t = useTranslations("nav");
  return (
    <Link href="/" aria-label={t("home")} className={cn("flex self-center justify-self-start", className)}>
      <span className="text-logo tracking-tight text-ink">
        simpulo<span className="text-accent">.</span>
      </span>
    </Link>
  );
}

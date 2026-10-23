import Link from "next/link";
import { useTranslations } from "next-intl";
import { Container } from "@/components/layout/Container";
import { buttonClass } from "@/components/ui/button";

export default function NotFound() {
  const t = useTranslations("states.notFound");
  return (
    <Container page>
      <div className="flex flex-col items-center py-16 text-center md:py-24">
        <p className="text-5xl font-bold tracking-tight text-ink md:text-6xl" aria-hidden>
          simpulo<span className="text-accent">.</span>
        </p>
        <h1 className="mt-8 text-2xl font-bold tracking-tight md:text-3xl">{t("title")}</h1>
        <p className="mt-2 max-w-sm text-neutral-500">{t("description")}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className={buttonClass("dark", "md")}>
            {t("explore")}
          </Link>
          <Link href="/how-it-works" className={buttonClass("secondary", "md")}>
            {t("howItWorks")}
          </Link>
        </div>
      </div>
    </Container>
  );
}

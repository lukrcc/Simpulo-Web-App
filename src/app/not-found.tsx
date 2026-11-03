import { useTranslations } from "next-intl";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/ActionButton";

export default function NotFound() {
  const t = useTranslations("states.notFound");
  return (
    <Container page>
      <div className="flex flex-col items-center py-16 text-center md:py-24">
        <p className="text-h1 text-ink" aria-hidden>
          simpulo<span className="text-ink">.</span>
        </p>
        <h1 className="mt-8 text-h2">{t("title")}</h1>
        <p className="mt-2 max-w-sm text-muted">{t("description")}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button variant="primary" size="lg" href="/">
            {t("explore")}
          </Button>
          <Button variant="secondary" size="lg" href="/how-it-works">
            {t("howItWorks")}
          </Button>
        </div>
      </div>
    </Container>
  );
}

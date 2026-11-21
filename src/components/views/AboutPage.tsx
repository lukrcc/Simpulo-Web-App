import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/layout/Container";
import { buttonStyles } from "@/components/ui/ActionButton";
import { Img } from "@/components/ui/Img";
import { ABOUT_VALUES, ABOUT_WHY, FOUNDER } from "@/config/pages";
import { APP_MODE } from "@/lib/appMode";

/**
 * /about (CLAUDE.md "About"): the mission large ("No one should have to go through life alone."), "Why Simpulo" in three short paragraphs,
 * the founder (photo, first name, two sentences, an email with the name – config/pages.ts FOUNDER, filled by the founder; until then a
 * placeholder in dev, hidden elsewhere), the three values, then Explore and Become a host. Server-rendered.
 */
export async function AboutPage() {
  const t = await getTranslations("aboutPage");
  const founder = FOUNDER.name ? FOUNDER : null;
  return (
    <div data-about-page>
      <section aria-labelledby="about-title" className="pt-[clamp(32px,6vw,80px)]">
        <Container className="explore-width">
          <p className="text-eyebrow uppercase text-muted">{t("eyebrow")}</p>
          <h1 id="about-title" className="stage-title mt-3 max-w-[18ch] text-ink">
            {t("mission")}
          </h1>
        </Container>
      </section>

      <section aria-labelledby="about-why" className="mt-(--space-section)">
        <Container className="explore-width">
          <div className="max-w-[680px]">
            <h2 id="about-why" className="text-section text-ink">
              {t("whyTitle")}
            </h2>
            <div className="mt-6 flex flex-col gap-5">
              {ABOUT_WHY.map((id) => (
                <p key={id} className="text-body-lg text-ink">
                  {t(`why.${id}`)}
                </p>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {(founder || APP_MODE === "dev") && (
        <section aria-labelledby="about-founder" className="mt-(--space-section)">
          <Container className="explore-width">
            <h2 id="about-founder" className="text-section text-ink">
              {t("founderTitle")}
            </h2>
            {founder ? (
              <div className="mt-6 grid items-center gap-8 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
                <div className="relative aspect-4/5 w-full max-w-[320px] overflow-hidden rounded-[24px] bg-ink/6">
                  {founder.photo && <Img src={founder.photo} alt={founder.name ?? ""} fill sizes="320px" className="object-cover" />}
                </div>
                <div className="flex max-w-[56ch] flex-col items-start gap-3">
                  <p className="text-h3 text-ink">{founder.name}</p>
                  {founder.text && <p className="text-body-lg text-ink">{founder.text}</p>}
                  {founder.email && (
                    <a href={`mailto:${founder.email}`} className="text-body font-semibold text-ink underline-offset-4 hover:underline">
                      {t("founderWrite", { name: founder.name ?? "" })} · {founder.email}
                    </a>
                  )}
                </div>
              </div>
            ) : (
              // Dev only: where the founder goes, until config/pages.ts FOUNDER is filled.
              <p data-founder-placeholder className="mt-6 max-w-[56ch] rounded-[24px] border border-dashed border-ink/20 p-6 text-body text-muted">
                {t("founderPlaceholder")}
              </p>
            )}
          </Container>
        </section>
      )}

      <section aria-labelledby="about-values" className="mt-(--space-section)">
        <Container className="explore-width">
          <h2 id="about-values" className="text-section text-ink">
            {t("valuesTitle")}
          </h2>
          <ul className="mt-6 grid gap-8 md:grid-cols-3">
            {ABOUT_VALUES.map((id) => (
              <li key={id} className="flex flex-col gap-2 border-t border-ink/10 pt-4">
                <h3 className="text-h3 text-ink">{t(`values.${id}.title`)}</h3>
                <p className="text-body text-muted">{t(`values.${id}.text`)}</p>
              </li>
            ))}
          </ul>
          <div className="mt-(--space-section) flex flex-wrap justify-center gap-3">
            <Link href="/explore" className={buttonStyles("primary", "md")}>
              {t("explore")}
            </Link>
            <Link href="/host" className={buttonStyles("secondary", "md")}>
              {t("host")}
            </Link>
          </div>
        </Container>
      </section>
    </div>
  );
}

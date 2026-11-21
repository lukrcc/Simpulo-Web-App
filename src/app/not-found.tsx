import { useTranslations } from "next-intl";
import { ErrorView } from "@/components/states/ErrorView";

/** 404 – the one error look (components/states/ErrorView.tsx): wordmark, one sentence, Explore, Get help. */
export default function NotFound() {
  const t = useTranslations("states");
  return <ErrorView texts={{ title: t("notFound.title"), description: t("notFound.description"), explore: t("notFound.explore"), getHelp: t("error.getHelp") }} />;
}

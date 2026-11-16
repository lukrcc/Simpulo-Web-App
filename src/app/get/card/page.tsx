import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GetCard } from "@/components/get/GetCard";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("install.card");
  return pageMetadata({ title: t("pageTitle"), description: t("text"), path: "/get/card", noindex: true });
}

/** /get/card – the print template: cards with the QR code to /get?src=qr, to leave in a House. Never indexed. */
export default function GetCardPage() {
  return <GetCard />;
}

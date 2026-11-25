import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Settings } from "@/components/views/Settings";
import { SETTINGS_ALIASES, SETTINGS_SECTIONS, SETTINGS_SUBPAGES } from "@/config/settings";

/** Every area, page and old name is known ahead – the route renders at build time. */
export function generateStaticParams() {
  return [...SETTINGS_SECTIONS, ...SETTINGS_SUBPAGES, ...Object.keys(SETTINGS_ALIASES)].map((p) => ({ path: p.split("/") }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.pages");
  return { title: t("settings") };
}

/** /settings/<area> and /settings/<area>/<page> (CLAUDE.md "Settings wie iOS-Einstellungen"); old names redirect, Appearance back to the list. */
export default function SettingsAreaPage({ params }: PageProps<"/settings/[...path]">) {
  return (
    <Suspense fallback={null}>
      <SettingsArea params={params} />
    </Suspense>
  );
}

async function SettingsArea({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const joined = path.join("/");
  if (path.length === 1 && path[0] in SETTINGS_ALIASES) {
    const to = SETTINGS_ALIASES[path[0]];
    redirect(to ? `/settings/${to}` : "/settings");
  }
  const known = (path.length === 1 && (SETTINGS_SECTIONS as readonly string[]).includes(path[0])) || (SETTINGS_SUBPAGES as readonly string[]).includes(joined);
  if (!known) notFound();
  return <Settings path={joined} />;
}

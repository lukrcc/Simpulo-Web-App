import { redirect } from "next/navigation";

/** Only a redirect – nothing to prerender for instant navigation. */
export const instant = false;

/** Die Bewerbungen sind ein Tab von Hosts; ?app= (eine Bewerbung) geht mit. */
export default async function Page({ searchParams }: { searchParams: Promise<{ app?: string }> }) {
  const { app } = await searchParams;
  redirect(`/admin/hosts?tab=applications${app ? `&app=${encodeURIComponent(app)}` : ""}`);
}

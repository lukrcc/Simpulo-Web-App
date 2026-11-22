import { redirect } from "next/navigation";

/** Only a redirect – nothing to prerender for instant navigation. */
export const instant = false;

/** Die Warteliste ist ein Tab von Wachstum. */
export default function Page() {
  redirect("/admin/growth?tab=waitlist");
}

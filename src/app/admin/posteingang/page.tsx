import { redirect } from "next/navigation";

/** Only a redirect – nothing to prerender for instant navigation. */
export const instant = false;

/** Der Posteingang heißt jetzt Aufgaben. */
export default function Page() {
  redirect("/admin/aufgaben");
}

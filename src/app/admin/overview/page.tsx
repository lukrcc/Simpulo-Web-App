import { redirect } from "next/navigation";

/** Only a redirect – nothing to prerender for instant navigation. */
export const instant = false;

/** The Overview is part of the Cockpit now. */
export default function Page() {
  redirect("/admin");
}

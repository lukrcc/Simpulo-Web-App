import { redirect } from "next/navigation";

/** Only a redirect – nothing to prerender for instant navigation. */
export const instant = false;

/** The old Algorithm tab is part of Data & Algorithm now. */
export default function Page() {
  redirect("/admin/data");
}

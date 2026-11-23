import { redirect } from "next/navigation";

/** Market Cap lives in Finanzierung › Bewertung now (CLAUDE.md "Jede Kachel → eine Kapsel"): the old address leads there. */
export default function Page() {
  redirect("/admin/funding?tab=valuation");
}

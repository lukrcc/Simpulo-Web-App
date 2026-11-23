import { redirect } from "next/navigation";

/** Market Cap is a capsule of Finanzierung now (CLAUDE.md "Jede Kachel → eine Kapsel"): the old address leads there. */
export default function Page() {
  redirect("/admin/funding?tab=marketcap");
}

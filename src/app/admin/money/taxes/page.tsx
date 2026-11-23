import { redirect } from "next/navigation";

/** Geld › Steuern is a topic of Geld now (CLAUDE.md "Acht Karten"): the old address leads there. */
export default function Page() {
  redirect("/admin/money?topic=taxes&tab=taxes");
}

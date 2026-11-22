"use client";

// "x offene Aufgaben → Aufgaben" (CLAUDE.md "Handeln nur über Aufgaben"): Houses and Hosts show no pressure of their own any more – only
// this one quiet line when Aufgaben holds something of theirs; the link opens Aufgaben on that tab. Nothing when there is nothing.
import Link from "next/link";
import { useTranslations } from "next-intl";
import { taskArea, type TaskArea } from "@/lib/admin/tasks";
import { useAdminTasks } from "@/lib/admin/useAdminTasks";

export function OpenTasksHint({ area }: { area: TaskArea }) {
  const t = useTranslations("admin.inbox");
  const count = useAdminTasks().filter((task) => taskArea(task) === area).length;
  if (count === 0) return null;
  return (
    <p data-open-tasks-hint className="mb-(--adm-inner) text-small text-muted">
      <Link href={`/admin/aufgaben?tab=${area}`} className="font-semibold text-ink hover:underline">
        {t("openHint", { count })} →
      </Link>
    </p>
  );
}

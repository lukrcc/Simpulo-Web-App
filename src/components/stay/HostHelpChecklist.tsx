"use client";

// Manage › "Tips from Simpulo": what Admin › Houses › Host helfen suggested for this House (Stay.hostHelp, from the comparison with similar
// full Houses – lib/houseHelp.ts), as a short checklist the host ticks off. Only the host sees it; nothing shows without tips.
import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/Checkbox";
import { useStore } from "@/lib/store";
import type { Stay } from "@/lib/types";

export function HostHelpChecklist({ stay }: { stay: Stay }) {
  const t = useTranslations("houseHelp.checklist");
  const store = useStore();
  const help = stay.hostHelp;
  if (!help || help.items.length === 0 || stay.hostId !== store.currentUserId) return null;
  return (
    <section data-host-help aria-labelledby="host-help" className="flex flex-col gap-2">
      <h2 id="host-help" className="text-subhead text-ink">
        {t("title")}
      </h2>
      <p className="text-small text-muted">{t("intro")}</p>
      <ul className="flex flex-col divide-y divide-ink/8 border-y border-ink/8">
        {help.items.map((item) => {
          const done = help.done.includes(item);
          return (
            <li key={item}>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 py-2 text-body text-ink">
                <Checkbox checked={done} onChange={() => store.toggleHostHelp(stay.id, item)} />
                <span className={done ? "text-muted line-through" : undefined}>{t(`items.${item}`)}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

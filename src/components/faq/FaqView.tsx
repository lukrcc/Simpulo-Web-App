"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, useSyncExternalStore } from "react";
import { TabBar } from "@/components/ui/TabBar";
import { CONTACT_EMAIL } from "@/config/contact";
import { FAQ, roleOfAnchor, type FaqRole } from "@/config/faq";
import type en from "@/lib/i18n/en";

/** A FAQ text key: "<id>.question" · "<id>.answer" · "<id>.link". */
type FaqKey = { [Id in keyof (typeof en)["faq"]["items"]]: `${Id & string}.${keyof (typeof en)["faq"]["items"][Id] & string}` }[keyof (typeof en)["faq"]["items"]];

const noSubscribe = () => () => {};

/**
 * /faq – a plain text page: "Joining · Hosting" (?role=host picks Hosting, read after hydration), the questions as an accordion with thin
 * lines between them, at most 720px wide, and "Still unsure? Write us →" at the end. Every question has its anchor; /faq#cancellation
 * picks its side, opens it and scrolls there.
 */
export function FaqView() {
  const t = useTranslations("faq");
  const tItems = useTranslations("faq.items");
  const params = useSearchParams();
  const router = useRouter();
  const hydrated = useSyncExternalStore(noSubscribe, () => true, () => false);
  const [picked, setPicked] = useState<FaqRole | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const role: FaqRole = picked ?? (hydrated && params.get("role") === "host" ? "host" : "join");

  // A question's anchor: its side, open, in view – on arrival and when the hash changes.
  useEffect(() => {
    const go = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const side = id ? roleOfAnchor(id) : null;
      if (!side) return;
      setPicked(side);
      setOpenId(id);
      requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
    };
    go();
    window.addEventListener("hashchange", go);
    return () => window.removeEventListener("hashchange", go);
  }, []);

  function choose(next: FaqRole) {
    setPicked(next);
    router.replace(next === "host" ? "/faq?role=host" : "/faq", { scroll: false });
  }

  return (
    <div className="max-w-[720px]">
      <h1 className="text-h1 text-ink">{t("title")}</h1>
      <TabBar
          label={t("roleLabel")}
          className="mt-6"
          value={role}
          onChange={choose}
          options={[
            { value: "join", label: t("joining") },
            { value: "host", label: t("hosting") },
          ]}
        />
      <div className="mt-8">
        {FAQ[role].map((item) => (
          <details
            key={item.id}
            id={item.id}
            open={openId === item.id || undefined}
            onToggle={(e) => {
              if ((e.currentTarget as HTMLDetailsElement).open) setOpenId(item.id);
              else if (openId === item.id) setOpenId(null);
            }}
            className="group scroll-mt-[calc(var(--header-total)+24px)] border-b border-ink/10 first:border-t"
          >
            <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 text-body font-semibold text-ink [&::-webkit-details-marker]:hidden">
              {tItems(`${item.id}.question` as FaqKey)}
              <ChevronDown className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="max-w-[640px] pb-5 text-body text-muted">
              <p>{tItems(`${item.id}.answer` as FaqKey, item.values)}</p>
              {item.link && (
                <Link href={item.link.href} className="mt-2 inline-block font-semibold text-ink underline-offset-4 hover:underline">
                  {tItems(`${item.id}.link` as FaqKey)}
                </Link>
              )}
            </div>
          </details>
        ))}
      </div>
      <a href={`mailto:${CONTACT_EMAIL}`} className="mt-10 inline-block text-body font-semibold text-ink underline-offset-4 hover:underline">
        {t("contact")}
      </a>
    </div>
  );
}

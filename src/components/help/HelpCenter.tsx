"use client";

// The help center (/help – CLAUDE.md "Hilfe-Center"): "Help center", a search on top, the topics Joining · Hosting · Payments & refunds ·
// Safety · Your account (?cat=…, a TabBar), each with its questions as an accordion (thin lines between them, answers at most 640px) – the
// questions and numbers from config/help.ts, the words from faq.items. A search looks through every topic. An anchor (/help#cancellation)
// opens its topic and question and scrolls to it. At the end "Still stuck? Get help" (the Get help sheet) and "Share an idea".
import { Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/ActionButton";
import { TabBar } from "@/components/ui/TabBar";
import { COMPANY } from "@/config/company";
import { CATEGORY_OF_ROLE, HELP, HELP_CATEGORIES, categoryOf, type HelpCategory, type HelpItem } from "@/config/help";
import { openGetHelp, openShareIdea } from "@/lib/support/feedback";

type FaqKey = "payment.question";

function Item({ item, open, onToggle }: { item: HelpItem; open: boolean; onToggle: (open: boolean) => void }) {
  const t = useTranslations("faq.items");
  return (
    <li id={item.id} className="scroll-mt-[calc(var(--header-total)+24px)] border-b border-ink/10">
      <details open={open} onToggle={(e) => onToggle((e.currentTarget as HTMLDetailsElement).open)} className="group py-4">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-body-lg font-semibold text-ink">
          {t(`${item.id}.question` as FaqKey)}
          <span aria-hidden className="text-muted transition-transform group-open:rotate-45">
            +
          </span>
        </summary>
        <p className="mt-2 max-w-[640px] text-body text-muted">{t(`${item.id}.answer` as FaqKey, item.values)}</p>
        {item.link && (
          <Link href={item.link.href} className="mt-2 inline-block text-body font-semibold text-ink underline-offset-4 hover:underline">
            {t(`${item.id}.link` as FaqKey)}
          </Link>
        )}
      </details>
    </li>
  );
}

export function HelpCenter() {
  const t = useTranslations("helpCenter");
  const tItems = useTranslations("faq.items");
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const asked = params.get("cat");
  const role = params.get("role");
  const fromUrl: HelpCategory = (HELP_CATEGORIES as readonly string[]).includes(asked ?? "") ? (asked as HelpCategory) : role && CATEGORY_OF_ROLE[role] ? CATEGORY_OF_ROLE[role] : "joining";
  const [category, setCategory] = useState<HelpCategory>(fromUrl);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  // An anchor (/help#cancellation): its topic, the question open, scrolled into view – on arrival and when the hash changes.
  useEffect(() => {
    const go = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const cat = id ? categoryOf(id) : null;
      if (!cat) return;
      setCategory(cat);
      setQuery("");
      setOpenId(id);
      requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
    };
    go();
    window.addEventListener("hashchange", go);
    return () => window.removeEventListener("hashchange", go);
  }, []);

  const q = query.trim().toLowerCase();
  const found = useMemo(() => {
    if (!q) return null;
    return HELP_CATEGORIES.flatMap((c) => HELP[c]).filter((item) => `${tItems(`${item.id}.question` as FaqKey)} ${tItems(`${item.id}.answer` as FaqKey, item.values)}`.toLowerCase().includes(q));
  }, [q, tItems]);
  const pick = (next: HelpCategory) => {
    setCategory(next);
    setOpenId(null);
    const sp = new URLSearchParams(params.toString());
    sp.set("cat", next);
    sp.delete("role");
    router.replace(`${pathname}?${sp}`, { scroll: false });
  };
  const list = found ?? HELP[category];

  return (
    <div data-help-center className="mx-auto w-full max-w-[720px] py-(--space-inner)">
      <h1 className="text-h1 text-ink">{t("title")}</h1>
      <p className="mt-2 text-body-lg text-muted">{t("intro")}</p>
      {/* The search: through every topic at once. */}
      <label className="relative mt-6 flex items-center">
        <span className="sr-only">{t("searchLabel")}</span>
        <Search aria-hidden className="pointer-events-none absolute left-4 size-4 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="h-12 w-full rounded-full border border-(--input-border) bg-transparent pr-12 pl-11 text-body text-ink placeholder:text-(--text-faint) focus:border-ink/40 focus:outline-none"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label={t("clear")} className="absolute right-2 flex size-9 items-center justify-center rounded-full text-muted hover:bg-ink/5 hover:text-ink">
            <X aria-hidden className="size-4" />
          </button>
        )}
      </label>
      {found ? (
        <p role="status" className="mt-6 text-small text-muted">
          {t("results", { count: found.length, query: query.trim() })}
        </p>
      ) : (
        <TabBar className="mt-6" label={t("categoriesLabel")} value={category} onChange={pick} options={HELP_CATEGORIES.map((c) => ({ value: c, label: t(`categories.${c}`) }))} />
      )}
      <ul className="mt-4 border-t border-ink/10">
        {list.map((item) => (
          <Item key={item.id} item={item} open={openId === item.id || Boolean(found && found.length <= 3)} onToggle={(open) => (open ? setOpenId(item.id) : openId === item.id && setOpenId(null))} />
        ))}
      </ul>
      {/* Still stuck: the Get help sheet (with the page as context), and Share an idea. */}
      <section aria-labelledby="help-stuck" className="mt-(--space-section) flex flex-col items-start gap-3">
        <h2 id="help-stuck" className="text-h2 text-ink">
          {t("stuckTitle")}
        </h2>
        <p className="text-body text-muted">{t("stuckText")}</p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => openGetHelp()}>{t("getHelp")}</Button>
          <Button variant="secondary" onClick={() => openShareIdea()}>
            {t("shareIdea")}
          </Button>
        </div>
        {/* The contact point for authorities and users (config/company.ts) – only once it's set; until then the gap shows on /impressum. */}
        {COMPANY.contactPoint && (
          <p data-contact-point className="text-small text-muted">
            {t.rich("contactPoint", { email: COMPANY.contactPoint, mail: (c) => <a href={`mailto:${COMPANY.contactPoint}`} className="font-semibold text-ink underline underline-offset-4">{c}</a> })}
          </p>
        )}
        <Link href="/report-content" className="text-small font-semibold text-ink underline-offset-4 hover:underline">
          {t("reportContent")} →
        </Link>
      </section>
    </div>
  );
}

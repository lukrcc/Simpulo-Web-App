"use client";

// The admin's search in the header (CLAUDE.md "Admin-Suche ⌘K"): instead of "Where to next?" a field "Suchen … ⌘K". It finds hosts, Houses,
// tasks and people (the same data as the admin's pages – mock data in dev and demo) and lists them as an overlay under the bar in the header's
// glass (.bar-menu); ↑ ↓ choose, Enter opens the element, Esc closes. ⌘K (Ctrl+K) opens it anywhere in the admin. Rendered by AdminFrame into the
// header's slot (lib/headerSlot.ts) – inside the admin's German provider.
import { House, ListTodo, Search, UserRound, Users, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useIsAdmin } from "@/lib/admin/access";
import { hostOverview } from "@/lib/admin/metrics";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { useAdminTasks } from "@/lib/admin/useAdminTasks";
import { day } from "@/lib/i18n/adminFormat";
import { useAdminHeaderSlot } from "@/lib/headerSlot";
import { profileHref } from "@/lib/privacy";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useSentence } from "./AdminInbox";

type Group = "tasks" | "houses" | "hosts" | "users";
type Hit = { id: string; group: Group; title: string; meta: string; href: string };
const ICONS: Record<Group, LucideIcon> = { tasks: ListTodo, houses: House, hosts: Users, users: UserRound };
/** Per group at most this many hits; with an empty query the overlay shows only a hint. */
const PER_GROUP = 5;

export function AdminCommandSearch() {
  const slot = useAdminHeaderSlot();
  const isAdmin = useIsAdmin();
  const t = useTranslations("admin.search");
  const router = useRouter();
  const store = useStore();
  const inputs = useAdminInputs();
  const tasks = useAdminTasks();
  const sentence = useSentence();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const listId = useId();

  // ⌘K / Ctrl+K anywhere in the admin: open (or close again).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((now) => !now);
      }
    };
    if (!isAdmin) return;
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isAdmin]);
  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const has = (...values: (string | undefined | null)[]) => values.some((v) => v?.toLowerCase().includes(q));
    const hosts = hostOverview(inputs);
    const hostIds = new Set(hosts.map((h) => h.user.id));
    const list: Hit[] = [
      ...tasks
        .map((task) => ({ task, text: sentence(task) }))
        .filter(({ text }) => has(text))
        .slice(0, PER_GROUP)
        .map(({ task, text }) => ({ id: task.id, group: "tasks" as const, title: text, meta: day(task.createdAt), href: `/admin/aufgaben?task=${encodeURIComponent(task.id)}` })),
      ...store.stays
        .filter((s) => !s.isExample && s.status !== "draft" && has(s.title, s.shortName, s.location?.city, s.city))
        .slice(0, PER_GROUP)
        .map((s) => ({ id: s.id, group: "houses" as const, title: s.title, meta: [s.location?.city ?? s.city, day(s.startDate)].join(" · "), href: `/admin/houses?house=${encodeURIComponent(s.id)}` })),
      ...hosts
        .filter((h) => has(h.user.name, ...h.hubs))
        .slice(0, PER_GROUP)
        .map((h) => ({ id: h.user.id, group: "hosts" as const, title: h.user.name, meta: h.hubs.join(", "), href: `/admin/hosts?host=${encodeURIComponent(h.user.id)}` })),
      ...store.users
        .filter((u) => !hostIds.has(u.id) && has(u.name, u.email, u.country))
        .slice(0, PER_GROUP)
        .map((u) => ({ id: u.id, group: "users" as const, title: u.name, meta: u.country ?? "", href: profileHref(u.id) })),
    ];
    return list;
  }, [query, inputs, tasks, sentence, store.stays, store.users]);

  const close = () => {
    setOpen(false);
    setQuery("");
    setIndex(0);
    trigger.current?.focus();
  };
  const go = (hit: Hit | undefined) => {
    if (!hit) return;
    setOpen(false);
    setQuery("");
    setIndex(0);
    // A person's profile opens in a new tab (outside the admin); everything else in the admin.
    if (hit.group === "users") window.open(hit.href, "_blank", "noopener");
    else router.push(hit.href);
  };
  const chosen = Math.min(index, Math.max(0, hits.length - 1));

  const field = (
    <button
      ref={trigger}
      type="button"
      data-search
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={t("label")}
      onClick={() => setOpen(true)}
      className="bar-capsule press inline-flex h-9 w-full max-w-90 items-center gap-2 rounded-full px-4 text-nav-main transition-colors duration-150"
    >
      <Search aria-hidden />
      <span className="min-w-0 flex-1 truncate text-left text-(--hdr-muted)">{t("trigger")}</span>
      <kbd className="shrink-0 rounded-md bg-(--header-pill) px-1.5 font-sans text-small text-(--hdr-muted)">{t("shortcut")}</kbd>
    </button>
  );

  const overlay = open
    ? createPortal(
        <div className="fixed inset-0 z-50" onPointerDown={(e) => e.target === e.currentTarget && close()}>
          <div
            role="dialog"
            aria-label={t("label")}
            className="bar-menu absolute inset-x-0 top-[calc(var(--header-total)+8px)] mx-auto w-[min(560px,calc(100vw-32px))]"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                close();
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndex((i) => Math.min(hits.length - 1, i + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndex((i) => Math.max(0, i - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                go(hits[chosen]);
              }
            }}
          >
            <div className="flex items-center gap-2 px-1">
              <Search aria-hidden className="size-4 shrink-0 text-muted" />
              <input
                ref={input}
                value={query}
                onChange={(e) => (setQuery(e.target.value), setIndex(0))}
                placeholder={t("placeholder")}
                aria-label={t("label")}
                role="combobox"
                aria-expanded={hits.length > 0}
                aria-controls={listId}
                aria-activedescendant={hits[chosen] ? `${listId}-${chosen}` : undefined}
                className="h-11 min-w-0 flex-1 rounded-xl px-3 text-body text-ink outline-none"
              />
            </div>
            <div className="mt-2 max-h-[min(60vh,480px)] overflow-y-auto overscroll-contain">
              {!query.trim() ? (
                <p className="px-3 py-2 text-small text-muted">{t("start")}</p>
              ) : hits.length === 0 ? (
                <p className="px-3 py-2 text-small text-muted">{t("empty")}</p>
              ) : (
                <ul id={listId} role="listbox" aria-label={t("label")}>
                  {hits.map((hit, i) => {
                    const Icon = ICONS[hit.group];
                    const first = i === 0 || hits[i - 1].group !== hit.group;
                    return (
                      <li key={`${hit.group}-${hit.id}`} role="presentation">
                        {first && <p className="px-3 pb-1 pt-3 text-eyebrow uppercase text-muted first:pt-1">{t(`groups.${hit.group}`)}</p>}
                        <button
                          type="button"
                          id={`${listId}-${i}`}
                          role="option"
                          aria-selected={i === chosen}
                          onMouseEnter={() => setIndex(i)}
                          onClick={() => go(hit)}
                          className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors duration-100", i === chosen && "bg-(--header-pill-hover)")}
                        >
                          <Icon aria-hidden className="size-4 shrink-0 text-muted" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-body text-ink">{hit.title}</span>
                            {hit.meta && <span className="block truncate text-small text-muted">{hit.meta}</span>}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <p className="mt-2 border-t border-(--line) px-3 pt-2 text-small text-muted">{t("hint")}</p>
          </div>
        </div>,
        document.body,
      )
    : null;

  // Only for admins (everyone else gets the 404 – no search over it).
  if (!isAdmin) return null;
  return (
    <>
      {slot && createPortal(field, slot)}
      {overlay}
    </>
  );
}

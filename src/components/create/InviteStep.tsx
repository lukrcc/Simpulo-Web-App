"use client";

import { Check, Link2, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Img } from "@/components/ui/Img";
import { Input } from "@/components/ui/Input";
import { listItemStyles } from "@/components/ui/listSelection";
import { shortNameOf } from "@/lib/shortName";
import { cn, firstName } from "@/lib/utils";
import type { PersonOfYours } from "@/lib/yourPeople";
import type { FormState } from "./model";

/** Tiles shown before searching when the House isn't a repeat: the most recent people. */
const RECENT_TILES = 6;

/**
 * "Invite your crew" (Do it again) / "Invite your people" – optional, before the review. Checkbox tiles with a photo: the old crew chosen
 * already (Do it again), otherwise the most recent people; under them "Add from Your people" (search) and "Invite by link". Each invite
 * holds a spot for 48h once the House opens; never more than the spots besides the host's.
 */
export function InviteStep({ form, patch, people, againCrewIds }: { form: FormState; patch: (p: Partial<FormState>) => void; people: PersonOfYours[]; /** Do it again: the old crew (minus the host) */ againCrewIds: string[] }) {
  const t = useTranslations("create.invite");
  const [query, setQuery] = useState("");
  const max = Math.max(0, form.spotsTotal - 1);
  const chosen = new Set(form.inviteIds);
  const used = form.inviteIds.length + (form.inviteLink ? 1 : 0);
  const full = used >= max;
  const byId = new Map(people.map((p) => [p.user.id, p]));
  // The tiles: the old crew (or the most recent people), then whoever was added from the search – in that order, no one twice.
  const base = againCrewIds.length > 0 ? againCrewIds : people.slice(0, RECENT_TILES).map((p) => p.user.id);
  const tileIds = [...new Set([...base, ...form.inviteIds])].filter((id) => byId.has(id));
  const toggle = (id: string) => {
    if (chosen.has(id)) patch({ inviteIds: form.inviteIds.filter((x) => x !== id) });
    else if (!full) patch({ inviteIds: [...form.inviteIds, id] });
  };
  const needle = query.trim().toLowerCase();
  const results = needle ? people.filter((p) => !tileIds.includes(p.user.id) && (p.user.name.toLowerCase().includes(needle) || shortNameOf(p.house).toLowerCase().includes(needle))).slice(0, 6) : [];

  return (
    <div className="space-y-8">
      <p className="text-body text-muted">{t("count", { count: used, max })}</p>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-4">
        {tileIds.map((id) => {
          const person = byId.get(id)!;
          const on = chosen.has(id);
          return (
            <li key={id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                disabled={!on && full}
                onClick={() => toggle(id)}
                className="group w-full text-left transition-opacity duration-150 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none"
              >
                <span className={cn("relative block aspect-square overflow-hidden rounded-2xl bg-ink/6 transition-shadow duration-150 group-focus-visible:ring-2 group-focus-visible:ring-(--focus-ring)", on && "ring-2 ring-ink ring-offset-2 ring-offset-(--bg)")}>
                  {person.user.photos[0] && <Img src={person.user.photos[0]} alt="" fill sizes="160px" className="object-cover" />}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute right-2.5 top-2.5 flex size-6 items-center justify-center rounded-full border-2 transition-colors duration-150",
                      on ? "border-ink bg-ink text-white" : "border-white bg-black/18 text-transparent",
                    )}
                  >
                    <Check className="size-3.5 motion-safe:transition-transform motion-safe:duration-200" strokeWidth={3} />
                  </span>
                </span>
                <span className="mt-2 block truncate text-body font-semibold text-ink">{firstName(person.user)}</span>
                <span className="block truncate text-small text-muted">{t("livedIn", { place: shortNameOf(person.house) })}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {people.length > tileIds.length && (
        <section>
          <h2 className="mb-3 text-eyebrow uppercase text-ink/55">{t("addFrom")}</h2>
          <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search")} aria-label={t("search")} className="pl-11" />
          </div>
          {needle && (
            <ul className="mt-2 space-y-1">
              {results.length === 0 && <li className="px-3 py-2 text-small text-muted">{t("noMatch")}</li>}
              {results.map((p) => (
                <li key={p.user.id}>
                  <button
                    type="button"
                    disabled={full}
                    onClick={() => {
                      toggle(p.user.id);
                      setQuery("");
                    }}
                    className={listItemStyles(false, "flex w-full items-center gap-3 px-3 py-2 text-left disabled:cursor-not-allowed disabled:opacity-45")}
                  >
                    <Avatar user={p.user} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body font-semibold text-ink">{firstName(p.user)}</span>
                      <span className="block truncate text-small text-muted">{t("livedIn", { place: shortNameOf(p.house) })}</span>
                    </span>
                    <span className="text-small font-semibold text-ink">{t("add")}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <button
        type="button"
        role="checkbox"
        aria-checked={form.inviteLink}
        disabled={!form.inviteLink && full}
        onClick={() => patch({ inviteLink: !form.inviteLink })}
        className={listItemStyles(form.inviteLink, "flex w-full items-center gap-3 px-4 py-3 text-left disabled:cursor-not-allowed disabled:opacity-45")}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink/6 text-ink">
          <Link2 aria-hidden className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-body font-semibold text-ink">{t("byLink")}</span>
          <span className="block text-small text-muted">{t("byLinkHint")}</span>
        </span>
        <span aria-hidden className={cn("flex size-6 items-center justify-center rounded-full border-2", form.inviteLink ? "border-ink bg-ink text-white" : "border-ink/20 text-transparent")}>
          <Check className="size-3.5" strokeWidth={3} />
        </span>
      </button>
    </div>
  );
}

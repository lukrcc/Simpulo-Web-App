"use client";

// The arc after the House (CLAUDE.md "Bogen › Danach"): a week later "Do it again" (only with a mutual choice – open the next House
// together, a guest becomes a host; three new Houses like it), 30 days later the private question (what you still do since, still in touch –
// a signal; a story only with consent, with a preview), and what past crews left for everyone on a host's House pages and profile: ratings
// as averages from PUBLIC_RATINGS_MIN on, public tips, shared stories. Never one person rated.
import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { Button, buttonStyles } from "@/components/ui/ActionButton";
import { CapsuleGroup } from "@/components/ui/CapsuleGroup";
import { Checkbox } from "@/components/ui/Checkbox";
import { Img } from "@/components/ui/Img";
import { Textarea } from "@/components/ui/Input";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { againHref } from "@/components/create/model";
import { AFTER_MIN_ANSWERS, AFTER_RATINGS, PUBLIC_RATINGS_MIN } from "@/config/arc";
import { track } from "@/lib/analytics";
import { mutualChoices, nextHousesLike, useArcClock, useArcNow } from "@/lib/arc";
import { useFormat } from "@/i18n/format";
import { hostRatings, pastCrewsOf } from "@/lib/pastCrews";
import { placeShortOf, shortNameOf } from "@/lib/shortName";
import { findUser, settingsOf, useStore } from "@/lib/store";
import type { Stay } from "@/lib/types";
import { housePhotos } from "@/lib/utils";

const first = (name?: string) => name?.split(" ")[0] ?? "";

// ── Do it again (+7) ──────────────────────────────────────────────────────────────────────────────────────────────────────────

/** "Open the next one together" (Open a House with the theme, the mutual ones invited) and three new Houses like it. */
export function DoItAgainPanel({ stay, compact = false }: { stay: Stay; compact?: boolean }) {
  const t = useTranslations("house.afterwards");
  const store = useStore();
  const f = useFormat();
  const now = useArcNow(stay);
  const mutual = mutualChoices(store, stay, store.currentUserId);
  const next = nextHousesLike(store, stay, now, store.currentUserId);
  const names = new Intl.ListFormat("en", { type: "conjunction" }).format(mutual.map((u) => first(u.name)));
  return (
    <div className="flex flex-col gap-4">
      {mutual.length > 0 && <p className="text-body text-ink">{t("againText", { names })}</p>}
      <div>
        <Link href={againHref(stay.id, mutual.map((u) => u.id))} onClick={() => track("arc_action_done", { house: stay.id, step: "doItAgain", together: true })} className={buttonStyles("primary", "sm")}>
          <RotateCcw aria-hidden />
          {t("openTogether")}
        </Link>
      </div>
      {next.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-small text-muted">{t("nextHouses")}</p>
          <ul className="flex flex-col gap-2">
            {next.map((s) => (
              <li key={s.id}>
                <Link href={`/house/${s.slug}`} className="flex items-center gap-3 rounded-xl hover:bg-ink/4">
                  <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-ink/6">
                    <Img src={housePhotos(s, findUser(store, s.hostId))[0]} alt="" fill sizes="48px" className="object-cover" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-body font-semibold text-ink">{s.title}</span>
                    <span className="block truncate text-small text-muted">
                      {f.stayDates(s)} · {placeShortOf(s)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {!compact && (
            <Link href={`/explore?category=${stay.vibe}`} className="text-small font-semibold text-ink underline-offset-4 hover:underline">
              {t("moreLike")} →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// ── 30 days later ─────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** How a shared story looks on the host's House pages and profile – the same block as there (the preview before consenting). */
function StoryQuote({ text, name, house }: { text: string; name: string; house: string }) {
  return (
    <figure className="flex flex-col gap-1">
      <blockquote className="text-body-lg text-ink">“{text}”</blockquote>
      <figcaption className="text-small text-muted">
        {name} · {house}
      </figcaption>
    </figure>
  );
}

/** 30 days after: what you still do since the House, still in touch (yes/no); private – "Share as a story" with a preview. */
export function ThirtyDaysForm({ stay }: { stay: Stay }) {
  const t = useTranslations("house.afterwards");
  const store = useStore();
  const showToast = useToast();
  const me = store.users.find((u) => u.id === store.currentUserId);
  const saved = settingsOf(me).thirty?.[stay.id];
  const [still, setStill] = useState(saved?.still ?? "");
  const [inTouch, setInTouch] = useState<boolean | undefined>(saved?.inTouch);
  const [story, setStory] = useState(Boolean(saved?.story));
  const [editing, setEditing] = useState(!saved);
  const host = first(findUser(store, stay.hostId)?.name);
  const isHost = stay.hostId === store.currentUserId;
  if (!editing && saved) {
    return (
      <div className="flex flex-col gap-2">
        {saved.still && <p className="text-body text-ink">“{saved.still}”</p>}
        <p className="text-small text-muted">{saved.story ? t("storyShared", { host }) : t("privateHint")}</p>
        <div>
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
            {t("edit")}
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <label className="flex flex-col gap-1.5">
        <span className="text-body font-semibold text-ink">{t("stillQ")}</span>
        <Textarea value={still} onChange={(e) => setStill(e.target.value)} rows={2} maxLength={200} />
      </label>
      <div className="flex flex-col gap-2">
        <p className="text-body font-semibold text-ink">{t("inTouchQ")}</p>
        <CapsuleGroup
          size="sm"
          label={t("inTouchQ")}
          value={inTouch === undefined ? null : inTouch ? "yes" : "no"}
          onChange={(v) => setInTouch(v === "yes")}
          className="w-fit"
          options={[
            { value: "yes" as const, content: t("yes") },
            { value: "no" as const, content: t("no") },
          ]}
        />
      </div>
      <p className="text-small text-muted">{t("privateHint")}</p>
      {/* A host's own House isn't their story to tell on it. */}
      {!isHost && (
        <div className="flex flex-col gap-3">
          <label className="flex min-h-11 cursor-pointer items-center gap-3">
            <Checkbox checked={story} disabled={!still.trim()} onChange={(e) => setStory(e.target.checked)} />
            <span className="text-body text-ink">{t("shareStory")}</span>
          </label>
          {story && still.trim() && (
            <div className="rounded-[20px] border border-dashed border-ink/15 p-4">
              <p className="mb-2 text-eyebrow uppercase text-(--text-faint)">{t("preview", { host })}</p>
              <StoryQuote text={still.trim()} name={first(me?.name)} house={shortNameOf(stay)} />
            </div>
          )}
        </div>
      )}
      <div>
        <Button
          size="sm"
          disabled={!still.trim() && inTouch === undefined}
          onClick={() => {
            store.setThirty(stay.id, { still, inTouch, story: !isHost && story });
            store.setArcStep(stay.id, "thirtyDays", "done");
            // Signals only: in touch yes/no, wrote something, shared a story – never the words.
            track("arc_action_done", { house: stay.id, step: "thirtyDays", inTouch: inTouch ?? null, wrote: Boolean(still.trim()), story: !isHost && story && Boolean(still.trim()) });
            setEditing(false);
            showToast(t("saved"));
          }}
        >
          {t("save")}
        </Button>
      </div>
    </div>
  );
}

// ── What past crews left (public) ─────────────────────────────────────────────────────────────────────────────────────────────

function Averages({ averages, count }: { averages: Record<(typeof AFTER_RATINGS)[number], number | null>; count: number }) {
  const t = useTranslations("house.afterwards");
  const tr = useTranslations("house.goodbye.ratings");
  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
        {AFTER_RATINGS.map((r) =>
          averages[r] !== null ? (
            <div key={r}>
              <dt className="text-small text-muted">{tr(r)}</dt>
              <dd className="text-h3 tabular-nums text-ink">{averages[r]!.toFixed(1)}</dd>
            </div>
          ) : null,
        )}
      </dl>
      <p className="text-small text-muted">{t("ratingsCount", { count })}</p>
    </div>
  );
}

function PastCrewsBody({ hostId }: { hostId: string }) {
  const t = useTranslations("house.afterwards");
  const store = useStore();
  const format = useFormatter();
  const clock = useArcClock();
  const past = pastCrewsOf(store, hostId, clock);
  const month = (s: Stay) => format.dateTime(new Date(`${s.startDate.slice(0, 7)}-01T00:00:00Z`), { month: "long", year: "numeric", timeZone: "UTC" });
  return (
    <div className="flex flex-col gap-10">
      {past.averages ? <Averages averages={past.averages} count={past.count} /> : <p className="text-body text-muted">{t("ratingsWait", { min: PUBLIC_RATINGS_MIN })}</p>}
      {past.tips.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-h3 text-ink">{t("tipsTitle")}</h3>
          <ul className="flex flex-col gap-4">
            {past.tips.map((tip, i) => (
              <li key={`${tip.house.id}-${i}`}>
                <figure className="flex flex-col gap-1">
                  <blockquote className="text-body-lg text-ink">“{tip.text}”</blockquote>
                  <figcaption className="text-small text-muted">{t("tipFrom", { house: shortNameOf(tip.house), month: month(tip.house) })}</figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </div>
      )}
      {past.stories.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-h3 text-ink">{t("storiesTitle")}</h3>
          <ul className="flex flex-col gap-4">
            {past.stories.map((s) => (
              <li key={`${s.house.id}-${s.user.id}`}>
                {/* Exactly what the preview showed when it was shared: the words, the first name, the House – no photo. */}
                <StoryQuote text={s.text} name={first(s.user.name)} house={shortNameOf(s.house)} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** The House page: "From past crews" of this host's Houses – nothing when there's nothing yet. */
export function PastCrews({ stay }: { stay: Stay }) {
  const t = useTranslations("house.afterwards");
  const store = useStore();
  const clock = useArcClock();
  if (stay.isExample || !pastCrewsOf(store, stay.hostId, clock).any) return null;
  return (
    <section id="house-past-crews" aria-labelledby="past-crews-title" className="flex max-w-[960px] flex-col gap-6">
      <div>
        <h2 id="past-crews-title" className="text-subhead text-ink">
          {t("pastTitle")}
        </h2>
        <p className="mt-1 text-body text-muted">{t("pastSub", { host: first(findUser(store, stay.hostId)?.name) })}</p>
      </div>
      <PastCrewsBody hostId={stay.hostId} />
    </section>
  );
}

/** The host's profile: one line "Past crews · 4.3 overall · 12 ratings →" – the rest in a sheet. Nothing when there's nothing yet. */
export function PastCrewsLine({ hostId }: { hostId: string }) {
  const t = useTranslations("house.afterwards");
  const store = useStore();
  const clock = useArcClock();
  const [open, setOpen] = useState(false);
  const past = pastCrewsOf(store, hostId, clock);
  if (!past.any) return null;
  const host = first(findUser(store, hostId)?.name);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="mt-2 self-start text-body text-ink underline-offset-4 hover:underline">
        {past.averages?.overall != null ? t("lineRated", { overall: past.averages.overall.toFixed(1), count: past.count }) : t("line")} →
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t("pastTitle")} subtitle={t("pastSub", { host })}>
        <PastCrewsBody hostId={hostId} />
      </Sheet>
    </>
  );
}

// ── For the host (Earnings) ───────────────────────────────────────────────────────────────────────────────────────────────────

/** Earnings › Your ratings: all the host's Houses – averages from AFTER_MIN_ANSWERS ratings, the sentences for them without names. */
export function HostRatingsSection() {
  const t = useTranslations("house.afterwards");
  const tg = useTranslations("house.goodbye");
  const store = useStore();
  const clock = useArcClock();
  if (!store.currentUserId) return null;
  const r = hostRatings(store, store.currentUserId, clock);
  return (
    <section aria-labelledby="host-ratings-title" className="flex flex-col gap-5">
      <h2 id="host-ratings-title" className="text-subhead text-ink">
        {t("hostTitle")}
      </h2>
      {r.count >= AFTER_MIN_ANSWERS ? <Averages averages={r.averages} count={r.count} /> : <p className="text-body text-muted">{tg("hostWait", { min: AFTER_MIN_ANSWERS })}</p>}
      <div>
        <p className="text-body font-semibold text-ink">{tg("hostNotes")}</p>
        {r.notes.length === 0 ? (
          <p className="mt-1 text-body text-muted">{tg("hostNotesNone")}</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {r.notes.map((n) => (
              <li key={n} className="text-body text-ink">
                “{n}”
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-small text-muted">{tg("hostAnon")}</p>
    </section>
  );
}

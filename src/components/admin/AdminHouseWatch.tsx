"use client";

// /admin/houses – the early warning as a to-do list (CLAUDE.md "Admin › Houses"): tabs Braucht Hilfe · Läuft gut · Alle; the most urgent House
// opens on its own; each House's reason in one sentence, the lever to pull first, the others, what was done (the log), "✓ Erledigt". Every
// action through lib/admin/actions.ts (logged); in the mock nothing is sent.
import { ProgressBar } from "./AdminCharts";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/ActionButton";
import { Img } from "@/components/ui/Img";
import { useToast } from "@/components/ui/Toast";
import { HOUSE_LEVERS, type HouseLever } from "@/config/admin";
import { HIGHLIGHT_POLICY } from "@/config/policies";
import { useFormat } from "@/i18n/format";
import { Textarea } from "@/components/ui/Input";
import { activeBoosts, actionOutcome, alternativeFor, exploreRank, hostComparison, isBoosted, nudgeAudience, type HostComparisonRow, type HouseAction } from "@/lib/houseHelp";
import { tEn } from "@/lib/i18n/translate";
import { catalogText } from "@/lib/notify";
import { useAdminActions } from "@/lib/admin/actions";
import { cockpit, fastestFull, hostOverview, needsHelp, needsHelpChange, type NeedsHelpRow, type RiskReason } from "@/lib/admin/metrics";
import { useAdminData } from "@/lib/admin/store";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { VIBES } from "@/lib/catalog";
import { day, eur, num, pct, share } from "@/lib/i18n/adminFormat";
import { convertApprox } from "@/lib/rates";
import { findUser, useStore } from "@/lib/store";
import type { AdminLogEntry, Currency, Stay } from "@/lib/types";
import { cn, housePhotos } from "@/lib/utils";
import { AdminListDetail, AdminSearch, AdminSort, AdminTabs, BackToList, DirectLink } from "./AdminLayout";
import { firebaseDocUrl } from "@/config/tools";
import { KeyNumbers } from "./AdminNumbers";
import { AdminShell } from "./AdminShell";

/** A date for the English messages to hosts: "8 Feb". */
const enDayFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const enDay = (iso: string) => enDayFormat.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
const enMoney = new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const enNumber = new Intl.NumberFormat("en-GB");

type Tab = "atRisk" | "goingWell" | "all";
type HouseSort = "urgency" | "start" | "fill" | "title";
const fillOf = (stay: Stay) => (stay.spotsTotal > 0 ? stay.spotsFilled / stay.spotsTotal : 0);

export function AdminHouseList() {
  const t = useTranslations("admin.houses");
  const tc = useTranslations("admin.cockpit");
  const inputs = useAdminInputs();
  const store = useStore();
  const f = useFormat();
  const help = needsHelp(inputs);
  const fastest = fastestFull(inputs);
  const all = store.stays.filter((s) => !s.isExample && s.status !== "draft" && s.status !== "draft_unclaimed");
  const [tab, setTab] = useState<Tab>("atRisk");
  const [sort, setSort] = useState<HouseSort>("urgency");
  const [query, setQuery] = useState("");
  // A link from the Posteingang opens one House (?house=…); otherwise the first (most urgent) House of the tab opens on its own.
  const [picked, setPicked] = useState<string | null>(() => (typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("house")));

  const reasonText = (r: RiskReason, stay: Stay) =>
    r.key === "deadline"
      ? t("reason.deadline", { days: r.days, missing: Math.max(0, stay.spotsTotal - stay.spotsFilled) })
      : r.key === "quiet"
        ? t("reason.quiet", { days: r.days })
        : t("reason.unanswered", { hours: r.hours });
  const q = query.trim().toLowerCase();
  type Row = { stay: Stay; help: NeedsHelpRow | null; fullIn: number | null };
  const base: Row[] =
    tab === "atRisk"
      ? help.map((h) => ({ stay: h.stay, help: h, fullIn: null }))
      : tab === "goingWell"
        ? fastest.map(({ stay, days }) => ({ stay, help: null, fullIn: days }))
        : all
            .filter((s) => !q || [s.title, findUser(store, s.hostId)?.name ?? "", s.city, s.region, s.location?.city ?? ""].some((v) => v.toLowerCase().includes(q)))
            .map((stay) => ({ stay, help: help.find((h) => h.stay.id === stay.id) ?? null, fullIn: fastest.find((x) => x.stay.id === stay.id)?.days ?? null }));
  // "Braucht Hilfe" keeps its urgency order unless another sort is chosen; the other tabs sort by start.
  const rows =
    sort === "urgency" && tab === "atRisk"
      ? base
      : base.toSorted((a, b) => (sort === "fill" ? fillOf(a.stay) - fillOf(b.stay) : sort === "title" ? a.stay.title.localeCompare(b.stay.title) : a.stay.startDate.localeCompare(b.stay.startDate)));
  const selected = rows.find((r) => r.stay.id === picked) ?? rows[0] ?? null;

  // The numbers on top: Braucht Hilfe (count, against the month before) · 2+ Vormerkungen (% of the coming Houses).
  const reserved = cockpit(inputs, "month").areas.find((a) => a.key === "demand")!.number;

  return (
    <AdminShell
      title={t("title")}
      tabs={
        <AdminTabs
          label={t("tabsLabel")}
          value={tab}
          onChange={(next) => (setTab(next), setPicked(null), setSort(next === "atRisk" ? "urgency" : "start"))}
          tabs={[
            { value: "atRisk", label: t("atRisk"), count: help.length, tooltip: t("info.atRisk") },
            { value: "goingWell", label: t("goingWell"), count: fastest.length },
            { value: "all", label: t("all"), count: all.length },
          ]}
        />
      }
      aside={
        <>
          <AdminSearch label={t("search")} value={query} onChange={setQuery} disabled={tab !== "all"} />
          <AdminSort label={t("sort.label")} value={sort} onChange={setSort} options={(["urgency", "start", "fill", "title"] as const).filter((v) => v !== "urgency" || tab === "atRisk").map((value) => ({ value, label: t(`sort.${value}`) }))} />
        </>
      }
    >
      <KeyNumbers
        className="mb-(--adm-section) md:grid-cols-2 lg:grid-cols-2 lg:max-w-160"
        items={[
          { key: "needsHelp", label: t("needsHelp"), info: t("needsHelpInfo"), value: num(help.length), change: needsHelpChange(inputs, help.length) },
          {
            key: "reservedShare",
            label: tc("metric.reservedShare"),
            info: tc("info.reservedShare"),
            value: reserved.value === null ? "–" : pct(reserved.value),
            change: reserved.change,
            target: { text: tc("target", { target: pct(reserved.target) }), status: reserved.status },
          },
        ]}
      />
      <AdminListDetail
        label={t("title")}
        rows={rows.slice(0, 60).map(({ stay, help: h, fullIn }) => {
          const host = findUser(store, stay.hostId);
          return {
            id: stay.id,
            status: h ? ("critical" as const) : undefined,
            media: <Img src={housePhotos(stay, host)[0]} alt="" width={36} height={36} className="size-9 rounded-lg object-cover" />,
            title: stay.title,
            meta: h ? reasonText(h.reasons[0], stay) : fullIn !== null ? t("fullIn", { days: fullIn }) : [host?.name, f.placeName(stay), f.stayDates(stay)].filter(Boolean).join(" · "),
            aside: (
              <span className="flex flex-col items-end gap-1">
                <span>{h ? `${t("left", { days: h.daysToStart })} · ${t("filled", { in: stay.spotsFilled, total: stay.spotsTotal })}` : f.stayDates(stay)}</span>
                <ProgressBar ratio={fillOf(stay)} label={t("filled", { in: stay.spotsFilled, total: stay.spotsTotal })} className="w-16" />
              </span>
            ),
          };
        })}
        selectedId={selected?.stay.id ?? null}
        onSelect={setPicked}
        empty={<p className="text-body text-muted">{tab === "atRisk" ? t("atRiskNone") : tab === "goingWell" ? t("goingWellNone") : t("searchEmpty")}</p>}
        detail={
          selected ? (
            <HouseDetail
              key={selected.stay.id}
              stay={selected.stay}
              help={selected.help}
              fullIn={selected.fullIn}
              reasonText={reasonText}
              onBack={() => setPicked(null)}
              onDone={() => setPicked(rows.find((r) => r.stay.id !== selected.stay.id)?.stay.id ?? null)}
            />
          ) : null
        }
      />
    </AdminShell>
  );
}

/** One House on the right: header; then for one that needs help its reasons, the recommended lever, the other three, what was done, ✓; for
 *  one going well why, and two actions; otherwise its numbers. */
function HouseDetail({
  stay,
  help,
  fullIn,
  reasonText,
  onBack,
  onDone,
}: {
  stay: Stay;
  help: NeedsHelpRow | null;
  fullIn: number | null;
  reasonText: (r: RiskReason, stay: Stay) => string;
  onBack: () => void;
  onDone: () => void;
}) {
  const t = useTranslations("admin.houses");
  const store = useStore();
  const f = useFormat();
  const inputs = useAdminInputs();
  const actions = useAdminActions();
  const showToast = useToast();
  const host = findUser(store, stay.hostId);
  const hostName = host?.name ?? "";
  const requests = store.joinRequests.filter((r) => r.stayId === stay.id && r.status === "pending").length;
  const daysToStart = Math.max(0, Math.round((Date.parse(stay.startDate) - Date.parse(inputs.today)) / 86_400_000));

  return (
    <article data-house-detail className="flex flex-col gap-(--adm-inner)">
      <BackToList onBack={onBack} />
      <div className="flex items-start gap-4">
        <Img src={housePhotos(stay, host)[0]} alt="" width={64} height={64} className="size-16 shrink-0 rounded-xl object-cover" />
        <div className="min-w-0">
          <Link href={`/h/${stay.id}`} className="block text-h3 text-ink hover:underline">
            {stay.title}
          </Link>
          <p className="mt-0.5 text-small text-muted">{[hostName, f.placeName(stay), f.stayDates(stay)].filter(Boolean).join(" · ")}</p>
          {/* Only a real Firestore id in production (config/tools.ts) – in the mock nothing. */}
          <DirectLink href={firebaseDocUrl("houses", stay.id)} className="mt-1">
            {t("openFirebase")}
          </DirectLink>
        </div>
      </div>

      {help ? (
        <NeedsHelpDetail key={stay.id} stay={stay} help={help} reasonText={reasonText} hostName={hostName} />
      ) : fullIn !== null ? (
        <GoingWellDetail stay={stay} fullIn={fullIn} hostName={hostName} />
      ) : (
        <dl className="grid grid-cols-3">
          {[
            { label: t("kpi.fill"), value: share(fillOf(stay)) },
            { label: t("kpi.requests"), value: String(requests) },
            { label: t("kpi.daysToStart"), value: String(daysToStart) },
          ].map((n, i) => (
            <div key={n.label} className={cn("min-w-0", i > 0 && "border-l border-ink/8 pl-4")}>
              <dt className="truncate text-eyebrow uppercase text-(--adm-label)">{n.label}</dt>
              <dd className="mt-1 text-adm-figure tabular-nums text-ink">{n.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <History stay={stay} />
      {help && (
        <div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              actions.markHouseDone(stay);
              showToast(t("toast.done", { title: stay.title }));
              onDone();
            }}
          >
            {t("done")}
          </Button>
        </div>
      )}
    </article>
  );
}

/**
 * Braucht Hilfe: every reason as a sentence, the recommended lever on top (highlighted), the other three below – each with what it would do
 * and one concrete action (lib/houseHelp.ts): Sichtbarkeit (the ranking bonus, its place in Explore, the limit), Nachfrage (who may be told,
 * the message), Host helfen (the comparison with similar full Houses, the message as Simpulo Support, the checklist), Ausweichen (later
 * dates or a similar House to join – only a suggestion).
 */
function NeedsHelpDetail({ stay, help, reasonText, hostName }: { stay: Stay; help: NeedsHelpRow; reasonText: (r: RiskReason, stay: Stay) => string; hostName: string }) {
  const t = useTranslations("admin.houses");
  const inputs = useAdminInputs();
  const store = useStore();
  const data = useAdminData();
  const actions = useAdminActions();
  const showToast = useToast();
  const f = useFormat();
  const now = Date.parse(`${inputs.today}T12:00:00Z`);
  const first = hostName.split(" ")[0];

  // Sichtbarkeit
  const boosted = activeBoosts(store.stays, now);
  const isOn = isBoosted(stay, now);
  const atLimit = !isOn && boosted.length >= HIGHLIGHT_POLICY.maxConcurrent;
  const rank = exploreRank(store.stays, stay, now);

  // Nachfrage – consent and once a day (NUDGE_POLICY)
  const involved = new Set(store.joinRequests.filter((r) => r.stayId === stay.id && r.status !== "declined" && r.status !== "expired").map((r) => r.userId));
  const nudgedToday = new Set(Object.entries(data.nudged ?? {}).filter(([, d]) => d === inputs.today).map(([k]) => k));
  const audience = nudgeAudience(stay, { users: store.users, waitlist: data.waitlist, inFor: store.inFor, involved, nudgedToday, today: inputs.today });
  const nudge = catalogText("houseNudge", stay.shortName ?? stay.title);

  // Host helfen
  const comparison = hostComparison(stay, store.stays, store.users);
  const behind = comparison.rows.filter((r) => r.behind);
  const money = (n: number | null) => (n === null ? "–" : eur(n));
  const shown = (r: HostComparisonRow, v: number | null) => (v === null ? "–" : r.key === "price" ? money(v) : num(Math.round(v)));
  // In the English message to the host: "€540", "1,200".
  const shownEn = (r: HostComparisonRow, v: number | null) => (v === null ? "–" : r.key === "price" ? enMoney.format(v) : enNumber.format(Math.round(v)));
  const hostTemplate = [
    tEn("houseHelp.hostIntro", { name: first, title: stay.title, missing: help.missing, days: help.daysToStart }),
    ...(behind.length ? [tEn("houseHelp.hostCompare"), ...behind.map((r) => `– ${tEn(`houseHelp.hostLines.${r.key}`, { median: shownEn(r, r.median), value: shownEn(r, r.value) })}`)] : [tEn("houseHelp.hostNone")]),
    behind.length ? tEn("houseHelp.hostOutro") : tEn("houseHelp.hostOutroNone"),
  ].join("\n");
  const [hostText, setHostText] = useState(hostTemplate);

  // Ausweichen
  const alt = alternativeFor(stay, store.stays);
  const altTemplate = tEn("houseHelp.alternative", {
    name: first,
    title: stay.title,
    days: help.daysToStart,
    in: stay.spotsFilled,
    total: stay.spotsTotal,
    // The host reads English: English dates ("8 Feb–12 Feb"), not the admin's German ones.
    later: `${enDay(alt.later.start)}–${enDay(alt.later.end)}`,
    join: alt.join ? tEn("houseHelp.alternativeJoin", { title: alt.join.title, date: `${enDay(alt.join.startDate)}–${enDay(alt.join.endDate)}` }) : "",
  });
  const [altText, setAltText] = useState(altTemplate);

  const order = [help.lever, ...HOUSE_LEVERS.filter((l) => l !== help.lever)];
  const body = (l: HouseLever) => {
    if (l === "visibility")
      return (
        <div className="flex flex-col gap-1 text-small text-muted">
          <p className="text-ink">{t("vis.rank", { now: rank.now, without: rank.without, boosted: rank.boosted })}</p>
          {isOn && stay.boostUntil && <p>{t("vis.until", { date: day(stay.boostUntil) })}</p>}
          {atLimit && <p className="text-adm-warning">{t("vis.limit", { count: boosted.length, max: HIGHLIGHT_POLICY.maxConcurrent })}</p>}
          <p>{t("vis.rule", { days: HIGHLIGHT_POLICY.days, shift: HIGHLIGHT_POLICY.rankShiftDays })}</p>
        </div>
      );
    if (l === "demand")
      return (
        <div className="flex flex-col gap-1 text-small text-muted">
          <p className="text-ink">{t("demand.sources", { waitlist: audience.waitlist.length, inFor: audience.inFor.length, saved: audience.saved.length })}</p>
          <p>{[t("demand.viewed"), t("demand.today", { count: audience.alreadyToday })].filter(Boolean).join(" · ")}</p>
          <p>{t("demand.rule")}</p>
          <p className="mt-1 text-eyebrow uppercase text-(--adm-label)">{t("demand.preview")}</p>
          <p className="text-ink">
            <span className="font-semibold">{nudge.subject}</span> – {nudge.body}
          </p>
        </div>
      );
    if (l === "host")
      return (
        <div className="flex flex-col gap-3">
          {comparison.similar === 0 ? (
            <p className="text-small text-muted">{t("compare.none")}</p>
          ) : (
            <table data-host-compare className="w-full text-left text-small tabular-nums">
              <caption className="mb-1 text-left text-eyebrow uppercase text-(--adm-label)">{t("compare.title", { count: comparison.similar })}</caption>
              <thead>
                <tr className="text-muted">
                  <th scope="col" className="py-1 pr-3 font-normal" />
                  <th scope="col" className="py-1 pr-3 text-right font-normal">{t("compare.this")}</th>
                  <th scope="col" className="py-1 text-right font-normal">{t("compare.median")}</th>
                </tr>
              </thead>
              <tbody>
                {comparison.rows.map((r) => (
                  <tr key={r.key} className="border-t border-ink/8">
                    <th scope="row" className="py-1.5 pr-3 font-normal text-ink">{t(`compare.rows.${r.key}`)}</th>
                    <td className="py-1.5 pr-3 text-right text-ink">
                      <span className="inline-flex items-center gap-1.5">
                        {r.behind && <span aria-hidden className="size-1.5 rounded-full bg-adm-critical" />}
                        {shown(r, r.value)}
                        {r.behind && <span className="sr-only">{t("compare.behind")}</span>}
                      </span>
                    </td>
                    <td className="py-1.5 text-right text-muted">{shown(r, r.median)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <label className="flex flex-col gap-1">
            <span className="text-eyebrow uppercase text-(--adm-label)">{t("message")}</span>
            <Textarea rows={5} value={hostText} onChange={(e) => setHostText(e.target.value)} />
          </label>
        </div>
      );
    return (
      <div className="flex flex-col gap-3">
        <ul className="flex flex-col gap-1 text-small text-ink">
          <li>{t("alt.later", { from: day(alt.later.start), to: day(alt.later.end) })}</li>
          <li>{alt.join ? t("alt.join", { title: alt.join.title, date: f.stayDates(alt.join), free: alt.join.spotsTotal - alt.join.spotsFilled }) : <span className="text-muted">{t("alt.noJoin")}</span>}</li>
        </ul>
        <p className="text-small text-muted">{t("alt.rule")}</p>
        <label className="flex flex-col gap-1">
          <span className="text-eyebrow uppercase text-(--adm-label)">{t("message")}</span>
          <Textarea rows={5} value={altText} onChange={(e) => setAltText(e.target.value)} />
        </label>
      </div>
    );
  };
  const act = (l: HouseLever) => {
    if (l === "visibility") {
      actions.highlightHouse(stay);
      showToast(t("toast.highlight", { title: stay.title }));
    } else if (l === "demand") {
      actions.nudgeHouse(stay, audience, inputs.today);
      showToast(t("toast.notify", { count: audience.total, title: stay.title }));
    } else if (l === "host") {
      actions.sendHostSuggestions(stay, hostText.trim(), behind.map((r) => r.key));
      showToast(t("toast.suggestions", { name: first }));
    } else {
      actions.proposeAlternative(stay, altText.trim(), alt.join?.hostId);
      showToast(t("toast.alternative", { name: first }));
    }
  };
  const buttonOf = (l: HouseLever) => {
    if (l === "visibility") return { label: t("lever.visibility.action"), disabled: isOn || atLimit };
    if (l === "demand") return { label: t("lever.demand.action", { count: audience.total }), disabled: audience.total === 0 };
    if (l === "host") return { label: t("sendHost"), disabled: hostText.trim() === "" };
    return { label: alt.join && alt.join.hostId !== stay.hostId ? t("alt.sendBoth") : t("alt.send"), disabled: altText.trim() === "" };
  };
  const lever = (l: HouseLever, recommended: boolean) => {
    const button = buttonOf(l);
    return (
      <section key={l} data-lever={l} data-recommended={recommended || undefined} className={cn("flex flex-col gap-3", recommended ? "rounded-xl bg-(--adm-block) p-4 ring-1 ring-(--adm-chart-1)/45" : "py-4")}>
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
          <div className="min-w-0 flex-1 basis-56">
            <h3 className="flex items-center gap-2 text-eyebrow uppercase text-(--adm-label)">
              {t(`lever.${l}.name`)}
              {recommended && <span className="rounded-full bg-(--adm-chart-1-soft) px-2 text-adm-chart-1">{t("recommended")}</span>}
            </h3>
            <p className="mt-0.5 text-small text-muted">{t(`lever.${l}.text`)}</p>
          </div>
          <Button size="sm" variant={recommended ? "primary" : "secondary"} disabled={button.disabled} onClick={() => act(l)}>
            {button.label}
          </Button>
        </div>
        {body(l)}
      </section>
    );
  };
  return (
    <>
      <ul className="flex flex-col gap-1">
        {help.reasons.map((r) => (
          <li key={r.key} className="flex items-center gap-2 text-body text-ink">
            <span aria-hidden className="size-2 shrink-0 rounded-full bg-adm-critical" />
            {reasonText(r, stay)}
          </li>
        ))}
        <li className="text-small text-muted">
          {t("left", { days: help.daysToStart })} · {t("filled", { in: stay.spotsFilled, total: stay.spotsTotal })}
          <ProgressBar ratio={fillOf(stay)} label={t("filled", { in: stay.spotsFilled, total: stay.spotsTotal })} className="mt-1.5 w-40" />
        </li>
      </ul>
      {lever(order[0], true)}
      <div className="divide-y divide-ink/8 border-y border-ink/8">{order.slice(1).map((l) => lever(l, false))}</div>
    </>
  );
}

/** Läuft gut: why (days to full, topic, price per person, host tier) and two actions – ask the host for a quote, keep it for Content. */
function GoingWellDetail({ stay, fullIn, hostName }: { stay: Stay; fullIn: number; hostName: string }) {
  const t = useTranslations("admin.houses");
  const tTier = useTranslations("admin.tiers");
  const inputs = useAdminInputs();
  const data = useAdminData();
  const actions = useAdminActions();
  const showToast = useToast();
  const tier = hostOverview(inputs).find((r) => r.user.id === stay.hostId)?.tier ?? null;
  const price = stay.pricePerPerson ? Math.round(convertApprox(stay.pricePerPerson, (stay.currency ?? "EUR") as Currency, "EUR")) : null;
  const marked = data.contentHouses.some((c) => c.stayId === stay.id);
  return (
    <>
      <section>
        <h3 className="text-eyebrow uppercase text-(--adm-label)">{t("whyGood")}</h3>
        <dl className="mt-2 grid grid-cols-2 gap-y-3 md:grid-cols-4">
          {[
            { label: t("good.daysToFull"), value: num(fullIn) },
            { label: t("good.topic"), value: VIBES.find((v) => v.key === stay.vibe)?.label ?? stay.customVibe ?? "–" },
            { label: t("good.price"), value: price === null ? "–" : eur(price) },
            { label: t("good.tier"), value: tier ? tTier(tier) : "–" },
          ].map((n) => (
            <div key={n.label} className="min-w-0 pr-3">
              <dt className="truncate text-eyebrow uppercase text-(--adm-label)">{n.label}</dt>
              <dd className="mt-1 truncate text-h3 text-ink">{n.value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            actions.askHostQuote(stay, hostName);
            showToast(t("toast.quote", { name: hostName }));
          }}
        >
          {t("goodAction.quote")}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={marked}
          onClick={() => {
            actions.markForContent(stay);
            showToast(t("toast.content", { title: stay.title }));
          }}
        >
          {marked ? t("goodAction.contentDone") : t("goodAction.content")}
        </Button>
      </div>
    </>
  );
}

/**
 * Verlauf: what was done for this House, newest first – the admin log by the House's id (older lines by its title), System or Admin, and for
 * each lever pulled what happened since (lib/houseHelp.ts actionOutcome: full · +N · unchanged) – the ground for later automation.
 */
function History({ stay }: { stay: Stay }) {
  const t = useTranslations("admin.houses");
  const tLog = useTranslations("admin.log");
  const f = useFormat();
  const data = useAdminData();
  const log = data.log.filter((e: AdminLogEntry) => e.ref === stay.id || (!e.ref && e.target.includes(stay.title))).slice(0, 10);
  const outcomes = (data.houseActions ?? []).filter((a) => a.stayId === stay.id);
  const LEVER_ACTION: Partial<Record<string, HouseAction["lever"]>> = { house_highlighted: "visibility", waitlist_notified: "demand", host_suggestions: "host", alternative_proposed: "alternative", host_quote_asked: "quote", content_marked: "content" };
  const outcomeOf = (entry: AdminLogEntry) => {
    const lever = LEVER_ACTION[entry.action];
    // The action recorded closest to this log line (same lever, within a minute).
    const action = lever ? outcomes.find((a) => a.lever === lever && Math.abs(Date.parse(a.at) - Date.parse(entry.createdAt)) < 60_000) : undefined;
    if (!action) return null;
    const o = actionOutcome(action, stay);
    return o.kind === "more" ? t("outcome.more", { count: o.gained }) : t(`outcome.${o.kind}`);
  };
  return (
    <section data-house-history>
      <h3 className="text-eyebrow uppercase text-(--adm-label)">{t("history")}</h3>
      {log.length === 0 ? (
        <p className="mt-2 text-small text-muted">{t("historyNone")}</p>
      ) : (
        <ul className="mt-2 divide-y divide-ink/8">
          {log.map((entry) => {
            const outcome = outcomeOf(entry);
            return (
              <li key={entry.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2 text-small">
                <span className="min-w-0 truncate text-ink">
                  {tLog(`action.${entry.action}`)}
                  <span className="text-muted"> · {entry.by === "system" ? t("by.system") : t("by.admin")}</span>
                  {outcome && <span className="text-muted"> · {outcome}</span>}
                </span>
                <span className="shrink-0 text-muted">{f.day(entry.createdAt)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

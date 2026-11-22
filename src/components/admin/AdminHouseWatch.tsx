"use client";
import { AdminButton, AdminDialogFooter } from "./AdminButton";
import { Sheet } from "@/components/ui/Sheet";

// /admin/houses – the early warning as a to-do list (CLAUDE.md "Admin › Houses"): tabs Braucht Hilfe · Läuft gut · Alle; the most urgent House
// opens on its own; each House's reason in one sentence, the lever to pull first, the others, what was done (the log), "✓ Erledigt". Every
// action through lib/admin/actions.ts (logged); in the mock nothing is sent.
import { ProgressBar } from "./AdminCharts";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
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
import { cockpit, fastestFull, hostOverview, needsHelp, type NeedsHelpRow, type RiskReason } from "@/lib/admin/metrics";
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
import { InfoTip, MetricCard } from "./AdminNumbers";
import { AdminShell } from "./AdminShell";
import { TileBoard, chunkRows, type TileSpec } from "./AdminTiles";
import { OpenTasksHint } from "./OpenTasksHint";

/** A date for the English messages to hosts: "8 Feb". */
const enDayFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const enDay = (iso: string) => enDayFormat.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
const enMoney = new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const enNumber = new Intl.NumberFormat("en-GB");

/** "Überblick" first and by default (CLAUDE.md "Überblick zuerst"), then the lists. */
type Tab = "overview" | "atRisk" | "goingWell" | "all";
type HouseSort = "urgency" | "start" | "fill" | "title";
const fillOf = (stay: Stay) => (stay.spotsTotal > 0 ? stay.spotsFilled / stay.spotsTotal : 0);

export function AdminHouseList() {
  const t = useTranslations("admin.houses");
  const tc = useTranslations("admin.cockpit");
  const tOverview = useTranslations("admin.overviewBlock");
  const inputs = useAdminInputs();
  const store = useStore();
  const f = useFormat();
  const help = needsHelp(inputs);
  const fastest = fastestFull(inputs);
  const all = store.stays.filter((s) => !s.isExample && s.status !== "draft" && s.status !== "draft_unclaimed");
  // A link from Aufgaben opens one House (?house=…); otherwise the first House of the tab opens on its own.
  const [picked, setPicked] = useState<string | null>(() => (typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("house")));
  // Houses is for looking (CLAUDE.md "Handeln nur über Aufgaben"): it opens on the overview; a House from a link (?house=) in its list –
  // "Braucht Hilfe" when it needs help, else "Alle".
  const [tab, setTab] = useState<Tab>(() => (picked ? (help.some((h) => h.stay.id === picked) ? "atRisk" : "all") : "overview"));
  const [sort, setSort] = useState<HouseSort>(() => (tab === "atRisk" ? "urgency" : "start"));
  const [query, setQuery] = useState("");

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

  const open = (next: Tab, nextSort?: HouseSort) => (setTab(next), setPicked(null), setSort(nextSort ?? (next === "atRisk" ? "urgency" : "start")));
  const tabs = (
    <AdminTabs
      label={t("tabsLabel")}
      value={tab}
      onChange={(next) => open(next)}
      tabs={[
        { value: "overview", label: tOverview("tab") },
        { value: "atRisk", label: t("atRisk"), count: help.length, tooltip: t("info.atRisk") },
        { value: "goingWell", label: t("goingWell"), count: fastest.length },
        { value: "all", label: t("all"), count: all.length },
      ]}
    />
  );
  if (tab === "overview")
    return (
      <AdminShell title={t("title")} tabs={tabs}>
        <HousesOverview all={all} help={help} fastest={fastest} reserved={reserved.value} onOpen={open} />
      </AdminShell>
    );

  return (
    <AdminShell
      title={t("title")}
      tabs={tabs}
      aside={
        <>
          <AdminSearch label={t("search")} value={query} onChange={setQuery} disabled={tab !== "all"} />
          <AdminSort label={t("sort.label")} value={sort} onChange={setSort} options={(["urgency", "start", "fill", "title"] as const).filter((v) => v !== "urgency" || tab === "atRisk").map((value) => ({ value, label: t(`sort.${value}`) }))} />
        </>
      }
    >
      {/* No pressure of its own: what needs doing lives in Aufgaben – only the hint, then the one number (2+ Vormerkungen). */}
      <OpenTasksHint area="houses" />
      <dl data-key-numbers className="mb-(--adm-section) grid gap-3 sm:grid-cols-2 lg:max-w-160">
        <MetricCard accent="chart-2" label={tc("metric.reservedShare")} info={tc("info.reservedShare")} value={reserved.value === null ? "–" : pct(reserved.value)} change={reserved.change} target={{ text: tc("target", { target: pct(reserved.target) }), status: reserved.status }} />
      </dl>
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

/**
 * One House on the right, without scrolling at 1440 × 900: the head (photo, name, host · place · dates, "Startet in X Tagen · x von y" with
 * its fill bar); for one that needs help its reasons and the four levers as equal rows; for one going well why and two actions; otherwise
 * its numbers. At the bottom one line "Verlauf: …" (the full history folds open) and, for one that needs help, ✓ Erledigt.
 */
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
  const filled = t("filled", { in: stay.spotsFilled, total: stay.spotsTotal });

  return (
    <article data-house-detail className="flex flex-col gap-(--adm-inner)">
      <BackToList onBack={onBack} />
      <header className="flex items-start gap-4">
        <Img src={housePhotos(stay, host)[0]} alt="" width={56} height={56} className="size-14 shrink-0 rounded-xl object-cover" />
        <div className="min-w-0 flex-1">
          <Link href={`/h/${stay.id}`} className="block truncate text-h3 text-ink hover:underline">
            {stay.title}
          </Link>
          <p className="truncate text-small text-muted">{[hostName, f.placeName(stay), f.stayDates(stay)].filter(Boolean).join(" · ")}</p>
          <div className="mt-1.5 flex items-center gap-3">
            <span className="shrink-0 text-small text-ink">
              {t("startsIn", { days: daysToStart })} · {filled}
            </span>
            <ProgressBar ratio={fillOf(stay)} label={filled} className="w-32" />
          </div>
          {/* Only a real Firestore id in production (config/tools.ts) – in the mock nothing. */}
          <DirectLink href={firebaseDocUrl("houses", stay.id)} className="mt-1">
            {t("openFirebase")}
          </DirectLink>
        </div>
      </header>

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

      <History
        stay={stay}
        done={
          help ? (
            <AdminButton
              onClick={() => {
                actions.markHouseDone(stay);
                showToast(t("toast.done", { title: stay.title }));
                onDone();
              }}
            >
              {t("done")}
            </AdminButton>
          ) : null
        }
      />
    </article>
  );
}

/**
 * Braucht Hilfe: the reasons (one line each), then the four levers as equal rows – name (the recommended one with a small dot and the one
 * primary button), one short sentence with the value that matters, one button; the rules only in the ⓘ (lib/houseHelp.ts). Sichtbarkeit acts
 * at once; Nachfrage, Host helfen and Ausweichen open a small window with recipients, preview, the text to edit and Senden / Abbrechen.
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
  // From Aufgaben (?house=…&lever=host|alternative|demand): that lever's window opens right away.
  const [dialog, setDialog] = useState<Exclude<HouseLever, "visibility"> | null>(() => {
    if (typeof window === "undefined") return null;
    const q = new URLSearchParams(window.location.search);
    const lever = q.get("lever");
    return q.get("house") === stay.id && (lever === "demand" || lever === "host" || lever === "alternative") ? lever : null;
  });

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
  const otherHost = alt.join && alt.join.hostId !== stay.hostId ? findUser(store, alt.join.hostId)?.name.split(" ")[0] : null;

  const send = (l: Exclude<HouseLever, "visibility">) => {
    if (l === "demand") {
      actions.nudgeHouse(stay, audience, inputs.today);
      showToast(t("toast.notify", { count: audience.total, title: stay.title }));
    } else if (l === "host") {
      actions.sendHostSuggestions(stay, hostText.trim(), behind.map((r) => r.key));
      showToast(t("toast.suggestions", { name: first }));
    } else {
      actions.proposeAlternative(stay, altText.trim(), alt.join?.hostId);
      showToast(t("toast.alternative", { name: first }));
    }
    setDialog(null);
  };

  // One short sentence with the value that matters, the button, whether it can act; the rule in the ⓘ.
  const row: Record<HouseLever, { sentence: string; button: string; disabled: boolean; info: string }> = {
    visibility: {
      sentence: isOn && stay.boostUntil ? t("vis.until", { date: day(stay.boostUntil) }) : atLimit ? t("vis.limit", { count: boosted.length, max: HIGHLIGHT_POLICY.maxConcurrent }) : t("row.visibility", { now: rank.now, boosted: rank.boosted }),
      button: t("btn.visibility"),
      disabled: isOn || atLimit,
      info: `${t("lever.visibility.text")} ${t("vis.rule", { days: HIGHLIGHT_POLICY.days, shift: HIGHLIGHT_POLICY.rankShiftDays })}`,
    },
    demand: { sentence: t("row.demand", { count: audience.total }), button: t("btn.demand"), disabled: audience.total === 0, info: `${t("lever.demand.text")} ${t("demand.rule")}` },
    host: { sentence: t("row.host", { name: first }), button: t("btn.host"), disabled: false, info: t("lever.host.text") },
    alternative: { sentence: t("row.alternative", { from: day(alt.later.start), to: day(alt.later.end) }), button: t("btn.alternative"), disabled: false, info: `${t("lever.alternative.text")} ${t("alt.rule")}` },
  };

  return (
    <>
      <ul className="flex flex-col gap-0.5">
        {help.reasons.map((r) => (
          <li key={r.key} className="flex items-center gap-2 text-small text-ink">
            <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-adm-critical" />
            {reasonText(r, stay)}
          </li>
        ))}
      </ul>
      <ul data-levers className="border-y border-ink/8">
        {HOUSE_LEVERS.map((l) => {
          const recommended = l === help.lever;
          const r = row[l];
          return (
            <li key={l} data-lever={l} data-recommended={recommended || undefined} className="grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-ink/8 py-2 last:border-b-0">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-body font-semibold text-ink">
                  {recommended && (
                    <>
                      <span aria-hidden className="size-2 shrink-0 rounded-full bg-adm-chart-1" />
                      <span className="sr-only">{t("recommended")}:</span>
                    </>
                  )}
                  {t(`lever.${l}.name`)}
                  <InfoTip text={r.info} />
                </p>
                <p className="truncate text-small text-muted">{r.sentence}</p>
              </div>
              <AdminButton
                variant={recommended ? "primary" : "secondary"}
                disabled={r.disabled}
                onClick={() => {
                  if (l === "visibility") {
                    actions.highlightHouse(stay);
                    showToast(t("toast.highlight", { title: stay.title }));
                  } else setDialog(l);
                }}
              >
                {r.button}
              </AdminButton>
            </li>
          );
        })}
      </ul>

      <Sheet open={dialog !== null} onClose={() => setDialog(null)} title={dialog ? t(`dialog.${dialog}`, { name: first }) : ""}>
        {dialog && (
          <div className="flex flex-col gap-(--adm-inner)" data-lever-dialog={dialog}>
            <p className="text-small text-muted">
              <span className="text-eyebrow uppercase text-(--adm-label)">{t("dialog.to")}</span>{" "}
              <span className="text-ink">
                {dialog === "demand"
                  ? [t("demand.sources", { waitlist: audience.waitlist.length, inFor: audience.inFor.length, saved: audience.saved.length }), t("demand.today", { count: audience.alreadyToday })].filter(Boolean).join(" · ")
                  : dialog === "host"
                    ? t("dialog.hostTo", { name: hostName })
                    : [hostName, otherHost].filter(Boolean).join(" · ")}
              </span>
            </p>
            {dialog === "demand" && (
              <div>
                <p className="text-eyebrow uppercase text-(--adm-label)">{t("demand.preview")}</p>
                <p className="mt-1 text-body text-ink">
                  <span className="font-semibold">{nudge.subject}</span> – {nudge.body}
                </p>
              </div>
            )}
            {dialog === "host" &&
              (comparison.similar === 0 ? (
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
              ))}
            {dialog === "alternative" && (
              <ul className="flex flex-col gap-1 text-small text-ink">
                <li>{t("alt.later", { from: day(alt.later.start), to: day(alt.later.end) })}</li>
                <li>{alt.join ? t("alt.join", { title: alt.join.title, date: f.stayDates(alt.join), free: alt.join.spotsTotal - alt.join.spotsFilled }) : <span className="text-muted">{t("alt.noJoin")}</span>}</li>
              </ul>
            )}
            {(dialog === "host" || dialog === "alternative") && (
              <label className="flex flex-col gap-1">
                <span className="text-eyebrow uppercase text-(--adm-label)">{t("message")}</span>
                <Textarea rows={6} value={dialog === "host" ? hostText : altText} onChange={(e) => (dialog === "host" ? setHostText(e.target.value) : setAltText(e.target.value))} />
              </label>
            )}
            <AdminDialogFooter onCancel={() => setDialog(null)}>
              <AdminButton variant="primary" disabled={dialog === "demand" ? audience.total === 0 : (dialog === "host" ? hostText : altText).trim() === ""} onClick={() => send(dialog)}>
                {t("dialog.send")}
              </AdminButton>
            </AdminDialogFooter>
          </div>
        )}
      </Sheet>
    </>
  );
}

/** Läuft gut: why (days to full, topic, price per person, host tier) in one row and two actions – ask the host for a quote, keep it for Content. */
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
        <AdminButton
          onClick={() => {
            actions.askHostQuote(stay, hostName);
            showToast(t("toast.quote", { name: hostName }));
          }}
        >
          {t("goodAction.quote")}
        </AdminButton>
        <AdminButton
          disabled={marked}
          onClick={() => {
            actions.markForContent(stay);
            showToast(t("toast.content", { title: stay.title }));
          }}
        >
          {marked ? t("goodAction.contentDone") : t("goodAction.content")}
        </AdminButton>
      </div>
    </>
  );
}

/**
 * Verlauf as one line – "Verlauf: {last step}" and, right, ✓ Erledigt; the full history folds open: what was done for this House, newest
 * first – the admin log by the House's id (older lines by its title), System or Admin, and for each lever pulled what happened since
 * (lib/houseHelp.ts actionOutcome: full · +N · unchanged) – the ground for later automation.
 */
function History({ stay, done }: { stay: Stay; done: React.ReactNode }) {
  const t = useTranslations("admin.houses");
  const tLog = useTranslations("admin.log");
  const f = useFormat();
  const data = useAdminData();
  const [open, setOpen] = useState(false);
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
  const lineOf = (entry: AdminLogEntry) => {
    const outcome = outcomeOf(entry);
    return `${tLog(`action.${entry.action}`)} · ${entry.by === "system" ? t("by.system") : t("by.admin")}${outcome ? ` · ${outcome}` : ""}`;
  };
  const last = log[0];
  return (
    <section data-house-history>
      <div className="flex items-center gap-4">
        <p className="min-w-0 flex-1 truncate text-small">
          <span className="text-eyebrow uppercase text-(--adm-label)">{t("history")}:</span>{" "}
          {last ? (
            <span className="text-ink">
              {lineOf(last)} <span className="text-muted">· {f.day(last.createdAt)}</span>
            </span>
          ) : (
            <span className="text-muted">{t("historyNone")}</span>
          )}
        </p>
        {log.length > 1 && (
          <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="shrink-0 text-small font-semibold text-ink hover:underline">
            {open ? t("historyLess") : t("historyAll", { count: log.length })}
          </button>
        )}
        {done}
      </div>
      {open && (
        <ul className="mt-2 divide-y divide-ink/8 border-t border-ink/8">
          {log.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-1.5 text-small">
              <span className="min-w-0 truncate text-ink">{lineOf(entry)}</span>
              <span className="shrink-0 text-muted">{f.day(entry.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Houses › Überblick (CLAUDE.md "Überblick zuerst"): only tiles, tinted in Plattform's lilac – the three lists (Braucht Hilfe · Läuft gut ·
 * Alle) and the numbers behind them: open and full coming Houses, 2+ Vormerkungen, highlighted, starting within 30 days, the average fill,
 * the warning reasons and the fastest fill. Each tile opens its list (sorted where that helps).
 */
function HousesOverview({ all, help, fastest, reserved, onOpen }: { all: readonly Stay[]; help: readonly NeedsHelpRow[]; fastest: readonly { stay: Stay; days: number }[]; reserved: number | null; onOpen: (tab: Tab, sort?: HouseSort) => void }) {
  const t = useTranslations("admin.pageTiles.houses");
  const tHouses = useTranslations("admin.houses");
  const store = useStore();
  const { today } = useAdminInputs();
  const now = Date.parse(`${today}T12:00:00Z`);
  const coming = all.filter((s) => s.startDate > today && s.status !== "closed");
  const open = coming.filter((s) => s.spotsFilled < s.spotsTotal);
  const full = coming.filter((s) => s.spotsTotal > 0 && s.spotsFilled >= s.spotsTotal);
  const in30 = new Date(now + 30 * 86_400_000).toISOString().slice(0, 10);
  const soon = coming.filter((s) => s.startDate <= in30);
  const avgFill = coming.length ? coming.reduce((n, s) => n + fillOf(s), 0) / coming.length : null;
  const reason = (key: RiskReason["key"]) => help.filter((h) => h.reasons.some((r) => r.key === key)).length;
  const helpIds = new Set(help.map((h) => h.stay.id));
  const pctOf = (part: number, whole: number) => (whole > 0 ? pct(Math.round((part / whole) * 100)) : "–");
  const avgFillOf = (list: readonly Stay[]) => (list.length ? pct(Math.round((list.reduce((n, s) => n + fillOf(s), 0) / list.length) * 100)) : "–");
  // The longest quiet spell and the oldest unanswered request among the Houses that need help.
  const longest = <K extends "quiet" | "unanswered">(key: K) =>
    help
      .flatMap((h) => h.reasons.filter((r): r is Extract<RiskReason, { key: K }> => r.key === key).map((r) => ({ stay: h.stay, n: "days" in r ? r.days : (r as { hours: number }).hours })))
      .toSorted((a, b) => b.n - a.n)[0];
  const quietMax = longest("quiet");
  const unansweredMax = longest("unanswered");
  const boosted = activeBoosts(store.stays, now);
  const sortedDays = fastest.map((f) => f.days).toSorted((a, b) => a - b);
  const medianDays = sortedDays.length ? sortedDays[Math.floor(sortedDays.length / 2)] : null;
  const in7 = new Date(now + 7 * 86_400_000).toISOString().slice(0, 10);
  const hostOnly = coming.filter((s) => s.spotsFilled <= 1).length;
  const withTwo = coming.filter((s) => s.spotsFilled - 1 >= 2).length;
  const filledSpots = coming.reduce((n, s) => n + s.spotsFilled, 0);
  const totalSpots = coming.reduce((n, s) => n + s.spotsTotal, 0);
  const cities = new Set(all.map((s) => s.location?.city ?? s.city)).size;
  const hosts = new Set(all.map((s) => s.hostId)).size;
  const days = (n: number | null) => (n === null ? "–" : t("days", { days: n }));
  const tile = (key: Exclude<keyof typeof import("@/lib/i18n/admin-tiles/houses").TILES_HOUSES, "days" | "d">, value: string, details: string[], tab: Tab, sort?: HouseSort): TileSpec => ({
    key,
    label: t(`${key}.label`),
    info: key === "boosted" ? t("boosted.info", { max: String(HIGHLIGHT_POLICY.maxConcurrent) }) : t(`${key}.info`),
    value,
    details,
    onOpen: () => onOpen(tab, sort),
  });
  const tiles: TileSpec[] = [
    tile("all", num(all.length), [t("d.comingPast", { coming: num(coming.length), past: num(all.length - coming.length) }), t("d.citiesHosts", { cities: num(cities), hosts: num(hosts) })], "all"),
    tile("atRisk", num(help.length), [t("d.within7", { count: num(help.filter((h) => h.stay.startDate <= in7).length) }), help[0] ? t("d.first", { title: help[0].stay.title }) : t("d.none")], "atRisk"),
    tile("goingWell", num(fastest.length), [t("d.medianFull", { days: days(medianDays) }), fastest[0] ? t("d.top", { title: fastest[0].stay.title, days: days(fastest[0].days) }) : t("d.none")], "goingWell"),
    tile("open", num(open.length), [t("d.needHelp", { count: num(open.filter((s) => helpIds.has(s.id)).length) }), t("d.avgFill", { fill: avgFillOf(open) })], "all", "start"),
    tile("full", num(full.length), [t("d.shareComing", { share: pctOf(full.length, coming.length) }), t("d.spots", { filled: num(filledSpots), total: num(totalSpots) })], "all", "fill"),
    tile("reserved", reserved === null ? "–" : pct(reserved), [t("d.ofComing", { count: num(withTwo), total: num(coming.length) }), t("d.hostOnly", { count: num(hostOnly) })], "all", "fill"),
    tile("boosted", num(boosted.length), [t("d.maxBoost", { max: num(HIGHLIGHT_POLICY.maxConcurrent) }), boosted[0] ? t("d.first", { title: boosted[0].title }) : t("d.none")], "all"),
    tile("soon", num(soon.length), [t("d.soonFull", { count: num(soon.filter((s) => s.spotsTotal > 0 && s.spotsFilled >= s.spotsTotal).length) }), t("d.needHelp", { count: num(soon.filter((s) => helpIds.has(s.id)).length) })], "all", "start"),
    tile("fill", avgFill === null ? "–" : pct(Math.round(avgFill * 100)), [t("d.fillHigh", { count: num(coming.filter((s) => fillOf(s) >= 0.7).length) }), t("d.fillLow", { count: num(coming.filter((s) => fillOf(s) < 0.5).length) })], "all", "fill"),
    tile("quiet", num(reason("quiet")), quietMax ? [t("d.longestDays", { days: days(quietMax.n) }), quietMax.stay.title] : [t("d.none")], "atRisk"),
    tile("unanswered", num(reason("unanswered")), unansweredMax ? [t("d.longestHours", { hours: num(unansweredMax.n) }), unansweredMax.stay.title] : [t("d.none")], "atRisk"),
    tile("fastest", fastest[0] ? days(fastest[0].days) : "–", [fastest[0] ? fastest[0].stay.title : t("d.none"), t("d.medianFull", { days: days(medianDays) })], "goingWell"),
  ];
  return <TileBoard label={tHouses("title")} columns={4} rows={chunkRows(tiles, "platform", 4)} />;
}

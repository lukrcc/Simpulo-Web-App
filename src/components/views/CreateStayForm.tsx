"use client";

import Link from "next/link";
import { Eye, Link2, QrCode } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMessages, useTranslations } from "next-intl";
import { Suspense, useEffect, useEffectEvent, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import {
  AccommodationDetail,
  CheckRow,
  CoverStep,
  CrewGroupDetail,
  CrewStep,
  DatesDetail,
  DetailsList,
  HostDetail,
  LanguagesDetail,
  LookingForDetail,
  OptionalList,
  PhotosDetail,
  ProfileNote,
  ReadySummary,
  RulesDetail,
  TemplatePicker,
  TitleDetail,
  VibeStep,
  WhereStep,
  WhyDetail,
  useTitleSuggestions,
  type StepProps,
} from "@/components/create/HouseSteps";
import {
  AGAIN_PARAM,
  EDIT_REQUIRED_STEPS,
  INVITE_PARAM,
  REQUIRED_STEPS,
  againForm,
  clearDraft,
  currencyOf,
  detailDone,
  detailsFor,
  fieldId,
  firstOpenStep,
  formFromStay,
  hasContent,
  initialForm,
  invitesOf,
  isDetail,
  prefillOf,
  readDraft,
  readTemplates,
  removeTemplate,
  saveTemplate,
  stepErrors,
  titleMaxFor,
  toInput,
  todayString,
  writeDraft,
  type FieldError,
  type FieldErrors,
  type FieldKey,
  type FormState,
  type HouseTemplate,
  type StepKey,
} from "@/components/create/model";
import { useSearchDemand } from "@/components/create/SearchDemandHint";
import { useDismiss } from "@/components/explore/Filters";
import { FormContainer, FormGrid, PreviewColumn } from "@/components/form/FormLayout";
import { useHostShare } from "@/components/share/HostShareTools";
import { BuildingCard, StayCard } from "@/components/StayCard";
import { PayoutSetupSheet } from "@/components/payouts/PayoutSetup";
import { usePayoutAccount } from "@/lib/payments/hooks";
import { Button } from "@/components/ui/ActionButton";
import { Anchored } from "@/components/ui/Anchored";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { useFeatureFlag } from "@/lib/featureFlags";
import { canChargeHostFee } from "@/lib/fees";
import { useFormat } from "@/i18n/format";
import { getCrew, getCurrentUser, isBlocked, isCrewMember, livedWithFor, useStore, type PersonEntry } from "@/lib/store";
import { locationOf } from "@/lib/catalog";
import { coversFromHouses } from "@/lib/coverSuggestions";
import type { Stay, User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { usePreferredCurrency } from "@/lib/usePreferredCurrency";
import { useMonthName } from "@/components/explore/SearchFields";

const noSubscribe = () => () => {};

export function CreateStayForm() {
  // The page is prerendered with an empty form. After hydration the flow remounts once and reads the saved draft
  // and templates – reading them during hydration itself would mismatch the server HTML.
  const hydrated = useSyncExternalStore(noSubscribe, () => true, () => false);
  return <CreateWizard key={hydrated ? "restored" : "initial"} restore={hydrated} />;
}

/** The same flow, filled with an existing House; it opens on the list of details and "Save" updates it. Host only. */
export function EditStayForm({ stay }: { stay: Stay }) {
  return <CreateWizard restore={false} editing={stay} />;
}

/**
 * The live preview card: 400px wide at most, and narrower when the window is short, so card + "Preview" label always
 * fit in the sticky column (4:5 kept).
 */
const PREVIEW_CARD_WIDTH = "mx-auto w-[min(100%,400px,calc((100dvh-var(--header-h)-96px)*0.8))]";

/** Scrolls a field into view and focuses its first control. */
function focusField(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  const control = el.matches("input, textarea, select, button") ? el : el.querySelector<HTMLElement>("input:not([type=hidden]), textarea, select, button");
  control?.focus({ preventScroll: true });
}

function CreateWizard({ restore, editing }: { restore: boolean; editing?: Stay }) {
  const store = useStore();
  const requireAuth = useRequireAuth();
  const router = useRouter();
  const showToast = useToast();
  const t = useTranslations("create");
  const tErrors = useTranslations("create.errors");
  const tDraft = useTranslations("growth.draft");
  const tDetails = useTranslations("create.details");
  const tReady = useTranslations("create.ready");
  const format = useFormat();
  const monthName = useMonthName();
  const hostPremium = useFeatureFlag("hostPremium");
  const details = detailsFor(hostPremium);
  const requiredSteps: readonly StepKey[] = editing ? EDIT_REQUIRED_STEPS : REQUIRED_STEPS;
  const steps: StepKey[] = [...requiredSteps, ...details];
  /** Where an optional detail leads back to: the list when editing, "Ready to open?" for a new House. */
  const home: StepKey = editing ? "details" : "ready";
  const preferredCurrency = usePreferredCurrency();

  const minSpots = editing ? Math.max(2, editing.spotsFilled) : 2;
  const messages = useMessages();
  const [starters] = useState(() => Object.values(messages.create.starters).flatMap((s) => s.lookingFor));
  const me = getCurrentUser(store);
  /** A link's answers count as done: the flow starts at the first step that isn't. */
  const startFor = (filled: FormState) => firstOpenStep({ form: filled, me, minSpots, today: todayString(), starters });

  // Coming back: straight into the flow, where it was left off. A link with its own answers asks which it'll be, right in the flow.
  const [draft] = useState(() => (restore && !editing ? readDraft() : null));
  // Read here on a full page load; after a client-side navigation the URL only arrives through LinkParams below.
  const [prefill] = useState(() => (restore && !editing ? prefillOf(window.location.search, todayString()) : null));
  const [prefillApplied, setPrefillApplied] = useState(prefill !== null);
  const [continuing, setContinuing] = useState<string | null>(draft ? draft.savedAt : null);
  const [conflict, setConflict] = useState<Partial<FormState> | null>(draft && prefill ? prefill : null);
  const [form, setForm] = useState<FormState>(() => (editing ? formFromStay(editing) : draft ? draft.form : { ...initialForm, ...prefill }));
  const [step, setStep] = useState<StepKey>(() => (editing ? "details" : draft ? startFor(draft.form) : prefill ? startFor({ ...initialForm, ...prefill }) : "vibe"));
  const [templates, setTemplates] = useState<HouseTemplate[]>(() => (restore && !editing ? readTemplates() : []));
  // "Add more details first", open by itself once a detail was opened from it.
  const [moreOpen, setMoreOpen] = useState(false);
  // Opened: the success screen, and how many heard first.
  const [openedId, setOpenedId] = useState<string | null>(null);
  const [notified, setNotified] = useState(0);
  const [inviteOn, setInviteOn] = useState(true);
  // A required answer opened from the list (editing): its button leads back to the list.
  const [fromList, setFromList] = useState(false);
  // "Open again" (/create?again=<House>): applied once the user and that House are known (the user is restored
  // after hydration), over any draft.
  const [againId, setAgainId] = useState<string | null>(null);
  const [againApplied, setAgainApplied] = useState(false);
  // "Invite to a House" from People (/create?invite=<user>): that person is invited on publish, once they're known.
  const [inviteId, setInviteId] = useState<string | null>(null);
  const [inviteApplied, setInviteApplied] = useState(false);
  function readLinkParams(params: URLSearchParams) {
    setAgainId(params.get(AGAIN_PARAM));
    setInviteId(params.get(INVITE_PARAM));
    const linked = prefillOf(params.toString(), todayString());
    if (linked && !prefillApplied) {
      setPrefillApplied(true);
      if (continuing !== null) return setConflict(linked);
      const filled = { ...form, city: "", ...linked };
      setForm(filled);
      setStep(startFor(filled));
    }
  }
  // Errors show once a field was left (touched) or moving on was tried on its step.
  const [touched, setTouched] = useState<ReadonlySet<FieldKey>>(() => new Set());
  const [attempted, setAttempted] = useState<ReadonlySet<StepKey>>(() => new Set());
  // A field to focus once the step it is on has rendered (set from event handlers).
  const pendingFocus = useRef<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const shownStep = useRef(step);
  const [previewOpen, setPreviewOpen] = useState(false);
  // Read on the client only: the page is prerendered, and a clock value must not be baked into it.
  // "" (server / hydration) simply means "no earliest date yet".
  const today = useSyncExternalStore(noSubscribe, todayString, () => "");
  // The House being repeated: from the link, or from a restored draft that started as one.
  const againSourceId = againId ?? (form.againFrom || null);
  const againSource = againSourceId && me ? store.stays.find((s) => s.id === againSourceId && isCrewMember(store, s, me.id)) : undefined;
  // Who can be invited on publish: the people the host lived with (completed Houses) who aren't blocked.
  const invitePeople: PersonEntry[] =
    !me || editing
      ? []
      : livedWithFor(store, me.id)
          .filter((entry) => !isBlocked(store, entry.user.id))
          .map((entry) => ({ user: entry.user, houses: [entry.house] }));
  if (againId && againSource && !againApplied) {
    setAgainApplied(true);
    const crewIds = getCrew(store, againSource).map((u) => u.id).filter((id) => invitePeople.some((p) => p.user.id === id));
    // Everything of the old House but the dates – the flow starts at "Where and when".
    setForm(againForm(againSource, crewIds));
    setContinuing(null);
    setConflict(null);
    setStep("where");
  }
  if (inviteId && !inviteApplied && invitePeople.some((p) => p.user.id === inviteId)) {
    setInviteApplied(true);
    setForm((f) => ({ ...f, inviteIds: f.inviteIds.includes(inviteId) ? f.inviteIds : [inviteId, ...f.inviteIds] }));
  }
  const invites = inviteOn ? invitesOf(form, invitePeople) : [];
  const errorsOf = (key: StepKey): FieldErrors => stepErrors(key, { form, me, minSpots, today, editing, starters });
  const titleMax = titleMaxFor(editing);
  const titleIdeas = useTitleSuggestions(form, titleMax);
  const input = () => toInput(form, { me, editing, today, fallbackTitle: titleIdeas[0] ?? "", preferredCurrency });
  const suggestions = useMemo(() => coversFromHouses(store.stays, { vibe: form.vibe, city: form.city, region: form.region }), [store.stays, form.vibe, form.city, form.region]);

  // Autosave: every change is the draft (not while it's still open which one it'll be, not once opened, and never when editing).
  const ownerId = me?.id ?? null;
  useEffect(() => {
    if (!restore || editing || conflict || openedId || !hasContent(form)) return;
    writeDraft({ form, step, savedAt: new Date().toISOString(), ownerId });
  }, [form, step, restore, editing, conflict, openedId, ownerId]);

  function startOver(filled: Partial<FormState> = {}) {
    clearDraft();
    const fresh = { ...initialForm, ...filled };
    setForm(fresh);
    setStep(startFor(fresh));
    setContinuing(null);
    setConflict(null);
    setTouched(new Set());
    setAttempted(new Set());
    setMoreOpen(false);
  }

  useEffect(() => {
    if (pendingFocus.current) {
      focusField(pendingFocus.current);
      pendingFocus.current = null;
    } else if (shownStep.current !== step) {
      // A new question: its first text field is ready to type into.
      bodyRef.current?.querySelector<HTMLElement>("input:not([type=checkbox]):not([type=date]), textarea")?.focus({ preventScroll: true });
    }
    shownStep.current = step;
  });

  const patch = (changes: Partial<FormState>) => setForm((f) => ({ ...f, ...changes }));

  function touch(key: FieldKey) {
    setTouched((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
  }

  function errorText(error: FieldError): string {
    if (error.key === "spots") return tErrors("spots", { min: error.min, max: error.max });
    if (error.key === "tooLong") return tErrors("tooLong", { max: error.max });
    if (error.key === "titleLength") return tErrors("titleLength", { min: error.min, max: error.max });
    if (error.key === "hostFeeTooHigh") return tErrors("hostFeeTooHigh", { max: format.price(error.max, previewStay.currency) });
    return tErrors(error.key);
  }

  const currentErrors = errorsOf(step);
  const errorOf = (key: FieldKey): string | null => {
    const error = currentErrors[key];
    return error && (touched.has(key) || attempted.has(step)) ? errorText(error) : null;
  };

  /** Stops at a step with its errors shown and the first one focused. */
  function showProblems(key: StepKey, errors: FieldErrors) {
    setAttempted((prev) => new Set(prev).add(key));
    setStep(key);
    const first = Object.keys(errors)[0];
    if (first) pendingFocus.current = fieldId(first);
  }

  function open(target: StepKey) {
    setStep(target);
    if (target !== step) window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /** First invalid step jumps into view with its errors; true when everything is valid. */
  function validateAll(): boolean {
    for (const key of steps) {
      const errors = errorsOf(key);
      if (Object.keys(errors).length > 0) {
        showProblems(key, errors);
        return false;
      }
    }
    return true;
  }

  /** Claimed and duplicated Houses start as drafts: saved as they are, or published from here. */
  const isDraft = editing?.status === "draft";

  function save() {
    // A draft may be saved half-finished – it's only checked when it goes live.
    if (!editing || (!isDraft && !validateAll())) return;
    store.updateStay(editing.id, input());
    showToast(isDraft ? tDraft("savedToast") : t("saved"));
    router.push(`/houses/${editing.id}/manage`);
  }

  function publishDraft() {
    if (!editing || !profileReady || !validateAll()) return;
    store.updateStay(editing.id, input());
    store.publishStay(editing.id);
    showToast(tDraft("publishedToast"));
    router.push(`/house/${editing.slug}`);
  }

  function publish() {
    if (!profileReady || !validateAll()) return;
    // Logged out: log in first, then publish – the draft is still in state, nothing is lost.
    requireAuth(() => {
      const id = store.createStay(input(), [], { invite: invites, againFrom: form.againFrom || undefined });
      clearDraft();
      setNotified(demand.count);
      setOpenedId(id);
      window.scrollTo({ top: 0 });
    }, t("loginToPublish"));
  }

  function next() {
    if (Object.keys(currentErrors).length > 0) return showProblems(step, currentErrors);
    if (isDetail(step) || fromList) {
      setFromList(false);
      return open(home);
    }
    open(REQUIRED_STEPS[REQUIRED_STEPS.indexOf(step as (typeof REQUIRED_STEPS)[number]) + 1] ?? "ready");
  }

  function back() {
    if (isDetail(step) || fromList) {
      setFromList(false);
      return open(home);
    }
    if (step === "ready") return open("cover");
    open(REQUIRED_STEPS[REQUIRED_STEPS.indexOf(step as (typeof REQUIRED_STEPS)[number]) - 1]);
  }

  /** The card needs a face photo and a name – publishing waits for them (logged out: checked after login). */
  const profileReady = !me || (Boolean(me.photos[0]) && me.name.trim() !== "");

  /** Enter moves on – not from a textarea, a button, or an open suggestion list. */
  function onKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (e.key !== "Enter" || e.defaultPrevented || e.shiftKey || step === "details" || step === "ready") return;
    const target = e.target as HTMLElement;
    if (target.closest("textarea, button, a, [role=switch]")) return;
    e.preventDefault();
    next();
  }

  const previewStay: Stay = {
    ...input(),
    location: locationOf(form.city.trim(), form.region.trim()),
    id: "preview",
    slug: "preview",
    hostId: me?.id ?? "preview",
    lat: 0,
    lng: 0,
    mapPreviewUrl: "",
    spotsFilled: editing?.spotsFilled ?? 1,
    // Invited people hold their spots on the card too.
    spotsInvited: editing ? editing.spotsInvited : invites.length,
    currency: editing?.accommodationStatus === "locked" ? editing.currency : currencyOf(form, me, preferredCurrency),
    status: "draft",
    acceptingRequests: true,
    featured: false,
    createdAt: "",
  };
  const demand = useSearchDemand({ city: form.city, region: form.region, startDate: previewStay.startDate, endDate: previewStay.endDate, vibe: form.vibe });
  const themeName = form.customVibe?.trim() || (form.vibe ? format.vibe(form.vibe) : "");
  // The preview of a new House builds itself up from the answers; editing shows the House as it is.
  const card = editing ? (
    <StayCard stay={previewStay} host={me} crew={me ? [me] : []} preview photoPlaceholder={t("photoPlaceholder")} />
  ) : (
    <BuildingCard stay={previewStay} host={me} theme={themeName || null} showTitle={form.title.trim() !== ""} showMeta={form.region.trim() !== "" || form.month !== ""} showDates={form.month !== ""} showPrice={form.budgetMin !== "" || form.budgetTbd} showCrew={form.budgetMin !== "" || form.budgetTbd} />
  );

  const locked = editing?.accommodationStatus === "locked";
  const stepProps: StepProps = { form, patch, errorOf, touch };
  const invalid = steps.filter((key) => Object.keys(errorsOf(key)).length > 0 && (Boolean(editing) || isDetail(key)));
  const placeAndTime = [format.placeLabel(previewStay), form.datesMode === "exact" ? format.stayDates(previewStay) : form.month && monthName(form.month)].filter(Boolean).join(" · ");
  const required = editing
    ? [
        { step: "vibe" as const, value: form.customVibe?.trim() || (form.vibe ? format.vibe(form.vibe) : "") },
        { step: "where" as const, value: placeAndTime },
        { step: "crew" as const, value: `${format.people(form.spotsTotal)} · ${format.priceLabel(previewStay)}` },
      ]
    : undefined;
  const invitesRow = invitesOf(form, invitePeople).length > 0 && <CheckRow label={t("publish.inviteCrew", { count: invitesOf(form, invitePeople).length })} checked={inviteOn} onChange={setInviteOn} />;
  const body = (
    <>
      {step === "vibe" && <VibeStep {...stepProps} />}
      {step === "where" && <WhereStep {...stepProps} today={today} editing={Boolean(editing)} />}
      {step === "cover" && <CoverStep {...stepProps} suggestions={suggestions} />}
      {step === "crew" && <CrewStep {...stepProps} currency={previewStay.currency} locked={locked} minSpots={minSpots} editing={Boolean(editing)} />}
      {step === "title" && <TitleDetail {...stepProps} titleMax={titleMax} />}
      {step === "photos" && <PhotosDetail {...stepProps} />}
      {step === "why" && <WhyDetail {...stepProps} />}
      {step === "dates" && <DatesDetail {...stepProps} today={today} />}
      {step === "accommodation" && <AccommodationDetail {...stepProps} currency={previewStay.currency} locked={locked} today={today} />}
      {step === "host" && <HostDetail {...stepProps} currency={previewStay.currency} allowed={canChargeHostFee(me)} />}
      {step === "lookingFor" && <LookingForDetail {...stepProps} />}
      {step === "rules" && <RulesDetail {...stepProps} />}
      {step === "languages" && <LanguagesDetail {...stepProps} />}
      {step === "crewGroup" && <CrewGroupDetail {...stepProps} />}
      {step === "details" && (
        <div className="space-y-4">
          <DetailsList
            form={form}
            details={details}
            required={required}
            invalid={invalid}
            onOpen={(key) => {
              if (!isDetail(key)) setFromList(true);
              open(key);
            }}
          />
        </div>
      )}
      {step === "ready" && (
        <div className="space-y-6">
          <ReadySummary
            onEdit={(key) => {
              setFromList(true);
              open(key);
            }}
            rows={[
              { key: "theme", label: tReady("theme"), value: themeName, step: "vibe" },
              { key: "where", label: tReady("where"), value: placeAndTime, step: "where" },
              { key: "crew", label: tReady("crew"), value: format.people(form.spotsTotal), step: "crew" },
              { key: "budget", label: tReady("budget"), value: format.priceLabel(previewStay), step: "crew" },
            ]}
          />
          {invitesRow}
        </div>
      )}
    </>
  );

  const tVerify = useTranslations("verification");
  const openOptional = details.filter((key) => !detailDone(key, form)).length;
  const position = REQUIRED_STEPS.indexOf(step as (typeof REQUIRED_STEPS)[number]);
  // Past the required steps: the count of what's left is what matters.
  const progressLabel = position >= 0 && !editing && !fromList ? tDetails("step", { current: position + 1, total: REQUIRED_STEPS.length }) : tDetails("progress", { count: openOptional });

  const stepValid = Object.keys(currentErrors).length === 0;
  const canGoBack = step !== "vibe" && !(editing && step === "details");
  const onList = step === "details";
  const actions = onList ? (
    editing ? (
      isDraft ? (
        <>
          <Button variant="secondary" size="md" onClick={save}>
            {tDraft("saveDraft")}
          </Button>
          <Button size="md" onClick={publishDraft} disabled={!profileReady}>
            {tDraft("publish")}
          </Button>
        </>
      ) : (
        <Button size="md" onClick={save}>
          {t("save")}
        </Button>
      )
    ) : null
  ) : step === "ready" ? (
    <Button size="md" onClick={publish} disabled={!profileReady}>
      {t("publish.button")}
    </Button>
  ) : (
    // Looks disabled until the step is valid, but a tap still shows what's missing.
    <Button size="md" onClick={next} aria-disabled={!stepValid || undefined} className="aria-disabled:cursor-not-allowed aria-disabled:bg-ink/10 aria-disabled:text-muted aria-disabled:hover:bg-ink/10">
      {isDetail(step) || fromList ? tDetails("done") : t("next")}
    </Button>
  );

  // No box: the question lies free on the page. Each new one fades in and rises (the key restarts it).
  const question = (
    <section onKeyDown={onKeyDown}>
      <div key={step} className="question-in">
        <h1 className="text-h1 text-ink">{t(`questions.${step}`)}</h1>
        <div ref={bodyRef} className="mt-8">
          {body}
        </div>
      </div>
      <div className="mt-10 space-y-4">
        {step === "ready" && <ProfileNote me={me} />}
        {/* Voluntary: never a lock on publishing, only why it helps. */}
        {step === "ready" && me && !me.verified && (
          <p className="text-small text-muted">
            {tVerify.rich("createHint", { link: (chunks) => <Link href="/settings#verification" className="font-semibold text-ink underline-offset-4 hover:underline">{chunks}</Link> })}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {canGoBack && (
            <Button variant="tertiary" onClick={back}>
              {t("back")}
            </Button>
          )}
          <span className="flex-1" />
          {actions}
        </div>
        {step === "ready" && (
          <div>
            <Button variant="tertiary" onClick={() => setMoreOpen((on) => !on)} aria-expanded={moreOpen}>
              {tReady("more")}
            </Button>
            {moreOpen && (
              <div className="question-in mt-6">
                <OptionalList form={form} details={details} invalid={invalid} onOpen={open} />
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );

  const openedStay = openedId ? store.stays.find((s) => s.id === openedId) : undefined;
  if (openedStay) return <OpenedScreen stay={openedStay} notified={notified} host={me} form={form} />;

  return (
    <FormContainer wide className={editing ? undefined : "max-md:pt-20"}>
      {restore && !editing && (
        <Suspense fallback={null}>
          <LinkParams onRead={readLinkParams} />
        </Suspense>
      )}
      <>
          {continuing !== null && !editing && <DraftLine savedAt={continuing} conflict={conflict} onKeep={() => setConflict(null)} onStartOver={startOver} />}
          {/* The first line: "1 / 4", small; on phones the live preview sits behind the button beside it. */}
          <div className="mb-3 flex items-center gap-4">
            <p aria-live="polite" className="min-w-0 flex-1 text-small text-muted">
              {progressLabel}
            </p>
            <Button variant="secondary" onClick={() => setPreviewOpen(true)} className="split:hidden">
              <Eye />
              {t("previewButton")}
            </Button>
          </div>
          <FormGrid
            wide
            form={
              <>
                {!editing && step === "vibe" && templates.length > 0 && (
                  <TemplatePicker
                    className="mb-10"
                    templates={templates}
                    onPick={(template) => {
                      // Everything but the dates; dates from a link stay, and so do invites.
                      setForm((f) => ({ ...template.form, month: f.month, datesMode: f.datesMode, startDate: f.startDate, endDate: f.endDate, inviteIds: f.inviteIds, againFrom: f.againFrom }));
                      setStep("where");
                    }}
                    onRemove={(id) => setTemplates(removeTemplate(id))}
                  />
                )}
                {question}
              </>
            }
            preview={
              <PreviewColumn>
                <div className={PREVIEW_CARD_WIDTH}>{card}</div>
                {!editing && me && (me.socials ?? []).length === 0 && (
                  <p className={cn(PREVIEW_CARD_WIDTH, "mt-3 text-small text-muted")}>
                    {t.rich("socialsHint", { link: (chunks) => <a href="/profile/edit" target="_blank" rel="noopener noreferrer" className="text-ink underline underline-offset-4">{chunks}</a> })}
                  </p>
                )}
              </PreviewColumn>
            }
          />
      </>

      <Sheet open={previewOpen} onClose={() => setPreviewOpen(false)} title={t("livePreview")}>
        <div className="mx-auto max-w-90">{card}</div>
      </Sheet>
    </FormContainer>
  );
}

/** Above the steps when a draft came back: from when, and the way to start over. A link with answers of its own asks which it'll be. */
function DraftLine({ savedAt, conflict, onKeep, onStartOver }: { savedAt: string; conflict: Partial<FormState> | null; onKeep: () => void; onStartOver: (filled?: Partial<FormState>) => void }) {
  const t = useTranslations("create.resume");
  const format = useFormat();
  const anchor = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [confirming, setConfirming] = useState(false);
  const open = confirming || conflict !== null;
  const close = () => {
    setConfirming(false);
    onKeep();
  };
  useDismiss(open, close, anchor, anchor, panel);
  const place = conflict?.city || conflict?.region?.split(",")[0];
  return (
    <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-muted">
      <span>{savedAt ? t("line", { date: format.day(savedAt) }) : t("lineNoDate")}</span>
      <button ref={anchor} type="button" onClick={() => setConfirming((on) => !on)} aria-expanded={open} className="font-semibold text-ink underline-offset-4 hover:underline">
        {t("startOver")}
      </button>
      {open && (
        <Anchored anchor={anchor} ref={panel} align="start" width={280}>
          <GlassPanel role="dialog" aria-label={conflict ? t("conflictLabel") : t("discardTitle")} className="animate-fade-in w-[min(280px,calc(100vw-32px))] rounded-[20px]! p-4">
            {conflict ? (
              <div className="flex flex-col gap-2">
                <Button size="md" onClick={close}>
                  {t("continueDraft")}
                </Button>
                <Button variant="secondary" size="md" onClick={() => onStartOver(conflict)}>
                  {place ? t("startNewWith", { place }) : t("startNew")}
                </Button>
              </div>
            ) : (
              <>
                <p className="text-body font-semibold text-ink">{t("discardTitle")}</p>
                <div className="mt-3 flex items-center gap-3">
                  <Button size="md" onClick={() => onStartOver()}>
                    {t("discard")}
                  </Button>
                  <Button variant="tertiary" onClick={close}>
                    {t("keep")}
                  </Button>
                </div>
              </>
            )}
          </GlassPanel>
        </Anchored>
      )}
    </div>
  );
}

/** It's open: the card, the link and the story image, who heard first, and the way on. */
/** On the success screen of a House with a host experience, while payouts aren't ready: why, and "Set up payouts". */
function OpenedPayouts() {
  const t = useTranslations("payouts");
  const { status } = usePayoutAccount();
  const [open, setOpen] = useState(false);
  if (status === null || status === "active") return null;
  return (
    <div className="card-soft mt-8 flex flex-wrap items-center gap-4 rounded-3xl p-6">
      <div className="min-w-0 flex-1">
        <p className="text-body font-semibold text-ink">{t("openedTitle")}</p>
        <p className="text-small text-muted">{t("openedText")}</p>
      </div>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        {t("setupAction")}
      </Button>
      <PayoutSetupSheet open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function OpenedScreen({ stay, notified, host, form }: { stay: Stay; notified: number; host?: User; form: FormState }) {
  const t = useTranslations("create.opened");
  const showToast = useToast();
  const { copy, story, busy } = useHostShare(stay);
  const [saved, setSaved] = useState(false);
  return (
    <FormContainer wide className="max-md:pt-20">
      <div data-flow-done className="question-in grid items-start gap-10 split:grid-cols-[minmax(0,1fr)_400px]">
        <section>
          <h1 className="text-h1 text-ink">{t("title")}</h1>
          {notified > 0 && <p className="mt-3 text-body-lg font-semibold text-ink">{t("notified", { count: notified })}</p>}
          {/* A host experience is paid to the host through Simpulo: payouts first (Stripe Connect). */}
          {(stay.hostFeePerPerson ?? 0) > 0 && <OpenedPayouts />}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button size="md" disabled={busy !== null} onClick={copy}>
              <Link2 aria-hidden />
              {t("copy")}
            </Button>
            <Button variant="secondary" size="md" disabled={busy !== null} onClick={story}>
              <QrCode aria-hidden />
              {t("story")}
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <Button
              variant="tertiary"
              disabled={saved}
              onClick={() => {
                saveTemplate(form, new Date());
                setSaved(true);
                showToast(t("templateSaved"));
              }}
            >
              {t("saveTemplate")}
            </Button>
            <Button variant="tertiary" href={`/houses/${stay.id}/manage`}>
              {t("yourHouses")}
            </Button>
          </div>
        </section>
        <div className={PREVIEW_CARD_WIDTH}>
          <StayCard stay={stay} host={host} crew={host ? [host] : []} preview />
        </div>
      </div>
    </FormContainer>
  );
}

/**
 * Reports the link's search params (?again=, ?invite=, ?place=…, ?opened=) to the flow. useSearchParams needs a Suspense
 * boundary on this prerendered page – here it wraps only this empty component.
 */
function LinkParams({ onRead }: { onRead: (params: URLSearchParams) => void }) {
  const params = useSearchParams();
  const key = params.toString();
  const read = useEffectEvent(() => onRead(new URLSearchParams(key)));
  useEffect(() => read(), [key]);
  return null;
}

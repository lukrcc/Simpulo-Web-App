"use client";

import { Eye } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMessages, useTranslations } from "next-intl";
import { Suspense, useEffect, useEffectEvent, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import {
  BudgetStep,
  CrewStep,
  ExtrasStep,
  HostStep,
  PitchStep,
  PublishStep,
  TemplatePicker,
  TitleStep,
  VibeStep,
  WhenStep,
  WhereStep,
  type StepProps,
} from "@/components/create/HouseSteps";
import {
  AGAIN_PARAM,
  INVITE_PARAM,
  againForm,
  clearDraft,
  currencyOf,
  earliestStart,
  extrasCount,
  fieldId,
  formFromStay,
  hasContent,
  ideasOf,
  initialForm,
  invitesOf,
  isNumbered,
  prefillOf,
  readDraft,
  readTemplates,
  removeTemplate,
  saveTemplate,
  stepErrors,
  stepsFor,
  titleMaxFor,
  toInput,
  todayString,
  writeDraft,
  type Draft,
  type FieldError,
  type FieldErrors,
  type FieldKey,
  type FormState,
  type HouseTemplate,
  type StepKey,
} from "@/components/create/model";
import { FlowProgress, FormContainer, FormGrid, PreviewColumn } from "@/components/form/FormLayout";
import { StayCard } from "@/components/StayCard";
import { Button } from "@/components/ui/ActionButton";
import { cardClass } from "@/components/ui/Card";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { useFeatureFlag } from "@/lib/featureFlags";
import { canChargeHostFee } from "@/lib/fees";
import { useFormat } from "@/i18n/format";
import { getCrew, getCurrentUser, isBlocked, isCrewMember, livedWithFor, useStore, type PersonEntry } from "@/lib/store";
import { locationOf } from "@/lib/catalog";
import type { Stay } from "@/lib/types";
import { cn } from "@/lib/utils";

const noSubscribe = () => () => {};

export function CreateStayForm() {
  // The page is prerendered with an empty form. After hydration the flow remounts once and reads the saved draft
  // and templates – reading them during hydration itself would mismatch the server HTML.
  const hydrated = useSyncExternalStore(noSubscribe, () => true, () => false);
  return <CreateWizard key={hydrated ? "restored" : "initial"} restore={hydrated} />;
}

/** The same flow, filled with an existing House; it opens on the review step and "Save" updates it. Host only. */
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
  const format = useFormat();
  const hostPremium = useFeatureFlag("hostPremium");
  const steps = stepsFor(hostPremium);
  const numbered: StepKey[] = steps.filter(isNumbered);

  // "Open one" / "Open your own House" links: /create?region=…&from=…&to=… fill place and dates in (over a draft).
  // Read here on a full page load; after a client-side navigation the URL only arrives through LinkParams below.
  const [prefill] = useState(() => (restore && !editing ? prefillOf(window.location.search, todayString()) : null));
  const [prefillApplied, setPrefillApplied] = useState(prefill !== null);
  // A saved draft is offered first ("Continue your draft") – nothing is written over it until the host decides.
  const [offer, setOffer] = useState<Draft | null>(() => (restore && !editing && !prefill ? readDraft() : null));
  const [form, setForm] = useState<FormState>(() => (editing ? formFromStay(editing) : { ...initialForm, ...prefill }));
  // Editing opens on the review step, where every answer has its "Change".
  const [step, setStep] = useState<StepKey>(editing ? "publish" : "vibe");
  const [templates, setTemplates] = useState<HouseTemplate[]>(() => (restore && !editing ? readTemplates() : []));
  const [asTemplate, setAsTemplate] = useState(false);
  const [inviteOn, setInviteOn] = useState(true);
  // "Edit" on the review step: that question, then straight back to the review.
  const [reviewing, setReviewing] = useState(false);
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
      setOffer(null);
      setForm((f) => ({ ...f, city: "", ...linked }));
      setStep("vibe");
    }
  }
  // Errors show once a field was left (touched) or Next was tried on its step.
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
  const me = getCurrentUser(store);
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
    // Everything of the old House but the dates – the flow starts at "When".
    setForm(againForm(againSource, crewIds));
    setOffer(null);
    setStep("when");
  }
  if (inviteId && !inviteApplied && invitePeople.some((p) => p.user.id === inviteId)) {
    setInviteApplied(true);
    setForm((f) => ({ ...f, inviteIds: f.inviteIds.includes(inviteId) ? f.inviteIds : [inviteId, ...f.inviteIds] }));
  }
  const invites = inviteOn ? invitesOf(form, invitePeople) : [];
  const minSpots = editing ? Math.max(2, editing.spotsFilled) : 2;
  const messages = useMessages();
  const [starters] = useState(() => Object.values(messages.create.starters).flatMap((s) => s.lookingFor));
  const errorsOf = (key: StepKey): FieldErrors => stepErrors(key, { form, me, minSpots, today, editing, starters });
  const index = steps.indexOf(step);

  // Autosave: every change is the draft (not while a saved draft is still on offer, and never when editing).
  useEffect(() => {
    if (!restore || editing || offer || !hasContent(form)) return;
    writeDraft({ form, step });
  }, [form, step, restore, editing, offer]);

  useEffect(() => {
    if (pendingFocus.current) {
      focusField(pendingFocus.current);
      pendingFocus.current = null;
    } else if (shownStep.current !== step) {
      // A new question: its first text field is ready to type into.
      bodyRef.current?.querySelector<HTMLElement>("input:not([type=checkbox]), textarea")?.focus({ preventScroll: true });
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

  /** Forward only through valid steps (stopping at the first invalid one); backwards always. True when it got there. */
  function goTo(target: StepKey): boolean {
    const to = steps.indexOf(target);
    for (let i = index; i < to; i++) {
      const errors = errorsOf(steps[i]);
      if (Object.keys(errors).length > 0) {
        showProblems(steps[i], errors);
        return false;
      }
    }
    setStep(target);
    if (target === "publish") setReviewing(false);
    if (target !== step) window.scrollTo({ top: 0, behavior: "smooth" });
    return true;
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
    store.updateStay(editing.id, toInput(form, me, editing));
    showToast(isDraft ? tDraft("savedToast") : t("saved"));
    router.push(`/my-stays/${editing.id}`);
  }

  function publishDraft() {
    if (!editing || !profileReady || !validateAll()) return;
    store.updateStay(editing.id, toInput(form, me, editing));
    store.publishStay(editing.id);
    showToast(tDraft("publishedToast"));
    router.push(`/house/${editing.slug}`);
  }

  function publish() {
    if (!profileReady || !validateAll()) return;
    // Logged out: log in first, then publish – the draft is still in state, nothing is lost.
    requireAuth(() => {
      const id = store.createStay(toInput(form, me), ideasOf(form), { invite: invites, againFrom: form.againFrom || undefined });
      if (asTemplate) saveTemplate(form, new Date());
      clearDraft();
      showToast(t("published"));
      // The new House in Your houses (desktop: the detail column, phones: its own page).
      router.push(`/my-stays/${id}`);
    }, t("loginToPublish"));
  }

  function next() {
    const errors = currentErrors;
    if (Object.keys(errors).length > 0) return showProblems(step, errors);
    if (reviewing) return goTo("publish");
    if (index < steps.length - 1) goTo(steps[index + 1]);
  }

  /** "Edit" on the review: opens that question; its Next leads back to the review. */
  function editFromReview(key: StepKey) {
    setReviewing(true);
    setStep(key);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /** The card needs a face photo and a name – publishing waits for them (logged out: checked after login). */
  const profileReady = !me || (Boolean(me.photos[0]) && me.name.trim() !== "");

  /** Enter moves on when the question is answered – not from a textarea, a button, or an open suggestion list. */
  function onKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (e.key !== "Enter" || e.defaultPrevented || e.shiftKey || step === "publish") return;
    const target = e.target as HTMLElement;
    if (target.closest("textarea, button, a, [role=switch]")) return;
    e.preventDefault();
    next();
  }

  const previewStay: Stay = {
    ...toInput(form, me, editing),
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
    currency: editing?.accommodationStatus === "locked" ? editing.currency : currencyOf(form, me),
    status: "draft",
    acceptingRequests: true,
    featured: false,
    createdAt: "",
  };
  const card = <StayCard stay={previewStay} host={me} crew={me ? [me] : []} preview photoPlaceholder={t("photoPlaceholder")} />;

  const stepProps: StepProps = { form, patch, errorOf, touch };
  const body = (
    <>
      {step === "vibe" && <VibeStep {...stepProps} />}
      {step === "where" && <WhereStep {...stepProps} />}
      {step === "when" && <WhenStep {...stepProps} minStart={earliestStart(today)} />}
      {step === "crew" && <CrewStep {...stepProps} minSpots={minSpots} />}
      {step === "budget" && <BudgetStep {...stepProps} currency={previewStay.currency} locked={editing?.accommodationStatus === "locked"} />}
      {step === "title" && <TitleStep {...stepProps} titleMax={titleMaxFor(editing)} />}
      {step === "pitch" && <PitchStep {...stepProps} />}
      {step === "host" && <HostStep {...stepProps} currency={previewStay.currency} allowed={canChargeHostFee(me)} />}
      {step === "extras" && <ExtrasStep {...stepProps} showIdeas={!editing} />}
      {step === "publish" && (
        <PublishStep
          stay={previewStay}
          form={form}
          me={me}
          editing={Boolean(editing)}
          steps={steps}
          missing={steps.filter((key) => key !== "publish" && Object.keys(errorsOf(key)).length > 0)}
          onEdit={editFromReview}
          invites={{ count: invitesOf(form, invitePeople).length, on: inviteOn, set: (on) => setInviteOn(on) }}
          template={{ on: asTemplate, set: (on) => setAsTemplate(on) }}
        />
      )}
    </>
  );

  const stepValid = Object.keys(currentErrors).length === 0;
  // Looks disabled until the step is valid, but a tap still shows what's missing.
  const nextButton = (
    <Button
      variant={editing ? "secondary" : "primary"}
      onClick={next}
      aria-disabled={!stepValid || undefined}
      className={editing ? "aria-disabled:cursor-not-allowed aria-disabled:text-muted" : "aria-disabled:cursor-not-allowed aria-disabled:bg-line aria-disabled:text-muted aria-disabled:hover:bg-line"}
    >
      {/* From the review: back to it. Nothing added: the optional step is skipped, not completed. */}
      {reviewing ? t("backToReview") : step === "extras" && extrasCount(form) === 0 ? t("skip") : t("next")}
    </Button>
  );
  const actions = editing ? (
    <>
      {step !== "publish" && nextButton}
      {isDraft ? (
        <>
          <Button variant="secondary" onClick={save}>
            {tDraft("saveDraft")}
          </Button>
          <Button onClick={publishDraft} disabled={!profileReady}>
            {tDraft("publish")}
          </Button>
        </>
      ) : (
        <Button onClick={save}>{t("save")}</Button>
      )}
    </>
  ) : step === "publish" ? (
    <Button onClick={publish} disabled={!profileReady}>
      {t("publish.button")}
    </Button>
  ) : (
    nextButton
  );

  const position = numbered.indexOf(step);
  const progress = position >= 0 ? (position + 1) / numbered.length : numbered.indexOf("publish") / numbered.length;
  const progressLabel = position >= 0 ? t("stepOf", { current: position + 1, total: numbered.length }) : t("optionalStep");

  const question = (
    <section className={cn(cardClass, "max-w-160")} onKeyDown={onKeyDown}>
      <h2 className="text-h3 tracking-tight text-ink">{t(`questions.${step}`)}</h2>
      <div ref={bodyRef} className="mt-5">
        {body}
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
        {index > 0 && (
          <Button variant="tertiary" onClick={() => goTo(steps[index - 1])}>
            {t("back")}
          </Button>
        )}
        <span className="flex-1" />
        {actions}
      </div>
    </section>
  );

  const draftName = offer && (offer.form.title.trim() || [offer.form.customVibe?.trim() || (offer.form.vibe && format.vibe(offer.form.vibe)), offer.form.region].filter(Boolean).join(" · "));

  return (
    <FormContainer wide>
      {restore && !editing && (
        <Suspense fallback={null}>
          <LinkParams onRead={readLinkParams} />
        </Suspense>
      )}
      {offer ? (
        <section className={cn(cardClass, "max-w-160")}>
          <h2 className="text-h3 tracking-tight text-ink">{t("resume.title")}</h2>
          <p className="mt-1 text-body text-muted">{draftName || t("resume.untitled")}</p>
          <div className="mt-6 flex items-center gap-3 border-t border-line pt-5">
            <Button
              variant="tertiary"
              onClick={() => {
                clearDraft();
                setOffer(null);
              }}
            >
              {t("resume.startOver")}
            </Button>
            <span className="flex-1" />
            <Button
              onClick={() => {
                setForm(offer.form);
                setStep(steps.includes(offer.step) ? offer.step : "vibe");
                setOffer(null);
              }}
            >
              {t("resume.continue")}
            </Button>
          </div>
        </section>
      ) : (
        <>
          {/* No page title: the first line is "Step N of 9" with the bar, across the form container; on phones the
              live preview sits behind the button beside it (desktop shows it in the right column). */}
          <div className="flex items-end gap-4">
            <FlowProgress value={progress} label={progressLabel} className="min-w-0 flex-1" />
            <Button variant="secondary" onClick={() => setPreviewOpen(true)} className="lg:hidden">
              <Eye />
              {t("previewButton")}
            </Button>
          </div>
          {!editing && step === "vibe" && templates.length > 0 && (
            <TemplatePicker
              className="mt-6"
              templates={templates}
              onPick={(template) => {
                // Everything but the dates; dates from a link stay, and so do invites.
                setForm((f) => ({ ...template.form, startDate: f.startDate, endDate: f.endDate, inviteIds: f.inviteIds, againFrom: f.againFrom }));
                setStep("when");
              }}
              onRemove={(id) => setTemplates(removeTemplate(id))}
            />
          )}
          {/* 24px under the bar: the step card and, from lg, the preview starting level with it. */}
          <div className="mt-6">
            <FormGrid
              wide
              form={question}
              preview={
                <PreviewColumn>
                  <div className={PREVIEW_CARD_WIDTH}>{card}</div>
                </PreviewColumn>
              }
            />
          </div>
        </>
      )}

      <Sheet open={previewOpen} onClose={() => setPreviewOpen(false)} title={t("livePreview")}>
        <div className="mx-auto max-w-90">{card}</div>
      </Sheet>
    </FormContainer>
  );
}

/**
 * Reports the link's search params (?again=, ?invite=, ?region=…) to the flow. useSearchParams needs a Suspense
 * boundary on this prerendered page – here it wraps only this empty component.
 */
function LinkParams({ onRead }: { onRead: (params: URLSearchParams) => void }) {
  const params = useSearchParams();
  const key = params.toString();
  const read = useEffectEvent(() => onRead(new URLSearchParams(key)));
  useEffect(() => read(), [key]);
  return null;
}

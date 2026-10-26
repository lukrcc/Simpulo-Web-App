"use client";

import { ArrowLeft, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMessages, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { AboutFields, AboutSummary, Checklist, HouseStep, PitchStep, PublishAside, PublishCard, type ChecklistKey } from "@/components/create/HouseSteps";
import {
  PUBLISH_STEP,
  STEPS,
  aboutModeOf,
  aboutOf,
  clearDraft,
  currencyOf,
  earliestStart,
  fieldId,
  formFromStay,
  ideasOf,
  initialForm,
  languageOf,
  languageOptions,
  readDraft,
  stepErrors,
  toInput,
  toProfilePatch,
  todayString,
  writeDraft,
  type About,
  type FieldError,
  type FieldErrors,
  type FieldKey,
  type FormState,
} from "@/components/create/model";
import { FormCards, FormContainer, FormGrid, FormHeader, PreviewColumn, StepProgress, StickyFormBar } from "@/components/form/FormLayout";
import { StayCard } from "@/components/StayCard";
import { buttonClass } from "@/components/ui/button";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { getCurrentUser, useStore } from "@/lib/store";
import type { Stay, User } from "@/lib/types";

const noSubscribe = () => () => {};

export function CreateStayForm() {
  // The page is prerendered with an empty form. After hydration the wizard remounts once and restores the
  // saved draft – restoring during hydration itself would mismatch the server HTML.
  const hydrated = useSyncExternalStore(noSubscribe, () => true, () => false);
  return <CreateWizard key={hydrated ? "restored" : "initial"} restore={hydrated} />;
}

/** The same stepper, filled with an existing House; "Save" updates it. Host only – the page gates that. */
export function EditStayForm({ stay }: { stay: Stay }) {
  return <CreateWizard restore={false} editing={stay} />;
}

/** Where each checklist item lives: its step and the field to focus. */
const CHECKLIST_TARGETS: Record<ChecklistKey, { step: number; id: string }> = {
  title: { step: 0, id: fieldId("title") },
  place: { step: 0, id: fieldId("region") },
  dates: { step: 0, id: fieldId("startDate") },
  lookingFor: { step: 1, id: fieldId("lookingForText") },
  photo: { step: 2, id: fieldId("photo") },
  hostNote: { step: 1, id: fieldId("hostNote") },
};

/**
 * The live preview card: 400px wide at most, and narrower when the window is short, so card + "Preview" label +
 * checklist line (~88px) always fit in the sticky column (4:5 kept).
 */
const PREVIEW_CARD_WIDTH = "mx-auto w-[min(100%,400px,calc((100dvh-var(--header-h)-48px-88px)*0.8))]";

/** Scrolls a field (or card) into view and focuses its first control. */
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
  const [initialDraft] = useState(() => (restore ? readDraft() : null));
  const [form, setForm] = useState<FormState>(() => (editing ? formFromStay(editing) : (initialDraft?.form ?? initialForm)));
  const [step, setStep] = useState(initialDraft?.step ?? 0);
  // Errors show once a field was left (touched) or Next was tried on its step.
  const [touched, setTouched] = useState<ReadonlySet<FieldKey>>(() => new Set());
  const [attempted, setAttempted] = useState<ReadonlySet<number>>(() => new Set());
  // A field to focus once the step it is on has rendered (set from event handlers).
  const pendingFocus = useRef<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  // Read on the client only: the page is prerendered, and a clock value must not be baked into it.
  // "" (server / hydration) simply means "no earliest date yet".
  const today = useSyncExternalStore(noSubscribe, todayString, () => "");
  const me = getCurrentUser(store);
  const minSpots = editing ? Math.max(2, editing.spotsFilled) : 2;
  const messages = useMessages();
  const [starters] = useState(() => Object.values(messages.create.starters).flatMap((s) => s.lookingFor));
  const errorsOf = (i: number): FieldErrors => stepErrors(i, { form, me, minSpots, today, editing, starters });
  const isValid = (i: number) => Object.keys(errorsOf(i)).length === 0;
  const aboutMode = aboutModeOf(me);

  // Keep the draft so a refresh doesn't lose it (only once restored, so the empty first render can't overwrite it).
  useEffect(() => {
    // Edits are never drafted: the House itself is the saved state.
    if (!restore || editing) return;
    writeDraft({ form, step });
  }, [form, step, restore, editing]);

  useEffect(() => {
    if (!pendingFocus.current) return;
    focusField(pendingFocus.current);
    pendingFocus.current = null;
  });

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function patch(changes: Partial<FormState>) {
    setForm((f) => ({ ...f, ...changes }));
  }

  function touch(key: FieldKey) {
    setTouched((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
  }

  function errorText(error: FieldError): string {
    if (error.key === "minSpots") return tErrors("minSpots", { count: error.count });
    if (error.key === "tooLong") return tErrors("tooLong", { max: error.max });
    if (error.key === "titleLength") return tErrors("titleLength", { min: error.min, max: error.max });
    return tErrors(error.key);
  }

  const currentErrors = errorsOf(step);
  const errorOf = (key: FieldKey): string | null => {
    const error = currentErrors[key];
    return error && (touched.has(key) || attempted.has(step)) ? errorText(error) : null;
  };

  /** Stops at step i with its errors shown and the first one focused. */
  function showProblems(i: number, errors: FieldErrors) {
    setAttempted((prev) => new Set(prev).add(i));
    setStep(i);
    const first = Object.keys(errors)[0];
    if (first) pendingFocus.current = fieldId(first);
  }

  /** Forward only through valid steps (stopping at the first invalid one); backwards always. True when it got there. */
  function goTo(target: number, scrollTop = true): boolean {
    for (let i = step; i < target; i++) {
      const errors = errorsOf(i);
      if (Object.keys(errors).length > 0) {
        showProblems(i, errors);
        return false;
      }
    }
    setStep(target);
    if (scrollTop && target !== step) window.scrollTo({ top: 0, behavior: "smooth" });
    return true;
  }

  /** First invalid step jumps into view with its errors; true when everything is valid. */
  function validateAll(): boolean {
    for (let i = 0; i < PUBLISH_STEP; i++) {
      const errors = errorsOf(i);
      if (Object.keys(errors).length > 0) {
        showProblems(i, errors);
        return false;
      }
    }
    return true;
  }

  function jumpTo(key: ChecklistKey) {
    setPreviewOpen(false);
    const target = CHECKLIST_TARGETS[key];
    if (target.step === step) return focusField(target.id);
    if (goTo(target.step, false)) pendingFocus.current = target.id;
  }

  /** The profile is only written when step 3 asked for something (summary = nothing to save). */
  const writesProfile = aboutMode.kind !== "summary";

  function save() {
    if (!editing || !validateAll()) return;
    store.updateStay(editing.id, toInput(form, me, editing));
    if (writesProfile) store.updateCurrentUser(toProfilePatch(form, me));
    showToast(t("saved"));
    router.push(`/my-stays/${editing.id}`);
  }

  function publish() {
    if (!validateAll()) return;
    // Logged out: log in first, then publish – the draft is still in state, nothing is lost.
    requireAuth(() => {
      const slug = store.createStay(toInput(form, me), ideasOf(form));
      if (writesProfile) store.updateCurrentUser(toProfilePatch(form, me));
      clearDraft();
      showToast(t("published"));
      router.push(`/stays/${slug}`);
    }, t("loginToPublish"));
  }

  const about = aboutOf(form, me);
  const previewHost = previewHostOf(about, me, t("previewName"));
  const previewStay: Stay = {
    ...toInput(form, me, editing),
    id: "preview",
    slug: "preview",
    hostId: me?.id ?? "preview",
    lat: 0,
    lng: 0,
    mapPreviewUrl: "",
    spotsFilled: editing?.spotsFilled ?? 1,
    currency: editing?.accommodationStatus === "locked" ? editing.currency : currencyOf(form, me),
    status: "draft",
    acceptingRequests: true,
    featured: false,
    createdAt: "",
  };
  const card = (
    <StayCard stay={previewStay} host={previewHost} crew={previewHost ? [previewHost] : []} preview photoPlaceholder={t("photoPlaceholder")} />
  );

  const houseErrors = errorsOf(0);
  const checklistItems = [
    { key: "title", done: !houseErrors.title },
    { key: "place", done: !houseErrors.region },
    { key: "dates", done: !houseErrors.startDate && !houseErrors.endDate },
    { key: "lookingFor", done: !errorsOf(1).lookingForText },
    { key: "photo", done: Boolean(about.photos[0]) },
    { key: "hostNote", done: form.hostNote.trim() !== "" },
  ] satisfies Array<{ key: ChecklistKey; done: boolean }>;

  const stepValid = isValid(step);
  const next = () => {
    if (stepValid) goTo(step + 1);
    else showProblems(step, currentErrors);
  };

  const formColumn = (
    <>
      {step === 0 && (
        <HouseStep
          form={form}
          update={update}
          patch={patch}
          minSpots={minSpots}
          minStart={earliestStart(today)}
          language={languageOf(form)}
          languages={languageOptions(me)}
          currency={previewStay.currency}
          locked={editing?.accommodationStatus === "locked"}
          errorOf={errorOf}
          touch={touch}
        />
      )}
      {step === 1 && <PitchStep form={form} update={update} patch={patch} showIdeas={!editing} errorOf={errorOf} touch={touch} />}
      {step === 2 &&
        (aboutMode.kind === "summary" && me ? (
          <FormCards>
            <AboutSummary me={me} onContinue={() => goTo(step + 1)} />
          </FormCards>
        ) : (
          <AboutFields
            about={about}
            update={update}
            fields={aboutMode.kind === "missing" ? aboutMode.fields : []}
            full={aboutMode.kind === "full"}
            errorOf={errorOf}
            touch={touch}
          />
        ))}
      {step === PUBLISH_STEP && <PublishCard card={card} loginNote={!me} />}

      <StickyFormBar>
        {step > 0 && (
          <button type="button" onClick={() => goTo(step - 1)} className={buttonClass("ghost", "md", "-ml-2")}>
            {t("back")}
          </button>
        )}
        <p className="min-w-0 flex-1 truncate text-[13px] text-zinc-500">{t("stepOf", { current: step + 1, total: STEPS.length })}</p>
        {step < PUBLISH_STEP && (
          // Looks disabled until the step is valid, but a tap still shows what's missing.
          <button
            type="button"
            onClick={next}
            aria-disabled={!stepValid || undefined}
            className={buttonClass(
              editing ? "secondary" : "dark",
              "md",
              editing
                ? "aria-disabled:cursor-not-allowed aria-disabled:text-neutral-400"
                : "aria-disabled:cursor-not-allowed aria-disabled:bg-neutral-200 aria-disabled:text-neutral-500 aria-disabled:hover:bg-neutral-200",
            )}
          >
            {t("next")}
          </button>
        )}
        {editing ? (
          <button type="button" onClick={save} className={buttonClass("dark", "md")}>
            {t("save")}
          </button>
        ) : (
          step === PUBLISH_STEP && (
            <button type="button" onClick={publish} className={buttonClass("dark", "md")}>
              {t("publishHouse")}
            </button>
          )
        )}
      </StickyFormBar>
    </>
  );

  return (
    <FormContainer wide>
      <FormHeader
        title={editing ? t("title.edit") : t("title.create")}
        back={
          step > 0 && (
            <button type="button" onClick={() => goTo(step - 1)} aria-label={t("previousStep")} className="-ml-2 rounded-full p-2 hover:bg-black/5">
              <ArrowLeft className="size-5" />
            </button>
          )
        }
        aside={
          // Mobile: the live preview sits behind this button (desktop shows it beside the form).
          step < PUBLISH_STEP && (
            <button type="button" onClick={() => setPreviewOpen(true)} className={buttonClass("secondary", "sm", "lg:hidden")}>
              <Eye className="size-4" />
              {t("previewButton")}
            </button>
          )
        }
      />

      {/* Completed steps are clickable to go back; editing: every step is reachable – the House is complete already. */}
      <StepProgress steps={STEPS.map((key) => t(`steps.${key}`))} current={step} reachable={editing ? PUBLISH_STEP : step} onSelect={goTo} />

      {/* Steps 1–3: the live preview stays in view. Step 4: the card moves into the form column, the summary takes its place. */}
      <FormGrid
        wide
        form={formColumn}
        preview={
          step < PUBLISH_STEP ? (
            <PreviewColumn>
              <div className={PREVIEW_CARD_WIDTH}>{card}</div>
              <Checklist items={checklistItems} onJump={jumpTo} />
            </PreviewColumn>
          ) : (
            <PublishAside stay={previewStay} form={form} />
          )
        }
      />
      {/* Below lg the summary follows the card (the sticky column is desktop only). */}
      {step === PUBLISH_STEP && (
        <div className="mt-6 lg:hidden">
          <PublishAside stay={previewStay} form={form} />
        </div>
      )}

      <Sheet open={previewOpen} onClose={() => setPreviewOpen(false)} title={t("livePreview")}>
        <div className="mx-auto max-w-90">{card}</div>
        <Checklist items={checklistItems} onJump={jumpTo} expanded />
      </Sheet>
    </FormContainer>
  );
}

/** The host as the preview card should show them – also before login, once there's a face photo. */
function previewHostOf(about: About, me: User | undefined, fallbackName: string): User | undefined {
  if (!me && !about.photos[0]) return undefined;
  const base: User = me ?? { id: "preview", name: "", age: 0, country: "", city: "", languages: [], bio: "", photos: [], verified: false };
  return {
    ...base,
    name: about.name.trim() || base.name || fallbackName,
    photos: about.photos.length > 0 ? about.photos : base.photos,
  };
}

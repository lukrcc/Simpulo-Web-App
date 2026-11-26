"use client";


import { cleanSpace } from "@/config/space";
import { useDepthChoice } from "@/config/platform";
import { depthLocked } from "@/lib/depth";
import { suggestedDepth } from "@/config/depth";
import Link from "next/link";
import { Eye, UserPlus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMessages, useTranslations } from "next-intl";
import { Suspense, useEffect, useEffectEvent, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import {
  AccommodationDetail,
  CoverStep,
  CrewGroupDetail,
  CrewStep,
  DatesDetail,
  DetailsList,
  ExtrasStep,
  SpaceStep,
  HostDetail,
  LanguagesDetail,
  LookingForDetail,
  PhotosDetail,
  PlaceStep,
  PlaceSaveStep,
  PeopleStep,
  PriceStep,
  KindStep,
  DepthStep,
  ProfileNote,
  ReadySummary,
  RulesDetail,
  SourceStep,
  TemplatePicker,
  extrasAdded,
  TitleDetail,
  VibeStep,
  WhereStep,
  WhyDetail,
  useTitleSuggestions,
  type StepProps,
} from "@/components/create/HouseSteps";
import {
  AGAIN_PARAM,
  WITH_PARAM,
  EDIT_REQUIRED_STEPS,
  EXTRAS,
  EXTRAS_STEP,
  INVITE_STEP,
  INVITE_PARAM,
  REQUIRED_STEPS,
  SOURCE_STEP,
  WINDOW_PARAM,
  placeForm,
  placeRent,
  rentSourceOf,
  monthBounds,
  flowRequired,
  againForm,
  clearDraft,
  currencyOf,
  detailsFor,
  fieldId,
  firstOpenStep,
  formFromStay,
  hasContent,
  initialForm,
  invitesOf,
  isDetail,
  placeShare,
  kindBudget,
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
import { copyText } from "@/lib/clipboard";
import { useSearchDemand } from "@/components/create/SearchDemandHint";
import { OpenedInvite } from "@/components/InviteSheet";

import { useDismiss } from "@/components/explore/Filters";
import { useHostShare } from "@/components/share/HostShareTools";
import { BuildingCard } from "@/components/create/BuildingCard";
import { OPEN_HOUSE_STEPS, SECONDS_PER_STEP, openHouseSteps } from "@/config/open-house-steps";
import { PanelCapsule } from "@/components/ui/PanelCapsule";
import { useViewerPrice } from "@/components/ui/PriceLine";
import { HouseCard } from "@/components/HouseCard";
import { PayoutSetupSheet } from "@/components/payouts/PayoutSetup";
import { usePayoutAccount } from "@/lib/payments/hooks";
import { Button } from "@/components/ui/ActionButton";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { useFeatureFlag } from "@/lib/featureFlags";
import { useFormat } from "@/i18n/format";
import { CATEGORY_IMAGE, TYPE_IMAGE, accommodationOf, type AccommodationCategoryId } from "@/config/accommodation";
import { getCrew, getCurrentUser, houseInviteUrl, isCrewMember, useStore, type PersonEntry } from "@/lib/store";
import { yourPeople } from "@/lib/yourPeople";
import { maxCrewOf, placeById, placesOf, windowsOf } from "@/lib/ownPlaces";
import { nightsBetween } from "@/lib/utils";
import { locationOf } from "@/lib/catalog";
import { coversFromHouses } from "@/lib/coverSuggestions";
import type { Stay, User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { usePreferredCurrency } from "@/lib/usePreferredCurrency";
import { useMonthName } from "@/components/explore/SearchFields";
import { MenuLayer } from "@/components/ui/MenuLayer";
import { useVisualViewport } from "@/lib/useVisualViewport";
import { useCodeGate } from "@/components/consent/Agreements";

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
  const tDepth = useTranslations("create.depth");
  const tHome = useTranslations("create.home");
  const format = useFormat();
  const monthName = useMonthName();
  const hostPremium = useFeatureFlag("hostPremium");
  const details = detailsFor(hostPremium);
  // Social depth (config/platform.ts): its step only while the choice is on; fixed after the first booking (lib/depth.ts).
  const depthOn = useDepthChoice();
  // A new House: one step, one question (config/open-house-steps.ts) – which steps apply follows the answers ("I have a place", one's own place).
  const newFlowOf = (f: FormState) => openHouseSteps({ placeMode: f.placeMode, ownPlace: Boolean(f.placeId), depthOn }).map((s) => s.id as StepKey);
  const depthIsLocked = editing ? depthLocked(editing, store) : false;
  /** Where an optional detail leads back to: the list when editing, "Ready to open?" for a new House. */
  const home: StepKey = editing ? "details" : "ready";
  const preferredCurrency = usePreferredCurrency();

  const minSpots = editing ? Math.max(2, editing.spotsFilled) : 2;
  const messages = useMessages();
  const [starters] = useState(() => Object.values(messages.create.starters).flatMap((s) => s.lookingFor));
  const me = getCurrentUser(store);
  /** A link's answers count as done: the flow starts at the first step that isn't. */
  const startFor = (filled: FormState) => firstOpenStep({ form: filled, me, minSpots, today: todayString(), starters, place: store.places.find((p) => p.id === filled.placeId) }, newFlowOf(filled).filter((k) => k !== "ready"));

  // Coming back: straight into the flow, where it was left off. A link with its own answers asks which it'll be, right in the flow.
  const [draft] = useState(() => (restore && !editing ? readDraft() : null));
  // Read here on a full page load; after a client-side navigation the URL only arrives through LinkParams below.
  const [prefill] = useState(() => (restore && !editing ? prefillOf(window.location.search, todayString()) : null));
  const [prefillApplied, setPrefillApplied] = useState(prefill !== null);
  const [continuing, setContinuing] = useState<string | null>(draft ? draft.savedAt : null);
  const [conflict, setConflict] = useState<Partial<FormState> | null>(draft && prefill ? prefill : null);
  const [form, setForm] = useState<FormState>(() => (editing ? formFromStay(editing) : draft ? draft.form : { ...initialForm, ...prefill }));
  // Editing from Manage's "Your House page" list (?detail=space | extras): straight to that part, its button back to the list.
  const [detailParam] = useState<StepKey | null>(() => {
    if (!editing || typeof window === "undefined") return null;
    const detail = new URLSearchParams(window.location.search).get("detail");
    return detail === "space" ? "space" : detail === "extras" ? EXTRAS_STEP : null;
  });
  const [step, setStep] = useState<StepKey>(() => (editing ? (detailParam ?? "details") : draft ? startFor(draft.form) : prefill ? startFor({ ...initialForm, ...prefill }) : "vibe"));
  // The steps of this form (a new House: the flow; editing: its own list), and the optional details behind them.
  const flowAll = newFlowOf(form);
  const flowSteps0: StepKey[] = flowAll.filter((k) => k !== "ready");
  const requiredSteps: readonly StepKey[] = editing ? flowRequired(EDIT_REQUIRED_STEPS, depthOn) : flowSteps0;
  const steps: StepKey[] = [...requiredSteps, ...details];
  const [templates, setTemplates] = useState<HouseTemplate[]>(() => (restore && !editing ? readTemplates() : []));
  // Opened: the success screen, and how many heard first.
  const [openedId, setOpenedId] = useState<string | null>(null);
  const [notified, setNotified] = useState(0);
  // "Invite by link": the token of the link made with the House – copied from the success screen.
  const [linkToken, setLinkToken] = useState<string | null>(null);
  // A required answer opened from the list (editing): its button leads back to the list.
  const [fromList, setFromList] = useState(detailParam !== null);
  // "Open again" (/create?again=<House>): applied once the user and that House are known (the user is restored
  // after hydration), over any draft.
  const [againId, setAgainId] = useState<string | null>(null);
  const [againApplied, setAgainApplied] = useState(false);
  // …with ?with=a,b: only those of the old crew picked (the mutual choices).
  const [againWith, setAgainWith] = useState<string[] | null>(null);
  // "Invite to a House" from People (/create?invite=<user>): that person is invited on publish, once they're known.
  const [inviteId, setInviteId] = useState<string | null>(null);
  const [inviteApplied, setInviteApplied] = useState(false);
  // "Open a window" (/create?window=<place>): applied once the user and their place are known, over any draft.
  const [windowId, setWindowId] = useState<string | null>(null);
  const [windowApplied, setWindowApplied] = useState(false);
  // "Host from your place": a new flow of a host with saved places starts with the choice (once, before step 1).
  const [sourceAsked, setSourceAsked] = useState(false);
  // A field to focus once the step it is on has rendered (set from event handlers).
  const pendingFocus = useRef<string | null>(null);
  function readLinkParams(params: URLSearchParams) {
    setAgainId(params.get(AGAIN_PARAM));
    setAgainWith(params.get(WITH_PARAM)?.split(",").filter(Boolean) ?? null);
    setInviteId(params.get(INVITE_PARAM));
    setWindowId(params.get(WINDOW_PARAM));
    // "Add a host fee" (Payouts, share hosts): straight to "Crew and price", the host fee field focused.
    if (params.get("step") === "price" && !editing) {
      pendingFocus.current = fieldId("hostFee");
      setStep("price");
    }
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
  const bodyRef = useRef<HTMLDivElement>(null);
  const shownStep = useRef(step);
  const [previewOpen, setPreviewOpen] = useState(false);
  // Read on the client only: the page is prerendered, and a clock value must not be baked into it.
  // "" (server / hydration) simply means "no earliest date yet".
  const today = useSyncExternalStore(noSubscribe, todayString, () => "");
  // The House being repeated: from the link, or from a restored draft that started as one.
  const againSourceId = againId ?? (form.againFrom || null);
  const againSource = againSourceId && me ? store.stays.find((s) => s.id === againSourceId && isCrewMember(store, s, me.id)) : undefined;
  // Who can be invited on publish: the host's people (lived together, both confirmed; not removed or blocked – lib/yourPeople.ts).
  const yours = useMemo(() => (!me || editing ? [] : yourPeople(store, me.id)), [store, me, editing]);
  const invitePeople: PersonEntry[] = yours.map((p) => ({ user: p.user, houses: [p.house] }));
  // "Host from your place": the host's saved places, and how many windows each has had.
  const placeRecords = { places: store.places, stays: store.stays };
  const myPlaces = editing ? [] : placesOf(placeRecords, me?.id);
  const hasSource = myPlaces.length > 0;
  const windowCounts = Object.fromEntries(myPlaces.map((p) => [p.id, windowsOf(placeRecords, p.id).length]));
  /** The newest window of a place – "Open a window" starts from its theme, title and texts. */
  const lastWindowOf = (placeId: string) => windowsOf(placeRecords, placeId).at(-1);
  // Inviting happens after publishing, in "Fill your House" (components/InviteSheet: Your people, Saved, who's in for it, search, the link);
  // the old crew of "Do it again" and a ?invite= person are picked there already. No invite step inside the flow any more.
  const hasInviteStep = false;
  if (againId && againSource && !againApplied) {
    setAgainApplied(true);
    const crewIds = getCrew(store, againSource)
      .map((u) => u.id)
      .filter((id) => id !== me?.id && (!againWith || againWith.includes(id)) && invitePeople.some((p) => p.user.id === id));
    // Everything of the old House but the dates – the flow starts at "Where and when".
    setForm(againForm(againSource, crewIds));
    setContinuing(null);
    setConflict(null);
    setStep("where");
  }
  const windowPlace = windowId && me ? myPlaces.find((p) => p.id === windowId) : undefined;
  if (windowPlace && !windowApplied) {
    setWindowApplied(true);
    const filled = placeForm(windowPlace, lastWindowOf(windowPlace.id));
    setForm(filled);
    setContinuing(null);
    setConflict(null);
    setSourceAsked(true);
    setStep(startFor(filled));
  }
  if (restore && !editing && !sourceAsked && !windowId && !againId && myPlaces.length > 0 && step === "vibe" && !hasContent(form)) {
    setSourceAsked(true);
    setStep(SOURCE_STEP);
  }
  if (inviteId && !inviteApplied && invitePeople.some((p) => p.user.id === inviteId)) {
    setInviteApplied(true);
    setForm((f) => ({ ...f, inviteIds: f.inviteIds.includes(inviteId) ? f.inviteIds : [inviteId, ...f.inviteIds] }));
  }
  // Who "Fill your House" starts with picked: the old crew (Do it again) or the ?invite= person.
  const preselect = invitesOf(form, invitePeople);
  // The saved place this House is a window of (form.placeId) – its rental period, rent and free rooms.
  const ownPlace = placeById(placeRecords, form.placeId);
  const errorsOf = (key: StepKey): FieldErrors => stepErrors(key, { form, me, minSpots, today, editing, starters, place: ownPlace });
  const titleMax = titleMaxFor(editing);
  const titleIdeas = useTitleSuggestions(form, titleMax);
  const input = () => toInput(form, { me, editing, today, fallbackTitle: titleIdeas[0] ?? "", preferredCurrency, depthOn });
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
  }

  useEffect(() => {
    // A field to focus waits until its step has rendered (a link can ask for one before the step changed).
    if (pendingFocus.current && document.getElementById(pendingFocus.current)) {
      focusField(pendingFocus.current);
      pendingFocus.current = null;
    } else if (pendingFocus.current) {
      // Not there yet: the next render.
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
    if (error.key === "spots") return tErrors("spots", { min: error.min });
    if (error.key === "spotsRooms") return tErrors("spotsRooms", { max: error.max });
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
    router.push(`/h/${editing.id}?tab=manage`);
  }

  // The hosts' community guidelines before the first House goes live (and after a new version).
  const hostCode = useCodeGate("hostCode");

  function publishDraft() {
    if (!editing || !profileReady || !validateAll()) return;
    if (store.currentUserId) return hostCode.gate(store.currentUserId, publishDraftNow);
  }

  function publishDraftNow() {
    if (!editing) return;
    store.updateStay(editing.id, input());
    store.publishStay(editing.id);
    showToast(tDraft("publishedToast"));
    router.push(`/house/${editing.slug}`);
  }

  function publish() {
    if (!profileReady || !validateAll()) return;
    // Logged out: log in first, then publish – the draft is still in state, nothing is lost.
    requireAuth((userId) => hostCode.gate(userId, () => {
      // "I live here": the place is saved to Your places first (only with the host's statement), and this House is its first window.
      const savedPlaceId = form.placeMode === "set" && form.savePlace && !form.placeId && form.allowedToHost ? savePlace() : null;
      const { id, linkToken } = store.createStay({ ...input(), ...(savedPlaceId && { placeId: savedPlaceId }) }, [], { invite: [], againFrom: form.againFrom || undefined, link: false });
      setLinkToken(linkToken ?? null);
      clearDraft();
      setNotified(demand.count);
      setOpenedId(id);
      window.scrollTo({ top: 0 });
    }), { reason: "open" });
  }

  /** The place found for this House, saved as the host's own: kind, photos, rooms (free spots + the host's), rules, city, rental, rent. */
  function savePlace(): string | null {
    const kind = accommodationOf(form.accommodationType);
    const where = form.city.trim() || form.region.split(",")[0].trim();
    const label = kind ? kind.type.label.charAt(0).toUpperCase() + kind.type.label.slice(1) : tHome("placeFallback");
    return store.addPlace({
      name: tHome("placeName", { kind: label, city: where }),
      accommodationType: kind?.type.id ?? "",
      photos: [...form.photos, ...(form.accommodationPhoto ? [form.accommodationPhoto] : [])].filter((photo) => !photo.startsWith("blob:")),
      rooms: form.spotsTotal,
      freeSpots: Math.max(1, form.spotsTotal - 1),
      rules: form.rulesText.split("\n").map((rule) => rule.trim()).filter(Boolean),
      address: { city: form.city.trim(), region: form.region.trim() },
      rentFrom: form.rentFrom,
      rentTo: form.rentTo,
      monthlyRent: Math.round(Number(form.monthlyRent)),
      currency: previewStay.currency,
      allowedToHost: form.allowedToHost,
      // "About the space" goes with the place – the next House from it starts with it.
      space: cleanSpace(form.space),
    });
  }

  function next() {
    if (Object.keys(currentErrors).length > 0) return showProblems(step, currentErrors);
    // "Host from your place": a saved place fills in what it knows – the flow goes on at the first step still open.
    if (step === SOURCE_STEP) {
      const place = form.source === "own" ? placeById(placeRecords, form.placeId) : undefined;
      if (!place) return open("vibe");
      const filled = placeForm(place, lastWindowOf(place.id));
      const target = startFor(filled);
      setForm(target === "price" ? { ...filled, ...placeRent(filled, today, place) } : filled);
      return open(target);
    }
    if (isDetail(step) || fromList || step === EXTRAS_STEP) {
      setFromList(false);
      return open(home);
    }
    goOn(step);
  }

  /** On to the step after `from` in the flow (with what entering "Price" fills in). */
  function goOn(from: StepKey) {
    const following = flowSteps0[flowSteps0.indexOf(from) + 1] ?? "ready";
    // Into "Price" with a kind of place and no budget yet: the budget starts from its price level (changeable).
    // A place with a rent behind it ("Host from your place"): the price from the rent, pro rata by nights (lib/price.ts).
    if (following === "price") patch({ ...kindBudget(form, previewStay.currency), ...placeRent(form, today, ownPlace) });
    open(following);
  }

  /** Back one step – every answer stays. */
  function back() {
    if (isDetail(step) || fromList || step === EXTRAS_STEP) {
      setFromList(false);
      return open(home);
    }
    if (step === "ready") return open(editing ? "cover" : (flowSteps0.at(-1) ?? "vibe"));
    const i = flowSteps0.indexOf(step);
    if (i <= 0) return hasSource ? open(SOURCE_STEP) : undefined;
    open(flowSteps0[i - 1]);
  }

  /** The card needs a face photo and a name – publishing waits for them (logged out: checked after login). */
  const profileReady = !me || (Boolean(me.photos[0]) && me.name.trim() !== "");

  /** Enter moves on – not from a textarea, a button, or an open suggestion list. */
  function onKeyDown(e: { key: string; defaultPrevented: boolean; shiftKey: boolean; target: EventTarget | null; preventDefault: () => void }) {
    if (e.key !== "Enter" || e.defaultPrevented || e.shiftKey || step === "details" || step === "ready") return;
    const target = e.target as HTMLElement;
    // Not from a sheet or dialog over the page (the place search's list, "More places").
    if (target.closest?.("[role=dialog]")) return;
    // A picked choice (a capsule, an option card, a tile) is an answer: Enter goes on. Other buttons and links keep their own Enter.
    const choice = target.closest("button[aria-pressed], button[role=radio]");
    if (!choice && target.closest("textarea, button, a, [role=switch]")) return;
    e.preventDefault();
    next();
  }

  // Enter = Next from anywhere on the page – Safari doesn't focus a clicked button, so the key lands on the body, not in the question.
  const onWindowKey = useEffectEvent((e: globalThis.KeyboardEvent) => {
    if (openedId) return;
    onKeyDown(e);
  });
  useEffect(() => {
    const listener = (e: globalThis.KeyboardEvent) => onWindowKey(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

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
    // Invites come after publishing ("Fill your House").
    spotsInvited: editing ? editing.spotsInvited : 0,
    currency: editing?.accommodationStatus === "locked" ? editing.currency : currencyOf(form, me, preferredCurrency),
    status: "draft",
    acceptingRequests: true,
    featured: false,
    createdAt: "",
  };
  const demand = useSearchDemand({ city: form.city, region: form.region, startDate: previewStay.startDate, endDate: previewStay.endDate, vibe: form.vibe });
  const themeName = form.customVibe?.trim() || (form.vibe ? format.vibe(form.vibe) : "");
  const tFlow = useTranslations("create.flow");
  const tCommon = useTranslations("common");
  const viewerPrice = useViewerPrice(previewStay);
  const share = placeShare(form);
  const tKind = useTranslations("create.kind");
  // "Host from your place": the rental period on "Where and when?", what the price came from on "Crew and price".
  const rentSource = rentSourceOf(form, ownPlace);
  const windowBounds = form.datesMode === "exact" ? { start: form.startDate, end: form.endDate } : monthBounds(form.month, today, form.monthEnd);
  const windowNights = windowBounds.start && windowBounds.end ? nightsBetween(windowBounds.start, windowBounds.end) : 0;
  const rentalNote = rentSource?.rentFrom && rentSource.rentTo ? tHome("rental", { range: format.longRange(rentSource.rentFrom, rentSource.rentTo) ?? "" }) : undefined;
  const rentNote = rentSource && windowNights > 0 ? tHome("fromRent", { rent: format.price(rentSource.monthlyRent, ownPlace?.currency ?? previewStay.currency), nights: windowNights }) : undefined;
  const kindPlace = accommodationOf(form.accommodationType);
  // "Villa" – or "Picked with the crew" for "Not sure yet".
  const kindLine = kindPlace ? kindPlace.type.label.charAt(0).toUpperCase() + kindPlace.type.label.slice(1) : form.accommodationCategory === "unsure" ? tKind("unsureLine") : "";
  const placeLine = form.placeMode === "set" ? (share ? tFlow("placeSet", { total: format.price(share.total, previewStay.currency) }) : tFlow("placeSetTitle")) : form.placeMode === "together" ? tFlow("placeTogether") : "";
  // Until there's a cover, the preview shows what's chosen: the picture of the kind of place, else a picture of the theme (and the place,
  // once there is one) from the Houses – never an empty surface once there's an answer.
  const kindCategory = kindPlace?.category.id ?? (form.accommodationCategory && form.accommodationCategory !== "unsure" ? form.accommodationCategory : "");
  const previewImage = (form.accommodationType && TYPE_IMAGE[form.accommodationType]) || (kindCategory && CATEGORY_IMAGE[kindCategory as AccommodationCategoryId]) || (form.vibe && form.customVibe === null ? suggestions[0] : undefined) || undefined;
  // The preview of a new House builds itself up from the answers; editing shows the House as it is.
  const card = editing ? (
    <HouseCard stay={previewStay} host={me} crew={me ? [me] : []} preview photoPlaceholder={t("photoPlaceholder")} />
  ) : (
    <BuildingCard
      stay={previewStay}
      host={me}
      theme={themeName || null}
      showTitle={form.title.trim() !== ""}
      showMeta={form.region.trim() !== "" || form.month !== ""}
      showDates={form.month !== ""}
      showPrice={form.placeMode === "set" ? share !== null : form.placeMode === "together" && (form.budgetMin !== "" || form.budgetTbd)}
      showCrew
      fallbackImage={previewImage}
      // "Place booked" only with a place of one's own; nothing otherwise ("est." says the price may move).
      placeLabel={form.placeMode === "set" ? tFlow("cardBooked") : null}
      kindLabel={kindLine || null}
    />
  );

  const locked = editing?.accommodationStatus === "locked";
  const stepProps: StepProps = { form, patch, errorOf, touch };
  const invalid = steps.filter((key) => Object.keys(errorsOf(key)).length > 0 && (Boolean(editing) || isDetail(key)));
  const placeAndTime = [format.placeLabel(previewStay), form.datesMode === "exact" || form.monthEnd ? format.stayDatesLong(previewStay) : form.month && monthName(form.month)].filter(Boolean).join(" · ");
  const required = editing
    ? [
        { step: "vibe" as const, value: form.customVibe?.trim() || (form.vibe ? format.vibe(form.vibe) : "") },
        { step: "where" as const, value: placeAndTime },
        { step: "crew" as const, value: `${format.people(form.spotsTotal)} · ${format.priceLabel(previewStay)}` },
        // The social depth – only while the choice is on; after the first booking with "Fixed" (lib/depth.ts).
        ...(depthOn ? [{ step: "depth" as const, value: [tDepth(`${form.depth ?? editing.depth ?? suggestedDepth(form.vibe || null)}.title`), depthIsLocked ? tDepth("fixed") : ""].filter(Boolean).join(" · ") }] : []),
      ]
    : undefined;
  const body = (
    <>
      {step === SOURCE_STEP && <SourceStep {...stepProps} places={myPlaces} windows={windowCounts} />}
      {step === "vibe" && <VibeStep {...stepProps} />}
      {step === "place" && <PlaceStep {...stepProps} />}
      {step === "placeSave" && <PlaceSaveStep {...stepProps} currency={previewStay.currency} />}
      {step === "when" && <WhereStep {...stepProps} today={today} editing={false} rentalNote={rentalNote} part="when" />}
      {step === "price" && <PriceStep {...stepProps} currency={previewStay.currency} rentNote={rentNote} previewStay={previewStay} hostFees={hostPremium} />}
      {step === "kind" && <KindStep {...stepProps} />}
      {step === "depth" && depthOn && <DepthStep {...stepProps} locked={depthIsLocked} />}
      {step === EXTRAS_STEP && <ExtrasStep {...stepProps} />}
      {step === "space" && <SpaceStep {...stepProps} />}
      {step === "where" && <WhereStep {...stepProps} today={today} editing={Boolean(editing)} rentalNote={rentalNote} part={editing ? "both" : "where"} />}
      {step === "cover" && <CoverStep {...stepProps} suggestions={suggestions} />}
      {step === "crew" && !editing && <PeopleStep {...stepProps} minSpots={minSpots} maxSpots={form.placeId && ownPlace ? maxCrewOf(ownPlace) : undefined} />}
      {step === "crew" && editing && <CrewStep {...stepProps} currency={previewStay.currency} locked={locked} minSpots={minSpots} editing={Boolean(editing)} rentNote={rentNote} maxSpots={form.placeId && ownPlace ? maxCrewOf(ownPlace) : undefined} />}
      {step === "title" && <TitleDetail {...stepProps} titleMax={titleMax} />}
      {step === "photos" && <PhotosDetail {...stepProps} />}
      {step === "why" && <WhyDetail {...stepProps} />}
      {step === "dates" && <DatesDetail {...stepProps} today={today} />}
      {step === "accommodation" && <AccommodationDetail {...stepProps} currency={previewStay.currency} locked={locked} today={today} />}
      {step === "host" && <HostDetail {...stepProps} currency={previewStay.currency} allowed />}
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
            // A calm list, each row with "Edit" back to its step (and back here with "Done"). What's optional comes after opening, in Manage.
            rows={[
              { key: "theme", label: tReady("theme"), value: themeName, step: "vibe" as StepKey },
              ...(form.placeId ? [] : [{ key: "place", label: tReady("place"), value: placeLine, step: "place" as StepKey }]),
              { key: "where", label: tReady("where"), value: format.placeLabel(previewStay), step: "where" as StepKey },
              { key: "when", label: tReady("when"), value: form.datesMode === "exact" || form.monthEnd ? format.stayDatesLong(previewStay) : form.month ? monthName(form.month) : "", step: "when" as StepKey },
              ...(form.placeId ? [] : [{ key: "kind", label: tReady("kind"), value: kindLine, step: "kind" as StepKey }]),
              { key: "crew", label: tReady("crew"), value: format.people(form.spotsTotal), step: "crew" as StepKey },
              { key: "price", label: tReady("price"), value: `${viewerPrice.label}${viewerPrice.estimated ? ` ${tCommon("estimated")}` : ""}`, step: "price" as StepKey },
              { key: "cover", label: tReady("cover"), value: form.title.trim(), step: "cover" as StepKey },
              ...(depthOn ? [{ key: "depth", label: tReady("depth"), value: tDepth(`${form.depth ?? suggestedDepth(form.vibe || null)}.title`), step: "depth" as StepKey }] : []),
            ]}
          />
        </div>
      )}
    </>
  );

  const tVerify = useTranslations("verification");
  const stepValid = Object.keys(currentErrors).length === 0;
  const canGoBack = step !== SOURCE_STEP && (step !== "vibe" || hasSource) && !(editing && step === "details");
  const onList = step === "details";
  // A new House: the thin line under the header (the share of steps done) and, small above the question, "The place · Step 4 of 10 ·
  // about 2 min left" (the steps left × SECONDS_PER_STEP). "I have a place" adds its step to the count.
  const flowSteps: StepKey[] = flowAll;
  const flowIndex = flowSteps.indexOf(step);
  const progress = !editing && flowIndex >= 0 ? flowIndex / Math.max(1, flowSteps.length - 1) : null;
  const flowStep = OPEN_HOUSE_STEPS.find((s) => s.id === step);
  const secondsLeft = (flowSteps.length - flowIndex) * SECONDS_PER_STEP;
  const stepLine =
    !editing && flowStep && flowIndex >= 0
      ? tFlow("stepLine", { part: tFlow(`parts.${flowStep.part}`), current: flowIndex + 1, total: flowSteps.length, left: secondsLeft < 60 ? tFlow("underMinute") : tFlow("minLeft", { count: Math.round(secondsLeft / 60) }) })
      : null;
  // Phones: the fixed Next stands on the keyboard (--vv-kb).
  useVisualViewport(true);
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
    <>
      {/* "About the space": Skip goes on without it (whatever was answered stays). */}
      {step === "space" && !editing && !fromList && (
        <Button variant="tertiary" onClick={() => goOn("where")}>
          {tFlow("skip")}
        </Button>
      )}
      {!editing && (step === EXTRAS_STEP || step === INVITE_STEP) && (
        <Button variant="tertiary" onClick={() => (step === EXTRAS_STEP && hasInviteStep ? open(INVITE_STEP) : open("ready"))}>
          {tFlow("skip")}
        </Button>
      )}
      {/* Looks disabled until the step is valid, but a tap still shows what's missing. */}
      <Button size="md" onClick={next} aria-disabled={!stepValid || undefined} className="aria-disabled:cursor-not-allowed aria-disabled:bg-ink/10 aria-disabled:text-muted aria-disabled:hover:bg-ink/10">
        {(isDetail(step) && !(step === "space" && !editing)) || fromList ? tDetails("done") : t("next")}
      </Button>
    </>
  );

  // Coming back to a draft: once, a toast with the way to start over (instead of a line over the steps).
  const draftToast = useEffectEvent(() => showToast(tFlow("draftRestored"), undefined, undefined, { action: { label: tFlow("startOver"), onClick: () => startOver() }, ms: 6000 }));
  useEffect(() => {
    if (continuing !== null && !editing && !conflict) draftToast();
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // No box: the question lies free on the page. Each new one cross-fades in (200ms; the key restarts it). Back and Next always sit in one
  // row at the bottom of the column – level with the card's bottom edge while the question is shorter than the card.
  const question = (
    <section className="flex flex-col split:min-h-(--create-card-h)">
      <div key={step} className="animate-[fade-in_200ms_ease-out] motion-reduce:animate-none">
        {stepLine && <p className="mb-2 text-small text-muted">{stepLine}</p>}
        <h1 className="text-h1 text-ink">{step === INVITE_STEP && form.againFrom ? t("questions.inviteAgain") : t(`questions.${(!editing && flowStep ? flowStep.title : step) as "vibe"}`)}</h1>
        <div ref={bodyRef} className="mt-6">
          {body}
        </div>
        {step === "ready" && (
          <div className="mt-8 space-y-3">
            <ProfileNote me={me} />
            {/* Voluntary: never a lock on publishing, only why it helps. */}
            {me && !me.verified && (
              <p className="text-small text-muted">
                {tVerify.rich("createHint", { link: (chunks) => <Link href="/settings/payments" className="font-semibold text-ink underline-offset-4 hover:underline">{chunks}</Link> })}
              </p>
            )}
          </div>
        )}
      </div>
      {/* Back and Next: a fixed bar at the bottom on every width (CLAUDE.md "Open a House – gemeinsame UI-Regel"), always at the same place –
          the page's tone, no line; its buttons on the question's column. Phones: over the safe area and, with the keyboard open, right on it. */}
      <div data-create-bar className="fixed inset-x-0 bottom-(--vv-kb,0px) z-30 bg-(--bg) pb-[max(12px,var(--safe-bottom))] pt-3 md:pb-4 md:pt-4">
        <div className="mx-auto w-[min(100%-2*var(--page-margin),1200px)] md:max-split:w-[min(100%-2*var(--page-margin),640px)] split:grid split:grid-cols-[62fr_38fr] split:gap-16">
          <div className="flex flex-nowrap items-center gap-3">
            {canGoBack && (
              <Button variant="tertiary" onClick={back} className="-ml-4">
                {t("back")}
              </Button>
            )}
            <span className="flex-1" />
            {actions}
          </div>
        </div>
      </div>
    </section>
  );

  const openedStay = openedId ? store.stays.find((s) => s.id === openedId) : undefined;
  if (openedStay) return <OpenedScreen stay={openedStay} notified={notified} host={me} form={form} linkToken={linkToken} preselect={preselect} />;

  return (
    <>
      {restore && !editing && (
        <Suspense fallback={null}>
          <LinkParams onRead={readLinkParams} />
        </Suspense>
      )}
      {progress !== null && (
        // Phones: along the foot of the focus bar (56px under the status bar's strip).
        <div aria-hidden className="fixed inset-x-0 top-(--header-total) z-30 h-0.5 bg-ink/8 max-md:top-[calc(var(--header-total)+3.5rem-2px)] max-md:z-41">
          <div className="h-full bg-ink transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none" style={{ width: `${progress * 100}%` }} />
        </div>
      )}
      <span className="sr-only" aria-live="polite">
        {progress !== null ? tFlow("progress", { current: flowIndex + 1, total: flowSteps.length }) : ""}
      </span>
      <CreateLayout
        bar
        aside={
          <>
            <div className={CARD_BOX}>{card}</div>
            {!editing && me && (me.socials ?? []).length === 0 && (
              <p className={cn(CARD_BOX, "mt-3 text-small text-muted")}>
                {t.rich("socialsHint", { link: (chunks) => <a href="/settings/profile" target="_blank" rel="noopener noreferrer" className="text-ink underline underline-offset-4">{chunks}</a> })}
              </p>
            )}
          </>
        }
      >
        {/* A link with answers of its own while a draft came back: which it'll be. */}
        {conflict && continuing !== null && !editing && <DraftLine savedAt={continuing} conflict={conflict} onKeep={() => setConflict(null)} onStartOver={startOver} />}
        {/* Phones and narrow windows: the live preview behind a button. */}
        <div className="mb-4 flex justify-end split:hidden">
          <Button variant="secondary" onClick={() => setPreviewOpen(true)}>
            <Eye />
            {t("previewButton")}
          </Button>
        </div>
        {!editing && step === "vibe" && templates.length > 0 && (
          <TemplatePicker
            className="mb-10"
            templates={templates}
            onPick={(template) => {
              // Everything but the dates; dates from a link stay, and so do invites.
              setForm((f) => ({ ...template.form, month: f.month, monthEnd: f.monthEnd, datesMode: f.datesMode, startDate: f.startDate, endDate: f.endDate, inviteIds: f.inviteIds, againFrom: f.againFrom }));
              setStep("place");
            }}
            onRemove={(id) => setTemplates(removeTemplate(id))}
          />
        )}
        {question}
      </CreateLayout>

      <Sheet open={previewOpen} onClose={() => setPreviewOpen(false)} title={t("livePreview")}>
        <div className="mx-auto max-w-90">{card}</div>
      </Sheet>
      {hostCode.sheet}
    </>
  );
}

/** The preview card's fixed size: 360 × 450 (4:5) – the same in every step and on the success screen. */
const CARD_W = 360;
const CARD_BOX = "mx-auto w-[min(100%,360px)]";

/**
 * Open a House's page: one centred container (at most 1200px, the header's margins), two columns 62 : 38 (the golden section), 64px apart,
 * both vertically centred in the area under the header. The card is sticky at the same place in every step; only the left side changes.
 * Under 1100px one column, the card behind "Preview".
 */
function CreateLayout({ aside, children, bar = false }: { aside: ReactNode; children: ReactNode; /** The steps: room for the fixed Back / Next bar */ bar?: boolean }) {
  return (
    <div
      // Phones: room under the last line for the fixed Back / Next bar. Tablet: one centred column, at most 640px (the preview behind "Preview").
      className="create-flow mx-auto w-[min(100%-2*var(--page-margin),1200px)] pb-32 pt-6 md:max-split:w-[min(100%-2*var(--page-margin),640px)] split:grid split:grid-cols-[62fr_38fr] split:gap-16 split:py-0 split:pb-(--create-bar-h)"
      style={{ ["--create-card-h" as string]: `${(CARD_W * 5) / 4}px`, ["--create-bar-h" as string]: bar ? "76px" : "0px" }}
    >
      <div className="flex min-w-0 flex-col justify-center split:min-h-[calc(100dvh-var(--header-total)-16px-var(--create-bar-h))] split:py-10">{children}</div>
      <aside className="hidden split:block">
        <div className="sticky top-[calc(var(--header-total)+16px)] flex h-[calc(100dvh-var(--header-total)-16px-var(--create-bar-h))] items-center justify-center">
          <div className="w-full">{aside}</div>
        </div>
      </aside>
    </div>
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
      <MenuLayer open={open} onClose={close} anchor={anchor} panelRef={panel} align="start" width={280} label={conflict ? t("conflictLabel") : t("discardTitle")} tone="light" panelProps={{ role: "dialog", "aria-label": conflict ? t("conflictLabel") : t("discardTitle") }} panelClassName="glass-panel animate-fade-in w-[min(280px,calc(100vw-32px))] rounded-[20px]! p-4">
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
      </MenuLayer>
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

function OpenedScreen({ stay, notified, host, form, linkToken, preselect }: { stay: Stay; notified: number; host?: User; form: FormState; /** "Invite by link" */ linkToken: string | null; /** Picked already in "Fill your House" */ preselect: string[] }) {
  const t = useTranslations("create.opened");
  const showToast = useToast();
  const store = useStore();
  const invite = linkToken ? store.houseInvites.find((i) => i.token === linkToken) : undefined;
  async function copyInvite() {
    if (!invite) return;
    try {
      await copyText(houseInviteUrl(window.location.origin, stay, invite));
      showToast(t("inviteCopied"));
    } catch {
      // The clipboard can be refused; nothing else to do.
    }
  }
  const { story, busy } = useHostShare(stay);
  const [saved, setSaved] = useState(false);
  // ONE last page (CLAUDE.md "Open a House Teil 2"): "Your House is open." – share, spots for friends, your people – and the way on.
  return (
    <CreateLayout
      aside={
        <div className={CARD_BOX}>
          <HouseCard stay={stay} host={host} crew={host ? [host] : []} preview />
        </div>
      }
    >
      <div data-flow-done className="question-in split:py-10">
        <OpenedInvite
          stay={stay}
          preselect={preselect}
          onStory={story}
          storyBusy={busy !== null}
          head={
            <div>
              <h1 className="text-h1 text-ink">{t("title")}</h1>
              <p className="mt-3 max-w-[560px] text-body-lg text-muted">{t("text")}</p>
              {notified > 0 && <p className="mt-3 text-body-lg font-semibold text-ink">{t("notified", { count: notified })}</p>}
              {/* Phones: the card under the sentence (the side column is hidden there). */}
              <div className={cn(CARD_BOX, "mt-8 split:hidden")}>
                <HouseCard stay={stay} host={host} crew={host ? [host] : []} preview />
              </div>
              {/* A host experience is paid to the host through Simpulo: payouts first (Stripe Connect). */}
              {(stay.hostFeePerPerson ?? 0) > 0 && <OpenedPayouts />}
            </div>
          }
          extra={
            invite ? (
              <PanelCapsule onClick={copyInvite}>
                <UserPlus aria-hidden className="size-4" />
                {t("copyInvite")}
              </PanelCapsule>
            ) : undefined
          }
          links={
            <>
              <Button variant="tertiary" href={`/h/${stay.id}?tab=manage`}>
                {t("yourHouses")}
              </Button>
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
            </>
          }
        />
      </div>
    </CreateLayout>
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

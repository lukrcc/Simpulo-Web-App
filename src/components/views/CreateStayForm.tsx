"use client";

import { ArrowLeft, Lock, LockOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { StayCard } from "@/components/StayCard";
import { buttonClass } from "@/components/ui/button";
import { useToast } from "@/components/ui/Toast";
import { DEFAULT_MAP_PREVIEW } from "@/lib/mock-extras";
import { findUser, useStore } from "@/lib/store";
import type { NewStayInput, Stay, Vibe } from "@/lib/types";
import { VIBES, cn, formatPrice, nightsBetween, pluralize, simpuloFee, splitList } from "@/lib/utils";


interface FormState {
  title: string;
  city: string;
  region: string;
  startDate: string;
  endDate: string;
  spotsTotal: number;
  vibe: Vibe;
  pricePerPerson: string;
  budgetMin: string;
  budgetMax: string;
  accommodationLink: string;
  locked: boolean;
  description: string;
  whyText: string;
  dayText: string;
  lookingForText: string;
  interests: string;
  houseRules: string;
}

const initialForm: FormState = {
  title: "",
  city: "",
  region: "",
  startDate: "",
  endDate: "",
  spotsTotal: 4,
  vibe: "remote-work",
  pricePerPerson: "",
  budgetMin: "",
  budgetMax: "",
  accommodationLink: "",
  locked: false,
  description: "",
  whyText: "",
  dayText: "",
  lookingForText: "",
  interests: "",
  houseRules: "",
};

const STEPS = ["Basics", "Price & accommodation", "Details"] as const;

const PITCH_FIELDS: ReadonlyArray<{ key: "whyText" | "dayText" | "lookingForText"; label: string; placeholder: string }> = [
  { key: "whyText", label: "Why I'm hosting this", placeholder: "What made you want to open this House?" },
  { key: "dayText", label: "A typical day", placeholder: "Morning, afternoon, evening – what does it look like?" },
  { key: "lookingForText", label: "Who I'm looking for", placeholder: "Who would be a great fit for the crew?" },
];

function validateStep(step: number, form: FormState): string | null {
  if (step === 0) {
    if (!form.title.trim()) return "Give your House a title.";
    if (!form.city.trim() || !form.region.trim()) return "Add a city and region.";
    if (!form.startDate || !form.endDate) return "Pick start and end dates.";
    if (nightsBetween(form.startDate, form.endDate) < 1) return "End date must be after the start date.";
  }
  if (step === 1) {
    if (form.locked) {
      if (!form.accommodationLink.trim()) return "Add the accommodation link to lock it.";
      if (!(Number(form.pricePerPerson) > 0)) return "A locked place needs a final price per person.";
    } else if (form.budgetMin || form.budgetMax) {
      const min = Number(form.budgetMin);
      const max = Number(form.budgetMax);
      if (!(min > 0) || !(max > 0)) return "Enter both ends of the budget – or leave it empty.";
      if (min > max) return "The budget minimum can't be above the maximum.";
    }
  }
  if (step === 2) {
    if (form.description.trim().length < 20) return "Describe your House in at least 20 characters.";
  }
  return null;
}

function toInput(form: FormState): NewStayInput {
  return {
    title: form.title.trim(),
    city: form.city.trim(),
    region: form.region.trim(),
    startDate: form.startDate,
    endDate: form.endDate,
    spotsTotal: form.spotsTotal,
    vibe: form.vibe,
    // A fixed price only exists for a locked place; otherwise there's at most a rough budget.
    pricePerPerson: form.locked ? Math.round(Number(form.pricePerPerson)) || undefined : undefined,
    budgetPerPerson:
      !form.locked && Number(form.budgetMin) > 0 && Number(form.budgetMax) > 0
        ? { min: Math.round(Number(form.budgetMin)), max: Math.round(Number(form.budgetMax)) }
        : undefined,
    accommodationLink: form.accommodationLink.trim() || undefined,
    accommodationStatus: form.locked ? "locked" : "open",
    description: form.description.trim(),
    whyText: form.whyText.trim(),
    dayText: form.dayText.trim(),
    lookingForText: form.lookingForText.trim(),
    interests: splitList(form.interests, /,/),
    houseRules: splitList(form.houseRules, /\n/),
  };
}

export function CreateStayForm() {
  const store = useStore();
  const router = useRouter();
  const showToast = useToast();
  const [form, setForm] = useState<FormState>(initialForm);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  }

  function next() {
    const problem = validateStep(step, form);
    if (problem) return setError(problem);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // On desktop all steps are visible at once, so validate everything.
    for (let i = 0; i < STEPS.length; i++) {
      const problem = validateStep(i, form);
      if (problem) {
        setStep(i);
        return setError(problem);
      }
    }
    const stay = store.createStay(toInput(form));
    showToast("Your House is open 🎉");
    router.push(`/stays/${stay.slug}`);
  }

  const input = toInput(form);
  const previewStay: Stay = {
    ...input,
    id: "preview",
    slug: "preview",
    hostId: store.currentUserId,
    lat: 0,
    lng: 0,
    mapPreviewUrl: DEFAULT_MAP_PREVIEW,
    spotsFilled: 1,
    currency: "EUR",
    status: "draft",
    featured: false,
    createdAt: "",
  };
  const me = findUser(store, store.currentUserId);
  const price = Number(form.pricePerPerson) || 0;
  const isLastStep = step === STEPS.length - 1;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 md:px-6 md:pt-10">
      <div className="flex items-center gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            aria-label="Previous step"
            className="-ml-2 rounded-full p-2 hover:bg-neutral-100 md:hidden"
          >
            <ArrowLeft className="size-5" />
          </button>
        )}
        <div>
          <p className="text-sm text-neutral-500 md:hidden">
            Step {step + 1} of {STEPS.length} · {STEPS[step]}
          </p>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Open a House</h1>
        </div>
      </div>

      {/* Mobile progress */}
      <div className="mt-4 flex gap-1.5 md:hidden">
        {STEPS.map((label, i) => (
          <span key={label} className={cn("h-1 flex-1 rounded-full", i <= step ? "bg-accent" : "bg-neutral-200")} />
        ))}
      </div>

      <div className="mt-6 md:grid md:grid-cols-[1fr_340px] md:gap-12">
        <form onSubmit={handleSubmit} noValidate className="space-y-8">
          <Step index={0} current={step} title="Basics">
            <Field label="Title">
              <input
                className={inputClass}
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="Remote Work Base by the Beach"
                maxLength={80}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="City">
                <input className={inputClass} value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Canggu" />
              </Field>
              <Field label="Region">
                <input className={inputClass} value={form.region} onChange={(e) => update("region", e.target.value)} placeholder="Bali, Indonesia" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start date">
                <input type="date" className={inputClass} value={form.startDate} onChange={(e) => update("startDate", e.target.value)} />
              </Field>
              <Field label="End date">
                <input
                  type="date"
                  className={inputClass}
                  value={form.endDate}
                  min={form.startDate || undefined}
                  onChange={(e) => update("endDate", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Crew size (incl. you)" group>
              <div className="flex gap-2">
                {[2, 3, 4, 5, 6].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={form.spotsTotal === n}
                    onClick={() => update("spotsTotal", n)}
                    className={cn(chipClass, form.spotsTotal === n && chipActiveClass, "flex-1")}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Vibe" group>
              <div className="flex flex-wrap gap-2">
                {VIBES.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    aria-pressed={form.vibe === v.key}
                    onClick={() => update("vibe", v.key)}
                    className={cn(chipClass, form.vibe === v.key && chipActiveClass)}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </Field>
          </Step>

          <Step index={1} current={step} title="Price & accommodation">
            <button
              type="button"
              role="switch"
              aria-checked={form.locked}
              onClick={() => update("locked", !form.locked)}
              className="flex w-full items-center gap-3 rounded-2xl border border-neutral-200 p-4 text-left"
            >
              {form.locked ? <Lock className="size-5 text-accent" /> : <LockOpen className="size-5 text-neutral-400" />}
              <span className="flex-1">
                <span className="block text-sm font-medium">Accommodation is locked</span>
                <span className="block text-xs text-neutral-500">
                  {form.locked ? "Guests see the booked place." : "Crew decides on the place together."}
                </span>
              </span>
              <span className={cn("relative h-6 w-11 rounded-full transition-colors", form.locked ? "bg-accent" : "bg-neutral-200")}>
                <span
                  className={cn(
                    "absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform",
                    form.locked ? "translate-x-5.5" : "translate-x-0.5",
                  )}
                />
              </span>
            </button>
            <Field label={form.locked ? "Accommodation link" : "Accommodation link (optional)"} hint="Airbnb, Booking.com or any listing URL.">
              <input
                type="url"
                className={inputClass}
                value={form.accommodationLink}
                onChange={(e) => update("accommodationLink", e.target.value)}
                placeholder="https://www.airbnb.com/rooms/…"
              />
            </Field>
            {form.locked ? (
            <Field
              label="Final price per person (whole House)"
              hint={
                price > 0
                  ? `Includes a ${formatPrice(simpuloFee(price))} Simpulo fee (10%).`
                  : "Simpulo adds a 10% fee, included in this price."
              }
            >
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">€</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  className={cn(inputClass, "pl-8")}
                  value={form.pricePerPerson}
                  onChange={(e) => update("pricePerPerson", e.target.value)}
                  placeholder="1200"
                />
              </div>
            </Field>
            ) : (
            <Field label="Rough budget per person (optional)" hint="Your best guess for the whole House. The final price comes once the place is locked." group>
              <div className="grid grid-cols-2 gap-3">
                {(["budgetMin", "budgetMax"] as const).map((key) => (
                  <div key={key} className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">€</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      aria-label={key === "budgetMin" ? "Budget from" : "Budget to"}
                      className={cn(inputClass, "pl-8")}
                      value={form[key]}
                      onChange={(e) => update(key, e.target.value)}
                      placeholder={key === "budgetMin" ? "400" : "600"}
                    />
                  </div>
                ))}
              </div>
            </Field>
            )}
          </Step>

          <Step index={2} current={step} title="Details">
            <Field label="Description">
              <textarea
                rows={5}
                className={cn(inputClass, "h-auto resize-none py-3")}
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="The place, the area and the plan in a few sentences."
              />
            </Field>
            {PITCH_FIELDS.map(({ key, label, placeholder }) => (
              <Field key={key} label={`${label} (optional)`}>
                <textarea
                  rows={3}
                  className={cn(inputClass, "h-auto resize-none py-3")}
                  value={form[key]}
                  onChange={(e) => update(key, e.target.value)}
                  placeholder={placeholder}
                />
              </Field>
            ))}
            <Field label="Interests" hint="Comma-separated, e.g. Surfing, Yoga, Startups">
              <input className={inputClass} value={form.interests} onChange={(e) => update("interests", e.target.value)} placeholder="Surfing, Yoga, Coffee" />
            </Field>
            <Field label="House rules" hint="One rule per line">
              <textarea
                rows={3}
                className={cn(inputClass, "h-auto resize-none py-3")}
                value={form.houseRules}
                onChange={(e) => update("houseRules", e.target.value)}
                placeholder={"Quiet hours after 11 pm\nShared groceries split weekly"}
              />
            </Field>
          </Step>

          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {/* Mobile step navigation */}
          <div className="md:hidden">
            {isLastStep ? (
              <button type="submit" className={buttonClass("primary", "lg", "w-full")}>
                Open House
              </button>
            ) : (
              <button type="button" onClick={next} className={buttonClass("primary", "lg", "w-full")}>
                Continue
              </button>
            )}
          </div>
          <div className="hidden md:block">
            <button type="submit" className={buttonClass("primary", "lg")}>
              Open House
            </button>
          </div>
        </form>

        {/* Desktop live preview */}
        <aside className="hidden md:block">
          <div className="sticky top-24">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-400">Live preview</p>
            <StayCard stay={previewStay} host={me} crew={me ? [me] : []} preview />
            <p className="mt-4 text-sm text-neutral-500">
              {pluralize(form.spotsTotal - 1, "spot")} open for your crew.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

const inputClass =
  "h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm outline-none transition-colors placeholder:text-neutral-400 focus:border-ink";
const chipClass = "rounded-full border border-neutral-200 px-4 py-2 text-sm transition-colors hover:border-neutral-400";
const chipActiveClass = "border-ink bg-ink text-white hover:border-ink";

function Step({ index, current, title, children }: { index: number; current: number; title: string; children: ReactNode }) {
  return (
    <fieldset className={cn("space-y-4", index === current ? "block" : "hidden md:block")}>
      <legend className="mb-4 hidden text-lg font-semibold md:block">
        <span className="mr-2 text-accent">{index + 1}</span>
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

interface FieldProps {
  label: string;
  hint?: string;
  /** Renders a div instead of a <label> for groups of buttons */
  group?: boolean;
  children: ReactNode;
}

function Field({ label, hint, group = false, children }: FieldProps) {
  const Wrapper = group ? "div" : "label";
  return (
    <Wrapper className="block" {...(group ? { role: "group", "aria-label": label } : {})}>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-neutral-500">{hint}</span>}
    </Wrapper>
  );
}

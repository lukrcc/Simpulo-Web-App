"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent, type ReactNode } from "react";
import { sheetButtonClass } from "@/components/ui/sheetButton";
import { LanguageInput } from "@/components/ui/LanguageInput";
import { PhotoUploader } from "@/components/ui/PhotoUploader";
import { useStore } from "@/lib/store";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

// Soft field style of Edit profile.
const field =
  "h-12 w-full rounded-xl border border-[#E7E5E4] bg-[#FAFAF9] px-4 text-[15px] outline-none transition-shadow placeholder:text-neutral-400 focus:ring-2 focus:ring-ink/20";
const fieldInvalid = "border-red-300";

type FieldKey = "photo" | "name" | "age" | "country";
type Errors = Partial<Record<FieldKey, true>>;

interface FormState {
  photos: string[];
  name: string;
  age: string;
  country: string;
  languages: string[];
}

function validate(form: FormState): Errors {
  const errors: Errors = {};
  if (!form.photos[0]) errors.photo = true;
  if (!form.name.trim()) errors.name = true;
  const age = Number(form.age);
  if (!(Number.isInteger(age) && age >= 18 && age <= 99)) errors.age = true;
  if (!form.country.trim()) errors.country = true;
  return errors;
}

interface CompleteProfileFormProps {
  /** The user who just logged in (read from `users` by id – `currentUserId` may lag one render). */
  user: User;
  /** Called after the profile was saved. */
  onDone: (userId: string) => void;
  /** Own "Complete your profile" heading – off when the surrounding sheet/page already shows it. */
  heading?: boolean;
}

/**
 * First-login step: face photo, first name, age, country (required) and languages (optional). Prefilled with
 * what the account already has; "Continue" saves to the current user and hands back.
 */
export function CompleteProfileForm({ user, onDone, heading = false }: CompleteProfileFormProps) {
  const t = useTranslations("onboarding");
  const store = useStore();
  const [form, setForm] = useState<FormState>(() => ({
    photos: user.photos.slice(0, 1),
    name: user.name,
    age: user.age > 0 ? String(user.age) : "",
    country: user.country,
    languages: user.languages,
  }));
  const [errors, setErrors] = useState<Errors>({});

  /** Sets a field and drops its error message, if any. */
  function update<K extends keyof FormState>(key: K, value: FormState[K], clears?: FieldKey) {
    setForm((f) => ({ ...f, [key]: value }));
    if (clears) setErrors((e) => ({ ...e, [clears]: undefined }));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const problems = validate(form);
    if (Object.values(problems).some(Boolean)) return setErrors(problems);
    // Keep any further photos the account already had; only the face slot is edited here.
    const photos = [form.photos[0], ...user.photos.slice(1)];
    store.updateCurrentUser({
      photos,
      name: form.name.trim(),
      age: Number(form.age),
      country: form.country.trim(),
      languages: form.languages,
    });
    onDone(user.id);
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {heading ? (
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{t("title")}</h2>
          <p className="mt-1 text-[15px] text-zinc-500">{t("subtitle")}</p>
        </div>
      ) : (
        <p className="-mt-2 text-[15px] text-zinc-500">{t("subtitle")}</p>
      )}

      <div role="group" aria-label={t("photo")}>
        <span className="mb-1.5 block text-sm font-medium">{t("photo")}</span>
        <div className="flex items-center gap-4">
          {/* One slot of the 5-column profile grid, so it matches the face tile on Edit profile. */}
          <div className="w-28 shrink-0">
            <PhotoUploader photos={form.photos} onChange={(photos) => update("photos", photos, "photo")} slots={1} labels="profile" />
          </div>
          <p className="text-[13px] text-zinc-500">{t("photoHint")}</p>
        </div>
        {errors.photo && <FieldError>{t("errors.photo")}</FieldError>}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-3">
        <Field label={t("name")} error={errors.name && t("errors.name")}>
          <input
            className={cn(field, errors.name && fieldInvalid)}
            value={form.name}
            onChange={(e) => update("name", e.target.value, "name")}
            autoComplete="given-name"
            aria-invalid={errors.name}
          />
        </Field>
        <Field label={t("age")} error={errors.age && t("errors.age")}>
          <input
            className={cn(field, errors.age && fieldInvalid)}
            type="number"
            inputMode="numeric"
            min={18}
            max={99}
            value={form.age}
            onChange={(e) => update("age", e.target.value, "age")}
            aria-invalid={errors.age}
          />
        </Field>
      </div>

      <Field label={t("country")} error={errors.country && t("errors.country")}>
        <input
          className={cn(field, errors.country && fieldInvalid)}
          value={form.country}
          onChange={(e) => update("country", e.target.value, "country")}
          autoComplete="country-name"
          aria-invalid={errors.country}
        />
      </Field>

      <div role="group" aria-label={t("languages")}>
        <span className="mb-1.5 block text-sm font-medium">
          {t("languages")} <span className="font-normal text-zinc-500">{t("optional")}</span>
        </span>
        <LanguageInput languages={form.languages} onChange={(languages) => update("languages", languages)} soft />
      </div>

      <button type="submit" className={cn(sheetButtonClass, "justify-center bg-ink text-white hover:bg-[#2A2A30]")}>
        {t("continue")}
      </button>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string | false; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {error && <FieldError>{error}</FieldError>}
    </label>
  );
}

function FieldError({ children }: { children: ReactNode }) {
  return <span className="mt-1.5 block text-[13px] text-red-600">{children}</span>;
}

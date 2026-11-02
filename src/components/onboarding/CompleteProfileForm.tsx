"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState, type FormEvent } from "react";
import { FormField, formInput } from "@/components/form/FormLayout";
import { Button } from "@/components/ui/ActionButton";
import { Combobox } from "@/components/ui/Combobox";
import { LanguageInput } from "@/components/ui/LanguageInput";
import { PhotoUploader } from "@/components/ui/PhotoUploader";
import { useStore } from "@/lib/store";
import type { User } from "@/lib/types";
import { countryNames } from "@/lib/utils";

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
  const locale = useLocale();
  const countries = useMemo(() => countryNames(locale).map((name) => ({ value: name, label: name })), [locale]);

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
          <p className="mt-1 text-[15px] text-muted">{t("subtitle")}</p>
        </div>
      ) : (
        <p className="-mt-2 text-[15px] text-muted">{t("subtitle")}</p>
      )}

      <FormField label={t("photo")} error={errors.photo && t("errors.photo")} group>
        <div className="flex items-center gap-4">
          {/* One slot of the 5-column profile grid, so it matches the face tile on Edit profile. */}
          <div className="w-28 shrink-0">
            <PhotoUploader photos={form.photos} onChange={(photos) => update("photos", photos, "photo")} slots={1} labels="profile" />
          </div>
          <p className="text-[13px] text-muted">{t("photoHint")}</p>
        </div>
      </FormField>

      <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-3">
        <FormField label={t("name")} error={errors.name && t("errors.name")}>
          <input
            className={formInput}
            value={form.name}
            onChange={(e) => update("name", e.target.value, "name")}
            autoComplete="given-name"
            aria-invalid={errors.name}
          />
        </FormField>
        <FormField label={t("age")} error={errors.age && t("errors.age")}>
          {/* Typed, no spinner: digits only, 18–99 checked on submit. */}
          <input
            className={formInput}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            value={form.age}
            onChange={(e) => update("age", e.target.value.replace(/\D/g, ""), "age")}
            aria-invalid={errors.age}
          />
        </FormField>
      </div>

      <FormField label={t("country")} error={errors.country && t("errors.country")} group>
        {/* Suggestions while typing; anything else typed is kept. */}
        <Combobox
          aria-label={t("country")}
          value={form.country}
          options={countries}
          onPick={(option) => update("country", option.value, "country")}
          onFreeText={(text) => update("country", text, "country")}
          isSelected={(option) => option.value === form.country}
          invalid={errors.country}
        />
      </FormField>

      <FormField label={t("languages")} optional group>
        <LanguageInput languages={form.languages} onChange={(languages) => update("languages", languages)} />
      </FormField>

      <Button type="submit" size="lg" className="w-full">
        {t("continue")}
      </Button>
    </form>
  );
}

"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { FormField, formInput, formTextarea } from "@/components/form/FormLayout";
import { buttonClass } from "@/components/ui/button";
import { AUDIENCE_SIZES, type AudienceSize } from "@/lib/growth";
import { getCurrentUser, useStore } from "@/lib/store";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Fields {
  name: string;
  email: string;
  links: string;
  audienceSize: AudienceSize | "";
  idea: string;
  place: string;
  from: string;
  to: string;
}

type FieldName = keyof Fields;
type ErrorKey = "required" | "email" | "links";

/** "instagram.com/you, twitch.tv/you" → ["instagram.com/you", "twitch.tv/you"] */
const linksOf = (text: string) => text.split(/[\s,]+/).map((l) => l.trim()).filter(Boolean).slice(0, 8);

function errorsOf(fields: Fields): Partial<Record<FieldName, ErrorKey>> {
  const errors: Partial<Record<FieldName, ErrorKey>> = {};
  for (const key of ["name", "email", "audienceSize", "idea", "place"] as const) {
    if (!fields[key].trim()) errors[key] = "required";
  }
  if (fields.email.trim() && !EMAIL.test(fields.email.trim())) errors.email = "email";
  if (linksOf(fields.links).length === 0) errors.links = "links";
  return errors;
}

/** /host application – stored in the mock store (admin: /admin/growth). */
export function HostApplicationForm() {
  const t = useTranslations("growth.host");
  const store = useStore();
  const me = getCurrentUser(store);
  const empty: Fields = { name: me?.name ?? "", email: me?.email ?? "", links: "", audienceSize: "", idea: "", place: "", from: "", to: "" };
  const [fields, setFields] = useState<Fields>(empty);
  const [tried, setTried] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const errors = errorsOf(fields);

  const set = (key: FieldName, value: string) => setFields((prev) => ({ ...prev, [key]: value }));
  const errorOf = (key: FieldName) => (tried && errors[key] ? t(`errors.${errors[key]}`) : null);

  function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (Object.keys(errors).length > 0 || !fields.audienceSize) return;
    store.addApplication({
      name: fields.name.trim(),
      email: fields.email.trim(),
      platformLinks: linksOf(fields.links),
      audienceSize: fields.audienceSize,
      idea: fields.idea.trim(),
      place: fields.place.trim(),
      ...(fields.from && { from: fields.from }),
      ...(fields.to && { to: fields.to }),
    });
    setSentTo(fields.email.trim());
  }

  if (sentTo) {
    return (
      <div role="status" className="mt-6 flex max-w-2xl items-start gap-4 rounded-[24px] bg-white p-6">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-ink">
          <Check className="size-5" strokeWidth={2.5} aria-hidden />
        </span>
        <div>
          <p className="text-lg font-semibold">{t("sentTitle")}</p>
          <p className="mt-1 text-zinc-600">{t("sentText", { email: sentTo })}</p>
          <button
            type="button"
            onClick={() => {
              setFields(empty);
              setTried(false);
              setSentTo(null);
            }}
            className="mt-3 text-sm font-medium text-zinc-600 underline underline-offset-2 hover:text-ink"
          >
            {t("another")}
          </button>
        </div>
      </div>
    );
  }

  const input = (key: "name" | "email" | "links" | "place", props: { type?: string; placeholder?: string; autoComplete?: string } = {}) => (
    <FormField label={t(`fields.${key}`)} error={errorOf(key)}>
      <input
        type={props.type ?? "text"}
        autoComplete={props.autoComplete}
        value={fields[key]}
        onChange={(e) => set(key, e.target.value)}
        placeholder={props.placeholder}
        aria-invalid={errorOf(key) ? true : undefined}
        className={formInput}
      />
    </FormField>
  );

  return (
    <form onSubmit={submit} noValidate className="mt-6 max-w-2xl space-y-5 rounded-[24px] bg-white p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        {input("name", { autoComplete: "name" })}
        {input("email", { type: "email", autoComplete: "email" })}
      </div>
      {input("links", { placeholder: t("fields.linksPlaceholder") })}
      <FormField label={t("fields.audience")} error={errorOf("audienceSize")}>
        <select
          value={fields.audienceSize}
          onChange={(e) => set("audienceSize", e.target.value)}
          aria-invalid={errorOf("audienceSize") ? true : undefined}
          className={formInput}
        >
          <option value="">{t("fields.audienceChoose")}</option>
          {AUDIENCE_SIZES.map((size) => (
            <option key={size} value={size}>
              {t(`audienceSizes.${size}`)}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label={t("fields.idea")} error={errorOf("idea")}>
        <textarea
          rows={4}
          value={fields.idea}
          onChange={(e) => set("idea", e.target.value)}
          placeholder={t("fields.ideaPlaceholder")}
          aria-invalid={errorOf("idea") ? true : undefined}
          className={formTextarea}
        />
      </FormField>
      {input("place", { placeholder: t("fields.placePlaceholder") })}
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label={t("fields.from")} optional>
          <input type="date" value={fields.from} onChange={(e) => set("from", e.target.value)} className={formInput} />
        </FormField>
        <FormField label={t("fields.to")} optional>
          <input type="date" value={fields.to} min={fields.from || undefined} onChange={(e) => set("to", e.target.value)} className={formInput} />
        </FormField>
      </div>
      <button type="submit" className={buttonClass("dark", "lg", "w-full sm:w-auto")}>
        {t("submit")}
      </button>
    </form>
  );
}

"use client";

// "Become a host" (/apply, and /create before the launch without an accepted application – CLAUDE.md "Host-Bewerbung"): name, email, a
// link to you, followers (optional), theme, where, roughly when and one sentence "Why I want to host". Sent through store.addApplication
// into Admin › Bewerbungen. Your own application's status stays visible here (and in Settings › Account): received · a question for you ·
// accepted (then Open a House) · not this time.
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { Container } from "@/components/layout/Container";
import { LegalLine } from "@/components/layout/LegalLine";
import { Button } from "@/components/ui/ActionButton";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { canOpenHouseAs, usePlatformPhase } from "@/config/platform";
import { useFormat } from "@/i18n/format";
import { useAdminData } from "@/lib/admin/store";
import { track } from "@/lib/analytics";
import { firstTouch } from "@/lib/growth";
import { HOST_REFERRAL } from "@/config/policies";
import { VIBES } from "@/lib/catalog";
import { getCurrentUser, useStore } from "@/lib/store";
import type { HostApplication, Vibe } from "@/lib/types";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Your latest host application: by your account, or by your account's email. */
export function useMyApplication(): HostApplication | null {
  const store = useStore();
  const me = getCurrentUser(store);
  const { applications } = useAdminData();
  if (!me) return null;
  const mine = applications.filter((a) => a.userId === me.id || (me.email && a.email?.toLowerCase() === me.email.toLowerCase()));
  return mine.toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
}

/** The page: your application's status when you have one, else the form. */
export function HostApply() {
  const mine = useMyApplication();
  const [sent, setSent] = useState<HostApplication | null>(null);
  const shown = sent ?? mine;
  return (
    <Container className="flex min-h-[calc(100dvh-var(--header-total))] flex-col items-center py-16">
      <div className="w-full max-w-[640px]">{shown ? <ApplicationStatus application={shown} justSent={Boolean(sent)} /> : <ApplyForm onSent={setSent} />}</div>
      <LegalLine className="mt-16" />
    </Container>
  );
}

/** Where your application stands – one title, one sentence, at most one action. */
export function ApplicationStatus({ application, justSent = false }: { application: HostApplication; justSent?: boolean }) {
  const t = useTranslations("platform.apply");
  const f = useFormat();
  const phase = usePlatformPhase();
  const me = getCurrentUser(useStore());
  const canOpen = canOpenHouseAs(phase, me) || application.status === "yes";
  const view =
    application.status === "yes"
      ? { title: t("statusYes"), text: t("statusYesText") }
      : application.status === "no"
        ? { title: t("statusNo"), text: t("statusNoText") }
        : application.status === "maybe"
          ? { title: t("statusQuestion"), text: t("statusQuestionText") }
          : justSent
            ? { title: t("sentTitle"), text: t("sentText", { name: application.name.split(" ")[0], email: application.email ?? "" }) }
            : { title: t("statusNew"), text: t("statusNewText") };
  return (
    <section data-application-status={application.status} className="flex flex-col items-center text-center">
      <p className="text-eyebrow uppercase text-muted">{t("applied", { date: f.day(application.createdAt) })}</p>
      <h1 className="mt-3 text-h1 text-ink">{view.title}</h1>
      <p className="mt-3 max-w-[520px] text-body-lg text-muted">{view.text}</p>
      {application.status === "yes" && canOpen && (
        <Button href="/create" className="mt-8">
          {t("openHouse")}
        </Button>
      )}
      {application.status !== "yes" && (
        <Button href="/explore" variant="secondary" className="mt-8">
          {t("back")}
        </Button>
      )}
    </section>
  );
}

/** The next 12 months as "YYYY-MM". */
function nextMonths(): string[] {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1)).toISOString().slice(0, 7));
}

function Field({ label, optional, hint, error, children }: { label: string; optional?: boolean; hint?: string; error?: string | false; children: React.ReactNode }) {
  const t = useTranslations("platform.apply");
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-small font-semibold text-ink">
        {label}
        {optional && <span className="font-normal text-muted"> · {t("optional")}</span>}
      </span>
      {children}
      {error ? <span className="text-small text-danger">{error}</span> : hint && <span className="text-small text-muted">{hint}</span>}
    </label>
  );
}

function ApplyForm({ onSent }: { onSent: (application: HostApplication) => void }) {
  const t = useTranslations("platform.apply");
  const f = useFormat();
  const format = useFormatter();
  const store = useStore();
  const me = getCurrentUser(store);
  const [form, setForm] = useState({ name: me?.name.split(" ")[0] ?? "", email: me?.email ?? "", link: "", reach: "", topic: "" as Vibe | "", place: "", when: "", why: "" });
  const [touched, setTouched] = useState(false);
  const set = (patch: Partial<typeof form>) => setForm((x) => ({ ...x, ...patch }));
  const emailOk = EMAIL.test(form.email.trim());
  const linkOk = /^https:\/\/\S+\.\S+/.test(form.link.trim());
  const complete = form.name.trim() && emailOk && linkOk && form.topic && form.place.trim() && form.why.trim();
  const submit = () => {
    setTouched(true);
    if (!complete) return;
    const touch = firstTouch();
    const referrer = HOST_REFERRAL.enabled && touch.utmSource === "hostref" && touch.refUserId && touch.refUserId !== me?.id ? touch.refUserId : null;
    const reach = Math.max(0, Math.round(Number(form.reach.replace(/\D/g, "")) || 0));
    const added = store.addApplication({
      name: form.name.trim(),
      email: form.email.trim(),
      topic: form.topic as Vibe,
      hub: form.place.trim(),
      // The admin decides share or pro later; a new applicant starts as share.
      hostType: "share",
      audienceLinks: [form.link.trim()],
      audienceSize: reach,
      pitch: form.why.trim(),
      when: form.when || null,
      // Host brings host (prepared, off): a host's own link (?ref={host}&src=hostref) marks who brought this one.
      ...(referrer && { referredBy: referrer }),
    });
    // Signals only: the theme, a reach given, a period given – never the words.
    track("host_application_sent", { topic: added.topic, reach: reach > 0, when: Boolean(form.when) });
    onSent(added);
  };
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-col gap-6"
    >
      <div className="text-center">
        <p className="text-eyebrow uppercase text-muted">{t("eyebrow")}</p>
        <h1 className="mt-3 text-h1 text-ink">{t("title")}</h1>
        <p className="mx-auto mt-3 max-w-[520px] text-body-lg text-muted">{t("text")}</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("name")} error={touched && !form.name.trim() && " "}>
          <Input autoComplete="given-name" value={form.name} onChange={(e) => set({ name: e.target.value })} maxLength={60} aria-invalid={touched && !form.name.trim()} />
        </Field>
        <Field label={t("email")} error={touched && !emailOk && t("invalidEmail")}>
          <Input type="email" inputMode="email" autoComplete="email" value={form.email} onChange={(e) => set({ email: e.target.value })} aria-invalid={touched && !emailOk} />
        </Field>
        <Field label={t("social")} hint={t("socialHint")} error={touched && !linkOk && t("invalidLink")}>
          <Input type="url" inputMode="url" placeholder="https://" value={form.link} onChange={(e) => set({ link: e.target.value })} aria-invalid={touched && !linkOk} />
        </Field>
        <Field label={t("reach")} optional hint={t("reachHint")}>
          <Input inputMode="numeric" value={form.reach} onChange={(e) => set({ reach: e.target.value })} />
        </Field>
        <Field label={t("topic")} error={touched && !form.topic && " "}>
          <Select value={form.topic} onChange={(e) => set({ topic: e.target.value as Vibe | "" })} aria-invalid={touched && !form.topic}>
            <option value="">{t("topicPick")}</option>
            {VIBES.map((v) => (
              <option key={v.key} value={v.key}>
                {f.vibe(v.key)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("place")} hint={t("placeHint")} error={touched && !form.place.trim() && " "}>
          <Input value={form.place} onChange={(e) => set({ place: e.target.value })} maxLength={80} aria-invalid={touched && !form.place.trim()} />
        </Field>
        <Field label={t("when")}>
          <Select value={form.when} onChange={(e) => set({ when: e.target.value })}>
            <option value="">{t("whenAny")}</option>
            {nextMonths().map((m) => (
              <option key={m} value={m}>
                {format.dateTime(new Date(`${m}-01T00:00:00Z`), { month: "long", year: "numeric", timeZone: "UTC" })}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label={t("why")} hint={t("whyHint")} error={touched && !form.why.trim() && " "}>
        <Textarea value={form.why} onChange={(e) => set({ why: e.target.value })} rows={3} maxLength={200} aria-invalid={touched && !form.why.trim()} />
      </Field>
      <div className="flex justify-end">
        <Button type="submit">{t("send")}</Button>
      </div>
    </form>
  );
}

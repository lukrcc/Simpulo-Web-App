"use client";

// Settings › Payments & payouts, for hosts (CLAUDE.md "Plattform-Pflichten"): "Hosting as" – private or a business (a business adds its
// name, address and register number, and its Houses say "Hosted by a business") – and, behind HOST_TAX_INFO's switch and past its
// threshold, the tax details (tax ID, address), stored for Simpulo's team only.
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/ActionButton";
import { Input, Textarea } from "@/components/ui/Input";
import { useFormat } from "@/i18n/format";
import { appendAdminLog, submitHostTax, useAdminData } from "@/lib/admin/store";
import { hostYear, taxDetailsDue } from "@/lib/hostObligations";
import { useStore } from "@/lib/store";
import type { User } from "@/lib/types";
import { RowSelect, SettingsGroup, SettingsPanel, SettingsRow } from "./SettingsList";

export function HostDuties({ me, onSaved }: { me: User; onSaved: () => void }) {
  const store = useStore();
  const hosts = store.stays.some((s) => s.hostId === me.id && s.status !== "draft");
  if (!hosts) return null;
  return (
    <>
      <HostingAs me={me} onSaved={onSaved} />
      <TaxDetails me={me} onSaved={onSaved} />
    </>
  );
}

function HostingAs({ me, onSaved }: { me: User; onSaved: () => void }) {
  const t = useTranslations("hostDuties");
  const store = useStore();
  const current = me.hostBusiness;
  const [kind, setKind] = useState<"private" | "business">(current?.kind ?? "private");
  const [form, setForm] = useState({ name: current?.name ?? "", address: current?.address ?? "", register: current?.register ?? "" });
  const [touched, setTouched] = useState(false);
  const save = (next: "private" | "business") => {
    if (next === "business" && (!form.name.trim() || !form.address.trim())) return setTouched(true);
    store.updateCurrentUser({ hostBusiness: next === "business" ? { kind: "business", name: form.name.trim(), address: form.address.trim(), ...(form.register.trim() && { register: form.register.trim() }), updatedAt: new Date().toISOString() } : { kind: "private", updatedAt: new Date().toISOString() } });
    appendAdminLog("host_business_set", `${me.id} · ${next}`, me.id);
    onSaved();
  };
  return (
    <>
      <SettingsGroup title={t("title")} footer={t("footer")}>
        <SettingsRow
          title={t("hostingAs")}
          control={
            <RowSelect
              label={t("hostingAs")}
              value={kind}
              onChange={(v) => {
                setKind(v);
                if (v === "private") save("private");
              }}
              options={[
                { value: "private", label: t("private") },
                { value: "business", label: t("business") },
              ]}
            />
          }
        />
      </SettingsGroup>
      {kind === "business" && (
        <SettingsPanel>
          <form
            data-host-business
            onSubmit={(e) => {
              e.preventDefault();
              save("business");
            }}
            className="flex flex-col gap-4"
          >
            <label className="flex flex-col gap-1.5">
              <span className="text-small font-semibold text-ink">{t("name")}</span>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={120} autoComplete="organization" aria-invalid={touched && !form.name.trim()} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-small font-semibold text-ink">{t("address")}</span>
              <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={3} maxLength={300} autoComplete="street-address" aria-invalid={touched && !form.address.trim()} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-small font-semibold text-ink">
                {t("register")} <span className="font-normal text-muted">· {t("optional")}</span>
              </span>
              <Input value={form.register} onChange={(e) => setForm({ ...form, register: e.target.value })} maxLength={80} />
            </label>
            {touched && (!form.name.trim() || !form.address.trim()) && <p className="text-small text-danger">{t("missing")}</p>}
            <div className="flex justify-end">
              <Button type="submit" size="sm">
                {t("save")}
              </Button>
            </div>
          </form>
        </SettingsPanel>
      )}
    </>
  );
}

function TaxDetails({ me, onSaved }: { me: User; onSaved: () => void }) {
  const t = useTranslations("hostDuties.tax");
  const f = useFormat();
  const store = useStore();
  const { hostTax } = useAdminData();
  const [year] = useState(() => new Date().getUTCFullYear());
  const stats = hostYear(me.id, store.stays, store.payments, year);
  const sent = hostTax?.[me.id];
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ taxId: "", address: "" });
  if (!taxDetailsDue(stats)) return null;
  const valid = form.taxId.trim().length >= 4 && form.address.trim().length >= 6;
  return (
    <SettingsGroup title={t("title")} footer={t("footer")}>
      {sent && !editing ? (
        <SettingsRow title={t("sent", { date: f.day(sent.at) })} subtitle={t("onlyTeam")} control={<Button size="sm" variant="tertiary" onClick={() => setEditing(true)}>{t("update")}</Button>} />
      ) : (
        <form
          data-host-tax
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid) return;
            submitHostTax(me.id, form);
            setForm({ taxId: "", address: "" });
            setEditing(false);
            onSaved();
          }}
          className="flex flex-col gap-4 p-4"
        >
          <p className="text-small text-muted">{t("why", { count: stats.activities })}</p>
          <label className="flex flex-col gap-1.5">
            <span className="text-small font-semibold text-ink">{t("taxId")}</span>
            <Input value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} maxLength={40} autoComplete="off" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-small font-semibold text-ink">{t("address")}</span>
            <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={3} maxLength={300} autoComplete="street-address" />
          </label>
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={!valid}>
              {t("send")}
            </Button>
          </div>
        </form>
      )}
    </SettingsGroup>
  );
}

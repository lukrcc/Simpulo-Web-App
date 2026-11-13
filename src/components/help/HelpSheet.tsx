"use client";

import { Check, ImagePlus, LifeBuoy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { formTextarea } from "@/components/form/FormLayout";
import { Button } from "@/components/ui/ActionButton";
import { Chip } from "@/components/ui/Chip";
import { Img } from "@/components/ui/Img";
import { ModalFooter, Sheet } from "@/components/ui/Sheet";
import { getCurrentUser, useStore, type SupportCategory } from "@/lib/store";
import type { Stay } from "@/lib/types";
import { cn } from "@/lib/utils";
import { usePlatformPhase } from "@/config/platform";
import { addSupportTicket } from "@/lib/admin/store";
import { ticketContext } from "@/lib/support/feedback";

const CATEGORIES: readonly SupportCategory[] = ["place", "host", "safety", "payment", "other"];
const DAY_MS = 86_400_000;

/** "Something went wrong" is offered from 3 days before arrival until the day after the House ends. */
export function helpAvailable(stay: Pick<Stay, "startDate" | "endDate">, now: number): boolean {
  return Boolean(stay.startDate && stay.endDate) && now >= Date.parse(stay.startDate) - 3 * DAY_MS && now <= Date.parse(stay.endDate) + 2 * DAY_MS;
}

/** The way in: a quiet tertiary button with a lifebuoy. */
export function HelpButton({ stay }: { stay: Stay }) {
  const t = useTranslations("help");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="tertiary" size="sm" onClick={() => setOpen(true)}>
        <LifeBuoy aria-hidden />
        {t("button")}
      </Button>
      <HelpSheet stay={stay} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** What went wrong (a category), in your words, a photo if it helps → a case for support with a number. */
export function HelpSheet({ stay, open, onClose }: { stay: Stay; open: boolean; onClose: () => void }) {
  const t = useTranslations("help");
  return (
    <Sheet open={open} onClose={onClose} title={t("title")}>
      {open && <HelpForm stay={stay} onClose={onClose} />}
    </Sheet>
  );
}

function HelpForm({ stay, onClose }: { stay: Stay; onClose: () => void }) {
  const t = useTranslations("help");
  const store = useStore();
  const phase = usePlatformPhase();
  const [category, setCategory] = useState<SupportCategory | null>(null);
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();
  const [number, setNumber] = useState<string | null>(null);

  if (number) {
    return (
      <div role="status" className="flex flex-col items-center py-4 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-ink text-inverse motion-safe:animate-check-in">
          <Check className="size-7" strokeWidth={2.5} aria-hidden />
        </span>
        <p className="mt-4 text-h3 text-ink">{t("sentTitle")}</p>
        <p className="mt-1 text-body text-muted">{t("sentText", { number })}</p>
        <ModalFooter className="mt-6 w-full">
          <Button onClick={onClose}>{t("done")}</Button>
        </ModalFooter>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!category || !text.trim()) return;
        setNumber(store.addSupportCase({ stayId: stay.id, category, text: text.trim(), photo }));
        // The same case in Admin › Support: safety as a safety ticket (high priority), the rest as a question tagged with its kind.
        const me = getCurrentUser(store);
        addSupportTicket({
          userId: me?.id,
          email: me?.email ?? "",
          category: category === "safety" ? "safety" : "question",
          message: `[${t(`categories.${category}`)}] ${text.trim()}`,
          context: ticketContext(phase, stay.id),
          attachments: photo ? [{ name: "photo.jpg", size: photo.length }] : [],
        });
      }}
      className="flex flex-col gap-5"
    >
      <p className="text-small text-muted">{t("intro", { title: stay.title })}</p>
      <div role="radiogroup" aria-label={t("categoryLabel")} className="flex flex-wrap gap-2">
        {CATEGORIES.map((key) => (
          <Chip key={key} role="radio" aria-checked={category === key} active={category === key} onClick={() => setCategory(key)}>
            {t(`categories.${key}`)}
          </Chip>
        ))}
      </div>
      {category === "safety" && <p className="rounded-2xl bg-ink/6 px-4 py-3 text-small text-ink">{t("safetyNote")}</p>}
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} aria-label={t("textLabel")} placeholder={t("placeholder")} className={cn(formTextarea, "min-h-30")} />
      <label className="flex cursor-pointer items-center gap-3 self-start text-small font-semibold text-ink">
        {photo ? <Img src={photo} alt="" width={48} height={48} className="size-12 rounded-xl object-cover" /> : <ImagePlus className="size-5 text-muted" aria-hidden />}
        {photo ? t("photoChange") : t("photo")}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => setPhoto(String(reader.result));
            reader.readAsDataURL(file);
          }}
        />
      </label>
      <ModalFooter onCancel={onClose}>
        <Button type="submit" disabled={!category || !text.trim()}>
          {t("send")}
        </Button>
      </ModalFooter>
    </form>
  );
}

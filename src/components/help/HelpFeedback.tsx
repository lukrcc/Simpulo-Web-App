"use client";

// "Help & feedback" – the one sheet (mounted once in AppShell), in the manner of the InviteSheet: a panel, its body 24px in, the action in
// its foot. What it's about as capsules, the message, an optional screenshot, the email (prefilled when logged in, else required); the
// page, House and device go along and are shown before sending. Safety: the emergency line and high priority. The ticket lands in
// Admin › Support (lib/admin/store.ts addSupportTicket).
import { Check, ImagePlus, Info, ShieldAlert, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";
import { FormField } from "@/components/form/FormLayout";
import { Button } from "@/components/ui/ActionButton";
import { Chip } from "@/components/ui/Chip";
import { Input, Textarea } from "@/components/ui/Input";
import { Sheet } from "@/components/ui/Sheet";
import { usePlatformPhase } from "@/config/platform";
import { addSupportTicket } from "@/lib/admin/store";
import { getCurrentUser, useStore } from "@/lib/store";
import { closeHelpFeedback, deviceLabel, openHelpFeedback, ticketContext, useHelpFeedbackOpen } from "@/lib/support/feedback";
import { TICKET_CATEGORIES, type TicketCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The House a route is about (/h/[id], /house/[slug]) – for the ticket's context. */
function useRouteHouseId(): string | undefined {
  const pathname = usePathname();
  const { stays } = useStore();
  const [, kind, key] = pathname.split("/");
  if (kind === "h") return stays.find((s) => s.id === key || s.slug === key)?.id;
  if (kind === "house") return stays.find((s) => s.slug === key)?.id;
  return undefined;
}

export function HelpFeedbackSheet() {
  const open = useHelpFeedbackOpen();
  const t = useTranslations("help.feedback");
  // Mounted fresh each time it opens: a new message every time.
  return open ? <FeedbackSheet key="open" onClose={closeHelpFeedback} /> : <Sheet variant="panel" open={false} onClose={closeHelpFeedback} title={t("title")}>{null}</Sheet>;
}

function FeedbackSheet({ onClose }: { onClose: () => void }) {
  const t = useTranslations("help.feedback");
  const store = useStore();
  const me = getCurrentUser(store);
  const phase = usePlatformPhase();
  const houseId = useRouteHouseId();
  const pathname = usePathname();
  const fileId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<TicketCategory>("question");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(me?.email ?? "");
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const [sent, setSent] = useState(false);
  const emailOk = EMAIL.test(email.trim());
  const ready = message.trim().length > 0 && emailOk;

  function send() {
    if (!ready) return;
    addSupportTicket({ userId: me?.id, email: email.trim(), category, message: message.trim(), context: ticketContext(phase, houseId), attachments: file ? [file] : [] });
    setSent(true);
  }

  return (
    <Sheet
      variant="panel"
      open
      onClose={onClose}
      title={t("title")}
      footer={
        <div className="flex w-full items-center justify-end">
          {sent ? (
            <Button variant="secondary" onClick={onClose}>
              {t("close")}
            </Button>
          ) : (
            <Button onClick={send} disabled={!ready}>
              {t("send")}
            </Button>
          )}
        </div>
      }
    >
      <div className="px-6 pb-6 pt-2">
        {sent ? (
          <div className="flex flex-col items-start gap-4 py-8">
            <span className="flex size-12 items-center justify-center rounded-full bg-ink text-inverse">
              <Check className="size-6 motion-safe:animate-check-in" strokeWidth={2.5} aria-hidden />
            </span>
            <p className="text-h3 text-ink">{t("thanks")}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div>
              <p className="mb-3 text-small text-muted">{t("category")}</p>
              <div role="radiogroup" aria-label={t("category")} className="flex flex-wrap gap-2">
                {TICKET_CATEGORIES.map((key) => (
                  <Chip key={key} role="radio" aria-checked={category === key} active={category === key} onClick={() => setCategory(key)}>
                    {t(`categories.${key}`)}
                  </Chip>
                ))}
              </div>
            </div>

            {category === "safety" && (
              <p className="flex items-start gap-2 text-body font-semibold text-ink">
                <ShieldAlert aria-hidden className="mt-0.5 size-5 shrink-0" />
                {t("emergency")}
              </p>
            )}

            <FormField label={t("message")}>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t(`messagePlaceholder.${category}`)} className="min-h-36" maxLength={4000} />
            </FormField>

            <div>
              <input
                ref={fileRef}
                id={fileId}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const picked = e.target.files?.[0];
                  if (picked) setFile({ name: picked.name, size: picked.size });
                }}
              />
              {file ? (
                <span className="inline-flex items-center gap-2 text-body text-ink">
                  <ImagePlus aria-hidden className="size-4 text-muted" />
                  <span className="max-w-60 truncate">{file.name}</span>
                  <button
                    type="button"
                    aria-label={t("remove")}
                    onClick={() => {
                      setFile(null);
                      if (fileRef.current) fileRef.current.value = "";
                    }}
                    className="flex size-7 items-center justify-center rounded-full text-muted hover:bg-ink/5 hover:text-ink"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </span>
              ) : (
                <label htmlFor={fileId} className="inline-flex cursor-pointer items-center gap-2 text-body font-semibold text-ink hover:underline">
                  <ImagePlus aria-hidden className="size-4" />
                  {t("screenshot")}
                </label>
              )}
            </div>

            <FormField label={t("email")} helper={t("emailHint")} error={email.length > 0 && !emailOk ? t("invalidEmail") : undefined}>
              <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required />
            </FormField>

            {/* What goes along – said out loud before sending. */}
            <p className="flex items-start gap-2 text-small text-muted">
              <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
              {t("context", { page: pathname, device: deviceLabel(), width: window.innerWidth })}
            </p>
          </div>
        )}
      </div>
    </Sheet>
  );
}

/** A link-styled button that opens "Help & feedback" (footer). */
export function HelpFeedbackLink({ className }: { className?: string }) {
  const t = useTranslations("help.feedback");
  return (
    <button type="button" onClick={openHelpFeedback} className={cn("inline-flex items-center transition-colors hover:text-ink", className)}>
      {t("entry")}
    </button>
  );
}

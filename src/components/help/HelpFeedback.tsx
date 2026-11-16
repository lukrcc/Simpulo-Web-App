"use client";

// Support in two ways (mounted once in AppShell), both a centred dialog (the one dialog pattern: Cancel left, the action right):
// "Get help" – what it's about as capsules (Question · Something's broken · Safety), the message, an optional screenshot, the email
// (prefilled when logged in, else required); the page, House and device go along and are shown before sending. Safety: the emergency line
// and high priority. "Share an idea" – light: "Your idea", optional "Why would it help you?", optional screenshot; a ticket with category
// "idea". Both land in Admin › Support (lib/admin/store.ts addSupportTicket) and, signed in, in Messages as the conversation "Simpulo
// Support" (lib/support/conversation.ts), where the answers come.
import { Check, ImagePlus, Info, ShieldAlert, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";
import { FormField } from "@/components/form/FormLayout";
import { Button } from "@/components/ui/ActionButton";
import { Chip } from "@/components/ui/Chip";
import { Input, Textarea } from "@/components/ui/Input";
import { ModalFooter, Sheet } from "@/components/ui/Sheet";
import { SUPPORT_THREAD_ID } from "@/lib/support/conversation";
import { usePlatformPhase } from "@/config/platform";
import { addSupportTicket } from "@/lib/admin/store";
import { getCurrentUser, useStore } from "@/lib/store";
import { closeSupportSheet, deviceLabel, helpPrefill, openGetHelp, openShareIdea, ticketContext, useSupportSheet } from "@/lib/support/feedback";
import type { TicketCategory } from "@/lib/types";

/** "Get help" offers these; ideas have their own sheet ("Share an idea"). */
const HELP_CATEGORIES = ["question", "bug", "safety"] as const satisfies readonly TicketCategory[];
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
  const open = useSupportSheet();
  const t = useTranslations("help.feedback");
  // Mounted fresh each time one opens: a new message every time.
  if (open === "help") return <FeedbackSheet key="help" onClose={closeSupportSheet} />;
  if (open === "idea") return <IdeaSheet key="idea" onClose={closeSupportSheet} />;
  return (
    <Sheet open={false} onClose={closeSupportSheet} title={t("title")}>
      {null}
    </Sheet>
  );
}

function FeedbackSheet({ onClose }: { onClose: () => void }) {
  const t = useTranslations("help.feedback");
  const store = useStore();
  const me = getCurrentUser(store);
  const phase = usePlatformPhase();
  const routeHouseId = useRouteHouseId();
  const pathname = usePathname();
  // Opened in context (a House, a report in the chat): that House, that category.
  const [prefill] = useState(helpPrefill);
  const houseId = prefill.houseId ?? routeHouseId;
  const [category, setCategory] = useState<(typeof HELP_CATEGORIES)[number]>(prefill.category ?? "question");
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
    <Sheet open onClose={onClose} title={t("title")} focusOverlay>
      <div>
        {sent ? (
          <Sent text={t("thanks")} signedIn={me !== null} onClose={onClose} />
        ) : (
          <div className="flex flex-col gap-6">
            <div>
              <p className="mb-3 text-small text-muted">{t("category")}</p>
              <div role="radiogroup" aria-label={t("category")} className="flex flex-wrap gap-2">
                {HELP_CATEGORIES.map((key) => (
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

            <ScreenshotField file={file} onChange={setFile} />

            <FormField label={t("email")} helper={t("emailHint")} error={email.length > 0 && !emailOk ? t("invalidEmail") : undefined}>
              <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required />
            </FormField>

            {/* What goes along – said out loud before sending. */}
            <p className="flex items-start gap-2 text-small text-muted">
              <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
              {t("context", { page: pathname, device: deviceLabel(), width: window.innerWidth })}
            </p>
            <ModalFooter onCancel={onClose} className="mt-2">
              <Button onClick={send} disabled={!ready}>
                {t("send")}
              </Button>
            </ModalFooter>
          </div>
        )}
      </div>
    </Sheet>
  );
}

/**
 * After sending: the check and the thanks; signed in, the request now stands in Messages as "Simpulo Support" (lib/support/conversation.ts) –
 * the answers come there. No chat bubble in a corner.
 */
function Sent({ text, signedIn, onClose }: { text: string; signedIn: boolean; onClose: () => void }) {
  const t = useTranslations("help.conversation");
  const router = useRouter();
  return (
    <div className="flex flex-col items-start gap-4 py-4">
      <span className="flex size-12 items-center justify-center rounded-full bg-ink text-inverse">
        <Check className="size-6 motion-safe:animate-check-in" strokeWidth={2.5} aria-hidden />
      </span>
      <p className="text-h3 text-ink">{text}</p>
      {signedIn && <p className="text-body text-muted">{t("sentHint")}</p>}
      <ModalFooter onCancel={signedIn ? onClose : undefined} className="mt-4 w-full">
        {signedIn ? (
          <Button
            onClick={() => {
              onClose();
              router.push(`/messages?id=${SUPPORT_THREAD_ID}`);
            }}
          >
            {t("open")}
          </Button>
        ) : (
          <Button variant="secondary" onClick={onClose}>
            {t("close")}
          </Button>
        )}
      </ModalFooter>
    </div>
  );
}

/** The optional screenshot – name and size only so far (no upload yet). */
function ScreenshotField({ file, onChange }: { file: { name: string; size: number } | null; onChange: (file: { name: string; size: number } | null) => void }) {
  const t = useTranslations("help.feedback");
  const fileId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <input
        ref={fileRef}
        id={fileId}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const picked = e.target.files?.[0];
          if (picked) onChange({ name: picked.name, size: picked.size });
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
              onChange(null);
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
  );
}

/**
 * "Share an idea": one field, an optional why, an optional screenshot – nothing else to fill in. Saved as a ticket with category "idea"
 * (the why after the idea in the message; the email when logged in, so the team can answer); "Thanks – we read every idea."
 */
function IdeaSheet({ onClose }: { onClose: () => void }) {
  const t = useTranslations("help.idea");
  const store = useStore();
  const me = getCurrentUser(store);
  const phase = usePlatformPhase();
  const houseId = useRouteHouseId();
  const [idea, setIdea] = useState("");
  const [why, setWhy] = useState("");
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const [sent, setSent] = useState(false);
  const ready = idea.trim().length > 0;

  function send() {
    if (!ready) return;
    const message = why.trim() ? `${idea.trim()}\n\n${t("whyPrefix")} ${why.trim()}` : idea.trim();
    addSupportTicket({ userId: me?.id, email: me?.email ?? "", category: "idea", message, context: ticketContext(phase, houseId), attachments: file ? [file] : [] });
    setSent(true);
  }

  return (
    <Sheet open onClose={onClose} title={t("title")} focusOverlay>
      <div>
        {sent ? (
          <Sent text={t("thanks")} signedIn={me !== null} onClose={onClose} />
        ) : (
          <div className="flex flex-col gap-6">
            <FormField label={t("idea")}>
              <Textarea value={idea} onChange={(e) => setIdea(e.target.value)} placeholder={t("ideaPlaceholder")} className="min-h-32" maxLength={2000} autoFocus />
            </FormField>
            <FormField label={t("why")} optional>
              <Textarea value={why} onChange={(e) => setWhy(e.target.value)} placeholder={t("whyPlaceholder")} className="min-h-24" maxLength={1000} />
            </FormField>
            <ScreenshotField file={file} onChange={setFile} />
            <ModalFooter onCancel={onClose} className="mt-2">
              <Button onClick={send} disabled={!ready}>
                {t("send")}
              </Button>
            </ModalFooter>
          </div>
        )}
      </div>
    </Sheet>
  );
}

/** A link-styled button that opens "Get help" or "Share an idea" (footer). */
export function SupportLink({ kind, className }: { kind: "help" | "idea"; className?: string }) {
  const t = useTranslations("help");
  return (
    <button type="button" onClick={() => (kind === "help" ? openGetHelp() : openShareIdea())} className={cn("inline-flex items-center transition-colors hover:text-ink", className)}>
      {kind === "help" ? t("getHelp") : t("shareIdea")}
    </button>
  );
}

/**
 * Help in context: a small quiet line that opens "Get help" for this House ("Need help with this House?", "Something wrong? Get help") –
 * text-small muted, the action words ink.
 */
export function ContextHelp({ houseId, text, action, className }: { houseId?: string; text?: string; action: string; className?: string }) {
  return (
    <p className={cn("text-small text-muted", className)}>
      {text && <>{text} </>}
      <button type="button" onClick={() => openGetHelp({ houseId })} className="font-semibold text-ink underline-offset-4 hover:underline">
        {action}
      </button>
    </p>
  );
}

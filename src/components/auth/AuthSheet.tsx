"use client";

import { ArrowLeft, Mail, MailCheck } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { FcGoogle } from "react-icons/fc";
import { SiApple } from "react-icons/si";
import { CompleteProfileForm } from "@/components/onboarding/CompleteProfileForm";
import { Avatar } from "@/components/ui/Avatar";
import { Sheet } from "@/components/ui/Sheet";
import { isProfileComplete, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type Provider = "Apple" | "Google";

/** Mock magic link: how long the "Check your inbox" state shows before the mock user is logged in. */
const MOCK_LINK_DELAY_MS = 1500;

import { sheetButtonClass } from "@/components/ui/sheetButton";

// Re-exported for existing imports; the class itself lives in ui/sheetButton (no import cycle with onboarding).
export { sheetButtonClass } from "@/components/ui/sheetButton";

interface AuthSheetProps {
  open: boolean;
  /** Why we ask, e.g. "Log in to send your request" */
  context?: string;
  onClose: () => void;
  onSuccess: (userId: string) => void;
}

/** "Continue to Simpulo" – bottom sheet on mobile, centred modal on desktop (see Sheet). */
export function AuthSheet({ open, context, onClose, onSuccess }: AuthSheetProps) {
  const t = useTranslations("auth");
  const tOnboarding = useTranslations("onboarding");
  /** Logged in, but the profile still needs filling in – the sheet then titles that step instead. */
  const [completing, setCompleting] = useState(false);
  // Every open starts at the provider buttons again.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setCompleting(false);
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={completing ? tOnboarding("title") : t("title")}
      subtitle={completing ? undefined : context}
      size="wide"
    >
      {/* Remounted on every open, so it always starts at the provider buttons. */}
      {open && <AuthOptions onSuccess={onSuccess} onCompleting={() => setCompleting(true)} />}
    </Sheet>
  );
}

interface AuthOptionsProps {
  /** Runs after login – for incomplete profiles only once "Complete your profile" was saved. */
  onSuccess: (userId: string) => void;
  /**
   * The login went through and the "Complete your profile" step is showing. When set, the parent titles that
   * step (e.g. the sheet header); otherwise the step brings its own heading.
   */
  onCompleting?: () => void;
}

/**
 * Apple / Google / email – three identical buttons with the icon in a fixed 24px slot, so the labels share one
 * axis. Used by the AuthSheet and inline in multi-step sheets. First login with an incomplete profile (no face
 * photo, name, age or country): the "Complete your profile" form replaces the options in place, and `onSuccess`
 * only runs after it was saved – so pending actions (send a request, publish a House) continue afterwards.
 */
export function AuthOptions({ onSuccess, onCompleting }: AuthOptionsProps) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const { users, login } = useStore();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  /** Logged in as this user, who still has to complete their profile. */
  const [completingId, setCompletingId] = useState<string | null>(null);

  // Decide by the id just logged in – `currentUserId` from useStore() may still be the old value this render.
  function loggedIn(userId: string) {
    const user = users.find((u) => u.id === userId);
    if (user && !isProfileComplete(user)) {
      setCompletingId(userId);
      onCompleting?.();
    } else {
      onSuccess(userId);
    }
  }

  const completingUser = completingId ? users.find((u) => u.id === completingId) : undefined;
  if (completingUser) {
    return <CompleteProfileForm user={completingUser} onDone={onSuccess} heading={!onCompleting} />;
  }

  // No real auth yet: either provider opens a picker of mock users.
  if (provider) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setProvider(null)}
          className="-ml-1 mb-3 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-ink"
        >
          <ArrowLeft className="size-4" />
          {tc("back")}
        </button>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {t("mockProviderLogin", { provider })}
        </p>
        <ul className="scroll-pane max-h-[50vh] divide-y divide-neutral-100 rounded-2xl border border-neutral-100">
          {users.map((user) => (
            <li key={user.id}>
              <button
                type="button"
                onClick={() => {
                  login(user.id);
                  loggedIn(user.id);
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-neutral-50"
              >
                <Avatar user={user} size="sm" />
                <span className="flex-1 text-sm font-medium">{user.name}</span>
                <span className="text-xs text-zinc-500">{user.country}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-3">
        <AuthButton
          icon={<SiApple className="size-5" />}
          label={t("continueWithApple")}
          onClick={() => setProvider("Apple")}
          className="bg-black text-white hover:bg-black/85"
        />
        <AuthButton
          icon={<FcGoogle className="size-5" />}
          label={t("continueWithGoogle")}
          onClick={() => setProvider("Google")}
          className="border border-zinc-200 bg-white text-ink hover:bg-zinc-50"
        />
        {emailOpen ? (
          <EmailForm onSuccess={loggedIn} />
        ) : (
          <AuthButton
            icon={<Mail className="size-5" />}
            label={t("continueWithEmail")}
            onClick={() => setEmailOpen(true)}
            className="bg-page text-ink hover:bg-zinc-200/60"
          />
        )}
      </div>
      <p className="mt-4 text-[13px] text-zinc-500">{t("dataUse")}</p>
      <p className="mt-1 text-[13px] text-zinc-500">
        {t.rich("legal", {
          terms: (chunks) => (
            <Link href="/terms" className="underline underline-offset-2 hover:text-ink">
              {chunks}
            </Link>
          ),
          privacy: (chunks) => (
            <Link href="/privacy" className="underline underline-offset-2 hover:text-ink">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </div>
  );
}

function AuthButton({ icon, label, onClick, className }: { icon: ReactNode; label: string; onClick: () => void; className: string }) {
  return (
    <button type="button" onClick={onClick} className={cn(sheetButtonClass, className)}>
      <span className="flex w-6 shrink-0 justify-center" aria-hidden>
        {icon}
      </span>
      <span className="flex-1 text-center">{label}</span>
    </button>
  );
}

/** Magic-link form that replaces the email button in place. */
function EmailForm({ onSuccess }: { onSuccess: (userId: string) => void }) {
  const t = useTranslations("auth");
  const { users, login } = useStore();
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  // Mock mode: "Send link" logs in this dev user instead of sending an email.
  const [mockUserId, setMockUserId] = useState(users[0]?.id ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function sendLink(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!e.currentTarget.checkValidity()) return;
    const address = email.trim();
    setSentTo(address);
    // A real backend would email a sign-in link; the mock "clicks" it after a moment.
    timer.current = setTimeout(() => {
      login(mockUserId);
      onSuccess(mockUserId);
    }, MOCK_LINK_DELAY_MS);
  }

  if (sentTo) {
    return (
      <p role="status" className="flex min-h-14 items-center gap-3 rounded-3xl bg-page px-5 py-3 text-[15px] text-ink">
        <MailCheck className="size-5 shrink-0 text-accent" />
        <span>
          {t.rich("checkInbox", { email: sentTo, strong: (chunks) => <span className="font-medium">{chunks}</span> })}
        </span>
      </p>
    );
  }

  return (
    <form onSubmit={sendLink} noValidate className="space-y-2">
      <div className="flex gap-2">
        <input
          type="email"
          required
          autoFocus
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("emailPlaceholder")}
          aria-label={t("emailLabel")}
          className="h-14 min-w-0 flex-1 rounded-full border border-zinc-200 bg-white px-5 text-[16px] outline-none focus:border-ink"
        />
        <button
          type="submit"
          disabled={!/^\S+@\S+\.\S+$/.test(email.trim())}
          className="h-14 shrink-0 rounded-full bg-ink px-6 text-[16px] font-medium text-white transition-colors hover:bg-[#2A2A30] disabled:bg-neutral-200 disabled:text-neutral-500"
        >
          {t("sendLink")}
        </button>
      </div>
      <label className="flex items-center gap-1.5 pl-5 text-xs text-zinc-500">
        {t("mockLoginAs")}
        <select
          value={mockUserId}
          onChange={(e) => setMockUserId(e.target.value)}
          className="cursor-pointer bg-transparent font-medium text-ink outline-none"
        >
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </label>
    </form>
  );
}

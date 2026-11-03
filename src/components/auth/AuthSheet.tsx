"use client";

import { ArrowLeft, Mail, MailCheck } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { FcGoogle } from "react-icons/fc";
import { SiApple } from "react-icons/si";
import { formInput } from "@/components/form/FormLayout";
import { CompleteProfileForm } from "@/components/onboarding/CompleteProfileForm";
import { Button } from "@/components/ui/ActionButton";
import { Avatar } from "@/components/ui/Avatar";
import { ListRow } from "@/components/ui/ListRow";
import { Sheet } from "@/components/ui/Sheet";
import { isProfileComplete, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type Provider = "Apple" | "Google";

/** Mock magic link: how long the "Check your inbox" state shows before the mock user is logged in. */
const MOCK_LINK_DELAY_MS = 1500;

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
      focusOverlay
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
        <Button variant="tertiary" onClick={() => setProvider(null)} className="mb-3">
          <ArrowLeft />
          {tc("back")}
        </Button>
        <p className="mb-2 text-eyebrow uppercase text-muted">
          {t("mockProviderLogin", { provider })}
        </p>
        <ul className="scroll-pane max-h-[50vh] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] ">
          {users.map((user) => (
            <li key={user.id}>
              <button
                type="button"
                onClick={() => {
                  login(user.id);
                  loggedIn(user.id);
                }}
                className="block w-full px-4 text-left hover:bg-bg"
              >
                <ListRow lead={<Avatar user={user} size="md" />} title={user.name} aside={<span className="shrink-0 text-small text-muted">{user.country}</span>} />
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
        <AuthButton icon={<SiApple />} label={t("continueWithApple")} onClick={() => setProvider("Apple")} />
        <AuthButton icon={<FcGoogle />} label={t("continueWithGoogle")} onClick={() => setProvider("Google")} />
        {emailOpen ? <EmailForm onSuccess={loggedIn} /> : <AuthButton icon={<Mail />} label={t("continueWithEmail")} onClick={() => setEmailOpen(true)} />}
      </div>
      <p className="mt-1 text-small text-muted">
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

/**
 * One provider button: secondary, full width, the brand icon in a fixed 24px slot (size-5) so the labels share one
 * axis. All three look alike – the sheet's only primary is "Send link".
 */
function AuthButton({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <Button variant="secondary" size="lg" onClick={onClick} className="w-full">
      <span className="flex w-6 shrink-0 justify-center [&_svg]:size-5!" aria-hidden>
        {icon}
      </span>
      <span className="flex-1 text-center">{label}</span>
      {/* Balances the icon slot, so the label is centred on the button. */}
      <span className="w-6 shrink-0" aria-hidden />
    </Button>
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
      <p role="status" className="flex min-h-11 items-center gap-3 rounded-xl bg-bg px-4 py-3 text-body text-ink">
        <MailCheck className="size-5 shrink-0 text-ink" />
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
          className={cn(formInput, "min-w-0 flex-1")}
        />
        <Button type="submit" variant="primary" size="lg" disabled={!/^\S+@\S+\.\S+$/.test(email.trim())}>
          {t("sendLink")}
        </Button>
      </div>
      <label className="flex items-center gap-1.5 pl-4 text-small text-muted">
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

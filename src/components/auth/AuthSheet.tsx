"use client";

import { ArrowLeft, Mail, MailCheck } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { FaApple, FaGoogle } from "react-icons/fa6";
import { buttonClass } from "@/components/ui/button";
import { Avatar } from "@/components/ui/Avatar";
import { Sheet } from "@/components/ui/Sheet";
import { useStore } from "@/lib/store";

type Provider = "Apple" | "Google";

/** Mock magic link: how long the "Check your inbox" state shows before the mock user is logged in. */
const MOCK_LINK_DELAY_MS = 1500;

interface AuthSheetProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (userId: string) => void;
}

/** "Continue to Simpulo" – bottom sheet on mobile, centred modal on desktop (see Sheet). */
export function AuthSheet({ open, onClose, onSuccess }: AuthSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title="Continue to Simpulo">
      {/* Remounted on every open, so it always starts at the provider buttons. */}
      {open && <AuthSheetBody onSuccess={onSuccess} />}
    </Sheet>
  );
}

function AuthSheetBody({ onSuccess }: { onSuccess: (userId: string) => void }) {
  const { users, login } = useStore();
  const [provider, setProvider] = useState<Provider | null>(null);

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
          Back
        </button>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Mock {provider} login – pick a user
        </p>
        <ul className="max-h-[50vh] divide-y divide-neutral-100 overflow-y-auto rounded-2xl border border-neutral-100">
          {users.map((user) => (
            <li key={user.id}>
              <button
                type="button"
                onClick={() => {
                  login(user.id);
                  onSuccess(user.id);
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
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setProvider("Apple")}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-black text-sm font-semibold text-white hover:bg-black/85"
      >
        <FaApple className="size-5" />
        Continue with Apple
      </button>
      <button
        type="button"
        onClick={() => setProvider("Google")}
        className={buttonClass("secondary", "lg", "w-full")}
      >
        <FaGoogle className="size-4" />
        Continue with Google
      </button>
      <EmailOption onSuccess={onSuccess} />
      <p className="pt-1 text-center text-xs text-zinc-500">We only use it to keep your crews and messages.</p>
    </div>
  );
}

/** "Continue with email": a text link that expands inline into a magic-link form. */
function EmailOption({ onSuccess }: { onSuccess: (userId: string) => void }) {
  const { users, login } = useStore();
  const [open, setOpen] = useState(false);
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
      <p role="status" className="flex items-start gap-2 rounded-2xl bg-accent-soft px-4 py-3 text-sm text-ink">
        <MailCheck className="mt-0.5 size-4 shrink-0 text-accent" />
        <span>
          Check your inbox – we sent a link to <span className="font-medium">{sentTo}</span>
        </span>
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-auto flex items-center gap-1.5 py-1 text-sm font-medium text-ink underline-offset-4 hover:underline"
      >
        <Mail className="size-4 text-zinc-500" />
        Continue with email
      </button>
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
          placeholder="you@example.com"
          aria-label="Email address"
          className="h-12 min-w-0 flex-1 rounded-full border border-neutral-200 bg-white px-4 text-sm outline-none focus:border-ink"
        />
        <button type="submit" disabled={!/^\S+@\S+\.\S+$/.test(email.trim())} className={buttonClass("dark", "lg", "shrink-0")}>
          Send link
        </button>
      </div>
      <label className="flex items-center justify-center gap-1.5 text-xs text-zinc-500">
        Mock login as
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

"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import type { AuthReason } from "@/config/auth-copy";
import { TermsGate } from "@/components/consent/Agreements";
import { AuthSheet } from "./AuthSheet";

/**
 * The one auth gate. Logged in → runs `action` right away. Logged out → opens the AuthSheet, its heading and line chosen by why it
 * opened (`reason`, config/auth-copy.ts; `hostName` for "join" and "message"), and runs `action` after a successful login; cancelling
 * discards it. The action gets the user id, since right after login the store's closures may not know it yet. Reading never goes
 * through here – only actions that need an account.
 */
export interface AuthAsk {
  reason: AuthReason;
  hostName?: string;
}
type RequireAuth = (action?: (userId: string) => void, ask?: AuthAsk) => void;

interface PendingAction {
  action?: (userId: string) => void;
  ask?: AuthAsk;
}

const AuthContext = createContext<RequireAuth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { currentUserId } = useStore();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const router = useRouter();

  const requireAuth = useCallback<RequireAuth>(
    (action, ask) => {
      if (currentUserId) action?.(currentUserId);
      else setPending({ action, ask });
    },
    [currentUserId],
  );

  return (
    <AuthContext.Provider value={requireAuth}>
      {children}
      {/* Rendered after the page, so it stacks above sheets opened by the page (e.g. the request sheet). */}
      <AuthSheet
        open={pending !== null}
        reason={pending?.ask?.reason ?? "login"}
        hostName={pending?.ask?.hostName}
        onClose={() => setPending(null)}
        onSuccess={(userId, info) => {
          const action = pending?.action;
          setPending(null);
          action?.(userId);
          // A new account signing in for nothing else (no request, no House waiting): the onboarding (CLAUDE.md "Onboarding").
          if (info?.registered && !action) router.push("/settings/profile?setup=1");
        }}
      />
      {/* The Terms for sessions that didn't come through the sheet (a returning visit, a new version) – never over the sign-in sheet. */}
      {pending === null && <TermsGate />}
    </AuthContext.Provider>
  );
}

export function useRequireAuth(): RequireAuth {
  const requireAuth = useContext(AuthContext);
  if (!requireAuth) throw new Error("useRequireAuth must be used inside <AuthProvider>");
  return requireAuth;
}

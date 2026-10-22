"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import { AuthSheet } from "./AuthSheet";

/**
 * The one auth gate. Logged in → runs `action` right away. Logged out → opens the AuthSheet (with an optional
 * context line, e.g. "Log in to send your request") and runs `action` after a successful login; cancelling
 * discards it. The action gets the user id, since right after login the store's closures may not know it yet.
 * Reading never goes through here – only actions that need an account.
 */
type RequireAuth = (action?: (userId: string) => void, context?: string) => void;

interface PendingAction {
  action?: (userId: string) => void;
  context?: string;
}

const AuthContext = createContext<RequireAuth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { currentUserId } = useStore();
  const [pending, setPending] = useState<PendingAction | null>(null);

  const requireAuth = useCallback<RequireAuth>(
    (action, context) => {
      if (currentUserId) action?.(currentUserId);
      else setPending({ action, context });
    },
    [currentUserId],
  );

  return (
    <AuthContext.Provider value={requireAuth}>
      {children}
      {/* Rendered after the page, so it stacks above sheets opened by the page (e.g. the request sheet). */}
      <AuthSheet
        open={pending !== null}
        context={pending?.context}
        onClose={() => setPending(null)}
        onSuccess={(userId) => {
          const action = pending?.action;
          setPending(null);
          action?.(userId);
        }}
      />
    </AuthContext.Provider>
  );
}

export function useRequireAuth(): RequireAuth {
  const requireAuth = useContext(AuthContext);
  if (!requireAuth) throw new Error("useRequireAuth must be used inside <AuthProvider>");
  return requireAuth;
}

"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import { AuthSheet } from "./AuthSheet";

/** Runs `onSuccess` right away when logged in; otherwise opens the AuthSheet first and runs it after login. */
type RequireAuth = (onSuccess?: (userId: string) => void) => void;

const AuthContext = createContext<RequireAuth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { currentUserId } = useStore();
  const [pending, setPending] = useState<{ onSuccess?: (userId: string) => void } | null>(null);

  const requireAuth = useCallback<RequireAuth>(
    (onSuccess) => {
      if (currentUserId) onSuccess?.(currentUserId);
      else setPending({ onSuccess });
    },
    [currentUserId],
  );

  return (
    <AuthContext.Provider value={requireAuth}>
      {children}
      {/* Rendered after the page, so it stacks above sheets opened by the page (e.g. the request sheet). */}
      <AuthSheet
        open={pending !== null}
        onClose={() => setPending(null)}
        onSuccess={(userId) => {
          const callback = pending?.onSuccess;
          setPending(null);
          callback?.(userId);
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

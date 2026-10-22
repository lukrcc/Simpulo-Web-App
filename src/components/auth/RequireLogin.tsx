"use client";

import { LogIn } from "lucide-react";
import type { ReactNode } from "react";
import { Container } from "@/components/layout/Container";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useStore } from "@/lib/store";
import { useRequireAuth } from "./AuthProvider";

interface RequireLoginProps {
  title: string;
  description?: string;
  /** Extra content under the prompt, e.g. the "More" links on /profile */
  after?: ReactNode;
  children: ReactNode;
}

/** Logged-in pages: when logged out, show a log-in prompt in place – no redirect. */
export function RequireLogin({ title, description, after, children }: RequireLoginProps) {
  const { currentUserId } = useStore();
  const requireAuth = useRequireAuth();

  if (currentUserId) return <>{children}</>;

  return (
    <Container page width="narrow">
      <EmptyState
        icon={LogIn}
        title={title}
        description={description}
        action={
          <button type="button" onClick={() => requireAuth()} className={buttonClass("dark", "sm")}>
            Log in
          </button>
        }
      />
      {after}
    </Container>
  );
}

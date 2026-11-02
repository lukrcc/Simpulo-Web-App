"use client";

import { LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/ActionButton";
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
  const t = useTranslations("auth");
  const { currentUserId } = useStore();
  const requireAuth = useRequireAuth();
  const router = useRouter();

  if (currentUserId) return <>{children}</>;

  return (
    <Container page width="narrow">
      <EmptyState
        icon={LogIn}
        title={title}
        description={description}
        action={
          <Button variant="primary" onClick={() => requireAuth(() => router.refresh())}>
            {t("logIn")}
          </Button>
        }
      />
      {after}
    </Container>
  );
}

"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { Avatar } from "@/components/ui/Avatar";
import { OpenHouseButton } from "@/components/ui/OpenHouseButton";
import { getCurrentUser, useStore } from "@/lib/store";

/** Header right side: "Log in" (logged out) or the avatar (logged in), plus "Open a House". */
export function HeaderActions() {
  const store = useStore();
  const requireAuth = useRequireAuth();
  const me = getCurrentUser(store);
  const t = useTranslations("nav");

  return (
    <div className="flex items-center justify-end gap-5">
      {me ? (
        <Link href="/profile" aria-label={t("yourProfile")} className="rounded-full">
          <Avatar user={me} size="sm" />
        </Link>
      ) : (
        <button type="button" onClick={() => requireAuth()} className="text-sm font-medium text-zinc-500 hover:text-ink">
          {t("logIn")}
        </button>
      )}
      <OpenHouseButton />
    </div>
  );
}

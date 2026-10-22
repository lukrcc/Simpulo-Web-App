"use client";

import { SearchX } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { use, useEffect } from "react";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { Container } from "@/components/layout/Container";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { EditStayForm } from "@/components/views/CreateStayForm";
import { useStore } from "@/lib/store";

export function EditStay({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("create.edit");
  return (
    <RequireLogin title={t("loginTitle")}>
      <EditStayGate id={id} />
    </RequireLogin>
  );
}

/** Host only. Anyone else – crew members included – is sent to the public House page. */
function EditStayGate({ id }: { id: string }) {
  const t = useTranslations("create.edit");
  const { stays, currentUserId } = useStore();
  const router = useRouter();
  const stay = stays.find((s) => s.id === id);
  const isHost = stay !== undefined && stay.hostId === currentUserId;

  useEffect(() => {
    if (stay && !isHost) router.replace(`/stays/${stay.slug}`);
  }, [stay, isHost, router]);

  if (!stay) {
    return (
      <Container page width="narrow">
        <EmptyState
          icon={SearchX}
          title={t("notFound")}
          action={
            <Link href="/my-stays" className={buttonClass("dark", "sm")}>
              {t("backToHouses")}
            </Link>
          }
        />
      </Container>
    );
  }

  if (!isHost) return <PageSkeleton />;
  return <EditStayForm stay={stay} />;
}

"use client";

import { ArrowLeft, SearchX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { use, useEffect } from "react";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { Container } from "@/components/layout/Container";
import { HouseDetail } from "@/components/stay/HouseDetail";
import { Button } from "@/components/ui/ActionButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { useStore } from "@/lib/store";
import { useIsDesktop } from "@/lib/useIsDesktop";

/** /my-stays/[id] – the mobile detail page. On desktop the same panel opens inside /my-stays. */
export function ManageStay({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("houses.manage");
  return (
    <RequireLogin title={t("loginTitle")}>
      <ManageStayGate id={id} />
    </RequireLogin>
  );
}

function ManageStayGate({ id }: { id: string }) {
  const t = useTranslations("houses");
  const store = useStore();
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const stay = store.stays.find((s) => s.id === id);
  // Host, accepted member or someone with a pending request – everyone else gets the public page.
  const involved =
    stay !== undefined &&
    (stay.hostId === store.currentUserId ||
      store.joinRequests.some((r) => r.stayId === stay.id && r.userId === store.currentUserId && r.status !== "declined"));

  useEffect(() => {
    if (!stay) return;
    if (!involved) router.replace(`/house/${stay.slug}`);
    else if (isDesktop) router.replace(`/my-stays?id=${stay.id}`);
  }, [stay, involved, isDesktop, router]);

  if (!stay) {
    return (
      <Container page width="narrow">
        <EmptyState
          icon={SearchX}
          title={t("manage.notFound")}
          action={
            <Button href="/my-stays">
              {t("manage.backToHouses")}
            </Button>
          }
        />
      </Container>
    );
  }

  if (!involved || isDesktop) return <PageSkeleton />;

  return (
    <Container page width="narrow">
      <Button href="/my-stays" variant="tertiary" className="mb-3">
        <ArrowLeft />
        {t("title")}
      </Button>
      <HouseDetail stay={stay} />
    </Container>
  );
}

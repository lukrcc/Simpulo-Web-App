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
import { didntWorkOut } from "@/lib/requests";

/** /your-houses/[id] – one House you host or joined: "← Your houses", the head, where it stands, the tabs. The page scrolls; no footer. */
export function ManageHouse({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("houses.manage");
  return (
    <RequireLogin title={t("loginTitle")}>
      <ManageHouseGate id={id} />
    </RequireLogin>
  );
}

function ManageHouseGate({ id }: { id: string }) {
  const t = useTranslations("houses");
  const store = useStore();
  const router = useRouter();
  const stay = store.stays.find((s) => s.id === id);
  // Host, or someone on the way in (request, invite, waitlist) – everyone else gets the public page.
  const involved =
    stay !== undefined &&
    (stay.hostId === store.currentUserId || store.joinRequests.some((r) => r.stayId === stay.id && r.userId === store.currentUserId && !didntWorkOut(r)));

  useEffect(() => {
    if (stay && !involved) router.replace(`/house/${stay.slug}`);
  }, [stay, involved, router]);

  if (!stay) {
    return (
      <Container page width="narrow">
        <EmptyState icon={SearchX} title={t("manage.notFound")} action={<Button href="/your-houses">{t("manage.backToHouses")}</Button>} />
      </Container>
    );
  }
  if (!involved) return <PageSkeleton />;

  return (
    <Container className="pb-(--space-section) pt-6 md:pt-8">
      <Button href="/your-houses" variant="tertiary" size="sm" className="-ml-4 mb-4">
        <ArrowLeft aria-hidden />
        {t("title")}
      </Button>
      <HouseDetail stay={stay} />
    </Container>
  );
}

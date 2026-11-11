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

/** /h/[id]/manage – one House you host: "← Your houses", the head, where it stands, the tabs. The page scrolls; no footer. */
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
  // Only the host manages here; guests have their way through the House on /h/[id] (members see it there, everyone else the public page).
  const involved = stay !== undefined && stay.hostId === store.currentUserId;

  useEffect(() => {
    if (stay && !involved) router.replace(`/h/${stay.id}`);
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
      {/* One narrow column, centred under the header: on 1440 × 900 the whole page fits without scrolling. */}
      <div className="mx-auto w-full max-w-[720px]">
        <Button href="/your-houses" variant="tertiary" size="sm" className="-ml-4 mb-2">
          <ArrowLeft aria-hidden />
          {t("title")}
        </Button>
        <HouseDetail stay={stay} />
      </div>
    </Container>
  );
}

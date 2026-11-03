"use client";

import { useTranslations } from "next-intl";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { Container } from "@/components/layout/Container";
import { PeopleList, usePeople } from "./People";

/** /people – everyone from your completed and locked Houses, with Message and Invite to a House. Logged in only. */
export function PeoplePage() {
  const t = useTranslations("people");
  return (
    <RequireLogin title={t("loginTitle")}>
      <PeopleContent />
    </RequireLogin>
  );
}

function PeopleContent() {
  const t = useTranslations("people");
  const people = usePeople();
  return (
    <Container page width="narrow">
      <h1 className="text-h2">{t("title")}</h1>
      {people.length > 0 && <p className="mt-1 text-muted">{t("subtitle", { count: people.length })}</p>}
      <div className="mt-6">
        <PeopleList variant="page" />
      </div>
    </Container>
  );
}

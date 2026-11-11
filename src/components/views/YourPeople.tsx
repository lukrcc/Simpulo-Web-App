"use client";

import { Search, Users } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/ActionButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Img } from "@/components/ui/Img";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useStore } from "@/lib/store";
import { shortNameOf } from "@/lib/shortName";
import { useYourPeople } from "@/lib/useYourPeople";
import { firstName } from "@/lib/utils";

/** The search shows from this many people on. */
const SEARCH_FROM = 9;

/** /people (avatar menu → "Your people"): who you lived with – both confirmed – as a grid of faces. No feed, no counts. */
export function YourPeople() {
  const t = useTranslations("people.page");
  return (
    <RequireLogin title={t("loginTitle")} description={t("loginDescription")}>
      <PeopleContent />
    </RequireLogin>
  );
}

function PeopleContent() {
  const t = useTranslations("people.page");
  const { removePerson } = useStore();
  const people = useYourPeople();
  const showToast = useToast();
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const shown = needle ? people.filter((p) => p.user.name.toLowerCase().includes(needle) || shortNameOf(p.house).toLowerCase().includes(needle)) : people;

  return (
    <Container page>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-h2 md:text-h1">{t("title")}</h1>
          <p className="mt-2 text-muted">{t("description")}</p>
        </div>
        {people.length >= SEARCH_FROM && (
          <div className="relative w-full max-w-[320px]">
            <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search")} aria-label={t("search")} className="pl-11" />
          </div>
        )}
      </div>
      {people.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={Users}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
            action={
              <Button href="/" variant="secondary" size="md">
                {t("explore")}
              </Button>
            }
          />
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-x-5 gap-y-8">
          {shown.map(({ user, house }) => (
            <li key={user.id} className="group">
              <Link href={`/u/${user.id}`} className="block rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring)">
                <span className="relative block aspect-[4/5] overflow-hidden rounded-[20px] bg-ink/6">
                  {user.photos[0] && <Img src={user.photos[0]} alt="" fill sizes="240px" className="object-cover transition-transform duration-350 group-hover:scale-[1.03]" />}
                </span>
                <span className="mt-3 block truncate text-body font-semibold text-ink">{firstName(user)}</span>
                <span className="block truncate text-small text-muted">{t("livedIn", { place: shortNameOf(house) })}</span>
              </Link>
              <Button
                variant="tertiary"
                size="sm"
                className="-ml-4 mt-1"
                onClick={() => {
                  removePerson(user.id);
                  showToast(t("removed", { name: firstName(user) }));
                }}
              >
                {t("remove")}
              </Button>
            </li>
          ))}
          {shown.length === 0 && <li className="col-span-full text-muted">{t("noMatch")}</li>}
        </ul>
      )}
    </Container>
  );
}

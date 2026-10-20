"use client";

import { Compass, House, Plus } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { AvatarStack } from "@/components/ui/Avatar";
import { buttonClass } from "@/components/ui/button";
import { Img } from "@/components/ui/Img";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusPill } from "@/components/ui/StatusPill";
import { Tabs } from "@/components/ui/Tabs";
import { crewThreadId, getCrew, pendingRequestCount, useStore } from "@/lib/store";
import type { JoinRequest, Stay, User } from "@/lib/types";
import { formatDateRange, pluralize } from "@/lib/utils";

type Tab = "hosting" | "joined";

export function MyStays() {
  const store = useStore();
  const [tab, setTab] = useState<Tab>("hosting");

  const hosting = store.stays.filter((s) => s.hostId === store.currentUserId);
  const joined = store.joinRequests
    .filter((r) => r.userId === store.currentUserId && (r.status === "accepted" || r.status === "pending"))
    .map((r) => ({ request: r, stay: store.stays.find((s) => s.id === r.stayId) }))
    .filter((j): j is { request: JoinRequest; stay: Stay } => Boolean(j.stay));

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 md:px-6 md:pt-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Houses</h1>
        <Link href="/create" className={buttonClass("dark", "sm", "md:hidden")}>
          <Plus className="size-4" />
          Open a House
        </Link>
      </div>

      <div className="mt-5">
        <Tabs
          tabs={[
            { value: "hosting", label: "Hosting", count: hosting.length },
            { value: "joined", label: "Joined", count: joined.length },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      <div className="mt-6 space-y-3">
        {tab === "hosting" &&
          (hosting.length > 0 ? (
            hosting.map((stay) => {
              const pending = pendingRequestCount(store, stay.id);
              return (
                <StayRow
                  key={stay.id}
                  stay={stay}
                  href={`/stays/${stay.slug}`}
                  crew={getCrew(store, stay)}
                  badge={
                    <span
                      className={
                        pending > 0
                          ? "rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-white"
                          : "rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500"
                      }
                    >
                      {pending > 0 ? `${pluralize(pending, "request")} pending` : "No pending requests"}
                    </span>
                  }
                  action={
                    <Link href={`/my-stays/${stay.id}`} className={buttonClass("dark", "sm")}>
                      Manage
                    </Link>
                  }
                />
              );
            })
          ) : (
            <EmptyState
              icon={House}
              title="You're not hosting yet"
              description="Found a great villa? Open a House and let the right people join you."
              action={
                <Link href="/create" className={buttonClass("primary", "sm")}>
                  Open a House
                </Link>
              }
            />
          ))}

        {tab === "joined" &&
          (joined.length > 0 ? (
            joined.map(({ request, stay }) => (
              <StayRow
                key={request.id}
                stay={stay}
                href={`/stays/${stay.slug}`}
                crew={getCrew(store, stay)}
                badge={<StatusPill status={request.status} />}
                action={
                  request.status === "accepted" ? (
                    <Link href={`/inbox/${crewThreadId(stay.id)}`} className={buttonClass("secondary", "sm")}>
                      Chat
                    </Link>
                  ) : undefined
                }
              />
            ))
          ) : (
            <EmptyState
              icon={Compass}
              title="No joined Houses yet"
              description="Browse Houses and ask to join a crew that matches your vibe."
              action={
                <Link href="/" className={buttonClass("primary", "sm")}>
                  Explore Houses
                </Link>
              }
            />
          ))}
      </div>
    </div>
  );
}

interface StayRowProps {
  stay: Stay;
  href: string;
  crew: User[];
  badge?: ReactNode;
  action?: ReactNode;
}

function StayRow({ stay, href, crew, badge, action }: StayRowProps) {
  return (
    <div className="flex gap-4 rounded-2xl border border-neutral-100 p-3 transition-colors hover:border-neutral-200">
      <Link href={href} className="shrink-0">
        <Img src={stay.mapPreviewUrl} alt={stay.title} width={112} height={112} className="size-24 rounded-xl bg-neutral-100 object-cover md:size-28" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={href} className="truncate font-semibold hover:underline">
              {stay.title}
            </Link>
            {badge}
          </div>
          <p className="mt-0.5 truncate text-sm text-neutral-500">
            {stay.city} · {formatDateRange(stay.startDate, stay.endDate)}
          </p>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AvatarStack users={crew} size="xs" />
            <span className="text-xs text-neutral-500">
              {stay.spotsFilled}/{stay.spotsTotal}
            </span>
          </div>
          {action}
        </div>
      </div>
    </div>
  );
}

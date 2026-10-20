"use client";

import { ArrowLeft, ExternalLink, Inbox, Lock, LockOpen, SearchX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState, type FormEvent, type ReactNode } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Img } from "@/components/ui/Img";
import { PriceLine } from "@/components/ui/PriceLine";
import { SocialRow } from "@/components/ui/SocialRow";
import { StatusPill } from "@/components/ui/StatusPill";
import { useToast } from "@/components/ui/Toast";
import { crewThreadId, findUser, getCrew, useStore } from "@/lib/store";
import type { JoinRequest, Stay, User } from "@/lib/types";
import { ageAndCountry, formatDateRange, formatDay, pluralize } from "@/lib/utils";

const statusOrder: Record<JoinRequest["status"], number> = { pending: 0, accepted: 1, declined: 2 };

export function ManageStay({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const store = useStore();
  const stay = store.stays.find((s) => s.id === id);

  if (!stay || stay.hostId !== store.currentUserId) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-16">
        <EmptyState
          icon={SearchX}
          title={stay ? "Only the host can manage this House" : "House not found"}
          action={
            <Link href="/my-stays" className={buttonClass("primary", "sm")}>
              Back to Houses
            </Link>
          }
        />
      </div>
    );
  }

  return <ManageStayContent stay={stay} />;
}

function ManageStayContent({ stay }: { stay: Stay }) {
  const store = useStore();

  const requests = store.joinRequests
    .filter((r) => r.stayId === stay.id)
    .toSorted((a, b) => statusOrder[a.status] - statusOrder[b.status] || b.createdAt.localeCompare(a.createdAt));
  const pending = requests.filter((r) => r.status === "pending").length;
  const crew = getCrew(store, stay);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-4 md:px-6 md:pt-10">
      <Link href="/my-stays" className="-ml-2 inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-sm text-neutral-500 hover:text-ink">
        <ArrowLeft className="size-4" />
        Houses
      </Link>

      <div className="mt-3 flex items-center gap-4">
        <Img src={stay.mapPreviewUrl} alt="" width={64} height={64} className="size-16 shrink-0 rounded-xl bg-neutral-100 object-cover" />
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight md:text-2xl">{stay.title}</h1>
          <p className="text-sm text-neutral-500">
            {stay.city} · {formatDateRange(stay.startDate, stay.endDate)}
          </p>
          <p className="text-sm text-neutral-500">
            {stay.spotsFilled >= stay.spotsTotal ? "Crew complete" : `${stay.spotsFilled} of ${stay.spotsTotal} in`}
          </p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Link href={`/stays/${stay.slug}`} className={buttonClass("secondary", "sm")}>
          View public page
        </Link>
        <Link href={`/inbox/${crewThreadId(stay.id)}`} className={buttonClass("secondary", "sm")}>
          Crew chat
        </Link>
      </div>

      <Section title="Requests" aside={pending > 0 ? `${pending} pending` : undefined}>
        {requests.length === 0 ? (
          <EmptyState icon={Inbox} title="No requests yet" description="Share your House page to find your crew." />
        ) : (
          <ul className="space-y-3">
            {requests.map((request) => {
              const applicant = findUser(store, request.userId);
              return applicant ? <RequestCard key={request.id} request={request} applicant={applicant} stay={stay} /> : null;
            })}
          </ul>
        )}
      </Section>

      <Section title="Crew" aside={pluralize(crew.length, "person", "people")}>
        <ul className="divide-y divide-neutral-100 rounded-2xl border border-neutral-100">
          {crew.map((member) => (
            <li key={member.id} className="flex items-center gap-3 p-3">
              <Avatar user={member} size="sm" linked />
              <span className="flex-1 text-sm font-medium">{member.name}</span>
              {member.id === stay.hostId && <span className="text-xs font-medium uppercase text-accent">Host</span>}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Accommodation">
        <AccommodationPanel stay={stay} />
      </Section>
    </div>
  );
}

function RequestCard({ request, applicant, stay }: { request: JoinRequest; applicant: User; stay: Stay }) {
  const { acceptRequest, declineRequest, openDirectThread } = useStore();
  const router = useRouter();
  const showToast = useToast();
  const firstName = applicant.name.split(" ")[0];
  const isFull = stay.spotsFilled >= stay.spotsTotal;

  function reply() {
    router.push(`/inbox/${openDirectThread(stay.id, applicant.id)}`);
  }

  return (
    <li className="rounded-2xl border border-neutral-100 p-4">
      <div className="flex items-start gap-3">
        <Avatar user={applicant} size="lg" linked />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/u/${applicant.id}`} className="font-semibold hover:underline">
              {applicant.name}
            </Link>
            <StatusPill status={request.status} />
          </div>
          <p className="text-sm text-neutral-500">
            {ageAndCountry(applicant)} · {formatDay(request.createdAt)}
          </p>
          <p className="text-sm text-neutral-500">
            Speaks {applicant.languages.join(", ")}
          </p>
          <SocialRow user={applicant} size="sm" className="mt-2" />
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-neutral-700">{request.message}</p>

      <div className="mt-4 flex gap-2">
        {request.status === "pending" && (
          <>
            <button
              type="button"
              disabled={isFull}
              onClick={() => {
                acceptRequest(request.id);
                showToast(`${firstName} joined the crew 🎉`);
              }}
              className={buttonClass("dark", "sm", "flex-1")}
            >
              {isFull ? "Crew is full" : "Accept"}
            </button>
            <button
              type="button"
              onClick={() => {
                declineRequest(request.id);
                showToast(`Declined ${firstName}`);
              }}
              className={buttonClass("ghost", "sm", "flex-1")}
            >
              Decline
            </button>
          </>
        )}
        <button type="button" onClick={reply} className={buttonClass("ghost", "sm", request.status === "pending" ? "flex-1" : undefined)}>
          Reply
        </button>
      </div>
    </li>
  );
}

function AccommodationPanel({ stay }: { stay: Stay }) {
  const { lockAccommodation } = useStore();
  const showToast = useToast();
  const [link, setLink] = useState(stay.accommodationLink ?? "");
  const [price, setPrice] = useState(stay.pricePerPerson ? String(stay.pricePerPerson) : "");
  const priceValue = Math.round(Number(price));
  const valid = link.trim() !== "" && priceValue > 0;

  if (stay.accommodationStatus === "locked") {
    return (
      <div className="space-y-3 rounded-2xl bg-neutral-50 p-4">
        <div className="flex items-start gap-3">
          <Lock className="mt-0.5 size-5 shrink-0 text-accent" />
          <div className="min-w-0">
            <p className="font-medium">Accommodation locked</p>
            {stay.accommodationLink && (
              <a
                href={stay.accommodationLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 flex items-center gap-1 truncate text-sm text-neutral-500 hover:text-ink"
              >
                <span className="truncate">{stay.accommodationLink}</span>
                <ExternalLink className="size-3.5 shrink-0" />
              </a>
            )}
          </div>
        </div>
        <PriceLine stay={stay} />
      </div>
    );
  }

  function handleLock(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    lockAccommodation(stay.id, link, priceValue);
    showToast("Accommodation locked");
  }

  const inputClass = "h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm outline-none focus:border-ink";

  return (
    <form onSubmit={handleLock} className="space-y-3 rounded-2xl bg-accent-soft p-4">
      <p className="flex items-center gap-2 text-sm">
        <LockOpen className="size-4 text-accent" />
        Not fixed yet – lock it once the crew has decided.
      </p>
      <PriceLine stay={stay} />
      <input
        type="url"
        value={link}
        onChange={(e) => setLink(e.target.value)}
        placeholder="https://www.airbnb.com/rooms/…"
        aria-label="Accommodation link"
        className={inputClass}
      />
      <input
        type="number"
        inputMode="numeric"
        min={1}
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder="Final price per person (€, incl. 10% fee)"
        aria-label="Final price per person"
        className={inputClass}
      />
      <button type="submit" disabled={!valid} className={buttonClass("primary", "sm")}>
        <Lock className="size-4" />
        Lock accommodation
      </button>
    </form>
  );
}

function Section({ title, aside, children }: { title: string; aside?: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        {aside && <span className="text-sm text-neutral-500">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

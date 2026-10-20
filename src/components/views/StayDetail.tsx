"use client";

import { Check, SearchX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState, type FormEvent } from "react";
import { AccommodationSection } from "@/components/stay/AccommodationSection";
import { CrewSection } from "@/components/stay/CrewSection";
import { HostGallery } from "@/components/stay/HostGallery";
import { HostPitch } from "@/components/stay/HostPitch";
import { BudgetBlock } from "@/components/stay/BudgetBlock";
import { Section } from "@/components/stay/Section";
import { StayFacts } from "@/components/stay/StayFacts";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PriceLine } from "@/components/ui/PriceLine";
import { Sheet } from "@/components/ui/Sheet";
import { useInstallNudge } from "@/components/InstallNudge";
import { useToast } from "@/components/ui/Toast";
import { crewThreadId, findUser, getCrew, getCrewThread, getMyRequest, isCrewMember, useStore } from "@/lib/store";
import type { JoinRequest, Stay } from "@/lib/types";
import { formatDateRange, pluralize, stayNights } from "@/lib/utils";

const URL_PATTERN = /https?:\/\/\S+/g;

export function StayDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const store = useStore();
  const stay = store.stays.find((s) => s.slug === slug);

  if (!stay) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-16">
        <EmptyState
          icon={SearchX}
          title="House not found"
          description="This House doesn't exist or isn't public anymore."
          action={
            <Link href="/" className={buttonClass("primary", "sm")}>
              Explore Houses
            </Link>
          }
        />
      </div>
    );
  }

  return <StayDetailContent stay={stay} />;
}

function StayDetailContent({ stay }: { stay: Stay }) {
  const store = useStore();
  const router = useRouter();
  const showToast = useToast();
  const offerInstall = useInstallNudge();
  const [sheetOpen, setSheetOpen] = useState(false);

  const host = findUser(store, stay.hostId);
  const crew = getCrew(store, stay);
  const myRequest = getMyRequest(store, stay.id);
  const isHost = stay.hostId === store.currentUserId;
  const isMember = isCrewMember(store, stay, store.currentUserId);
  const spotsLeft = Math.max(0, stay.spotsTotal - stay.spotsFilled);
  const chatLinkCount = (getCrewThread(store, stay.id)?.messages ?? []).reduce((count, m) => count + (m.text.match(URL_PATTERN)?.length ?? 0), 0);

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast("Link copied to clipboard");
    } catch {
      showToast("Couldn't copy the link");
    }
  }

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push("/");
  }

  const cta = (
    <StayCta
      stay={stay}
      isHost={isHost}
      request={myRequest}
      spotsLeft={spotsLeft}
      onRequest={() => setSheetOpen(true)}
    />
  );

  return (
    <div className="mx-auto max-w-6xl md:grid md:grid-cols-[1fr_360px] md:gap-12 md:px-6 md:pt-8">
      <div className="min-w-0">
        {host && <HostGallery host={host} onBack={goBack} onShare={share} />}

        <div className="px-4 pt-6 md:px-0">
          <StayFacts stay={stay} />

          <HostPitch stay={stay} />

          {/* Always visible before anyone requests to join. */}
          <Section title="Budget">
            <BudgetBlock stay={stay} />
          </Section>

          <Section title="Accommodation">
            <AccommodationSection stay={stay} chatLinkCount={chatLinkCount} canOpenChat={isMember} />
          </Section>

          <Section title="Crew">
            <CrewSection stay={stay} crew={crew} />
          </Section>

          {stay.houseRules.length > 0 && (
            <Section title="House rules">
              <ul className="space-y-2">
                {stay.houseRules.map((rule) => (
                  <li key={rule} className="flex gap-2 text-neutral-700">
                    <Check className="mt-0.5 size-4 shrink-0 text-accent" />
                    {rule}
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      </div>

      {/* Desktop: sticky side card */}
      <aside className="hidden md:block">
        <div className="sticky top-24 rounded-2xl border border-neutral-100 p-6 shadow-sm">
          <PriceLine stay={stay} size="lg" />
          <p className="mt-3 text-sm text-neutral-500">
            {formatDateRange(stay.startDate, stay.endDate)} · {pluralize(stayNights(stay), "night")}
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            {stay.spotsFilled} of {stay.spotsTotal} in
          </p>
          <div className="mt-5">{cta}</div>
        </div>
      </aside>

      {/* Mobile: sticky bottom CTA (replaces the tab bar on this route) */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-100 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-4">
          <PriceLine stay={stay} compact className="shrink-0" />
          <div className="flex-1">{cta}</div>
        </div>
      </div>

      <RequestSheet
        open={sheetOpen}
        stay={stay}
        hostName={host?.name.split(" ")[0] ?? "the host"}
        onClose={() => setSheetOpen(false)}
        onSubmit={(message) => {
          store.requestToJoin(stay.id, message);
          setSheetOpen(false);
          showToast("Request sent – the host will get back to you");
          offerInstall(host?.name.split(" ")[0] ?? "the host");
        }}
      />
    </div>
  );
}

interface StayCtaProps {
  stay: Stay;
  isHost: boolean;
  request?: JoinRequest;
  spotsLeft: number;
  onRequest: () => void;
}

function StayCta({ stay, isHost, request, spotsLeft, onRequest }: StayCtaProps) {
  const full = "w-full";
  if (isHost) {
    return (
      <Link href={`/my-stays/${stay.id}`} className={buttonClass("dark", "lg", full)}>
        Manage House
      </Link>
    );
  }
  if (request?.status === "accepted") {
    return (
      <Link href={`/inbox/${crewThreadId(stay.id)}`} className={buttonClass("dark", "lg", full)}>
        You&apos;re in – open the crew chat
      </Link>
    );
  }
  if (request?.status === "pending") {
    return (
      <button type="button" disabled className={buttonClass("primary", "lg", full)}>
        <Check className="size-4" />
        Request sent · waiting for host
      </button>
    );
  }
  if (request?.status === "declined") {
    return (
      <button type="button" disabled className={buttonClass("primary", "lg", full)}>
        Not this time
      </button>
    );
  }
  if (spotsLeft === 0 || stay.status === "full") {
    return (
      <button type="button" disabled className={buttonClass("primary", "lg", full)}>
        Crew is full
      </button>
    );
  }
  return (
    <button type="button" onClick={onRequest} className={buttonClass("primary", "lg", full)}>
      Join this House
    </button>
  );
}

interface RequestSheetProps {
  open: boolean;
  stay: Stay;
  hostName: string;
  onClose: () => void;
  onSubmit: (message: string) => void;
}

function RequestSheet({ open, stay, hostName, onClose, onSubmit }: RequestSheetProps) {
  const [message, setMessage] = useState("");
  const minLength = 20;
  const valid = message.trim().length >= minLength;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    onSubmit(message);
    setMessage("");
  }

  return (
    <Sheet open={open} onClose={onClose} title="Join this House">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-neutral-500">
          Tell {hostName} a bit about yourself and why <span className="font-medium text-ink">{stay.title}</span> is
          a good fit for you.
        </p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          autoFocus
          placeholder="Hi! I'm a designer from Berlin, love early mornings and cooking for the crew…"
          className="w-full resize-none rounded-2xl border border-neutral-200 p-4 text-sm outline-none focus:border-ink"
        />
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span>{valid ? "Looks good" : `At least ${minLength} characters`}</span>
          <span>{message.trim().length}</span>
        </div>
        <button type="submit" disabled={!valid} className={buttonClass("primary", "lg", "w-full")}>
          Send request
        </button>
      </form>
    </Sheet>
  );
}

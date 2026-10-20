"use client";

import { AtSign, BadgeCheck, Pencil, SearchX } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { StayCard } from "@/components/StayCard";
import { Avatar } from "@/components/ui/Avatar";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LanguageChips } from "@/components/ui/LanguageChips";
import { MoreList } from "@/components/views/MoreList";
import { findUser, getCrew, getCurrentUser, useStore } from "@/lib/store";
import type { User } from "@/lib/types";
import { ageAndCountry } from "@/lib/utils";

export function MyProfile() {
  const store = useStore();
  return <ProfileView user={getCurrentUser(store)} isMe />;
}

export function PublicProfile({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const store = useStore();
  const user = findUser(store, userId);

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-16">
        <EmptyState
          icon={SearchX}
          title="Profile not found"
          action={
            <Link href="/" className={buttonClass("primary", "sm")}>
              Explore Houses
            </Link>
          }
        />
      </div>
    );
  }

  return <ProfileView user={user} isMe={user.id === store.currentUserId} />;
}

function ProfileView({ user, isMe }: { user: User; isMe: boolean }) {
  const store = useStore();
  const hosted = store.stays.filter((s) => s.hostId === user.id);
  const joinedCount = store.joinRequests.filter((r) => r.userId === user.id && r.status === "accepted").length;
  const openHosted = hosted.filter((s) => s.status === "published" || s.status === "full");

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 md:px-6 md:pt-12">
      <div className="flex flex-col items-center text-center">
        <Avatar user={user} size="xl" />
        <h1 className="mt-4 flex items-center gap-1.5 text-2xl font-bold tracking-tight">
          {user.name}
          {user.verified && <BadgeCheck className="size-5 text-accent" aria-label="Verified" />}
        </h1>
        <p className="mt-1 text-neutral-500">
          {ageAndCountry(user)} · based in {user.city}
        </p>
        {user.verified ? (
          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
            <BadgeCheck className="size-3.5" />
            Verified member
          </span>
        ) : (
          <span className="mt-2 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-500">
            Not verified yet
          </span>
        )}
        {user.instagram && (
          <p className="mt-3 flex items-center gap-1 text-sm text-neutral-600">
            <AtSign className="size-4" />
            {user.instagram}
          </p>
        )}
        {isMe && (
          <button type="button" className={buttonClass("secondary", "sm", "mt-5")}>
            <Pencil className="size-4" />
            Edit profile
          </button>
        )}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3">
        <Stat value={hosted.length} label="Houses hosted" />
        <Stat value={joinedCount} label="Houses joined" />
      </div>

      <section className="mt-8">
        <h2 className="mb-2 text-lg font-semibold">About</h2>
        <p className="leading-relaxed text-neutral-700">{user.bio}</p>
      </section>

      {user.languages.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Languages</h2>
          <LanguageChips languages={user.languages} />
        </section>
      )}

      {!isMe && openHosted.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Hosting</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {openHosted.map((stay) => (
              <StayCard key={stay.id} stay={stay} host={user} crew={getCrew(store, stay)} />
            ))}
          </div>
        </section>
      )}

      {isMe && <MoreList />}
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl bg-neutral-50 p-4 text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-neutral-500">{label}</p>
    </div>
  );
}

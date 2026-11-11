"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { use, useEffect } from "react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { useStore } from "@/lib/store";

/** /your-houses/[id] → the host to /h/[id]/manage, everyone else to /h/[id]; the query (?focus=) goes along. */
export function HouseRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const store = useStore();
  const router = useRouter();
  const query = useSearchParams().toString();
  const stay = store.stays.find((s) => s.id === id);
  const isHost = stay !== undefined && stay.hostId === store.currentUserId;

  useEffect(() => {
    router.replace(`/h/${id}${isHost ? "/manage" : ""}${query ? `?${query}` : ""}`);
  }, [id, isHost, query, router]);

  return <PageSkeleton />;
}

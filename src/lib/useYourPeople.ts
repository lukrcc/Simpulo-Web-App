"use client";

import { useMemo } from "react";
import { useStore } from "./store";
import { peopleSignal, yourPeople, type PeopleSignal, type PersonOfYours } from "./yourPeople";

/** The current user's people (lib/yourPeople.ts); logged out none. */
export function useYourPeople(): PersonOfYours[] {
  const store = useStore();
  const me = store.currentUserId;
  return useMemo(() => (me ? yourPeople(store, me) : []), [store, me]);
}

/** Who of the current user's people is in this House – the card's and the House page's hint. Never for the viewer's own House. */
export function usePeopleSignal(stay: Parameters<typeof peopleSignal>[1]): PeopleSignal | null {
  const store = useStore();
  const people = useYourPeople();
  return useMemo(() => (stay.hostId === store.currentUserId ? null : peopleSignal(store, stay, people)), [store, stay, people]);
}

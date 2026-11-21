"use client";

// /: visitors get the start page (components/views/Landing.tsx – also what the server renders, so it is what search engines read); signed in,
// / stays Explore. The login lives in this browser, so the switch happens right after hydration (store.sessionRestored).
import { useStore } from "@/lib/store";
import { ExploreFeed } from "./ExploreFeed";
import { Landing } from "./Landing";

export function HomeEntry() {
  const { currentUserId, sessionRestored } = useStore();
  return sessionRestored && currentUserId ? <ExploreFeed /> : <Landing />;
}

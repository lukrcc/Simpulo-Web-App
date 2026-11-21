"use client";

// Online or not (the offline banner, the error pages' "You're offline"): the browser's navigator.onLine and its online/offline events – in
// dev also the Dev menu's "Simulate offline". Online on the server and while hydrating.
import { useSyncExternalStore } from "react";
import { readDevSetting, subscribeDevSettings } from "./devSettings";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  const unsub = subscribeDevSettings(onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
    unsub();
  };
}

export const isOnline = () => navigator.onLine && !readDevSetting("simOffline");

export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, isOnline, () => true);
}

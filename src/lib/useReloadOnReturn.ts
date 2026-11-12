"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { isStandalone } from "./install";
import { useStore } from "./store";

/**
 * The installed app has no pull-to-refresh: when it comes back to the front (visibilitychange), Messages and Your houses read their data
 * again – the store (mock: what was saved; later the backend) and the server parts of the route. In a browser tab nothing happens.
 */
export function useReloadOnReturn() {
  const { reloadData } = useStore();
  const router = useRouter();
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible" || !isStandalone()) return;
      reloadData();
      router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [reloadData, router]);
}

import { useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

/**
 * false in the first render – on the server and while the component hydrates –, true right after. Everything that depends on the browser
 * (localStorage: the platform phase, the mock data, the login, flags) must render the server's value while this is false; React renders again
 * with the real one at once. Never read localStorage in the first render (CLAUDE.md "Hydration").
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(noSubscribe, () => true, () => false);
}

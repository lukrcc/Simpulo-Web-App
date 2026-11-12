// The platform's phase – the one place for what each phase allows. Pages ask only the helpers below (canRequest, canReserve, canPay,
// canOpenHouse) or usePlatformPhase(); no component compares phase names itself.
//
//   prelaunch – nobody can ask to join and nothing is paid; hosts can apply. A House's main action is "Join the waitlist".
//   beta      – the founding hosts open Houses; guests reserve a spot ("Reserve a spot"); no payment until launch.
//   live      – everything as it is today.
//
// In dev the Dev menu's "Phase" picks it (and the mock data set that goes with it: Pre-launch → the live Houses as examples, Beta → the
// examples + 15 founding Houses, Live → the full data); in demo and production it is "live" until the real launch switch exists.
import { useHydrated } from "@/lib/useHydrated";
import { PLATFORM_PHASES, readPlatformPhase, savePlatformPhase } from "@/lib/data";
import type { PlatformPhase } from "@/lib/types";

export { PLATFORM_PHASES };
export type { PlatformPhase };

export interface PhaseRules {
  /** "Request to join" a House */
  request: boolean;
  /** Hold a spot without paying ("Reserve a spot") */
  reserve: boolean;
  /** Pay a share (and everything that leads to it: pay steps, payouts) */
  pay: boolean;
  /** Open a House ("+" / Open a House) */
  openHouse: boolean;
  /** Apply as a host (instead of opening a House) */
  applyAsHost: boolean;
}

export const phaseRules: Record<PlatformPhase, PhaseRules> = {
  prelaunch: { request: false, reserve: false, pay: false, openHouse: false, applyAsHost: true },
  beta: { request: false, reserve: true, pay: false, openHouse: true, applyAsHost: false },
  live: { request: true, reserve: false, pay: true, openHouse: true, applyAsHost: false },
};

/** Whether the founding hosts see each other's Houses during the beta. Open – a decision for the founders. */
export const foundingHostsSeeOthers = false;

/**
 * Example Houses (pre-launch and beta): the full page with sample Houses, marked "Example", not bookable – they give way as real ones come
 * (lib/data/visibleHouses.ts getVisibleHouses): a category with this many real Houses loses its examples; at this many real Houses in all,
 * every example goes. Live never shows examples.
 */
export const examples = {
  hideCategoryAtRealCount: 5,
  removeAllAtRealCount: 50,
} as const;

/** The launch, as the pages say it. */
export const launch = {
  targetLabel: "Opening March 2027",
  /** "Real Houses open in March." */
  targetMonth: "March",
} as const;

/** Whether example Houses are shown at all in this phase. */
export const showsExamples = (phase: PlatformPhase) => phase !== "live";
/** Personal rows on Explore ("Your people are going" …): not before the launch – there's nobody's House to go to yet. */
export const showsPersonalRows = (phase: PlatformPhase) => phase !== "prelaunch";

export const canRequest = (phase: PlatformPhase) => phaseRules[phase].request;
export const canReserve = (phase: PlatformPhase) => phaseRules[phase].reserve;
export const canPay = (phase: PlatformPhase) => phaseRules[phase].pay;
export const canOpenHouse = (phase: PlatformPhase) => phaseRules[phase].openHouse;
export const canApplyAsHost = (phase: PlatformPhase) => phaseRules[phase].applyAsHost;

/** The current phase; "live" on the server and in the first render (useHydrated), then the browser's choice – never localStorage in the first
 *  render. */
export function usePlatformPhase(): PlatformPhase {
  const hydrated = useHydrated();
  return hydrated ? readPlatformPhase() : "live";
}

/** Dev menu only: switch the phase (the page reloads with that phase's data). */
export function setPlatformPhase(phase: PlatformPhase) {
  savePlatformPhase(phase);
}

// Open a House – one step, one question, no scrolling (CLAUDE.md "Open a House: ein Schritt, eine Frage"). The steps of a NEW House in order,
// in three parts; each with the key under create.questions for its title, whether it must be answered, and the component that renders it
// (create/HouseSteps.tsx). Editing a House keeps its own list (create/model.ts EDIT_REQUIRED_STEPS + the details).
// Everything else (About the space, description, photos of the place, languages, who, crew age, house rules) comes after opening, in Manage.

export const OPEN_HOUSE_PARTS = ["idea", "place", "crew"] as const;
export type OpenHousePart = (typeof OPEN_HOUSE_PARTS)[number];

export interface OpenHouseStep {
  id: "vibe" | "place" | "placeSave" | "where" | "when" | "kind" | "crew" | "price" | "depth" | "cover" | "ready";
  part: OpenHousePart;
  /** Key under create.questions */
  title: string;
  required: boolean;
  component: string;
  /** Only sometimes: "set" – only with "I have a place" (a new one); "notOwn" – not for a window of the host's own place; "depth" – only while the depth choice is on */
  when?: "set" | "notOwn" | "depth";
}

export const OPEN_HOUSE_STEPS: readonly OpenHouseStep[] = [
  { id: "vibe", part: "idea", title: "vibe", required: true, component: "VibeStep" },
  { id: "place", part: "idea", title: "place", required: true, component: "PlaceStep", when: "notOwn" },
  { id: "placeSave", part: "idea", title: "placeSave", required: true, component: "PlaceSaveStep", when: "set" },
  { id: "where", part: "place", title: "whereOnly", required: true, component: "WhereStep (where)" },
  { id: "when", part: "place", title: "when", required: true, component: "WhereStep (when)" },
  { id: "kind", part: "place", title: "kind", required: true, component: "KindStep", when: "notOwn" },
  { id: "crew", part: "crew", title: "people", required: true, component: "PeopleStep" },
  { id: "price", part: "crew", title: "price", required: true, component: "PriceStep" },
  { id: "depth", part: "crew", title: "depth", required: true, component: "DepthStep", when: "depth" },
  { id: "cover", part: "crew", title: "cover", required: true, component: "CoverStep" },
  { id: "ready", part: "crew", title: "ready", required: false, component: "ReadySummary" },
];

/** About how long a step takes – "about M min left" */
export const SECONDS_PER_STEP = 20;
/** The crew stepper's bounds (the host included) */
export const PEOPLE_MIN = 2;
export const PEOPLE_MAX = 30;

/** The steps that apply to this form: the place's own steps only with "I have a place", the place and its kind not for a window of one's own place. */
export function openHouseSteps({ placeMode, ownPlace, depthOn }: { placeMode: string; ownPlace: boolean; depthOn: boolean }): OpenHouseStep[] {
  return OPEN_HOUSE_STEPS.filter((s) => (s.when === "set" ? placeMode === "set" && !ownPlace : s.when === "notOwn" ? !ownPlace : s.when === "depth" ? depthOn : true));
}

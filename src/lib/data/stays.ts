// Server-safe read access to public House data – what crawlers and server-rendered pages may see. Today it reads the
// mock data; a Firebase implementation of StayRepository replaces `mockRepository` later without touching callers.
// No client context, no store: these work in server components, generateMetadata, sitemap and OG images alike.
import { joinRequests as mockRequests, stays as mockStays, users as mockUsers, VIBES } from "../mock";
import type { JoinRequest } from "../types";
import type { Stay, User, Vibe } from "../types";
import { slugify } from "../utils";

/** A city with public Houses, as used by /co-living/[city]. */
export interface CityEntry {
  slug: string;
  name: string;
  country: string;
  count: number;
}

/** A vibe with public Houses, as used by /houses/[vibe]. */
export interface VibeEntry {
  vibe: Vibe;
  label: string;
  count: number;
}

export interface StayRepository {
  /** Every House with a public page (open, full, booked or completed) – never drafts, closed or unclaimed ones */
  getPublicStays(): Promise<Stay[]>;
  /** The public House with this slug, or undefined (also for drafts, closed and unclaimed Houses) */
  getStayBySlug(slug: string): Promise<Stay | undefined>;
  /** Any House with this slug, whatever its status – for the House page to tell drafts (404) from closed ones */
  getStayRecord(slug: string): Promise<Stay | undefined>;
  /** Listed Houses (open on Explore) in a city, by city slug ("bangkok") */
  getStaysByCity(citySlug: string): Promise<Stay[]>;
  /** Listed Houses with this vibe */
  getStaysByVibe(vibe: Vibe): Promise<Stay[]>;
  /** A host's public profile data */
  getUser(userId: string): Promise<User | undefined>;
  /** Host first, then the accepted members – what a card's crew row shows */
  getCrew(stay: Stay): Promise<User[]>;
  /** Cities / vibes with at least one listed House, most Houses first */
  getCities(): Promise<CityEntry[]>;
  getVibes(): Promise<VibeEntry[]>;
}

/** Statuses whose House page stays public (their links keep working); only "published" Houses are listed. */
const PUBLIC_STATUSES: ReadonlySet<Stay["status"]> = new Set(["published", "booked", "completed"]);

export const isPublicStay = (stay: Stay) => PUBLIC_STATUSES.has(stay.status) && stay.hostId !== "";
export const isListedStay = (stay: Stay) => stay.status === "published" && stay.hostId !== "";

export const citySlugOf = (stay: Pick<Stay, "city">) => slugify(stay.city);
/** "Bali, Indonesia" → "Indonesia" */
export const countryOf = (stay: Pick<Stay, "region">) => stay.region.split(",").at(-1)?.trim() ?? stay.region;

/** The order everywhere public: soonest start first. */
const bySoonest = (a: Stay, b: Stay) => a.startDate.localeCompare(b.startDate);

function createMockRepository(all: readonly Stay[], users: readonly User[], requests: readonly JoinRequest[]): StayRepository {
  const listed = () => all.filter(isListedStay).toSorted(bySoonest);
  return {
    getPublicStays: async () => all.filter(isPublicStay).toSorted(bySoonest),
    getStayBySlug: async (slug) => all.find((s) => s.slug === slug && isPublicStay(s)),
    getStayRecord: async (slug) => all.find((s) => s.slug === slug),
    getStaysByCity: async (citySlug) => listed().filter((s) => citySlugOf(s) === citySlug),
    getStaysByVibe: async (vibe) => listed().filter((s) => s.vibe === vibe),
    getUser: async (userId) => users.find((u) => u.id === userId),
    getCrew: async (stay) =>
      [stay.hostId, ...requests.filter((r) => r.stayId === stay.id && r.status === "accepted").map((r) => r.userId)]
        .map((id) => users.find((u) => u.id === id))
        .filter((u): u is User => u !== undefined),
    getCities: async () => {
      const cities = new Map<string, CityEntry>();
      for (const stay of listed()) {
        const slug = citySlugOf(stay);
        if (!slug) continue;
        const entry = cities.get(slug) ?? { slug, name: stay.city, country: countryOf(stay), count: 0 };
        entry.count++;
        cities.set(slug, entry);
      }
      return [...cities.values()].toSorted((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    },
    getVibes: async () =>
      VIBES.map(({ key, label }) => ({ vibe: key, label, count: listed().filter((s) => s.vibe === key).length }))
        .filter((v) => v.count > 0)
        .toSorted((a, b) => b.count - a.count),
  };
}

export const stayRepository: StayRepository = createMockRepository(mockStays, mockUsers, mockRequests);

export const { getPublicStays, getStayBySlug, getStayRecord, getStaysByCity, getStaysByVibe, getUser, getCrew, getCities, getVibes } = stayRepository;

/** Below this many listed Houses a city or vibe page is thin content: rendered, but noindex. */
export const MIN_INDEXABLE_HOUSES = 3;

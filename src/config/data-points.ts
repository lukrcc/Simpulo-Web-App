// Every data point Simpulo collects – the one list. Tracking (lib/analytics.ts, later the backend) records only what stands here; a new data
// point is entered here first, or it isn't collected (CLAUDE.md "Daten und Modelle"). Admin › Data & Algorithm shows it.
//
// Never: special categories (religion, sexual orientation, health, political views, ethnicity) and never the content of chat messages.
// Support ("Help & feedback") is read by the team to help – its free text is never used by a model, for matching or for ranking.
// Legal basis only `contract` (needed to run a House) or `consent` (asked for, can be withdrawn).
import type { ModelId } from "./models";

export const MOMENTS = ["onboarding", "search", "create", "request", "inTheHouse", "afterTheStay", "marketing", "support"] as const;
export type Moment = (typeof MOMENTS)[number];

export const DATA_POINT_STATUSES = ["planned", "collecting", "used"] as const;
/** planned – not collected yet · collecting – stored, no model reads it yet · used – a model reads it */
export type DataPointStatus = (typeof DATA_POINT_STATUSES)[number];

export type LegalBasis = "consent" | "contract";

export interface DataPoint {
  id: string;
  moment: Moment;
  /** What is recorded */
  captures: string;
  /** Why */
  purpose: string;
  /** The models that read it (config/models.ts); empty = none yet */
  models: readonly ModelId[];
  legalBasis: LegalBasis;
  status: DataPointStatus;
}

export const DATA_POINTS: readonly DataPoint[] = [
  // ── Onboarding ──
  { id: "profile.age", moment: "onboarding", captures: "Birth date (shown only as age)", purpose: "18+ check; crews of similar age", models: ["crewFit"], legalBasis: "contract", status: "used" },
  { id: "profile.base", moment: "onboarding", captures: "Country and city they're based in", purpose: "Where people come from; nearby Houses", models: ["demandMap"], legalBasis: "contract", status: "collecting" },
  { id: "profile.languages", moment: "onboarding", captures: "Languages spoken", purpose: "A crew that can talk to each other", models: ["crewFit"], legalBasis: "contract", status: "used" },
  { id: "profile.interests", moment: "onboarding", captures: "Categories they're into (Fitness, Founder …)", purpose: "First guess at what to show them", models: ["interestRanking", "crewFit"], legalBasis: "contract", status: "used" },
  { id: "profile.houseVibe", moment: "onboarding", captures: "Four sliders: early bird ↔ night owl, quiet ↔ social, active ↔ chill, tidy ↔ relaxed", purpose: "How they live together", models: ["crewFit"], legalBasis: "consent", status: "collecting" },
  { id: "profile.socials", moment: "onboarding", captures: "Public social links they add", purpose: "Shown on the profile; trust", models: [], legalBasis: "consent", status: "collecting" },

  // ── Search ──
  { id: "search.placeMonth", moment: "search", captures: "Place and month searched on Explore", purpose: "Where and when people want to go", models: ["demandMap", "interestRanking"], legalBasis: "consent", status: "collecting" },
  { id: "search.category", moment: "search", captures: "Category and filters chosen", purpose: "Which topics people look for", models: ["interestRanking", "demandMap"], legalBasis: "consent", status: "collecting" },
  { id: "search.saved", moment: "search", captures: "Saved searches (place, month, category)", purpose: "Tell them first when a House opens; demand without supply", models: ["demandMap"], legalBasis: "consent", status: "used" },
  { id: "search.inFor", moment: "search", captures: "\"I'm in for\": place, months, length, categories", purpose: "Hosts see who'd come; demand without supply", models: ["demandMap", "crewFit"], legalBasis: "consent", status: "collecting" },
  { id: "search.cardClick", moment: "search", captures: "Which House cards are opened, from which row", purpose: "Which suggestions work", models: ["interestRanking"], legalBasis: "consent", status: "planned" },
  { id: "search.saveHouse", moment: "search", captures: "Houses saved (heart)", purpose: "Interest before a request", models: ["interestRanking"], legalBasis: "contract", status: "collecting" },

  // ── Create ──
  { id: "create.category", moment: "create", captures: "The House's category (or own label)", purpose: "Which topics hosts open", models: ["demandMap", "interestRanking"], legalBasis: "contract", status: "used" },
  { id: "create.placeMonth", moment: "create", captures: "Place and months of the House", purpose: "Supply per place and month", models: ["demandMap"], legalBasis: "contract", status: "used" },
  { id: "create.crewPrice", moment: "create", captures: "Crew size, price or budget per person", purpose: "What fills at which size and price", models: ["houseChemistry"], legalBasis: "contract", status: "collecting" },
  { id: "create.hostFee", moment: "create", captures: "Host fee per guest (pro hosts)", purpose: "Pro vs share hosts; earnings", models: [], legalBasis: "contract", status: "collecting" },
  { id: "create.placeMode", moment: "create", captures: "Place booked or picked together", purpose: "Which way fills faster", models: [], legalBasis: "contract", status: "collecting" },

  // ── Request ──
  { id: "request.sent", moment: "request", captures: "Request to join (House, time, with a friend)", purpose: "Run the House; which suggestions lead to requests", models: ["interestRanking", "crewFit"], legalBasis: "contract", status: "used" },
  { id: "request.answer", moment: "request", captures: "Host's answer: accepted, not a fit, expired", purpose: "Run the House; who hosts accept", models: ["crewFit"], legalBasis: "contract", status: "used" },
  { id: "request.reserved", moment: "request", captures: "Spot reserved (beta, no payment)", purpose: "Demand before the launch", models: ["demandMap"], legalBasis: "contract", status: "collecting" },
  { id: "request.timeToFull", moment: "request", captures: "Time from opening to a full crew", purpose: "How fast Houses fill", models: ["houseChemistry"], legalBasis: "contract", status: "collecting" },
  { id: "request.payment", moment: "request", captures: "Payment made (amount, date – no card data)", purpose: "Run the House; payouts", models: [], legalBasis: "contract", status: "collecting" },

  // ── In the house ──
  { id: "stay.arrived", moment: "inTheHouse", captures: "Arrived (check-in confirmed)", purpose: "Who actually came", models: ["houseChemistry"], legalBasis: "contract", status: "planned" },
  { id: "stay.leftEarly", moment: "inTheHouse", captures: "Left before the end (date)", purpose: "Early departures as a warning sign", models: ["houseChemistry"], legalBasis: "contract", status: "planned" },
  { id: "stay.report", moment: "inTheHouse", captures: "Reports and \"Something went wrong\" cases (category, no chat content)", purpose: "Safety; a House that doesn't work", models: ["houseChemistry"], legalBasis: "contract", status: "collecting" },

  // ── After the stay (the rating: its own form, a later prompt) ──
  { id: "after.livedWith", moment: "afterTheStay", captures: "\"Lived with\" confirmed, both ways", purpose: "Your people; trust", models: ["crewFit", "houseChemistry"], legalBasis: "contract", status: "used" },
  { id: "after.doItAgain", moment: "afterTheStay", captures: "\"Do it again\" started", purpose: "Houses that are worth repeating", models: ["houseChemistry"], legalBasis: "contract", status: "collecting" },
  { id: "after.rating", moment: "afterTheStay", captures: "Overall rating (1–5)", purpose: "Quality of the House", models: ["houseChemistry"], legalBasis: "consent", status: "planned" },
  { id: "after.crewMood", moment: "afterTheStay", captures: "Mood in the crew (1–5)", purpose: "The social side of the House", models: ["houseChemistry"], legalBasis: "consent", status: "planned" },
  { id: "after.tidiness", moment: "afterTheStay", captures: "Tidiness (too messy · fine · very tidy)", purpose: "Living together; matching the vibe sliders", models: ["houseChemistry", "crewFit"], legalBasis: "consent", status: "planned" },
  { id: "after.noise", moment: "afterTheStay", captures: "Noise (too loud · fine · too quiet)", purpose: "Living together; matching the vibe sliders", models: ["houseChemistry", "crewFit"], legalBasis: "consent", status: "planned" },
  { id: "after.together", moment: "afterTheStay", captures: "Shared activities (how much the crew did together)", purpose: "Whether a crew became a group", models: ["houseChemistry"], legalBasis: "consent", status: "planned" },
  { id: "after.again", moment: "afterTheStay", captures: "\"Who would you live with again?\" (people from the crew, private)", purpose: "Mutual \"again\" – the strongest signal of fit", models: ["crewFit", "houseChemistry"], legalBasis: "consent", status: "planned" },
  { id: "after.sentence", moment: "afterTheStay", captures: "One free sentence (optional)", purpose: "Read by the team – no automated analysis", models: [], legalBasis: "consent", status: "planned" },

  // ── Marketing ──
  { id: "mkt.src", moment: "marketing", captures: "?src= of the link they came through (first touch)", purpose: "Which channel brings people", models: ["marketingImpact"], legalBasis: "consent", status: "collecting" },
  { id: "mkt.utm", moment: "marketing", captures: "utm_source / medium / campaign", purpose: "Which campaign brings people", models: ["marketingImpact"], legalBasis: "consent", status: "collecting" },
  { id: "mkt.video", moment: "marketing", captures: "Series and episode in the link (?src=series-ep)", purpose: "Which series and which video works", models: ["marketingImpact"], legalBasis: "consent", status: "planned" },
  { id: "mkt.referral", moment: "marketing", captures: "Who shared the link (ref)", purpose: "Word of mouth; invites", models: ["marketingImpact"], legalBasis: "consent", status: "collecting" },
  { id: "mkt.waitlist", moment: "marketing", captures: "Waitlist sign-up (email, interests, where, when, wants to host)", purpose: "Launch demand; tell them when it opens", models: ["demandMap", "marketingImpact"], legalBasis: "consent", status: "used" },
  { id: "mkt.install", moment: "marketing", captures: "App installed (home screen)", purpose: "Who stays reachable", models: [], legalBasis: "consent", status: "collecting" },

  // ── Support ("Help & feedback" → Admin › Support): purpose "support" only, never a model ──
  { id: "support.category", moment: "support", captures: "What it's about: question, something's broken, idea, safety", purpose: "support", models: [], legalBasis: "contract", status: "collecting" },
  { id: "support.message", moment: "support", captures: "Their message (free text)", purpose: "support", models: [], legalBasis: "contract", status: "collecting" },
  { id: "support.email", moment: "support", captures: "Email to answer to (prefilled when logged in)", purpose: "support", models: [], legalBasis: "contract", status: "collecting" },
  { id: "support.context", moment: "support", captures: "Page, House, device, screen width and phase at the time (shown to them before sending)", purpose: "support", models: [], legalBasis: "contract", status: "collecting" },
  { id: "support.screenshot", moment: "support", captures: "A screenshot, if they add one", purpose: "support", models: [], legalBasis: "consent", status: "collecting" },
];

/** The data points a model reads – derived from DATA_POINTS, never listed twice. */
export const inputsOf = (model: ModelId) => DATA_POINTS.filter((d) => d.models.includes(model));

// Admin › Vision › Der Hof, the two graphics on top of its zoom: "Wo alles zusammenkommt" (the marketplace → five pillars → Der Hof) and
// "Der Hof" with its six branches, each leading to its part (or to Finanzierung › Firmenstruktur). German, admin only; drawn by the BlockMap.
export const HOF_TOGETHER = {
  title: "Wo alles zusammenkommt",
  base: { id: "marketplace", title: "MARKTPLATZ", subtitle: "Fundament heute" },
  baseLabel: "Fundament",
  pillarsLabel: "Fünf Säulen",
  pillars: [
    { id: "people", title: "Menschen", subtitle: "Crew" },
    { id: "moment", title: "Moment", subtitle: "Bogen" },
    { id: "space", title: "Raum", subtitle: "Muster" },
    { id: "place", title: "Ort", subtitle: "Daten" },
    { id: "tech", title: "Technik", subtitle: "Smart House" },
  ],
  goalLabel: "Ziel",
  goal: { id: "hof", title: "DER HOF" },
} as const;

/** The six branches: `part` opens that part (?block=hof.<part>), `href` another place in the admin. */
export const HOF_BRANCHES = {
  title: "Der Hof",
  centerLabel: "Mitte",
  branchesLabel: "Sechs Äste",
  branches: [
    { id: "muster", title: "Muster", subtitle: "5 Größen, 5 Regeln", part: "muster" },
    { id: "beweis", title: "Beweis", subtitle: "These → Daten → Entwurf", part: "beweis" },
    { id: "produkte", title: "Produkte", subtitle: "Leiter, Smart House", part: "produkte" },
    { id: "eigentum", title: "Eigentum", subtitle: "Places, Rendite, Börse", href: "/admin/funding?tab=structure" },
    { id: "markt", title: "Markt", subtitle: "Franchise, Positionierung", part: "franchise" },
    { id: "longevity", title: "Longevity", subtitle: "die soziale Säule", block: "longevity" },
  ] as readonly { id: string; title: string; subtitle: string; part?: string; href?: string; block?: string }[],
} as const;

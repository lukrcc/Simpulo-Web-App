// The width test's pages (npm run test:breiten, scripts/breiten-test.mjs) – EVERY page of src/app is listed here (Regel: jede neue oder geänderte
// Seite hier eintragen). The production build checks this list against the routes that exist (scripts/check-test-routes.ts, called from
// next.config.ts): a page missing here fails the build with "Neue Seite /xyz nicht im Breiten-Test", an entry whose page is gone too.
//
// A plain module without imports – next.config.ts reads it.
//   route    the route as in src/app ("/house/[slug]"), without route groups
//   key      file name of the screenshot (test-results/breiten/<breite>/<key>.png)
//   example  the address the test opens – required for dynamic routes (a demo example from the mock data); "{profile:u2}" becomes that
//            user's profile id (lib/privacy.ts profileIdOf)
//   action   a step after loading: "request" opens the request dialog ("Request to join")
//   skip     not opened by the test, with the reason (redirects, dev-only pages, switched-off features) – still listed, so nothing is forgotten
//   core     one of the main pages (the short run: KERN=1)

export interface TestRoute {
  route: string;
  key: string;
  label: string;
  example?: string;
  action?: "request";
  skip?: string;
  core?: boolean;
}

export const TEST_ROUTES: readonly TestRoute[] = [
  // Explore and public pages
  { route: "/", key: "start", label: "Start", skip: "dieselbe Seite wie /explore" },
  { route: "/explore", key: "explore", label: "Explore", core: true },
  { route: "/co-living/[city]", key: "stadt", label: "Stadtseite", example: "/co-living/lisbon" },
  { route: "/collections/[slug]", key: "sammlung", label: "Sammlung", example: "/collections/last-spot" },
  { route: "/house/[slug]", key: "house", label: "House-Seite", example: "/house/surf-coach-house-ericeira", core: true },
  { route: "/house/[slug]", key: "anfrage", label: "Anfrage-Fenster", example: "/house/surf-coach-house-ericeira", action: "request", core: true },
  { route: "/h/[id]", key: "house-host", label: "House-Seite (Host)", example: "/h/s1" },
  { route: "/h/[id]/manage", key: "house-verwalten", label: "House verwalten", skip: "leitet auf /h/[id]?tab=manage" },
  { route: "/h/[id]", key: "house-manage", label: "House-Bereich › Manage", example: "/h/s1?tab=manage" },
  { route: "/h/[id]", key: "house-mitglied", label: "House-Bereich (Mitglied)", example: "/h/s22?tab=me" },
  { route: "/u/[userId]", key: "profil-fremd", label: "Fremdes Profil", example: "/u/{profile:u2}" },
  { route: "/invite/[token]", key: "einladung", label: "Einladung", example: "/invite/sample-invite" },
  { route: "/claim/[token]", key: "claim", label: "House übernehmen", example: "/claim/demo-run-club" },
  { route: "/help", key: "hilfe", label: "Hilfe-Center" },
  { route: "/guides", key: "ratgeber", label: "Ratgeber" },
  { route: "/guides/[slug]", key: "ratgeber-artikel", label: "Ratgeber-Artikel", example: "/guides/share-a-villa-solo" },
  { route: "/apply", key: "bewerbung", label: "Host-Bewerbung" },
  { route: "/host", key: "host", label: "Host-Werbeseite" },
  { route: "/waitlist/confirm", key: "warteliste-bestaetigen", label: "Warteliste bestätigen", example: "/waitlist/confirm?token=wlt-1-0" },
  { route: "/waitlist/unsubscribe", key: "warteliste-abmelden", label: "Warteliste abmelden", example: "/waitlist/unsubscribe?token=wlt-2-7919" },
  { route: "/about", key: "about", label: "About" },
  { route: "/contact", key: "kontakt", label: "Kontakt" },
  { route: "/safety", key: "safety", label: "Safety" },
  { route: "/cancellation", key: "storno", label: "Stornoregeln" },
  { route: "/impressum", key: "impressum", label: "Impressum" },
  { route: "/privacy", key: "privacy", label: "Privacy" },
  { route: "/terms", key: "terms", label: "Terms" },
  { route: "/ideas", key: "ideen", label: "Ideen", skip: "aus (config/platform.ts ideasBoard: false) – 404" },
  { route: "/get", key: "app", label: "App auf dem Telefon" },
  { route: "/get/card", key: "app-karten", label: "QR-Karten (Druck)" },
  { route: "/preview", key: "passwort", label: "Passwortseite" },
  { route: "/welcome", key: "willkommen", label: "Willkommen" },

  // Signed in
  { route: "/messages", key: "messages-liste", label: "Messages (Liste)", core: true },
  { route: "/messages/[threadId]", key: "messages-chat", label: "Messages (Chat)", example: "/messages/t-s1", core: true },
  { route: "/your-houses", key: "your-houses", label: "Your houses", core: true },
  { route: "/your-houses/[id]", key: "your-houses-house", label: "Your houses › House", skip: "leitet auf /h/[id] bzw. /h/[id]?tab=manage" },
  { route: "/your-houses/[id]/edit", key: "house-bearbeiten", label: "House bearbeiten", example: "/your-houses/s1/edit" },
  { route: "/your-houses/all/[group]", key: "your-houses-alle", label: "Your houses › See all", example: "/your-houses/all/hosting" },
  { route: "/your-houses/payouts", key: "payouts", label: "Payouts" },
  { route: "/profile", key: "profil", label: "Profil", core: true },
  { route: "/people", key: "your-people", label: "Your people" },
  { route: "/saved", key: "saved", label: "Saved" },
  { route: "/settings", key: "settings", label: "Settings", core: true },
  { route: "/settings/profile", key: "edit-profile", label: "Edit profile" },
  { route: "/settings/payouts", key: "settings-payouts", label: "Settings › Payouts" },
  { route: "/settings/delete-account", key: "konto-loeschen", label: "Konto löschen" },
  { route: "/create", key: "open-a-house", label: "Open a House", core: true },

  // Admin
  { route: "/admin", key: "admin-uebersicht", label: "Admin Übersicht", core: true },
  { route: "/admin/overview", key: "admin-overview", label: "Admin (alt)", skip: "leitet auf /admin" },
  { route: "/admin/houses", key: "admin-houses", label: "Admin Houses", core: true },
  { route: "/admin/houses/new", key: "admin-house-neu", label: "Admin House anlegen" },
  { route: "/admin/houses/prepared", key: "admin-vorbereitet", label: "Admin Vorbereitete Houses" },
  { route: "/admin/hosts", key: "admin-hosts", label: "Admin Hosts", core: true },
  { route: "/admin/growth", key: "admin-wachstum", label: "Admin Wachstum" },
  { route: "/admin/traffic", key: "admin-traffic", label: "Admin Traffic" },
  { route: "/admin/topics", key: "admin-analyse", label: "Admin Analyse" },
  { route: "/admin/data", key: "admin-algorithmus", label: "Admin Algorithmus" },
  { route: "/admin/algorithm", key: "admin-algorithm", label: "Admin Algorithmus (alt)", skip: "leitet auf /admin/data" },
  { route: "/admin/labore", key: "admin-labore", label: "Admin Labore" },
  { route: "/admin/vision", key: "admin-vision", label: "Admin Vision" },
  { route: "/admin/funding", key: "admin-finanzierung", label: "Admin Finanzierung" },
  { route: "/admin/posteingang", key: "admin-posteingang", label: "Admin Posteingang" },
  { route: "/admin/money", key: "admin-geld", label: "Admin Geld" },
  { route: "/admin/money/taxes", key: "admin-steuern", label: "Admin Steuern" },
  { route: "/admin/platform", key: "admin-system", label: "Admin System" },
  { route: "/admin/log", key: "admin-log", label: "Admin Log" },
  { route: "/admin/waitlist", key: "admin-warteliste", label: "Admin Warteliste" },
  { route: "/admin/applications", key: "admin-bewerbungen", label: "Admin Bewerbungen" },
  { route: "/admin/marketing", key: "admin-marketing", label: "Admin Marketing" },

  // Dev only (never in demo or production)
  { route: "/dev/emails", key: "dev-emails", label: "Dev E-Mails", skip: "nur im Dev-Modus" },
  { route: "/dev/crash", key: "dev-crash", label: "Dev Fehlerseite", skip: "nur im Dev-Modus – wirft absichtlich einen Fehler" },
  { route: "/dev/identity-check", key: "dev-identity", label: "Dev Identity-Check", skip: "nur im Dev-Modus" },
  { route: "/dev/stripe-onboarding", key: "dev-stripe", label: "Dev Stripe-Onboarding", skip: "nur im Dev-Modus" },
];

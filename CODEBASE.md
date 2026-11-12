# CODEBASE.md – technischer Überblick über simpuloweb

Stand: 11. Nov 2026. Erstellt durch eine reine Lese-Analyse, ohne Änderungen am Code. Diese Datei ergänzt die `CLAUDE.md`. Die `CLAUDE.md` ist die Produkt- und Design-Spezifikation (das Soll). Diese Datei beschreibt, wie der Code heute gebaut ist (das Ist). Pfade sind relativ zu `src/`, wenn nichts anderes dasteht.

---

## 1. Tech-Stack

| Bereich | Technik |
|---|---|
| Framework | **Next.js 16.4.2** (App Router). Aktiv sind `cacheComponents: true` und `partialPrefetching`. Middleware heißt in Next 16 `src/proxy.ts`. **Wichtig:** `AGENTS.md` sagt: Vor Code-Änderungen die Next-Doku in `node_modules/next/dist/docs/` lesen, weil sich APIs geändert haben. |
| UI | **React 19.3.0**, TypeScript 5 (strict, 0 Fehler bei `tsc --noEmit`), ESLint 9 mit `eslint-config-next` (0 Warnungen) |
| Styling | **Tailwind CSS v4**, als Turbopack-Loader über `@tailwindcss/turbopack`, ohne PostCSS-Config. Tokens stehen in `app/globals.css` (1275 Zeilen). |
| i18n | **next-intl 4.14.9**, nur `en`. Texte in `messages/en.json` (~3650 Zeilen), Formatierer in `i18n/format.ts` |
| Karussells | `embla-carousel-react` 8.6, `embla-carousel-wheel-gestures` (nur über `lib/passiveWheelGestures.ts`), `embla-carousel-autoplay` |
| Icons | `lucide-react`, `react-icons`, `@icons-pack/react-simple-icons` (Marken) |
| Sonstiges | `qrcode` (QR), `d3-geo` + `topojson-client` + `world-atlas` (Host-Karte und Geodaten), `supercluster`, `sharp` (Bildskripte), `tsx` (Skripte) |
| Schriften | `next/font/google`: Inter (`--font-inter`) und Inter Tight 600/700 (`--font-display`). Die TTF-Dateien in `assets/fonts` werden nur für OG-Bilder genutzt. |
| Hosting | `apphosting.yaml` nennt **Firebase App Hosting** (Secret `sitePassword` → `SITE_PASSWORD`). Der Code nutzt aber auch Vercel-Header (`x-vercel-ip-country`). Es gibt noch **kein Firebase-SDK** im Projekt. |
| Backend | Keins. Alles läuft im Browser auf Mock-Daten. `emptyAdapter` und `payments/stripe.ts` sind Stubs. |

**Skripte:** `npm run dev` (vorher läuft `scripts/sync-destination-images.ts`), `build`, `start`, `lint`, `dev:lan` (Zugriff aus dem LAN).

**Umgebungsvariablen:**

| Variable | Wirkung |
|---|---|
| `NEXT_PUBLIC_APP_MODE` | `dev`, `demo` oder `production` (`lib/appMode.ts`) |
| `SITE_PASSWORD` | HTTP Basic Auth (Benutzer `simpulo`) für private Deployments. Ist sie gesetzt, gilt noindex. |
| `DEMO_PASSWORD` | Demo-Login mit signiertem Cookie `simpulo_demo` |
| `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_LINK_BASE_URL`, `NEXT_PUBLIC_PRODUCTION_URL` | Basis-URLs |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google-Karte auf der House-Seite |
| `NEXT_PUBLIC_FLAG_HOST_PREMIUM` | Schaltet die Host-Gebühr frei |
| `NEXT_PUBLIC_ADMIN` | Schaltet `/admin` außerhalb von dev frei |

---

## 2. Ordnerstruktur

```
messages/en.json        alle UI-Texte (next-intl)
docs/MVP-CHECKLIST.md   MVP-Status (teilweise veraltet, siehe Abschnitt B)
scripts/                sync-destination-images.ts (vor dev/build), fetch-mock-images.ts
public/                 Favicons/Manifest-Icons, destinations/<slug>.jpg, mock/ (Mock-Fotos)
src/
  proxy.ts              Middleware: Basic Auth, Demo-Gate, X-Robots-Tag, Cookie viewer_country
  app/                  Routen (App Router). page.tsx sind dünne Server-Komponenten.
  components/
    views/              eine Client-View pro Route (ExploreFeed, StayDetail, YourHouses, …)
    ui/                 ~65 gemeinsame Bausteine (Button, Chip, Sheet, Panel, Shelf, Input, …)
    layout/             AppShell, Footer, Container, Logo, LegalLine, CurrencyPicker; header/ (SiteHeader + Laschen-Form)
    explore/            Filterleiste, Filter-Panel, Suche, Spotlight-Texte, NoHouseYet
    stay/               House-Seite (HouseSections, Galerie, Karte, PaySheet, CrewVotes) + Verwaltung (HouseDetail, HouseProgress)
    create/             Open-a-House-Wizard (HouseSteps, model.ts, BuildingCard, InviteStep)
    chat/               ThreadHeader, MessageList, MessageBubble, Composer, EmojiPicker
    payments/ payouts/  MyShare, Receipt, Refund, PaymentsCard / PayoutSetup, PayoutsReturn
    settings/ profile/ auth/ notifications/ share/ safety/ seo/ admin/ demo/ dev/ faq/ get/ help/ onboarding/ skeletons/
    HouseCard.tsx       DIE House-Karte, SpotlightCoverflow.tsx, SpotlightHero.tsx, SimpuloQR.tsx, InstallPrompt.tsx
  config/               Regeln und Konstanten (policies, explore, privacy, notifications, todo, activity, faq, auth-copy, nav, contact, app-links)
  lib/                  Logik ohne UI
    store.tsx           der eine Client-Store (Reducer, Persistenz, Uhren). 2867 Zeilen.
    data/               Datenschicht: adapter.ts (Schnittstelle), mockAdapter, emptyAdapter, stays.ts (Server-Repository), places, destinations, paging
    payments/           Zahlungs-Adapter (mock / stripe-Stub) + Hooks
    notify/             notify() + channels (inapp, push, email) + events
    mock*.ts            Mock-Daten (mock.ts enthält AUCH die Domain-Typen!)
    fees.ts currency.ts earnings.ts hostStats.ts   Geld
    joinFlow.ts requests.ts waitlist.ts overlap.ts crewVotes.ts   Join-Logik
    profilePrivacy.ts yourPeople.ts savedSearches.ts launch.ts shelves.ts collections.ts …
    use*.ts             Hooks (useNow, useIsDesktop, usePagedList, usePreferredCurrency, …)
  i18n/                 request.ts, config.ts, format.ts (Datum/Geld), events.ts
  emails/               React-E-Mail-Vorlagen (EmailLayout, NotificationEmail, Digests, MagicLink)
```

---

## 3. Routen

Muster: `app/**/page.tsx` ist eine **Server-Komponente**. Sie erzeugt `generateMetadata` (`lib/seo.ts`, `pageMetadata`) und rendert eine **Client-View** in `<Suspense>`/`<MockDelay>`. Private Bereiche bekommen über ein eigenes `layout.tsx` die Robots-Einstellung `PRIVATE_ROBOTS`: admin, claim, create, messages, people, profile, settings, welcome, your-houses.

| Route | Komponente | Inhalt |
|---|---|---|
| `/` | `views/ExploreFeed` | Explore: Spotlight, Open Houses (Grid + Regale), Filter. JSON-LD Organization/WebSite |
| `/explore` | `ExploreFeed` | Wie `/`. Canonical zeigt auf `/`, `?category=` filtert. |
| `/house/[slug]` | `views/StayDetail` | Öffentliche House-Seite. `generateStaticParams`, JSON-LD Event, OG-Bild |
| `/co-living/[city]` | `seo/LandingPage` | SEO-Stadtseite. Unter `MIN_INDEXABLE_HOUSES` noindex. OG-Bild |
| `/collections/[slug]` | `ExploreFeed` (Collection) | Kuratierte Liste. Unter `MIN_COLLECTION_SIZE` noindex. *Fehlt in CLAUDE.md.* |
| `/invite/[token]` | `stay/InviteView` | Einladungsseite + OG-Bild |
| `/claim/[token]` | `views/ClaimView` | Growth: ein vorbereitetes House übernehmen. *Fehlt in CLAUDE.md.* |
| `/welcome` | `onboarding/WelcomeView` | Profil nach der Anmeldung vervollständigen (`?next=`). *Fehlt in CLAUDE.md.* |
| `/create` | `views/CreateStayForm` | Open-a-House-Wizard im Fokus-Modus |
| `/your-houses` | `views/YourHouses` | Dashboard (Up next, Needs you, Payouts) + Raster + Lived in + „For your next trip“ |
| `/your-houses/[id]` | `views/ManageHouse` → `stay/HouseDetail` | Verwaltungsseite (Stepper, StepCard, Kapseln → Sheets) |
| `/your-houses/[id]/edit` | `views/EditStay` | Bearbeiten (`EditStayForm` liegt in `CreateStayForm.tsx`) |
| `/your-houses/payouts` | `views/Payouts` | Earnings-Dashboard, Diagramm, Tabelle |
| `/messages`, `/messages/[threadId]` | `views/InboxList` (enthält `ThreadView`) | Chat-Liste + dunkler Chat |
| `/profile`, `/u/[userId]` | `views/ProfileView` | Bento-Profil (eigenes / fremdes). `/u` hat ein OG-Bild. |
| `/profile/edit` | `views/EditProfile` | Profil bearbeiten mit Autosave |
| `/settings` | `views/Settings` | Settings im Apple-Stil, Bereiche über den Hash |
| `/settings/payouts` | `payouts/PayoutsReturn` | Rückkehr nach dem Stripe-Onboarding |
| `/people` | `views/YourPeople` | Your people |
| `/saved` | `views/SavedHouses` | Gemerkte Houses |
| `/faq` | `faq/FaqView` | Joining/Hosting-Akkordeon + FAQPage-JSON-LD |
| `/get` | `get/GetApp` | App installieren / QR |
| `/about` `/contact` `/safety` `/cancellation` `/impressum` `/privacy` `/terms` | `layout/ContentPage` | Statische Textseiten (echtes Server-Rendering) |
| `/admin/{growth,houses,houses/new,support}` | `components/admin/*` | Mock-Admin. Ohne `ADMIN_ENABLED` 404. *growth/houses fehlen in CLAUDE.md.* |
| `/dev/{emails,stripe-onboarding,identity-check}` | `dev/*` | E-Mail-Vorschau, Provider-Simulationen. In production 404. |
| `/demo-login` | `DemoLoginForm` + Server-Action `enterDemo` | Nur im Demo-Modus |
| `/api/link-preview` | Route Handler (GET) | og:title/og:image/Preis einer Unterkunfts-URL |

Dazu kommen `robots.ts`, `sitemap.ts`, `manifest.ts`, `opengraph-image.tsx` (Root + house, co-living, invite, u), `error.tsx` und `not-found.tsx`. Die Weiterleitungen stehen in `next.config.ts` (how-it-works, host, stays, inbox, my-stays, houses, notifications …). `/i/:code` und `/c/:handle` leiten vorerst auf `/` (TODO).

---

## 4. Wichtige Komponenten und ihr Zusammenspiel

**Root-Layout** (`app/layout.tsx`): Inter-Schriften, `<html data-app-mode>`, zwei `beforeInteractive`-Skripte (Spotlight-Intro-Gate, House-Back-Gate). Provider-Kette:

`NextIntlClientProvider` › `StoreProvider` (`lib/store.tsx`) › `ToastProvider` › `AuthProvider` (`useRequireAuth`, AuthSheet) › `InstallPromptProvider` › `AppShell`

Daneben laufen `DevSwitcher`, `NotifyBridge` (Store → Push/E-Mail) und `CurrencyHint`.

**AppShell** (`layout/AppShell.tsx`) rendert in dieser Reihenfolge: `PageGlow` · `Tooltip` (einmal) · `HouseTransitions` · (Demo: `DemoBand`, `DemoGuard`) · `SiteHeader` · `MobileHeader` · `<main>` · `FooterByRoute` · `BottomTabBar`.

**Header** (`layout/header/`):
- `SiteHeader` wählt je Route `SiteHeaderView` oder `FocusHeader`.
- `useNotchShape` berechnet Leiste und Lasche als einen SVG-/clip-Pfad aus dem Fortschritt p (0, 1, 2).
- `lib/notchState.ts` (`useNotchState`) verbindet `ExploreFilterBar` mit der Lasche.
- `NotchGrip` ist der Griff. Er wird auch in Sheets genutzt.

**Seiten-Bäume:**
- **Explore:** `ExploreFeed` enthält:
  - `SpotlightCoverflow` (ab lg) bzw. `SpotlightHero` (darunter) bzw. `ExplorePrelaunch`
  - `SectionHeader` mit `SortCapsule` und `FiltersButton`
  - `ExploreFilterBar` (SearchField, ShortTripsToggle, Kategorie-Chips, More)
  - das Grid aus `HouseCard`. Die Regale dazwischen plant `lib/collections.ts`/`shelves.ts` (`planShelves`); dazu `PeopleGoingRow` und `CollectionRow`.
  - `LoadMore`, `NoHouseYet`/`NotifyLine`, `FilterPanel`
- **House-Seite:** `StayDetail` enthält:
  - `HouseGalleryCard` (sticky)
  - `HouseSummary` (Buchungskarte mit `HouseHostLine`, `HostFit`, `StayCta`, `JoinSteps`)
  - Abschnitte aus `HouseSections` (Facts, Why, Crew, Day, Where mit `HouseMap`/`AccommodationTile`)
  - `CrewVotes`, `HouseJoinBar`, Sheets (Pay, Request, QR, Safety)
- **Your houses:** `YourHouses` enthält:
  - `UpNextTile`, `TodoTile` (Gruppen aus `config/todo.ts`), `PayoutsTile`
  - ein Raster aus `HouseCard footer="status"` + `CardTask`, dazu `DraftCard`, `OpenHouseTile`, `LivedInCard`, `NextTripShelf`
  - Detailseite: `ManageHouse` › `HouseDetail` (HouseHead, `HouseProgress`-Stepper, Kapseln → Sheets für Requests/Crew/Chat/Details)
- **Messages:** `InboxList` (MasterDetail, `TabBar` Houses/Questions) › `ThreadView` (`ThreadHeader`, `MessageList` › `MessageBubble`, `ChatCards`, `Composer`)
- **Create:** `CreateStayForm` › `CreateWizard` › `CreateLayout` (62:38) mit den Schritten aus `create/HouseSteps` (Vibe, Place, Where, Crew, Cover, Extras), `InviteStep`, `BuildingCard` (Vorschau), `ReadySummary`, `OpenedScreen`. Der Formularzustand und die Helfer stehen in `create/model.ts`.

**Gemeinsame Bausteine** (`components/ui`):

| Gruppe | Bausteine |
|---|---|
| Buttons | `ActionButton` (`Button`, `buttonStyles`, `headerActionStyles`), `IconButton` (surface / onImage), `SaveButton` (Herz) |
| Auswahl | `Chip`, `SegmentedControl`, `TabBar`, `Switch`, `Checkbox`, `listSelection.ts` |
| Flächen und Overlays | `GlassPanel`, `Panel` (`.card-soft`), `Card` (`cardClass`), `Sheet`/`PanelSheet`, `ModalOverlay` (`lockScroll`), `Anchored`, `MoreMenu`, `DarkMenu`, `ConfirmPopover`, `Toast`, `Tooltip` |
| Felder | `Input` (`inputStyles`), `Select`, `Combobox`, `LanguageInput`, `DateRangePicker`, `RangeSlider`, `PhotoUploader` |
| Inhalt | `Shelf` (Embla-Reihe), `SectionHeader`, `LoadMore`, `CrewAvatars`/`CrewLine`, `Avatar`, `Img`, `PriceLine`, `VerifiedBadge`, `SocialRow`/`SocialTiles`, `useCrewFaces` (Privatsphäre), `StageBand` |

**`HouseCard`** (`components/HouseCard.tsx`) ist die eine Karte. Props: `notch` (host/you), `footer` (explore/status) und der Kontext (spotlight/gallery/preview). Genutzt wird sie in Explore, Your houses, StayDetail, im Create-Preview, in `HouseGalleryCard`, in allen Regalen und auf `LandingPage`.

---

## 5. Datenmodell und Mock-Daten

**Wo die Typen stehen:** Die Domain-Typen sind in **`lib/mock.ts`** definiert. `lib/types.ts` exportiert sie nur weiter und ergänzt `PaymentStatus`, `ThreadType` und `NewStayInput`. Weitere Typen: `SavedSearch` in `lib/savedSearches.ts`, `AppNotification` in `lib/data/notifications.ts`, `SupportCase` in `lib/store.tsx`, Growth-Typen in `lib/growth.ts`, Zahlungs-Typen in `lib/payments/types.ts`.

| Entität | Felder (gekürzt) |
|---|---|
| **User** (`mock.ts:39`, + Attribution utm*/refUserId) | id, name, age, birthDate?, country, city, languages[] (Labels wie „German“), bio, photos[] ([0] = Gesicht), gender?, verified, isPro, canChargeHostFee, proTitle?, socials?[{platform,value}], interests?[Vibe], replyMinutes?[], preferredCurrency?, savedStayIds?[], hostAlerts?[], email?, signInMethod?, settings?: UserSettings, privacy?{showOnHousePages, showAge}, deletedAt? |
| **UserSettings** | notifications{messages,nearby,news → {push,email}}, blockedUserIds[], removedPeopleIds?[] |
| **Stay (= House)** (`mock.ts:145`, ~70 Felder) | id, slug, title, shortName?, hostId, visibility? (unlisted/listed), priorityUntil?, vibe, customVibe?, language/languages (ISO-Codes), city, region, location{city,country,area?}, lat, lng, startDate/endDate („YYYY-MM-DD“), datesOpen?, **spotsTotal** (inkl. Host), **spotsFilled**, spotsInvited?, spotsReserved?, spotsOffered?, waitlistMax?, budgetPerPerson?{min,max}, **pricePerPerson?**, **currency**, **totalPrice?**, **hostFeePerPerson?**, hostOffer?[], accommodationStatus (open/locked), accommodationLink?/Photo?/Ideas?, accommodationVote?/datesVote? (CrewVote), description, whyText, dayText, typicalDay?[{time,label}], lookingForText, houseRules[], interests[], hostNote?, status (draft_unclaimed/draft/published/booked/completed/closed), acceptingRequests, featured, who?, audience?, ageRange?, verifiedGuestsOnly?, photos?, focalPoint?, coverImageOverride?, createdAt, lockedAt?, payByDate?, paymentDueAt?, allPaidAt?, bookingConfirmedAt?, bookingProofUrl?, claim?, duplicatedFrom?, crewGroupUrl? |
| **JoinRequest** (= Mitgliedschaft) | id, stayId, userId, message, status (pending/accepted/declined/expired/invited/waitlist_requested/waitlisted), createdAt, offerExpiresAt?, coveredBy?[], reservedUntil?. **Crew = Host + accepted Requests.** Es gibt keine eigene Membership-Entität. |
| **HouseInvite** | token, houseId, invitedName?, email?, createdAt, expiresAt, emailedAt?, priority?, invitedUserId?, status (pending/used/expired/cancelled), usedBy? |
| **Payment** | id (`pay-{stay}-{user}`), stayId, userId, share, hostFee?, fee, total, status (pending/paid/refunded), refundedAmount?, paidAt?. Der Host hat auch einen Datensatz (fee 0). |
| **Thread** | id, type (house/direct/updates), houseId?, participantIds[], **messages[] eingebettet** |
| **Message** | id, threadId, senderId (User oder „system“), text, createdAt, type?, attachments?, replyToId?, reactions?[{emoji,userIds}], contactsHidden?, event?{key,values} |
| **CrewVote** | options[{id, voterIds[], link?, pricePerPerson?, startDate?, endDate?}], deadline?, closedAt?, decidedOptionId? |
| **Crew** / **LivedWith** | {houseId, memberIds[], endedAt} / {userId, otherUserId, houseId, endedAt, confirmedAt?}, eine Zeile je Richtung |
| **SavedSearch** | id, place{id,name,country,lat,lng}\|null, month „YYYY-MM“\|null, category\|null, userId?/email?, consent, createdAt, notifiedAt |
| **AppNotification** | id, userId, eventId, key (NotifyEventKey, ~40), values, createdAt, readAt?, stayId?, threadId?, href? |
| **Payout/Earnings** | `PayoutRecord`, `Balance`, `PayoutAccount` (`payments/types.ts`). `EarningRow` und `PastEarning` (`lib/earnings.ts`, `data/adapter.ts`) werden aus den Stays abgeleitet und nicht gespeichert. |
| Sonstige | Report, SupportCase, GrowthEvent, DemandAlert, HostApplication, StayClaim, LockDetails |

**Mock-Quellen:**

| Datei | Inhalt |
|---|---|
| `mock.ts` | 49 User (u1–u49), 55 Houses (s1–s55), Requests, 3 Threads |
| `mock-houses-extra.ts` | 37 Hosts, 50 Houses x1–x50, in eigenem Schema, umgewandelt mit `houseToStay`/`hostToUser` |
| `mock-chat.ts` | Chatverläufe, fester `MOCK_NOW` 22. Okt 2026 |
| `mock-extras.ts` | bezahlte Nutzer, vergangene Earnings, installierte Nutzer, Link-Vorschauen |
| `mock-growth.ts` | Claim-Houses, Analytics |
| `mock-saved-searches.ts` | gespeicherte Suchen |
| `mock-images.ts` | Pfade unter `/public/mock` |
| `mock-datasets.ts` | die Datenzustände (siehe unten) |

`mock.ts` **verändert seine Exporte beim Import**: Crews werden ergänzt, Requests mit `Date.now()` neu datiert, `verified` über einen Hash gesetzt, Preise mit `inLocalCurrency` in die Landeswährung umgerechnet.

**Datenzustände** (`data/adapter.ts` `DATA_STATES`): `prelaunch` (3 Houses), `launch` (15 Houses aus 12 Basen, Bangkok und Lisbon, März–Mai 2027) und `full` (~105 Houses). Demo ist fest auf `full`.

**Dev-Nutzer:** `u1` (`CURRENT_USER_ID`). Personas: new = u90, guest = u17, host = u1.

**localStorage:**

| Schlüssel | Inhalt |
|---|---|
| `simpulo:mock:v11:{dataState}` | der ganze Store, 300ms nach jeder Änderung geschrieben |
| `simpulo:growth` | Growth-Daten (Claims, Invites, SavedSearches …) |
| `simpulo:payments` | Zustand des Zahlungs-Mocks |
| `simpulo:mock-user` / sessionStorage `simpulo:tab-user` | eingeloggter Mock-Nutzer (pro Tab über `?as=`) |
| `simpulo:phase` | gewählte Plattform-Phase (nur dev; ohne Eintrag „live“; alter Schlüssel `simpulo:dataset` wird beim Lesen übernommen) |
| weitere | `simpulo:flags`, `simpulo:currency`, `simpulo:currency-hint`, `simpulo:house-templates`, `simpulo:viewed:{id}`, Install-/Push-Zähler |

---

## 6. Dev-Menü

`components/auth/DevSwitcher.tsx`. Es ist nur sichtbar, wenn `APP_MODE === "dev"`: ein Glas-Knopf unten links, auf Telefonen über der Tab-Leiste. Das Panel ist 320px breit. Inhalt von oben nach unten:

1. **Nutzer wechseln:** „Logged out“ oder jeder `store.users`-Eintrag (`store.login`/`logout`). Auf House-Routen erscheint dazu ein Rollen-Badge (Host / Member / Pending / Not involved).
2. **Feature-Flags** (`lib/featureFlags.ts`, localStorage `simpulo:flags`):
   - `hostPremium`: Host-Gebühr, Pro-Host, Filter „Host experience“
   - `simulatePaymentFailure`: jede Zahlung schlägt fehl
   - `simulateOnboardingActionRequired`: Payout-Onboarding meldet „action_required“
   - `simulateShareHost`: Payouts-Seite als Share-Host
3. **Data:** Pre-launch / Launch / Full. Speichert in `simpulo:dataset` und lädt die Seite neu.
4. **Viewer currency:** Auto / EUR / GBP / USD / IDR.
5. **Your-houses-Persona:** New (u90) / Guest (u17) / Host (u1).
6. **Reset mock data:** löscht `simpulo:mock:*`, `simpulo:growth` und `simpulo:payments`, dann Reload.
7. **Fuß:**
   - **Scheduled reminders** (`computeReminders`): Klick → `store.fireReminder`
   - **Log:** die letzten 50 Push-/E-Mail-Zustellungen aus `lib/notify`
   - **Open as…** (nur auf House-Routen): neuer Tab als Host bzw. als Crew-Mitglied (`?as=`), „Unlock accommodation“, „Reset payments“, „Let the 48 hours run out“ (`lapsePaymentWindow` datiert die Fristen zurück, der nächste Settle-Tick greift), „Mark as completed“ (`completeStay`).

Verwandt: die Simulationen unter `/dev/*`, `MockDelay` (400ms Skeleton, läuft in jedem Modus) und der Demo-Modus mit `DemoBand`, `DemoGuard` (blockiert `/create`, `/messages` und `[data-preview-action]` per Toast), `lib/demoAuth.ts` (HMAC-Cookie) und den Demo-Toasts von `NotifyBridge`.

⚠️ `useRouteStay()` (`DevSwitcher.tsx:32-44`) prüft noch die alten Pfade `my-stays` und `inbox`. Deshalb funktionieren „Open as…“ und das Rollen-Badge nur auf `/house/[slug]`, nicht auf `/your-houses/[id]` oder `/messages/[id]`.

---

## 7. Geld: Preise, Gebühren, Währungen

**Eine Quelle für Regeln:** `config/policies.ts`. Dort stehen:
- `FEE_MODEL`: `serviceFeePercent` 10 (zahlen nur Gäste), `hostCommissionPercent` 0, `hostFeeCommissionPercent` 10
- `PAYMENT_POLICY` (48h zahlen, 48h buchen) und `CANCELLATION_POLICY`
- `STAY_EXAMPLE`/`stayExample()` (Villa €1.260 / 4 → €315 + €32)
- `HOST_FEES` ist ungenutzt.

**Rechenkern `lib/fees.ts`:**
- `guestFee(share) = round(share × 0,10)`
- `maxHostFee(share) = floor(share × 1,0)`, also höchstens 100 % des Anteils
- `hostProgrammeEarning(fee) = round(fee × 0,9)`
- **`paymentSplit(share, hostFee)`** → `{share, hostFee, fee, total = share + hostFee + fee, commission = round(hostFee × 0,1), hostReceives = share + hostFee − commission, revenue = fee + commission}`

**Anteil pro Person:**

| Stelle | Rechnung |
|---|---|
| Open a House, „I have a place“ (`create/model.ts:371` `placeShare`) | `round(total / spotsTotal)` |
| Unterkunft später festlegen (`stay/LockSheet.tsx:54`, `store.tsx:2418` `lockAccommodation`) | `ceil(total / spots)` |
| Crew-Abstimmung (`store.tsx` ~1696) | übernimmt `option.pricePerPerson` |

**Zahlungsdatensätze:** `store.tsx` `paymentFor()` ruft `paymentSplit` auf und friert die Beträge in `Payment` ein. Das passiert in `withLock`, bei Join/Accept, `takeWaitlistSpot` und `seedPayments`. Der Host bekommt fee 0 und keine Host-Gebühr.

**Anzeige:**
- `lib/utils.ts` `stayPrice()` liefert `price` (nur bei `locked`, inkl. `guestFee`), `budget` (Spanne) oder `tbd`.
- `PaySheet` rechnet nichts selbst. Er zeigt die gespeicherten `payment.{share, hostFee, fee, total}` in der House-Währung und ein „≈“ in der Betrachter-Währung.

**„Rent passed on“ vs. „Earnings“** (`lib/earnings.ts`): pro House wird `paymentSplit(pricePerPerson, hostFeePerPerson)` mit der Zahl der Gäste multipliziert. Gezählt werden bezahlte Payments; bei vergangenen Mock-Houses ohne Datensätze `spotsFilled − 1`.
- `rentPassed = Gäste × share`
- `hostEarnings = Gäste × (hostFee − commission)`
- `payout = Gäste × hostReceives`
- Auszahlungsdatum = Starttag + 1. Status allein nach Datum: paid / scheduled / pending.
- `earningsFor()` summiert in **EUR** (jede Zeile erst umgerechnet und gerundet).
- `lib/hostStats.ts` baut daraus das Dashboard (Trend, per Guest, Fill rate, Best House).
- Der Payments-Mock gibt diese Werte über `getPayouts`/`getBalance` zurück.

**Rückerstattungen:**

| Fall | Betrag |
|---|---|
| Ausstieg mit Nachrücker (`waitlist.ts` `waitlistRefund`) | `total − fee` (die Service-Gebühr bleibt bei Simpulo) |
| Ausstieg ohne Nachrücker | 0 |
| Host sagt ab, Unterkunft entsperrt, Buchung nicht binnen 48h bestätigt | alles |

Ein Effekt im `StoreProvider` erkennt Payments, die auf `refunded` springen, und ruft `payments.refund(...)` auf.

**Anzahlungen:** **Gibt es nicht.** Jedes Mitglied zahlt einmal den vollen Betrag, sobald die Crew komplett und die Unterkunft gewählt ist. Es gibt keine Vorautorisierung, keine Raten und keine Teilzahlung.

**Währungen** (`lib/currency.ts`; `lib/rates.ts` ist nur ein Re-Export):
- Feste Mock-Kurse `RATES_PER_EUR`. `convert()` rechnet als Float ohne Rundung.
- Länder-Zuordnung über `currencyForCountry`.
- Betrachter-Währung über `usePreferredCurrency`, in dieser Reihenfolge: manuelle Wahl (localStorage) → `User.preferredCurrency` → Cookie `viewer_country` → Zeitzone → Sprache mit Land → EUR.
- Formatiert wird in `i18n/format.ts`: `price` ohne Nachkommastellen, `approx`/`viewerPriceLabel` mit 2 signifikanten Stellen, `viewerAmount` mit 3.
- Der Preisfilter arbeitet intern in EUR (`exploreFilters.ts` `eurRange`).
- Beträge sind **ganze Haupteinheiten** (keine Cent-Werte).

---

## 8. State-Management und Datenfluss

```
lib/data/index.ts ──(beim Bundeln gewählt: mockAdapter | emptyAdapter)──► getData(state)
        │                                                        │
        ▼ (Server)                                               ▼ (Client)
lib/data/stays.ts  stayRepository (async,             lib/store.tsx  StoreProvider (useReducer)
einmal beim Import aus den Rohdaten gebaut)           initialState = buildInitialState(getData("full"))
→ page.tsx: Metadata, generateStaticParams,           nach der Hydration: localStorage-Stand bzw. Datensatz laden
  Sitemap, OG-Bilder, SEO-Seiten                      → useStore() in ~77 Dateien
```

- **Ein Store** (`lib/store.tsx`). `StoreState` enthält users, stays, joinRequests, threads, payments, notifications, savedSearches, crews, livedWith, houseInvites, supportCases, events, alerts, applications, reports, lastReadAt, typing und currentUserId.
- Es gibt **68 Reducer-Aktionen**: Auth, House-Lebenszyklus, Requests/Warteliste, Votes/Lock, Zahlungen, Chat, Benachrichtigungen, Growth, Settings.
- **Lesen:** Komponenten holen über `useStore()` die ganzen Arrays und filtern sie mit Selektoren (`getCrew`, `getMyPayment`, `isCrewMember` …). Die lib-Regeln (`waitlist`, `overlap`, `profilePrivacy`, `yourPeople`, `requests`, `earnings`) bekommen `StoreData` und durchsuchen ebenfalls alles.
- **Schreiben:** nur über die Action-Callbacks des Stores.
- **Nach jeder Aktion** laufen, wenn sich Stays oder Payments geändert haben: `settlePayments` → `syncWaitlist` → `expireRequests` → `expireInvites` → `withLaunchVisibility`.
- **Uhren:** `settlePayments` alle 60s und beim Mount. `expireHouseInvites` per Timeout. Alles läuft im Browser.
- **Seiteneffekte:**
  - `NotifyBridge` erkennt neue In-App-Einträge und schickt sie an `notify()`, das sie an die Kanäle push und email gibt (heute Mocks/Log).
  - Ein Refund-Effekt ruft `payments.refund` auf.
  - `bindPaymentsMock` gibt dem Payments-Mock Zugriff auf den Store.
- **Persistenz:** debounced in localStorage, versioniert (`MOCK_VERSION = 11`). `readPersistedMock` repariert alte Stände.
- **Zahlungen** gehen über `lib/payments` (Adapter je Modus, Hooks in `payments/hooks.ts` und `usePayouts.ts`).
- **Benachrichtigungen** gehen über `lib/notify`; die Kanäle stehen in `config/notifications.ts`.
- **Hydration:** `useStore()` liefert `currentUserId = null`, bis hydratisiert ist. Ohne das Flag `hostPremium` entfernt `withoutHostPremium` die Host-Gebühren aus dem gelieferten Wert.

---

## 9. Styling-System

- **Tokens** (`app/globals.css`):
  - Farben: `--bg` #F2F0EB, `--surface` #FBFAF7, `--card` #FBF9F6, `--select-bg` #FDFCFA, `--ink` #221E1B, `--muted` #77706A, `--line` #E3E0D9, `--accent` #F0633A
  - Glas: `--glass-*`, `--card-soft*`, `--chip-bg*`, `--header-bg`
  - Filter-Auswahl: `--pick-bg/edge/text`
  - Bühne: `--stage-*`
  - `@theme inline` bildet sie auf `--color-*` ab, damit sie als Tailwind-Klassen nutzbar sind.
- **Typografie:** Tailwind-Theme-Klassen `text-display`, `stage`, `h1`, `h2`, `h3`, `card-title`, `greeting`, `quote`, `body-lg`, `body`, `small`, `eyebrow`, `nav`, `nav-main`, `logo*`. Display bis h2 und das Logo nutzen `--font-display` (Inter Tight), der Rest Inter.
- **Abstände und Layout:**
  - Abstände: `--page-margin` (clamp 20–48px), `--space-section` (clamp 56–96px), `--space-inner` (clamp 20–32px)
  - Header: `--header-h` 56px, `--control-h` 44px
  - Spotlight: `--spot-h/w/top`
  - Raster: `.page-container` (max. 1680px), `.card-grid`/`.house-grid` mit `auto-fill` und `minmax`
  - Breakpoint `split` = 1100px, dazu `nav`/`nav-text`
- **Semantische Klassen:** `.glass`, `.glass-panel`, `.glass-float`, `.milk-glass`, `.card-soft`, `.ember`, `.menu-dark`, `.pick-on`, `.pick-option`, `.search-capsule`, `.filters-button`, `.chat-dark` (dreht die Tokens für den dunklen Chat um), `.stage-gradient`, `.press-feedback`, `.bar-grow`
- **Komponentenmuster:**
  - Stil-Funktionen statt Varianten-Komponenten: `buttonStyles`, `inputStyles`, `listItemStyles`, `cardClass`
  - `cn()` (`lib/utils.ts`) ist ein reiner Filter-Join ohne tailwind-merge.
  - Überwiegend Tailwind-Utilities, ~400 Arbitrary Values, wenige Inline-Styles (Header-Form, Griff, OG-Bilder).
- **Bewegung:** nur `transform`/`opacity`, Kurve `cubic-bezier(0.32,0.72,0,1)`, `prefers-reduced-motion` wird beachtet.
- Die vollständigen Gestaltungsregeln stehen in **CLAUDE.md**.

---

## 10. Code-Konventionen

- **Dateinamen:** Komponenten in PascalCase `.tsx`, lib/config in camelCase `.ts`, Konstanten in SCREAMING_SNAKE (`FEE_MODEL`, `HOUSE_GRID`, `EXPLORE_SPACING`), Hooks `use*`.
- **Exporte und Importe:** nur benannte Exporte; `export default` gibt es nur in `app/`, wie Next es verlangt. Pfad-Alias `@/*` → `src/*` (~1370 Importe, kaum relative).
- **`"use client"`** steht immer in Zeile 1 (171 Dateien). Alle Views sind Client-Komponenten, Routen-Dateien sind Server-Komponenten.
- **Kommentare:** erklären das *Warum*, meist mit Verweis auf CLAUDE.md-Regeln. Kopfkommentare in den Modulen beschreiben deren Rolle.
- **Texte:**
  - UI-Texte stehen in `messages/en.json` und werden über `useTranslations`/`getTranslations` gelesen.
  - Ausnahmen mit Absicht: FAQ (`config/faq.ts`), Auth-Texte (`config/auth-copy.ts`), E-Mails, OG-Bilder, Kategorie-Labels (`lib/catalog.ts`).
- **Regeln und Zahlen:** Fachregeln stehen in `src/config/*`, Rechenlogik in `src/lib/*`. Komponenten sollen keine eigene Logik oder eigene Zahlen enthalten.
- **Typen:** kein `any`, kein `@ts-ignore`. 18 `eslint-disable`, meist `exhaustive-deps`.
- **Adapter-Muster** für alles mit späterem Backend: `lib/data`, `lib/payments`, `lib/notify/channels`, `lib/data/placeProvider`.

---

# Befunde

## A. Unstimmigkeiten, doppelte Logik, auffällige Probleme

**Geld**
1. **Zwei Rundungsregeln für den Anteil:**
   - Create rechnet `Math.round` (`create/model.ts:374`): €1.000 / 3 = 333 (Summe 999).
   - Lock rechnet `Math.ceil` (`LockSheet.tsx:54`, `store.tsx:2418`): 334 (Summe 1.002).
   - Den Rest gleicht keine der beiden aus.
2. **LockSheet erlaubt weniger Personen als `spotsTotal`**, ändert `spotsTotal` aber nicht. Spätere Mitglieder zahlen dann den höheren Anteil, und die Summe kann über dem Unterkunftspreis liegen.
3. **Währungswechsel beim Lock rechnet nichts um** (`LockSheet.tsx:45`, `store.tsx:2412`): Aus 50 EUR Host-Gebühr werden 50 THB.
4. **Gebühr inline statt über `guestFee()`:** `HouseSteps.tsx:413` und `stayExample()` (`policies.ts:62`).
5. **Veraltete „30 %“-Obergrenze in Kommentaren:** `fees.ts:44`, `LockSheet.tsx:55`, `HouseSteps.tsx:966`, `model.ts:386`, `mock.ts:215`, `mock-houses-extra.ts:62`. Der Code erlaubt 100 % (`HOST_FEE_MAX_RATE = 1`). Dazu kommt die Angabe „min 10, max 50“ in `mock.ts:320`.
6. **Host-Gebühr wird beim Erstellen gegen das Budget-Minimum geprüft.** Liegt der spätere Anteil darunter, kürzt `paymentSplit` die Gebühr still.
7. **Earnings ignorieren die echten Zahlungsdatensätze:** `earnings.ts:84` rechnet aus den aktuellen Stay-Feldern, `PaymentsCard.tsx` aus den Datensätzen. Ändert sich etwas, weichen beide voneinander ab.
8. **Auszahlung widerspricht der Spec:** Im Code wird am Tag nach dem Start ausgezahlt, Status „paid“ allein nach Datum. Laut CLAUDE.md und `joinFlow.ts` geht das Geld an den Host, sobald alle bezahlt haben.
9. **Drei Genauigkeiten für „≈“:** Karten mit 2 signifikanten Stellen (€1.260 → „≈ €1.300“), Buchungskarte mit 3, PaySheet/HouseProgress/YourHouses exakt.
10. **Preis-Begriffe uneinheitlich:**
    - Filter und Sortierung nutzen `pricePerPerson` auch bei nicht gesperrten Houses; `stayPrice` verlangt `locked`.
    - Karten zeigen den Preis ohne Gebühr, „Pay €X“ mit Gebühr.
11. **Unformatierte Beträge in Benachrichtigungen:**
    - `store.tsx:1364` baut `"${amount} ${currency}"`.
    - Die `locked`-Meldung übergibt eine reine Zahl ohne Währung.
12. **Waitlist-Refund kommt zu früh:** Er wird gebucht, sobald jemand wartet, nicht erst, wenn der Platz übernommen und bezahlt ist. Verfällt das Angebot, hat Simpulo erstattet, ohne dass Ersatz bezahlt hat.
13. **Unklar beschriftete Beträge:** `Balance.currency` ist EUR, `PayoutRecord.amount` steht in der House-Währung.

**Daten und Store**
14. **Domain-Typen liegen in `lib/mock.ts`.** Das Datenmodell hängt damit an der Mock-Datei und ihren Import-Seiteneffekten.
15. **Server und Client sehen verschiedene Daten:**
    - Der Server liest die Rohdaten (`data/stays.ts`).
    - Der Client liest den Store mit Seeds, localStorage und dem gewählten Datensatz.
    - Folge: Im Browser erstellte Houses und die `-r2`-Houses des Launch-Datensatzes haben kein SSR, keine OG-Bilder und keine Sitemap-Einträge.
16. **Mock-Seeding im Kern-Store:** `mockInbox`, `mockCrewInbox`, `seedPayments`, `seedLockedStays`, `withMockConfirmations` liegen außerhalb des Adapters und laufen auch in production (bei leeren Daten ohne Wirkung).
17. **Doppelte Logik:**
    - zwei `getCrew` (`store.tsx:2604`, `data/stays.ts:58`)
    - zwei `MOCK_NOW` mit verschiedener Bedeutung (`store.tsx:484`, `mock-chat.ts:7`)
    - mehrere `hash()`-Helfer
    - „Host + accepted“ an ~6 Stellen berechnet
    - ähnliche „House ist offen“-Filter in `requests`, `yourPeople`, `profilePrivacy`
    - die Refund-Grund-Logik doppelt (`store.tsx:1943`, `HouseDetail.tsx:640`)
18. **Abgeleitete Felder werden gespeichert:** `spotsFilled`, `spotsReserved`, `spotsOffered`, `spotsInvited` werden von Hand nachgezogen; sie können auseinanderlaufen.
19. **Typen passen nicht zur Nutzung:**
    - `language` ist auf Stay ein ISO-Code, auf User ein Label.
    - `startDate` ist als „ISO“ kommentiert, enthält aber „YYYY-MM-DD“ und wird per String-Vergleich mit vollen ISO-Zeitstempeln verglichen.
    - `PaymentStatus` und `PaymentRecordStatus` existieren beide.
    - `ExtraHouse.status: "full"` ist kein gültiger `StayStatus`.
    - `lastReadAt` gibt es nur für den aktuellen Nutzer.

**Dev-Menü, Routen, Doku**
20. **Bug: Das Dev-Menü erkennt aktuelle Routen nicht** (`DevSwitcher.tsx:38-39`, prüft `my-stays`/`inbox`). „Open as…“, „Let the 48 hours run out“ usw. fehlen deshalb auf `/your-houses/[id]` und `/messages/[id]`.
21. **CLAUDE.md weicht vom Code ab:**
    - nennt Szenarien „empty/growing/huge (600)“; im Code gibt es nur prelaunch/launch/full
    - nennt `stay/HouseCard.tsx`, die Datei gibt es nicht (gemeint: `stay/HouseGalleryCard.tsx`)
    - nennt nur `DEMO_PASSWORD`; es gibt zusätzlich die Basic Auth über `SITE_PASSWORD`
    - `/collections`, `/claim`, `/welcome`, `/saved`, `/admin/growth|houses` fehlen
22. **`docs/MVP-CHECKLIST.md` ist veraltet:** Sie nennt `/host`, `/how-it-works` und `/your-houses/hosting` als Routen, `/people` als Weiterleitung und `/notifications` → `/messages?tab=updates`.
23. **Veraltete Kommentare:**
    - `globals.css:2-5` („sechs Farben“, tatsächlich ~30)
    - `globals.css:49-62`: Typo-Skala mit alten Werten
    - `SiteHeader.tsx`-Kopf („Log in“, 20px)
    - `MobileHeader.tsx`/`dot.ts` (Glocke)
    - `HeaderActions.tsx:20` (Rechtszeile im Menü)

**Toter Code** (keine Importe):
- `ui/VibeBadge`, `ui/HostAlertButton`, `ui/StayThumb`, `ui/NotchedCard`, `ui/FilterChips`
- `stay/AccommodationSection`, `stay/HostCard`
- `layout/header/dot.ts`, `profile/ProfileCard`, `account/VerifyIdSheet`, `seo/HouseGrid`, `notifications/NotificationItem`
- `lib/usePrefersReducedMotion`, `createGooglePlacesProvider`
- in `config/policies.ts`: `HOST_FEES`; in `mock.ts`: `START_FILTERS`; in `mock-extras.ts`: `mockLastReadAt`, `mockLinkPreview`
- `en.json` `growth.host.faq`
- in `StayDetail.tsx`: der Einladungs-State

**Stil und Struktur**
24. **Media-Query-Hooks dreifach:** `useIsDesktop`, `useMediaQuery`, `usePrefersReducedMotion`, dazu eine Kopie in `SpotlightHero`. Außerdem ~14 Stellen mit `matchMedia("(prefers-reduced-motion…)")` direkt im Code und ein weiteres `prefersReducedMotion()` in `FlipText.tsx`.
25. **Datums- und Monatsformatierung außerhalb von `i18n/format.ts`:**
    - eigene `Intl.DateTimeFormat`-Aufrufe: `DateRangePicker`, `ChatCards`, `EditProfile`, `ogCard`
    - Monatsnamen: `SearchFields`, `MonthChips`, `HouseDetail`, `create/model`
26. **Überschneidende Bausteine:**
    - drei Kartensysteme: `Card` (`cardClass`), `Panel` (`.card-soft`), `--card`
    - Social-Logik in fünf Modulen
    - Ortssuche in vier Dateien mit zwei `PlaceProvider`-Interfaces
    - `ConfirmSheet` vs. `ConfirmPopover`
    - `Badge`/`StatusBadge` vs. `CardStatusChip`
27. **Verstöße gegen die Schriftregeln von CLAUDE.md:** 16× `tracking-*` und 30× `leading-*`, vor allem im Chat, in `ContentPage` und `HouseDetail`. Der Zähler-Badge-String ist 6× kopiert.
28. **Chat-Farben fest im Code** (`#221E1B` 20×, `#F4EEE7`, `#2E2925`), weil `.chat-dark` das ink-Token umdreht. Feste Tokens wie `--ink-fixed` und `--cream` fehlen.
29. **Sehr große Dateien:**

    | Datei | Zeilen |
    |---|---|
    | `lib/store.tsx` | 2867 |
    | `lib/mock.ts` | 1752 |
    | `create/HouseSteps.tsx` | 1218 |
    | `views/StayDetail.tsx` | 877 |
    | `views/YourHouses.tsx` | 861 |

    `store.tsx` sollte in Slices aufgeteilt werden.
30. **Mock-Reste in production:** `MockDelay` läuft auch dort (400ms künstliches Skeleton).
31. **Uncommittete Arbeit:** ~16 Screenshot-PNGs liegen untracked im Projektstamm.

## B. Schwierige Stellen beim Umstieg von Mock auf Firebase

1. **Synchroner Zugriff auf alle Daten:** `getHouses()`/`getUsers()`/`getData()` liefern alles sofort. Der Store hält *alle* Nutzer, Houses, Threads samt Nachrichten, Zahlungen und Benachrichtigungen im Speicher, und jede Regel durchsucht die ganzen Arrays. Nötig sind Queries und Listener pro Ansicht, Ladezustände und Indizes. `loadPage` ist zwar cursorförmig, bekommt aber trotzdem die ganze Liste.
2. **Geschäftslogik im Client-Reducer.** Muss auf den Server (Cloud Functions/Transaktionen), weil heute jeder Client sie auslösen kann:
   - `requestToJoin` (Prüfung von Blockliste, Zielgruppe, verified)
   - `acceptRequest` (Kapazität)
   - `payShare` (setzt „paid“ ohne Bestätigung vom Provider)
   - `takeWaitlistSpot`, `leaveStay`/`closeStay` (Refunds), `decideVote`/`withLock` (erzeugt Payments), `announceToSearches`, `createStay` (Einladungen, reservierte Plätze)
   - Kapazitätsänderungen brauchen Transaktionen gegen Überbuchung.
3. **Uhren laufen nur im Browser:** `settlePayments`, `syncWaitlist`, `expireRequests`, `expireInvites`. Ist kein Tab offen, verfällt nichts; mit vielen Tabs konkurrieren alle um dieselben Schreibvorgänge. Nötig sind Scheduled Functions oder Cloud Tasks pro Frist.
4. **Seiteneffekte hängen an State-Diffs:** Refund-Effekt und `NotifyBridge` würden pro Client mehrfach oder gar nicht feuern. Nötig sind Firestore-Trigger und Stripe-Webhooks.
5. **Beträge werden im Client berechnet:**
   - Der PaymentIntent-Betrag muss auf dem Server aus einem vertrauenswürdigen Preis entstehen (`fees.ts`/`policies.ts` serverseitig nutzen).
   - Zahlungsdatensätze brauchen einen unveränderlichen Snapshot.
   - Der Stripe-TODO setzt `application_fee_amount: fee`. Damit ginge Simpulos 10 % auf die Host-Gebühr verloren; richtig wäre `split.revenue`.
   - Offen: Soll der Host für seinen eigenen Anteil per Destination Charge an sich selbst zahlen?
   - Halten bis zur Buchungsbestätigung passt eher zu „separate charges and transfers“.
6. **Haupteinheiten statt Minor Units:** Stripe braucht Cent-Werte und behandelt Währungen ohne Nachkommastellen (JPY, KRW, VND …) und solche mit drei (JOD) besonders. Einige der ~49 Währungen werden für Connect-Payouts eventuell nicht unterstützt.
7. **Wechselkurse:** Feste Mock-Kurse. Historische Earnings müssen mit dem Kurs zum Auszahlungszeitpunkt rechnen (`balance_transaction`), nicht mit dem heutigen.
8. **Payouts brauchen ein neues Modell:** Heute leitet sie `earnings.ts` aus den Stays ab und vergibt den Status nach Datum. Mit Stripe kommen sie aus Balance-/Payout-Objekten pro Connect-Konto. „Rent“ und „Earnings“ müssen dann aus Charge-Metadaten getrennt werden.
9. **Denormalisierte Zähler:** `spotsFilled`, `spotsReserved`, `spotsOffered`, `visibility` (`withLaunchVisibility` schreibt global um, sobald 10 Houses veröffentlicht sind), `paymentDueAt`, `allPaidAt`. Nötig sind Trigger oder Aggregationen.
10. **Joins über Sammlungen:** Crew = Stay + Requests + Users; Thread-Teilnehmer, Benachrichtigungstexte und `peopleSignal` brauchen ebenfalls mehrere Sammlungen. Nötig sind denormalisierte Snapshots (Host-Name und Avatar am House, Crew-Zusammenfassung).
11. **Datenformen:**
    - `Thread.messages` eingebettet → Subcollection
    - Reaktionen als Arrays
    - `LivedWith` in beide Richtungen
    - `blockedUserIds` des Hosts wird von Gästen gelesen; das ist so nicht erlaubt
12. **IDs und Daten:**
    - IDs aus `makeId` (Date.now + Zufall) oder zusammengesetzt (`pay-{s}-{u}`, `${id}-r2`, Präfix „mock-“).
    - Daten sind Strings mit lexikografischem Vergleich, „YYYY-MM-DD“ gemischt mit vollen ISO-Zeitstempeln. Firestore-Timestamps würden das brechen.
    - Zeitzonen sind implizit UTC.
13. **Privatsphäre nur im Client:** `profilePrivacy`, `useCrewFaceOf`, `sharesCrew`, der Head-Start (`hasHeadStart`), `contactFilter` und `openDirectThread` arbeiten auf vollständigen Daten. Heute landen alle Nutzer mit E-Mail, Geburtsdatum und Settings in jedem Browser. Nötig sind Security Rules und öffentliche Projektionen (z. B. `publicProfiles`).
14. **Auth:** `currentUserId` kommt aus localStorage, und `?as=` macht jeden zu jedem. Server-Code muss die uid aus Firebase Auth nehmen.
15. **localStorage als Datenbank:**
    - Einladungslinks (`houseInvites`) existieren nur im Browser des Erstellers.
    - Ebenso: SavedSearches ohne Konto, Vorlagen, Zahlungs-Mock.
    - Es gibt keinen Migrationspfad außer dem Hochzählen der Version.
16. **Server-Repository:** `data/stays.ts` wird einmal beim Import gebaut; mit Firestore braucht es Abfragen pro Request plus Caching (Cache Components, `generateStaticParams`). `mock.ts` ruft beim Import `Date.now()` auf, deshalb können Server- und Client-Build voneinander abweichen.
17. **Adapter-Schnittstelle mit Mock-Belangen:** `withChatHistory`, `withAttribution`, `growthEvents`, `devPersonas`, `paidUsers` und `pastEarnings` gehören nicht in einen echten Adapter. `emptyAdapter` lässt production heute auf einem leeren Store laufen.
18. **Hosting:** `apphosting.yaml` zielt auf Firebase App Hosting, `proxy.ts` erwartet den Vercel-Header `x-vercel-ip-country`. Unter Firebase fehlt er, also kein `viewer_country`. Ersatz wäre z. B. ein Geo-Header des CDN.

## C. Offene TODOs im Code

| Stelle | TODO |
|---|---|
| `lib/payments/stripe.ts:13-65` | Alle Stripe-Methoden sind Stubs: `accounts.create`, `accountLinks.create`, `accounts.retrieve`, `payouts.list`, `balance.retrieve`, `paymentIntents.create` (application_fee + transfer_data), `confirmPayment`, `paymentIntents.retrieve` (Quittung), `refunds.create` (reverse_transfer, refund_application_fee), `identity.verificationSessions.create`/`retrieve` |
| `lib/data/emptyAdapter.ts:25` | `TODO(firestore)`: Paging-Query mit `orderBy`/`startAfter`/`limit` + Zählabfrage |
| `lib/currency.ts:3` | `TODO(rates)`: Kursdienst (EZB/Open Exchange Rates), täglich auf dem Server |
| `lib/places.ts:52` | Google Places (New) Autocomplete bzw. Mapbox-Geocoding |
| `lib/notify/channels/push.ts:2` | `TODO(push)`: Firebase Cloud Messaging (`sendEachForMulticast`) |
| `lib/notify/channels/email.ts:3` | `TODO(email)`: Resend, Vorlagen serverseitig rendern |
| `next.config.ts` | `/i/:code` → Einladungscodes; `/c/:handle` → Creator-Seiten |

Implizit offen, ohne TODO-Marker: echter Daten-Adapter (production ist leer), Auth, serverseitige Uhren, Server-Projektionen für die Privatsphäre, rechtliche Prüfung von `/cancellation`.

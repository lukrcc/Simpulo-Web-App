# Produkt-Stand – Bestandsaufnahme

Stand 21. Nov. 2026 · nur gelesen, nichts am Code geändert. Grundlage: der Code in `src/` (Routen, Komponenten, Store, Adapter), nicht die Beschreibungen in CLAUDE.md.

**Status:** fertig · teilweise · nur Platzhalter · fehlt
**Platzhalter?** ob Inhalte Platzhalter, Entwurf, Mock oder TODO sind.

## Vorweg: was für alles gilt

- **Kein Backend.** Alle Daten laufen über `src/lib/data/index.ts`. In dev und demo liefert sie der Mock-Adapter, im Production-Build der leere Adapter (`emptyAdapter`: leere Listen, `TODO(firestore)`). Zustände liegen im Client-Store (`src/lib/store.tsx`) und in localStorage.
- **Keine externen Dienste.** `package.json` enthält kein Stripe-, Firebase-, Resend- oder Auth-Paket. Es gibt nur zwei API-Routen: `api/link-preview` und `api/static-map`.
- **Fristen nur im Browser.** Die 48h-Fristen (Anfragen, Zahlung, Einladungen, Buchung) prüft eine Uhr im Browser beim Laden und jede Minute. Einen Server-Job gibt es nicht.
- **„fertig“ heißt unten:** Oberfläche und Logik funktionieren im Mock-Store. In Produktion fehlt überall die Datenquelle.

---

## 1 Gast

| Bereich | Status | Route / Datei | Was fehlt | Platzhalter? |
|---|---|---|---|---|
| Explore (Spotlight, Raster, dunkle Bänder, Kategorien, All filters, Where · When) | fertig | `/explore`, `views/ExploreFeed.tsx`, `components/explore/*`, `SpotlightCoverflow.tsx`, `SpotlightHero.tsx` | – | Mock-Daten; die Ortssuche ist für Google Places nur vorbereitet |
| Leere Suche (NoHouseYet, BeFirstHere, NotifyLine, Save this search) | fertig | `explore/NoHouseYet.tsx`, `ExplorePrelaunch.tsx` | „Join the waitlist“ zeigt nur einen Toast | ja (Warteliste) |
| Stadt- und Sammlungsseiten | fertig | `/co-living/[city]`, `/collections/[slug]` | Der Stadttext ist nur eine Vorlage; Sammlungen haben kein eigenes OG-Bild | Mock-Daten |
| House-Seite Besucher | fertig | `/house/[slug]`, `/h/[id]`, `views/StayDetail.tsx`, `stay/HouseHero.tsx`, `stay/HouseSections.tsx` | – | Mock |
| House-Seite Host | teilweise | `StayDetail.tsx` + `/h/[id]/manage` (`views/ManageHouse.tsx`, `stay/HouseDetail.tsx`) | Die Verwaltung ist eine eigene Seite mit Sheets, nicht in die House-Seite eingebaut | nein |
| House-Seite Mitglied | teilweise | `stay/MemberHouse.tsx` (MemberHero, Stepper, MemberSections) | Die Reiter Chat · Crew · Plan · Moments · Me fehlen (nur als Kommentar geplant). Beleg und „Something went wrong“ gibt es nur in der alten Detailansicht | ja (Kommentar „Later: …“) |
| Buchungsleiste, schwebende Kapsel, JoinSteps | fertig | `HouseSections.tsx` (HouseJoinBar), `StayDetail.tsx` (StayCta) | – | nein |
| Warteliste eines vollen House | fertig | `lib/waitlist.ts`, Store `requestWaitlist` / `takeWaitlistSpot` / `syncWaitlist` | Die Uhr läuft nur im Browser | Mock |
| Warteliste vor dem Launch („Join the waitlist“) | fertig (Mock) | `lib/waitlistSignup.ts`, `platform/WaitlistSheet.tsx`, `/waitlist/confirm`, `/waitlist/unsubscribe` | Double-Opt-in und Mails nur im Mock (Dev-Log); kein echter Versand | ja |
| Request with a friend | fertig | `StayDetail.tsx` (`withFriend`, `?with=`) | – | nein |
| Beispiel- und Founding-Houses | fertig | `lib/data/visibleHouses.ts`, `HouseCard.tsx`, `HouseHero.tsx` | „Host one like this“ führt auf `/create`, nicht auf eine Bewerbung | ja (`HOST_APPLY_HREF = "/create"`) |
| Anfrage-Fenster (Notiz 300 Zeichen) | fertig | `StayDetail.tsx` (RequestSheet) | – | nein |
| Altersprüfung 18+ | fertig | `StayDetail.tsx`, `lib/birthDate.ts` | Das Alter wird nur selbst angegeben, nicht geprüft | nein |
| Women-only | fertig | `lib/requests.ts`, `store.requestToJoin` | – | nein |
| Anfrage zurückziehen | fertig | `store.withdrawRequest`, StayDetail, HouseDetail | – | nein |
| Bezahl-Fenster (Apple Pay, Google Pay, Karte) | teilweise | `stay/PaySheet.tsx` | Die Wallet-Knöpfe sind nur gezeichnet; die Kartenfelder sind einfache Eingaben statt Stripe Payment Element | ja (Testkarte vorbelegt) |
| Zahlungs-Adapter | Mock fertig, Stripe fehlt | `lib/payments/mock.ts`, `stripe.ts` | Jede Stripe-Methode wirft „not implemented“ (12×). Kein Paket, keine API-Routen, keine Webhooks. **Im Production-Modus schlägt jede Zahlung fehl** | ja |
| Belege (PDF) | teilweise | `payments/Receipt.tsx`, `lib/receiptPdf.ts` | Nur in der alten Detailansicht, nicht auf der Mitglieder-House-Seite | Mock-Beleg |
| Erstattungen | teilweise | `payments/Refund.tsx`, Store-Effekt → `payments.refund` | Laufen nur gegen den Mock | Mock |

## 2 Im House

| Bereich | Status | Route / Datei | Was fehlt | Platzhalter? |
|---|---|---|---|---|
| House-Bereich: Kopf, Stepper, Crew · Ort · Praktisches | fertig | `stay/MemberHouse.tsx`, `config/house-steps.ts` | Die 48h im Stepper sind fest im Code statt aus `REQUEST_POLICY` gelesen | nein |
| House-Chat (Systemzeilen, angeheftete Abstimmung) | fertig | `views/ThreadView.tsx` | Die geplanten Reiter im Chat-Kopf fehlen | Mock-Nachrichten |
| Bogen allgemein (Bausteine je Tiefe) | nur Platzhalter | `config/depth.ts` (`ARC_MODULES`) | Wird außerhalb dieser Datei nirgends benutzt; die Tiefenwahl ist aus | ja (nur Konfiguration) |
| Vorher: Absicht | fehlt | – | Keine Oberfläche, kein Datenfeld | – |
| Ankommen: Fragenkarten | fehlt | – | Keine Oberfläche | – |
| Mittendrin: Halbzeit | fehlt | – | Keine Oberfläche | – |
| Abschluss: Abschlussrunde | fehlt | – | Keine Oberfläche; im Admin fest „noch nicht gemessen“ | ja |
| Danach (im Bogen) | teilweise | „Do it again“, Lived-with-Bestätigung, PastHouse | Bewertung, „Absicht erreicht“ und 30-Tage-Frage fehlen | nein |
| Abstimmung Ort und Daten | fertig | `lib/crewVotes.ts`, `stay/CrewVotes.tsx` | Nur diese zwei Arten | nein |
| Allgemeine House-Abstimmungen | fehlt | – | Keine freien Abstimmungen; die Regel „Vorauswahl gilt nach 24h“ steht nur in CLAUDE.md | – |
| House agreement | fehlt | – | Es gibt nur die Hausregeln des Hosts, keine gemeinsame Vereinbarung | – |
| Melden (Person, Nachricht, House) | teilweise | `safety/SafetyMenu.tsx`, `ReportSheet.tsx` | Meldungen landen nur im lokalen Store. Keine Moderations-Oberfläche, nur ein Warnsignal im Admin | ja |
| „Something went wrong“ | teilweise | `help/HelpSheet.tsx` | Nur in der Host-Verwaltung und der alten Detailansicht, nicht auf der Mitglieder-House-Seite | Mock-Ticket |

## 3 Danach

| Bereich | Status | Route / Datei | Was fehlt | Platzhalter? |
|---|---|---|---|---|
| Abschluss-Fragen | fehlt | nur `config/depth.ts` | Keine Oberfläche | ja |
| Bewertung („Who would you live with again“, Stimmung, Ordnung …) | fehlt | `config/data-points.ts` (`after.*`: planned) | Kein Formular. „Would live again“ ist ein fester Mock-Wert | ja (`TODO(backend)`) |
| Album / House Memories | fehlt | nur `config/marketing.ts` (nächster Schritt) | Keine Route, keine Komponente | – |
| „Lived with“ bestätigen | fertig | `store.confirmLivedWith`, `ProfileView.tsx`, `profile/Crews.tsx` | Nur im Client-Store | Mock-Bestätigungen |
| Your people / Netzwerk | fertig | `/people`, `views/YourPeople.tsx`, `lib/yourPeople.ts` | Die Regeln gelten nur im Client, nicht auf dem Server | Mock-Daten |
| Einladen (InviteSheet, Einladungsseite) | fertig | `components/InviteSheet.tsx`, `lib/invites.ts`, `/invite/[token]` | Die Tokens leben nur im lokalen Store | nein |
| Spots for friends | fertig | `InviteSheet.tsx`, `INVITE_POLICY.maxSpotsPerLink` | Die 48h-Reservierung läuft ohne Server | nein |
| Do it again | fertig | `create/model.ts` (`againHref`, `againForm`) | – | nein |

## 4 Host

| Bereich | Status | Route / Datei | Was fehlt | Platzhalter? |
|---|---|---|---|---|
| Open a House (Schritte, Review, Veröffentlichen, Erfolg) | fertig | `/create`, `create/CreateEntry.tsx`, `views/CreateStayForm.tsx`, `create/HouseSteps.tsx` | Fotos werden nicht hochgeladen, nur lokal angezeigt | ja (PhotoUploader „nothing is uploaded“) |
| Fill your House | fertig | `InvitePage` in `InviteSheet.tsx` | – | nein |
| Open a House vor dem Launch | teilweise | `CreateEntry.tsx` (ApplyAsHost) | Vor dem Launch kann niemand ein House eröffnen; statt dessen ein Platzhalter | ja |
| Host from your place (Orte, Fenster) | fertig | `lib/ownPlaces.ts`, `places/YourPlaces.tsx`, `store.addPlace` | In Produktion gibt es nie Orte | Mock-Orte |
| Anfragen verwalten (Accept, Not a fit + Undo, Warteliste, Crew, Als gebucht markieren) | fertig | `/h/[id]/manage`, `stay/HouseDetail.tsx`, `stay/HouseProgress.tsx`, `payments/PaymentsCard.tsx` | „Remind“ zeigt nur einen Toast und schickt keine Erinnerung | ja (Toast) |
| House bearbeiten | fertig | `/your-houses/[id]/edit`, `views/EditStay.tsx` | – | nein |
| House absagen | fertig | `stay/CrewMenu.tsx` → `store.closeStay` | Die Erstattung hängt am leeren Stripe-Adapter | Mock |
| Auszahlungen (Payouts-Seite, Setup, Status) | teilweise | `/your-houses/payouts`, `payouts/PayoutSetup.tsx`, `/settings/payouts` | Stripe Connect ist leer; das Onboarding führt im Mock auf `/dev/stripe-onboarding` | ja (Mock-Ledger) |
| Founding Host / Bewerbung | fertig (Mock) | `/apply`, `platform/HostApply.tsx`, Admin › Bewerbungen | Mails nur im Mock; Annehmen setzt Founding Host und schaltet Open a House frei | ja |

## 5 Konto

| Bereich | Status | Route / Datei | Was fehlt | Platzhalter? |
|---|---|---|---|---|
| Login (Apple, Google, Magic Link, Passkey) | nur Platzhalter | `auth/AuthSheet.tsx`, `AuthProvider.tsx` | Keine echte Anmeldung: man wählt einen Mock-Nutzer | ja |
| Onboarding | fertig (Oberfläche) | `/welcome`, `onboarding/WelcomeView.tsx`, `/settings/profile?setup=1` | Ohne Konten wird nichts dauerhaft gespeichert | Mock |
| Profil (eigenes, fremdes, Vorschau) | fertig | `/profile`, `/u/[userId]`, `views/ProfileView.tsx` | Mitbewohner-Bewertungen fehlen (laut Plan erst nach dem Launch) | nein |
| Edit profile | fertig | `/settings/profile`, `views/EditProfile.tsx` | Fotos werden nicht hochgeladen | ja |
| Settings | teilweise | `/settings`, `views/Settings.tsx` | Sign-in-Methode und Passkey zeigen nur „comes soon“; „Add payment method“ zeigt nur einen Toast; die Sprache ist nur Englisch | ja (Mock-Karte Visa 4242, Mock-E-Mail) |
| Your data | teilweise | Settings › Privacy, `/settings/delete-account` | Der Download ist echt (JSON). Pausieren und Löschen ändern nur den lokalen Store | ja |
| Benachrichtigungen | teilweise | `lib/notify`, `channels/inapp` (echt im Store), `push.ts`, `email.ts`, Your houses › Activity | Push und E-Mail schreiben nur in die Konsole und ins Dev-Log | ja (`TODO(push)`, `TODO(email)`) |
| E-Mails | teilweise | `src/emails/*`, Vorschau `/dev/emails` | Die Vorlagen gibt es, aber es wird nichts verschickt (kein Resend); der Abmeldelink ist nicht signiert | ja |

## 6 Außen

| Bereich | Status | Route / Datei | Was fehlt | Platzhalter? |
|---|---|---|---|---|
| Footer (groß, schlank, keiner) | fertig | `config/footer.ts`, `layout/FooterByRoute.tsx` | Die Warteliste darin ist nur ein Toast; `/host` steht noch als Seite in der Liste, obwohl es weiterleitet | teils (Social-Links ungeprüft) |
| Landingpage | teilweise | `/` = Explore; vor dem Launch `ExplorePrelaunch` | Für Ausgeloggte gibt es keine eigene Startseite, die Simpulo erklärt | nein |
| About | teilweise | `/about` | Nur drei Absätze; Team, Geschichte und Bilder fehlen | nein (sehr knapp) |
| Host-Seite | fehlt | `/host` leitet auf `/faq?role=host` | Keine Seite für Hosts bzw. Founding Hosts | – |
| Themen | fertig | `/explore?category=`, `/collections/[slug]` | – | nein |
| Ratgeber / Guides | fehlt | – | Keine Inhalte, keine Routen | – |
| Hilfe / FAQ (Get help, Share an idea) | fertig | `/faq`, `config/faq.ts`, `help/HelpFeedback.tsx` | Tickets landen nur im lokalen Admin-Store | nein |
| Ideen-Liste | nur Platzhalter | `/ideas` (Schalter `ideasBoard: false` → 404) | Bewusst aus | – |
| Impressum | nur Platzhalter | `/impressum` | Alle Felder sind „[Company name] …“ | ja |
| Datenschutz | nur Platzhalter | `/privacy` | Verantwortlicher, Rechtsgrundlagen, Speicherdauer und Cookies sind „[…]“ | ja |
| AGB | teilweise | `/terms` | Ausformuliert, aber als Entwurf markiert und nicht juristisch geprüft | ja (Entwurf) |
| Stornoregeln | teilweise | `/cancellation`, `config/policies.ts` (`draft: true`) | Ausformuliert, aber als Entwurf markiert | ja (Entwurf) |
| Safety | nur Platzhalter | `/safety` | Unter jeder Überschrift steht „Section text follows.“ | ja |
| Cookies | fehlt | Footer-Link auf `/privacy#cookies` | Der Abschnitt ist „[…]“; heute ist kein Banner nötig (kein Analytics) | ja |
| Kontakt | teilweise | `/contact` | Nur eine mailto-Zeile, kein Formular | nein |
| App auf dem Telefon | teilweise | `/get`, `/get/card` | Store-Links und Installationsvideo sind leer (`config/app-links.ts`) | ja |
| Leere Zustände | fertig | NoHouseYet, BeFirstHere, Your houses (neues Konto), Messages, Saved, Your people (`ui/EmptyState`) | – | nein |
| Fehlerseiten | teilweise | `app/not-found.tsx`, `app/error.tsx` | Kein `global-error.tsx`: ein Fehler im Root-Layout wird nicht aufgefangen | nein |
| Passwortseite | fertig | `/preview` | – | nein |
| SEO (Sitemap, Robots, OG-Bilder) | fertig | `sitemap.ts`, `robots.ts`, OG für House, Stadt, Einladung, Profil | Kein OG-Bild für Sammlungen, About und FAQ | nein |

## 7 Admin

**Für das ganze Admin gilt:**
- Die Oberfläche ist sehr weit.
- Der Zugriffsschutz besteht nur in der Oberfläche (`lib/admin/access.ts`). Den echten Schutz (Custom Claim, Security Rules) bringt erst Phase 4.
- Änderungen liegen nur im localStorage (`lib/admin/store.ts`).
- Aktionen nach außen (erinnern, hervorheben, benachrichtigen, antworten) schreiben nur einen Log-Eintrag und zeigen einen Toast.
- In Produktion sind alle Admin-Sammlungen leer.

| Seite | Status | Datenquelle | Was fehlt | Platzhalter? |
|---|---|---|---|---|
| Übersicht `/admin` | fertig | `metrics.ts` (Mock-Verlauf, sonst aus den Daten berechenbar) | Die Statistik-Dokumente der stündlichen Function (`TODO getStats`) | Mock-Verlauf |
| Houses `/admin/houses` | teilweise | aus den Daten berechenbar | Die vier Hebel (hervorheben, benachrichtigen, Vorschläge, Ausweichen) schreiben nur ins Log | ja (`TODO(backend)`) |
| House anlegen `/admin/houses/new` | fertig (Mock) | Store | Claim-Links gibt es nur lokal | Mock |
| Vorbereitete Houses `/admin/houses/prepared` | fertig | `stay.claim` | – | Mock |
| Hosts `/admin/hosts` | teilweise | aus den Daten; Follower aus `mockAudienceSize` | „Erinnern“ zeigt nur einen Toast; die Follower-Zahlen sind Mock | ja |
| Bewerbungen `/admin/applications` | fertig (Mock) | Liste/Detail, Annehmen · Rückfrage · Ablehnen, Log, Mail im Mock | Bewerbungen kommen aus `/apply` | ja |
| Warteliste `/admin/waitlist` | fertig (Mock) | echte Einträge, Status bestätigt/offen/abgemeldet, Filter Ort/Thema | Nur Bestätigte zählen fürs Launch-Kriterium | ja |
| Wachstum `/admin/growth` | fertig | Ereignisse (Mock-Saat) | Echte Analytics-Ereignisse fehlen | Mock |
| Traffic `/admin/traffic` | nur Platzhalter | `MOCK_TRAFFIC` (Kapsel „Demo-Daten“) | Keine Analytics-Anbindung; in Produktion „nicht verfügbar“ | ja |
| Analyse `/admin/topics` | fertig | Mock-Ergebnisse oder aus den Daten | „Mit dir wieder“ sind Beispielwerte | teils |
| Algorithmus `/admin/data` | fertig | Konfiguration (`data-points`, `models`, `hypotheses`) | Die Thesen-Ergebnisse sind Mock | teils |
| Labore `/admin/labore` | fertig (Konzept) | `lib/admin/labs.ts` | Schätzungen, keine Messwerte (gewollt) | Schätzung |
| Vision `/admin/vision` | fertig | `config/vision.ts` + Live-Zahlen | – | Konzept |
| Finanzierung `/admin/funding` | fertig | `config/funding.ts`, `metrics.ts` | Die Investoren-Liste ist ein ausgegrauter Platzhalter (bewusst: „nach dem Umzug“) | teils |
| Posteingang `/admin/posteingang` | teilweise | Aufgabenliste + Tickets | Antworten und Erinnerungen werden nicht verschickt; keine Moderation der Meldungen | ja |
| Geld `/admin/money` | teilweise | Mock-Payouts, Mock-Kontostand | Keine Anbindung an Stripe oder Qonto | ja |
| Steuern `/admin/money/taxes` | teilweise | `mock-ledger.ts` | Die Exporte funktionieren; Beleg-Upload ist Mock; DATEV und Xero sind nur Platzhalter | ja |
| System `/admin/platform` | teilweise | localStorage | Der Phasenwechsel wirkt nur im eigenen Browser | ja |
| Log `/admin/log` | teilweise | localStorage | Wird nicht auf einem Server gespeichert | ja |
| Marketing (+ Partner) `/admin/marketing` | teilweise | `config/marketing.ts`, Mock-Kontakte/-Partner | Daten nur lokal; die Launch-Mail wird nicht verschickt; Werkzeuge und Einordnung der Kanäle fehlen größtenteils | Demo-Kontakte |
| `/admin/overview`, `/admin/algorithm` | – | Weiterleitungen | – | – |

---

## Buchungsablauf: alle Zustände

Datenmodell: `lib/mock.ts` (RequestStatus, Payment, Stay); Logik: `lib/store.tsx`, `lib/joinFlow.ts`, `lib/requests.ts`.

| Zustand | Datenmodell | Logik | Gast-Oberfläche | Host-Oberfläche | Anmerkung |
|---|---|---|---|---|---|
| angefragt (`pending`) | ja | ja | ja | ja | mit Notiz, Freund und Herkunft |
| angenommen (`accepted`) | ja | ja | ja | ja | – |
| abgelehnt (`declined`) | ja | ja (+ Undo) | ja („Didn't work out“ + ähnliche Houses) | ja („Not a fit“) | – |
| abgelaufen (`expired`, 48h) | ja | ja (Uhr im Browser) | ja (wie abgelehnt) | teilweise | Verschwindet beim Host ohne eigenen Hinweis |
| Zahlung fällig (`payment_due`) | ja | ja | ja („Pay your share“, Frist) | ja | Zahlung nur im Mock |
| Zahlung nach 48h verfallen | teilweise (kein eigener Status) | ja (Platz wird frei) | teilweise | ja | Der Gast bekommt nur eine allgemeine Benachrichtigung |
| bezahlt (`paid`) | ja | ja | ja (Anteil, Beleg) | ja | – |
| Buchung vom Host bestätigt | ja | ja (sonst nach 48h automatisch erstattet) | ja („Booked ✓“, Adresse) | ja (Nachweis) | – |
| storniert durch Gast (Leave) | teilweise (die Anfrage wird gelöscht) | ja (Erstattung nach Regel) | ja | ja | – |
| storniert durch Host („Cancel this House“) | ja (`closed`) | ja (volle Erstattung) | ja | ja | – |
| vom Host entfernt | ja | ja | **nein** | ja | Der Gast bekommt keinen eigenen Hinweis |
| erstattet (`refunded`) | ja (+ Betrag) | ja (nur Mock) | ja (RefundNotice, Settings) | teilweise | Echte Erstattung fehlt (Stripe) |
| Warteliste angefragt / wartend / Angebot 24h | ja | ja | ja | ja | – |
| eingeladen (`invited`, 48h) | ja | ja | ja | ja | – |
| vorgemerkt (Beta, `reserved`) | ja | ja | ja | teilweise | Für den Host nicht eigens gekennzeichnet |

**Gebaut:** alle Zustände im Mock.
**Nicht gebaut:**
- echtes Geld (bezahlen, erstatten, auszahlen)
- Server-Fristen
- ein eigener Hinweis für den Gast bei „entfernt“ und „Zahlung verfallen“

---

## Top 10 der größten Lücken für „Desktop fertig“

Gemeint: was auf dem Desktop als Produkt fehlt oder nur Platzhalter ist, nach Gewicht. Backend-Anbindungen stehen am Ende, weil sie keine Oberflächenarbeit sind, aber jede Oberfläche davon abhängt.

1. **Der Bogen im House fehlt ganz:** Absicht, Fragenkarten, House agreement, Halbzeit und Abschlussrunde gibt es nur als Konfiguration, ohne jede Oberfläche.
2. **Die Zeit danach fehlt:** Es gibt keine Bewertung („Mit wem wieder“, Stimmung, Ordnung …) und kein Album bzw. House Memories. Damit fehlen auch die Daten für Your people und das Matching.
3. **Der House-Bereich für Mitglieder ist unfertig:**
   - Die Reiter Chat · Crew · Plan · Moments · Me fehlen.
   - Beleg und „Something went wrong“ liegen nur in der alten Detailansicht.
   - Die Host-Verwaltung ist eine eigene Seite statt Teil der House-Seite.
4. **Host-Bewerbung und Warteliste sind Platzhalter:** Es gibt kein Founding-Host-Formular, „Join the waitlist“ zeigt nur einen Toast, und vor dem Launch kann niemand ein House eröffnen. Das ist der Kern der Phase Pre-launch.
5. **Die Rechtsseiten sind nicht fertig:** Impressum, Datenschutz, Safety und Cookies sind Platzhalter; AGB und Stornoregeln sind Entwürfe.
6. **Die Seiten für Außenstehende sind dünn:** Es gibt keine eigene Startseite für Ausgeloggte, keine Host-Seite und keine Ratgeber, und About hat nur drei Absätze.
7. **Melden und Moderation fehlen:** Meldungen landen nur lokal. Im Admin gibt es keine Moderation, nur ein Warnsignal.
8. **Kleine Lücken im Ablauf:**
   - Ein entfernter Gast bekommt keinen Hinweis, ebenso wer nach 48h nicht bezahlt hat.
   - „Remind“ zeigt nur einen Toast.
   - Die 48h im Stepper sind fest im Code.
   - Es gibt kein `global-error.tsx`.
   - Auf der Mitglieder-Seite fehlt der Beleg.
9. **Echtes Geld fehlt:** Stripe (Payment Element, Connect, Erstattungen, Webhooks) ist leer, und im Production-Modus bricht jede Zahlung ab.
10. **Echte Konten und Versand fehlen:**
   - Die Anmeldung ist eine Mock-Auswahl.
   - Fotos werden nicht hochgeladen.
   - E-Mail und Push werden nicht verschickt.
   - Es gibt keine Datenquelle (Firestore) und keine Server-Fristen.
   - Der Admin ist nur in der Oberfläche geschützt.

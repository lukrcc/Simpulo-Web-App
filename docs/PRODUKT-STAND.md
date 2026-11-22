# Produkt-Stand – Bestandsaufnahme

Stand 21. Nov. 2026, abends (nach der Nacharbeit: Fristen, Benachrichtigungen, Marketing-Kanäle, keine App-Stores) · nur gelesen, nichts am Code geändert. Grundlage ist der Code in `src/` (Routen, Komponenten, Store, Adapter, Configs), nicht CLAUDE.md.

**Status:** fertig im Mock · teilweise · Platzhalter · fehlt
**Platzhalter?** ob Inhalte Platzhalter, Entwurf, Mock oder TODO sind.

## Vorweg: was für alles gilt

- **Kein Backend.** Alle Daten laufen über `src/lib/data/index.ts`. In dev und demo liefert sie der Mock-Adapter, im Production-Build der leere Adapter (`emptyAdapter`). Zustände liegen im Client-Store (`src/lib/store.tsx`), im Admin-Store (`src/lib/admin/store.ts`) und in localStorage.
- **Keine externen Dienste.** `package.json` enthält kein Stripe-, Firebase-, Resend- oder Auth-Paket. `lib/payments/stripe.ts` wirft bei jeder Methode „isn't implemented yet“.
- **Kein echter Versand.** `DELIVERY` in `config/notifications.ts` steht auf `mock` für E-Mail und Push: alles geht in die Konsole und ins Dev-Log.
- **Fristen nur im Browser.** Fristen (Anfrage 72 h, Zahlung 48 h, Einladung 48 h) rechnet `lib/deadlines.ts` rein; ausgeführt werden sie von einer Uhr im Browser beim Laden und jede Minute. Einen Server-Job gibt es nicht.
- **„fertig im Mock“ heißt unten:** Oberfläche und Logik funktionieren mit Mock-Daten. In Produktion fehlt überall die Datenquelle.
- **Dev-Server:** Der laufende Dev-Server meldet auf Admin-Seiten beim Server-Rendern „reading 'filter'“. Das ist ein veralteter Code-Stand in seinem Speicher, kein Fehler im Code; ein Neustart sollte ihn beheben.

---

## 1 Gast

| Bereich | Status | Route / Datei | Was fehlt | Platzhalter? |
|---|---|---|---|---|
| Explore (Spotlight, Raster, Bänder, Kategorien, All filters erst bei „Show N houses“, Where · When) | fertig im Mock | `/explore`, `views/ExploreFeed.tsx`, `components/explore/*` | Ortssuche für Google Places nur vorbereitet | Mock-Daten |
| Startseite für Ausgeloggte | fertig im Mock | `/`, `views/Landing.tsx`, `config/landing.ts` | – | Mock-Houses |
| Leere Suche (NoHouseYet, BeFirstHere, Save this search) | fertig im Mock | `explore/NoHouseYet.tsx` | – | Mock |
| Stadt- und Sammlungsseiten | teilweise | `/co-living/[city]`, `/collections/[slug]` | Sammlungen haben kein eigenes OG-Bild | Mock |
| House-Seite Besucher (inkl. „The space“, Teilen-Blatt) | fertig im Mock | `/house/[slug]`, `views/StayDetail.tsx`, `stay/HouseHero.tsx`, `stay/HouseSections.tsx` | – | Mock |
| Buchungsleiste, schwebende Kapsel | fertig im Mock | `HouseSections.tsx` (HouseJoinBar) | – | nein |
| Warteliste eines vollen House | fertig im Mock | `lib/waitlist.ts`, Store | Uhr nur im Browser | Mock |
| Warteliste vor dem Launch (Double-Opt-in) | fertig im Mock | `lib/waitlistSignup.ts`, `platform/WaitlistSheet.tsx`, `/waitlist/confirm`, `/waitlist/unsubscribe` | Kein echter Versand, Token nicht signiert | Mock-Mails |
| Request with a friend | fertig im Mock | `StayDetail.tsx` | – | nein |
| Beispiel- und Founding-Houses | fertig im Mock | `lib/data/visibleHouses.ts`, `HouseCard.tsx` | – | Mock |
| Anfrage-Fenster mit Verhaltenskodex | fertig im Mock | `StayDetail.tsx`, `consent/Agreements.tsx` | – | nein |
| Push-Frage nach der ersten Anfrage | fertig im Mock | `InstallPrompt.tsx` (Trigger „requested“) | Echte Push-Anmeldung fehlt (FCM) | Mock |
| Altersprüfung 18+ | fertig im Mock | `lib/birthDate.ts`, Zustimmung „I'm 18 or older“ | Nur selbst angegeben | nein |
| Bezahl-Fenster | teilweise | `stay/PaySheet.tsx` | Wallet-Knöpfe nur gezeichnet, Kartenfelder statt Stripe Payment Element | Testkarte |
| Zahlungs-Adapter | Platzhalter | `lib/payments/mock.ts`, `stripe.ts` | Stripe leer: **im Production-Modus schlägt jede Zahlung fehl** | ja |
| Belege (PDF) | fertig im Mock | `payments/Receipt.tsx` im Me-Reiter | – | Mock-Beleg |
| Erstattungen | teilweise | `payments/Refund.tsx`, `payments.refund` | Nur gegen den Mock | Mock |

## 2 Im House

| Bereich | Status | Route / Datei | Was fehlt | Platzhalter? |
|---|---|---|---|---|
| House-Bereich mit Reitern Chat · Crew · Plan · Moments · Me · Manage | fertig im Mock | `/h/[id]`, `stay/HouseArea.tsx`; `/h/[id]/manage` leitet auf `?tab=manage` | – | Mock |
| Stepper der Schritte | fertig im Mock | `config/house-steps.ts` | – (Anfragefrist 72 h aus `DEADLINE_HOURS`) | nein |
| House-Chat | teilweise | `views/ThreadView.tsx` | Der Platz für Reiter im Chat-Kopf ist leer („not built yet“) | Mock-Nachrichten |
| Bogen: Vorher (Absicht, Crew-Seite, Getting there, Practical, Host-Aufgaben) | fertig im Mock | `stay/ArcBefore.tsx`, `config/arc.ts`, `lib/arc.ts` | – | Mock-Absichten |
| Bogen: Ankommen (I'm here, First night, House agreement) | fertig im Mock | `stay/ArcArrival.tsx`, `config/question-cards.ts` | – | Mock |
| Bogen: Mittendrin (Moment des Tages, Halbzeit, Höhepunkt) | fertig im Mock | `stay/ArcMiddle.tsx` | – | Mock |
| Bogen: Abschied (Closing circle, Words for the crew) | fertig im Mock | `stay/ArcGoodbye.tsx` | – | Mock |
| Bogen-Karten im Chat, E-Mails | fertig im Mock | `chat/ArcChatCard.tsx`, `ArcParts.tsx` (über den Katalog) | Mails nur im Mock | Mock |
| Programm-Baukasten (Pro Hosts) | fertig im Mock | `stay/ProgramParts.tsx`, `config/program.ts` | – | Vorlagen |
| Soziale Tiefe | Platzhalter (gebaut, aus) | `config/depth.ts`, Schalter `depthChoiceEnabled: false` | Bewusst aus bis zur Entscheidung | – |
| Abstimmung Ort und Daten | fertig im Mock | `lib/crewVotes.ts`, `stay/CrewVotes.tsx` | – | nein |
| Allgemeine Abstimmungen | teilweise | Agreement, Moment des Tages, Höhepunkt | Keine freien Abstimmungen der Crew | – |
| Melden (Person, Nachricht, House, Foto) und Moderation | fertig im Mock | `safety/ReportSheet.tsx`, Admin › Posteingang › Sicherheit | – | Mock |
| „Something went wrong“ | fertig im Mock | `help/HelpSheet.tsx` im Me-Reiter | Ticket nur im lokalen Admin-Store | Mock |

## 3 Danach

| Bereich | Status | Route / Datei | Was fehlt | Platzhalter? |
|---|---|---|---|---|
| Tag danach (mit wem wieder, Absicht, Bewertung, Tipp) | fertig im Mock | `stay/ArcGoodbye.tsx`, `UserSettings.after` | – | Mock-Antworten der anderen |
| Gegenseitige Wahl → Your people | fertig im Mock | `mutualChoices`, `revealChosen` | Server-Function fehlt | Mock |
| +7 Do it again, +30 Tage, Geschichten | fertig im Mock | `stay/ArcAfterwards.tsx`, `lib/pastCrews.ts` | – | Mock |
| Öffentliche Bewertungen (ab 3) | fertig im Mock | „From past crews“ auf House-Seite und Host-Profil | – | Mock |
| Album / House Memories | fertig im Mock | `stay/Album.tsx`, `lib/memories.ts` | Dateien nur in IndexedDB im Browser; kein Storage | Anreiz `MEMORIES_PERK` aus |
| „Lived with“ bestätigen | fertig im Mock | `store.confirmLivedWith` | Nur im Client | Mock |
| Netzwerk `/people` (4 Ebenen, I'm in for, Nearby, Crews, Jahrestag) | fertig im Mock | `views/YourPeople.tsx`, `lib/nearby.ts` | Regeln nur im Client | Mock |
| Einladen, Spots for friends (48 h über die Fristen) | fertig im Mock | `InviteSheet.tsx`, `lib/deadlines.ts` | – | nein |

## 4 Host

| Bereich | Status | Route / Datei | Was fehlt | Platzhalter? |
|---|---|---|---|---|
| Open a House (inkl. „About the space“) | fertig im Mock | `/create`, `views/CreateStayForm.tsx`, `create/HouseSteps.tsx` | Fotos werden nicht hochgeladen | ja (lokal) |
| Fill your House | fertig im Mock | `InvitePage` | – | nein |
| Host-Onboarding und Checkliste | fertig im Mock | `/welcome/host`, `onboarding/HostOnboarding.tsx` | – | Mock |
| Bewerbung / Founding Host | fertig im Mock | `/apply`, `platform/HostApply.tsx`, Admin › Bewerbungen | Mails nur im Mock | Mock |
| Host from your place | fertig im Mock | `lib/ownPlaces.ts`, `places/YourPlaces.tsx` | – | Mock-Orte |
| Verwalten (Anfragen, Crew, Zahlungen, Remind) | fertig im Mock | Manage-Reiter, `stay/HouseManageParts.tsx`, `RemindButtons.tsx` | – | Mock |
| Tips from Simpulo (Checkliste aus Admin › Host helfen) | fertig im Mock | `stay/HostHelpChecklist.tsx` | – | Mock |
| House bearbeiten, absagen | fertig im Mock | `/your-houses/[id]/edit`, `store.closeStay` | Erstattung nur im Mock | Mock |
| Auszahlungen | teilweise | `/your-houses/payouts`, `payouts/PayoutSetup.tsx` | Stripe Connect leer | Mock-Ledger |
| Host-Kit | fertig im Mock | `share/HostKit.tsx` | – | nein |
| Host wirbt Host | Platzhalter (gebaut, aus) | `HOST_REFERRAL` | Anteil und Laufzeit offen | ja |

## 5 Konto

| Bereich | Status | Route / Datei | Was fehlt | Platzhalter? |
|---|---|---|---|---|
| Login (Apple, Google, Magic Link, Passkey) | Platzhalter | `auth/AuthSheet.tsx` | Keine echte Anmeldung: man wählt einen Mock-Nutzer | ja |
| Zustimmungen (Terms, 18+, Verhaltenskodex, Versionen) | fertig im Mock | `config/consent.ts`, `consent/Agreements.tsx` | Rechtstexte sind Entwürfe | Entwurf |
| Gast-Onboarding, „Finish your profile“ | fertig im Mock | `/settings/profile?setup=1`, `/welcome/done`, `onboarding/ResumeCard.tsx` | – | Mock |
| Profil, Edit profile | fertig im Mock | `/profile`, `/u/[id]`, `views/EditProfile.tsx` | Fotos nicht hochgeladen | ja |
| Settings (alle Bereiche, Notifications mit Ruhezeiten, Wer darf schreiben) | teilweise | `views/Settings.tsx` | Passkey und Anmelde-Methode zeigen nur „comes soon“ | ja |
| Your data (Export, Pausieren, Löschen mit Sperre) | fertig im Mock | `lib/dataExport.ts`, `lib/accountDeletion.ts` | Wirkt nur im lokalen Store | Mock |
| Benachrichtigungs-Katalog | fertig im Mock | `config/notifications.ts`, `lib/notify` | – (alle 44 mit Auslöser) | – |
| E-Mails | teilweise | `src/emails/*`, `/dev/emails` | Kein Versand (Resend), Abmelde-Link nicht signiert | ja |
| Dark Mode | teilweise | Tokens, Schalter in Settings und Avatar-Menü | Die Seiten sind nicht einzeln angepasst (D1–D3) | – |
| Mehrsprachigkeit | Platzhalter | `i18n/config.ts` (`locales = ["en"]`, `SHOW_LANGUAGE_SETTING = false`) | Zweite Sprache fehlt | vorbereitet |

## 6 Außen

| Bereich | Status | Route / Datei | Was fehlt | Platzhalter? |
|---|---|---|---|---|
| Footer (groß, schlank, keiner) | fertig im Mock | `config/footer.ts`, `layout/FooterByRoute.tsx` | – | nein |
| Host-Seite | fertig im Mock | `/host`, `views/HostPage.tsx` | Rechenbeispiel ist ein gesetzter Wert (`HOST_FEE_EXAMPLE.perGuest`) | ja (Beispielwert) |
| About | teilweise | `/about`, `views/AboutPage.tsx` | Gründer-Abschnitt leer (`FOUNDER`) | ja |
| Ratgeber | fertig im Mock | `/guides`, `/guides/[slug]` (5 Texte) | – | nein |
| Hilfe-Center | fertig im Mock | `/help`, `help/HelpCenter.tsx` (31 Fragen) | – | nein |
| Ideen-Liste | Platzhalter | `/ideas` (`ideasBoard: false`) | Bewusst aus | – |
| Rechtsseiten (Impressum, Privacy, Terms, Cancellation, Cookies, Safety, Community guidelines) | teilweise | `content/legal/*.en.md`, `components/legal/LegalPage.tsx` | **Alle 7 als Entwurf; Impressum-Felder leer** | ja |
| Inhalte melden, Entscheidungen | fertig im Mock | `/report-content`, `/notices` | – | Mock |
| Kontakt | fertig im Mock | `/contact`, `help/ContactForm.tsx` | Nachricht landet nur im lokalen Admin-Store | nein |
| App auf dem Telefon (Web-App) | teilweise | `/get`, `/get/card` | Installationsvideo für iOS leer (keine native App, keine Stores) | ja |
| Leere Zustände | fertig im Mock | `ui/EmptyState` u. a. | – | nein |
| Fehlerseiten, offline | fertig im Mock | `error.tsx` je Bereich, `global-error.tsx`, `states/OfflineBanner.tsx` | – | nein |
| Passwortseite | fertig im Mock | `/preview` | – | nein |
| SEO (Sitemap, Robots, OG, JSON-LD) | teilweise | `sitemap.ts`, OG für House, Stadt, Einladung, Profil | Kein OG-Bild für Sammlungen | nein |
| Statistik ohne Cookies | Platzhalter (vorbereitet, aus) | `config/analytics.ts` (`enabled: false`) | PostHog-Key und Freigabe | – |

## 7 Admin

**Für das ganze Admin gilt:**
- Zugriffsschutz nur in der Oberfläche (`lib/admin/access.ts`); der echte Schutz kommt mit dem Backend.
- Änderungen liegen nur im localStorage (`lib/admin/store.ts`).
- Versand nach außen (Antworten, Nachrichten, Benachrichtigungen) läuft über den Katalog, aber nur im Mock.
- In Produktion sind alle Admin-Sammlungen leer.

| Seite | Status | Datenquelle | Was fehlt | Platzhalter? |
|---|---|---|---|---|
| Übersicht `/admin` (Drill-down, Woche · Monat · Quartal · Jahr) | fertig im Mock | `metrics.ts` | Stündliche Statistik-Function (`getStats`) | Mock-Verlauf |
| Houses `/admin/houses` (Frühwarnung, vier Hebel mit Wirkung, Ergebnis) | fertig im Mock | Daten + `lib/houseHelp.ts` | „Angesehen“ wird nicht gespeichert (gewollt) | Mock |
| Hosts `/admin/hosts` | fertig im Mock | Daten | Follower-Zahlen sind Mock | ja |
| Bewerbungen, Warteliste | fertig im Mock | Admin-Store | Mails nur Mock | Mock |
| Wachstum, Traffic | teilweise | Mock-Ereignisse, `MOCK_TRAFFIC` | Keine Analytics-Anbindung | ja |
| Analyse, Algorithmus, Labore, Vision, Finanzierung | fertig im Mock | Configs + `metrics.ts` | Thesen-Ergebnisse Mock; Finanzierungs-Begründungen offen | teils |
| Posteingang (Sicherheit mit Moderation, Widersprüche, Tickets) | fertig im Mock | Aufgaben + Tickets | Versand nur Mock | Mock |
| Geld › Übersicht | teilweise | Mock-Payouts, Mock-Kontostand | Keine Anbindung an Stripe oder Qonto | ja |
| Geld › Steuern › Buchungsjournal (DATEV-CSV, PDF, Rücklage) | fertig im Mock | Zahlungen der Daten, `config/tax.ts` | Alle Sätze und Konten Platzhalter; Stripe-Gebühren geschätzt | ja |
| Geld › Steuern › Überblick | fertig im Mock | `mock-ledger.ts` | Beleg-Upload Mock; Xero Platzhalter | ja |
| System (Einstellungen, Backlog, Launch-Checkliste, Plattform-Pflichten) | fertig im Mock | Configs + Server-Fakten (`lib/launchChecks.ts`) | Phasenwechsel wirkt nur im eigenen Browser | – |
| Log | teilweise | localStorage | Nicht auf einem Server gespeichert | ja |
| Marketing (Countdown, Pipeline, Partner, Content) | fertig im Mock | `config/marketing.ts` (Launch-Strategie), Mock-Kontakte, -Partner, -Shorts | – | Demo-Daten |

---

## Buchungsablauf: alle Zustände

Datenmodell: `lib/mock.ts`; Logik: `lib/store.tsx`, `lib/joinFlow.ts`, `lib/requests.ts`, `lib/deadlines.ts`.

| Zustand | Datenmodell | Logik | Gast-Oberfläche | Host-Oberfläche | Anmerkung |
|---|---|---|---|---|---|
| angefragt (`pending`) | ja | ja | ja | ja | mit Notiz, Freund, Herkunft, Verhaltenskodex |
| angenommen | ja | ja | ja | ja | – |
| abgelehnt | ja | ja (+ Undo) | ja („Didn't work out“ + ähnliche Houses) | ja | – |
| abgelaufen (72 h) | ja | ja (Fristen, Erinnerungen 24 h / 48 h) | ja | ja | – |
| Zahlung fällig | ja | ja (Erinnerungen 24 h / 44 h) | ja | ja | Zahlung nur Mock |
| Zahlung nach 48 h verfallen | ja (`endedReason: paymentLapsed`) | ja | ja (eigener Hinweis, Direktchat-Zeile, Benachrichtigung) | ja | – |
| bezahlt | ja | ja | ja (Anteil, Beleg) | ja | – |
| Buchung bestätigt | ja | ja (sonst Erstattung nach 48 h) | ja | ja | – |
| storniert durch Gast | ja | ja | ja | ja | – |
| storniert durch Host | ja | ja (volle Erstattung) | ja | ja | – |
| vom Host entfernt | ja (`endedReason: removed`, `endedNote`) | ja | ja (Benachrichtigung mit Grund und 3 ähnlichen Houses, Me-Reiter, Direktchat) | ja (optionaler Grund) | – |
| aus Moderation entfernt | ja | ja | ja | – | Benachrichtigung „decision“ |
| erstattet | ja | ja (Mock) | ja | teilweise | Echte Erstattung fehlt (Stripe) |
| Warteliste, Angebot 24 h | ja | ja | ja | ja | – |
| eingeladen (48 h) | ja | ja | ja | ja | – |
| vorgemerkt (Beta) | ja | ja | ja | teilweise | Für den Host nicht eigens gekennzeichnet |

---

## Abgleich mit den Blöcken 1–9

Der Block-Plan selbst liegt nicht im Repo. Die Teile sind nach Thema zugeordnet, gestützt auf die Hinweise in den Prompts („Plattform-Pflichten = 6d“, „Fristen-Logik = 4b“).

| Block | Teil | Stand | Was fehlt |
|---|---|---|---|
| 1 House-Bereich | Reiter Chat · Crew · Plan · Moments · Me · Manage, Zustand in der URL, Ausgeschiedene | fertig | Reiter im Chat-Kopf selbst (Platz frei) |
| 2a Bogen · Vorher | Absicht, Crew-Seite, Getting there, Practical, Host-Aufgaben | fertig | – |
| 2b Bogen · Ankommen | I'm here, First night (Fragenkarten), House agreement | fertig | – |
| 2c Bogen · Mittendrin | Moment des Tages, Halbzeit, Höhepunkt | fertig | – |
| 2d Bogen · Abschied | Closing circle, Words for the crew | fertig | – |
| 3a Danach · Tag danach | Mit wem wieder, Absicht, Bewertung, Tipp, gegenseitige Wahl | fertig | Server-Function für die gegenseitige Wahl |
| 3b Danach · später | +7 Do it again, +30 Tage, öffentliche Bewertungen | fertig | – |
| 3c Danach · Album | House Memories, Remove me, zwei Zustimmungen | fertig im Mock | Storage, serverseitige Standort-Prüfung, Anreiz aus |
| 4a Abläufe | Join-Ablauf, Ausgeschiedene, mehrere Houses parallel | fertig | Benachrichtigung „vom Host entfernt“ |
| 4b Abläufe · Fristen | Fristen in einer Stelle, Bündeln, Remind von Hand, Zeitreise | fertig im Mock | Server-Job; Stepper-Text 48 h statt 72 h |
| 4c Abläufe · Melden | Melden, Moderation, Widerspruch | fertig im Mock | – |
| 5a Außen · Startseite | Landing für Ausgeloggte | fertig | – |
| 5b Außen · SEO | Stadt-, Themen-, Ratgeber-Seiten | fertig | OG-Bild für Sammlungen |
| 5c Außen · Host und About | `/host`, `/about` | teilweise | Gründer-Abschnitt leer |
| 5d Außen · Hilfe, Fehler | Hilfe-Center, Fehlerseiten, offline | fertig | Kontaktformular (nur mailto) |
| 6a Recht · Rechtsseiten | Aufbau, Versionen, Entwürfe, Build-Prüfung | fertig (Aufbau) | Texte geprüft, Impressum gefüllt |
| 6b Recht · Zustimmungen | Terms, 18+, Verhaltenskodex | fertig im Mock | – |
| 6c Recht · ohne Cookie-Banner | Speicher-Liste, `/cookies`, Statistik ohne Cookies | fertig | Statistik aus (`enabled: false`) |
| 6d Recht · Plattform-Pflichten | Inhalte melden, Begründungen, gewerbliche Hosts, DAC7 | fertig im Mock | Anwaltsprüfung 0 von 5; Kontaktstelle leer |
| 7a Wachstum · Teilen | Teilen-Blatt, Story-Bild, Spots for friends, Herkunft | fertig im Mock | – |
| 7b Wachstum · Hosts | Founding Host, Host-Kit, Host wirbt Host | fertig; Host wirbt Host aus | Werte für Host wirbt Host |
| 7c Wachstum · Netzwerk | `/people`, I'm in for, Nearby, Jahrestag | fertig im Mock | – |
| 7d Wachstum · Programm | Programm-Baukasten für Pro Hosts | fertig im Mock | – |
| 8a Konto · Settings | Your data, Privatsphäre, Benachrichtigungen | fertig im Mock | Passkey/Anmelde-Methode „comes soon“ |
| 8b Konto · Onboarding | Gast und Host, Push-Moment, Wiedereinstieg | fertig im Mock | – |
| 8c Konto · Katalog | 44 Ereignisse, Vorlage, Bündeln, Push ohne Inhalt | fertig im Mock | Versand; 9 Ereignisse ohne Auslöser |
| 8d Konto · Raum-Daten | „About the space“ | fertig im Mock | – |
| 9a Admin · Steuern | Buchungsjournal, DATEV-CSV, PDF, Rücklage | fertig im Mock | Sätze und Konten vom Steuerberater |
| 9b Admin · System | Backlog, Launch-Checkliste, Plattform-Pflichten | fertig im Mock | – |
| 9c Admin · Houses | Frühwarnung mit vier Hebeln und Ergebnis | fertig im Mock | – |

## Einzel-Prompts

| Prompt | Umgesetzt | Fundstelle |
|---|---|---|
| Kopf unter 1100 px (ein Suchfeld, Chip-Reihe) | ja | `layout/header/CompactSearch.tsx`, `.chip-bar` |
| Avatar-Menü mit Dark-mode-Schalter | ja | `layout/header/AvatarMenu.tsx`, `APPEARANCE_IN_MENU` |
| Schalter in Salbei | ja | `ui/Switch.tsx`, `--switch-on` |
| Admin-Seitenleiste ohne Scrollen | ja | `--sidebar-item-h` in `admin-tokens.css` |
| AdminTabs als Kapseln überall | ja | `.adm-cap` in `admin-tokens.css` |
| Kein ⓘ an Tabs | ja | `AdminTab.tooltip` statt ⓘ (`AdminLayout.tsx`) |
| Übersicht mit Drill-down und Woche/Monat/Quartal/Jahr | ja | `DrillChart` in `AdminCharts.tsx`, `?zoom=`, `COMPARE_PERIODS` |
| Tooltips größer | ja | `.tooltip-box` mit `--text-body` (15px) |
| Filter erst bei „Show X houses“ | ja | Entwurf in `explore/FilterSheets.tsx` |
| Spotlight mit Host-Aussparung auf Tablet | ja | `SpotlightCoverflow` ab 744 px |
| Breiten-Test-Skript | ja | `scripts/breiten-test.mjs`, `npm run test:breiten` (hier noch nicht gelaufen) |
| Tablet ab 744 px | ja | `--breakpoint-md 46.5rem`, `config/breakpoints.ts` |
| Marketing mit Kontakten, Partnern, `config/marketing.ts` gefüllt | ja | Kontakte, Partner, Launch-Phasen mit Zielen, Content-Kalender |

## Platzhalter, die Lukas selbst füllen muss

| Was | Wo | Stand |
|---|---|---|
| Impressum: Geschäftsadresse (Straße, Ort, Land), Vertreter, Inhaltlich Verantwortlicher, Kontaktstelle, Sprachen (Register, USt-ID, Datenschutz-E-Mail optional) | `config/company.ts` | Name, E-Mail und Kontaktformular eingetragen; Adresse blockiert den öffentlichen Start |
| Rechtstexte prüfen lassen und `draft: false` setzen | `content/legal/*.en.md` (7 Seiten) | alle Entwurf |
| Plattform-Pflichten als geprüft markieren | `config/obligations.ts` `REVIEWED_BY_LAWYER` | 0 von 5 |
| Gründer-Abschnitt: Foto, Vorname, zwei Sätze, E-Mail | `config/pages.ts` `FOUNDER` | `null` |
| Fotos: 91 der kuratierten Ortsbilder fehlen | `public/destinations/` (`MISSING.md`) | 9 vorhanden |
| Installationsvideo für iOS (Web-App, keine Stores) | `config/app-links.ts` `iosInstallVideo` | leer |
| Werkzeug-Links (Firebase-Projekte, Stripe, Analytics, GitHub-Repo) | `config/app-links.ts` `TOOL_LINKS` | nur allgemeine Startseiten |
| Link zum Launch-Plan | `config/backlog.ts` `LAUNCH_PLAN_URL` | leer |
| Steuern: Rücklage-Sätze, USt an/aus und Sätze, Stripe-Gebühr, DATEV-Berater-/Mandantennummer und Konten, Rücklagenkonto | `config/tax.ts` | Platzhalter |
| Steuerberater-Termine | `config/tax.ts` `TAX_DEADLINES.advisor` | zwei Beispieltermine |
| Host-Fee-Beispiel der Host-Seite | `config/policies.ts` `HOST_FEE_EXAMPLE.perGuest` | 100 (Beispielwert) |
| Host wirbt Host: Anteil, Laufzeit, Einschalten | `config/policies.ts` `HOST_REFERRAL` | `null`, aus |
| Album-Anreiz: Höhe, Einschalten | `config/memories.ts` `MEMORIES_PERK` | `null`, aus |
| Founding Hosts sehen andere? | `config/platform.ts` `foundingHostsSeeOthers` | offen (false) |
| Soziale Tiefe einschalten? | `config/platform.ts` `depthChoiceEnabled` | aus |
| DAC7-Abfrage einschalten | `config/policies.ts` `HOST_TAX_INFO` | aus |
| Statistik (PostHog EU) einschalten, Key setzen | `config/analytics.ts`, `NEXT_PUBLIC_POSTHOG_KEY` | aus |
| Finanzierung: Begründungen der Verteilung, Rundenbeträge | `config/funding.ts` (`ALLOCATION.reason` u. a.) | `null` |
| Vision: Vergleich Börse · Privat · Verkauf | `config/vision.ts` | `null`-Zellen |
| Launch-Datum und Phasen-Ziele | `config/marketing.ts` `LAUNCH_DATE_DEFAULT`, `LAUNCH_PHASES` | gefüllt (3. Mai 2027, einstellbar) |
| Launch-Zeitpunkt prüfen („Opening March 2027“) | `config/platform.ts` `launch` | gesetzt |
| Eigene Social-Profile prüfen (instagram/tiktok/youtube „@simpulo“) | `lib/social.ts` `SOCIAL_LINKS` | ungeprüft |

---

## Top 10 der verbleibenden Lücken

Nach Gewicht. Die Oberfläche ist für Desktop, Tablet und Telefon im Mock weitgehend fertig; die großen Lücken liegen beim Backend und bei Inhalten, die nur Lukas liefern kann.

1. **Datenquelle und Server:** kein Firestore, keine Server-Fristen (Fristen laufen im Browser), Admin nur in der Oberfläche geschützt. In Produktion ist alles leer.
2. **Echtes Geld:** Stripe ist leer (Payment Element, Connect, Erstattungen, Webhooks); im Production-Modus bricht jede Zahlung ab.
3. **Echte Anmeldung:** Apple, Google, Magic Link und Passkey sind eine Mock-Auswahl.
4. **Versand:** E-Mail und Push laufen nur im Mock (`DELIVERY`); alle 44 Katalog-Ereignisse haben inzwischen einen Auslöser.
5. **Recht:** Alle 7 Rechtsseiten sind Entwürfe, das Impressum ist leer, 0 von 5 Plattform-Pflichten sind geprüft. Ein Live-Build bricht deshalb ab (gewollt).
6. **Fotos und Uploads:** House-, Profil- und Album-Fotos bleiben im Browser; 91 Ortsbilder und das Gründerfoto fehlen.
7. **Dark Mode D1–D3:** Das Fundament steht, die Seiten sind nicht einzeln angepasst.
8. **Mobile/iPad-Durchgang und Breiten-Test:** Der Test ist gebaut, aber hier nie gelaufen (kein Bericht); die Launch-Checkliste zeigt ihn offen.
9. **Kleine Ablauf-Lücken:**
   - Der Chat-Kopf hat noch keine Reiter.
   - Sammlungen haben kein OG-Bild.
   - Passkey und Anmelde-Methode zeigen „comes soon“.
10. **Offene Entscheidungen und Werte:** Steuersätze und Konten, Host wirbt Host, Album-Anreiz, Host-Fee-Beispiel, Tiefe ein/aus, Founding Hosts sehen andere, Finanzierungs-Begründungen, Launch-Monat (App sagt „Opening March 2027“, Strategie Mai 2027).

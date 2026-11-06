# MVP-Checkliste (Desktop, Mock-Daten)

Stand: 6. Nov 2026, nach den Phasen 1–6. UI und Mock sind für das MVP vollständig; was ein Backend braucht, steht gesammelt unter „Für Backend“.
Status: ✅ vorhanden · 🟡 teilweise · ❌ fehlt.

## Routen

| Bereich | Routen |
|---|---|
| Öffentlich | `/` (Explore) · `/explore` (`?category=`) · `/house/[slug]` · `/co-living/[city]` (SEO, nur Houses) · `/collections/[slug]` · `/host` · `/how-it-works` · `/faq` · `/about` · `/safety` · `/contact` · `/u/[userId]` · `/invite/[token]` · `/cancellation` · `/impressum` · `/privacy` · `/terms` · `/claim/[token]` · `/demo-login` |
| Eingeloggt | `/your-houses` (`?tab=earnings`) · `/your-houses/[id]` · `/your-houses/[id]/edit` · `/create` · `/messages` · `/messages/[threadId]` · `/notifications` · `/saved` · `/profile` · `/profile/edit` · `/settings` (Hash-Abschnitte) · `/settings/payouts` · `/welcome` |
| Intern | `/admin/growth` · `/admin/houses` · `/admin/houses/new` · `/admin/support` · `/dev/stripe-onboarding` · `/dev/identity-check` · `/dev/emails` (nur dev/demo) · `/api/link-preview` |
| Weiterleitungen | `/houses` → `/your-houses` · `/houses/[id]/manage` → `/your-houses/[id]` · `/houses/[slug]` → `/explore?category=` · `/my-stays…` → `/your-houses…` · `/inbox…` → `/messages…` · `/house/[slug]?invite=` → `/invite/[token]` · `/people` → `/profile` · `/stays/:slug` → `/house/:slug` |
| Fehler | `error.tsx` · `not-found.tsx` |

## Abläufe

**Gast:** Explore ohne Konto → House-Seite → „Request to join“ (Auth-Sheet, danach geht die Anfrage weiter; Geburtsdatum beim ersten Mal, 18+) → Foto-Nachfrage, falls keins → Host nimmt an (Glocke, House-Chat entsteht) → Crew komplett + Unterkunft gewählt → „Pay your share“ (48h) → Quittung → Host bestätigt die Buchung (48h, sonst volle Rückerstattung) → „Add to calendar“ → kurz vor/während des Aufenthalts „Something went wrong“ → danach „Past“, Lived-with bestätigen, „Do it again“.
Nebenwege: Join waitlist (Anfrage → Platz #N → Angebot 24h) · Anfrage zurückziehen · Einladungslink `/invite/[token]` · Einladung aus früherer Crew · House verlassen (vor der Zahlung kostenlos; danach nur per Nachrücker, minus Gebühr, sonst keine Rückerstattung).

**Host:** Open a House (4 Schritte → Ready → Erfolg; Entwurf, löschbar) → Auszahlungskonto (Stripe-Mock) → Anfragen annehmen/ablehnen, Warteliste verwalten → Unterkunft wählen (selbst oder „Decide with crew“) → Zahlungen laufen, Erinnern → Mark as booked (Nachweis, 48h-Frist) → Auszahlung nach dem Check-in (Earnings) → nach dem Aufenthalt „Open again with this crew“. Absagen jederzeit: volle Rückerstattung an alle.

## Fortschritt

- Phase 1 (Mock + Routen): Mock-Zustand bleibt über Reloads (versioniert, „Reset mock data“); Routen vereinheitlicht mit Weiterleitungen; Kategorie-Seiten entfernt; `/co-living/[city]` nur Houses, echter Intro-Text, leerer Zustand; `/people` war bereits eine Weiterleitung, die ungenutzte Personenliste ist entfernt.
- Phase 2 (Gast): Zurückziehen, `/invite/[token]`, Mindestalter 18, „Add to calendar“, „Something went wrong“ → `/admin/support`.
- Phase 3 (Host): Absagen vollständig, Entwürfe löschen in Your houses.
- Phase 4 (Stornoregeln): `config/policies.ts`, `/cancellation` (Entwurf), Kurzfassung im Bezahl-Sheet und auf der House-Seite; der Store folgt den Regeln.
- Phase 5 (Teilen & E-Mail): OG-/X-Bilder, gestaltete E-Mail-Vorlagen mit Vorschau `/dev/emails`.
- Phase 6 (System): Avatar-Menü, Benachrichtigungs-Popover, Datumsauswahl und Reaktions-Menü auf Milchglas; kein Cookie-Banner nötig (Footer-Link „Cookies“); leere Zustände geprüft und ergänzt.

## Prüfliste

### Konto
| Punkt | Status | Anmerkung |
|---|---|---|
| Ansehen ohne Konto | ✅ | Explore, House-Seiten, Profile, Host, How it works öffentlich |
| Auth-Sheet bei Aktion (Google, Apple, Magic Link) | ✅ | Mock; echte Anmeldung siehe „Für Backend“ |
| Aktion nach Login fortsetzen | ✅ | `requireAuth(callback)`; Anfrage-Modal mit eigenem Login-Schritt; „Accept invite“ nimmt nach dem Login an |
| Progressive Profile | ✅ | Geburtsdatum (18+) beim ersten Request; Foto nach der Anfrage; Name + Foto beim Veröffentlichen |
| Avatar-Menü | ✅ | Phase 6: Milchglas (`GlassPanel`) |
| Abmelden | ✅ | |
| Konto löschen | ✅ | Settings › Account, Bestätigung mit „DELETE“ |

### Gast
| Punkt | Status | Anmerkung |
|---|---|---|
| Saved-Seite + synchrones Herz | ✅ | |
| Einladungs-Seite `/invite/[token]` | ✅ | Große Karte, „{Name} invited you · spot held for 47h“, Accept, abgelaufen; alte `?invite=`-Links leiten weiter |
| Request to join | ✅ | |
| Join waitlist | ✅ | Bei vollem House oder wenn alle freien Plätze angefragt sind |
| Abgelehnt/abgelaufen | ✅ | Neutral „Didn't work out“, Past mit 3 ähnlichen Houses, Glocke |
| Zielgruppen-Houses (women only) | ✅ | Ruhiger Hinweis über dem Button; Profil passt nicht → deaktiviert, Angabe fehlt → erlaubt |
| Anfrage zurückziehen | ✅ | Anfrage und Wartelisten-Anfrage, House-Seite und Verwaltungsseite, Popover, Glocke beim Host |
| House verlassen (vor/nach Zahlung) | ✅ | Nach den Stornoregeln |
| Bezahlen | ✅ | `PaySheet` über `lib/payments` (Mock), Karte / Apple Pay / Google Pay, Fehlerfall |
| Quittung | ✅ | Betrag, Datum, ****4242, PDF |
| Rückerstattungs-Status | ✅ | „Refund of €410 on its way · 5–10 days“ mit Grund; „No refund“ beim Ausstieg ohne Nachrücker |
| Stornoregeln | ✅ | `/cancellation` (Entwurf, rechtliche Prüfung offen), Kurzfassung im Bezahl-Sheet und unter dem Ablauf |
| Mindestalter 18 | ✅ | Unter 18 freundliche Absage, nichts wird gesendet |
| Add to calendar | ✅ | .ics auf der Verwaltungsseite nach Buchungsbestätigung |
| Hilfe während des Aufenthalts | ✅ | Kategorien, Text, Foto, Fallnummer, `/admin/support` |

### Host
| Punkt | Status | Anmerkung |
|---|---|---|
| Open a House (4 Schritte, Ready, Erfolg, Entwurf) | ✅ | |
| House bearbeiten | ✅ | `/your-houses/[id]/edit` |
| House absagen | ✅ | Volle Rückerstattung über `lib/payments`, Glocke + Mail-Log an Crew, Wartende, Anfragende, Systemzeilen, Status „Cancelled“ |
| Entwurf löschen | ✅ | Im Flow und in Your houses › DRAFTS („…“ › Delete draft) |
| Anfragen annehmen/ablehnen | ✅ | Verifizierte Gäste oben; „Not a fit“ ohne Grund mit Undo (5s); Ablauf nach 48h mit Countdown |
| Antwortquote | ✅ | Intern: Needs-you-Hinweis unter 70 %, leicht tiefer in der Standardsortierung |
| Warteliste verwalten | ✅ | |
| Mark as booked + 48h-Frist | ✅ | |
| Abstimmung „Decide with crew“ | ✅ | |
| Auszahlungskonto (Stripe-Mock) | ✅ | |
| Earnings-Dashboard | ✅ | Leere Zustände ergänzt (Phase 6) |

### Überall
| Punkt | Status | Anmerkung |
|---|---|---|
| Explore (Spotlight, Grid, Regale, Filter/Lasche) | ✅ | `?category=` als Alias für den Kategorie-Filter |
| House-Seite | ✅ | |
| Profil (fremd/eigen, Preview) | ✅ | |
| Your houses (Übersicht + Verwaltung) | ✅ | `/your-houses`, `/your-houses/[id]` |
| Messages (House-Chats, Direkt, Kontaktdaten-Schutz) | ✅ | `/messages`; Schutz im Browser, serverseitig siehe „Für Backend“ |
| Benachrichtigungen (Popover + Seite) | ✅ | Popover jetzt Milchglas |
| E-Mail-Vorschauen | ✅ | Vorlagen für jedes Ereignis + Magic Link, `/dev/emails` |
| Teilen-Vorschau (OG/X) | ✅ | `/house/[slug]`, `/co-living/[city]`, `/invite/[token]` (allgemein), `/u/[id]` |
| Settings: Account, Profile, Notifications, Privacy, Payouts, Payments, Verification, Blocked users, Delete account | ✅ | |
| Settings: Language & currency | 🟡 | Währung ja; Sprache nur Englisch („More languages soon“) – bewusst für das MVP |
| Verifizierung (freiwillig) | ✅ | |
| Melden/Blockieren | ✅ | |
| Fehlerseiten, Skeletons | ✅ | |
| Leere Zustände | ✅ | Geprüft: Explore gefiltert (`NoHouseYet`), Saved, Your houses, Messages, Notifications (Popover + Seite), Profil („New to Simpulo“, eigene Angebots-Kachel), Requests („No pending requests“), Crew (Host ist immer drin), Waitlist (leer = kein Abschnitt), Stadtseite; ergänzt: Earnings (Auszahlungen, Monate) |
| Impressum / Privacy / Terms | 🟡 | Seiten da; Rechtstexte als Platzhalter markiert (rechtliche Prüfung offen) |
| Cookie-Hinweis | ✅ | Keine nicht-notwendigen Cookies, kein Analytics → kein Banner; Footer-Link „Cookies“ → `/privacy#cookies` |
| Datenzustände (Pre-launch/Launch/Full) | ✅ | Dev-Menü; Zustand bleibt über Reloads, „Reset mock data“ |
| Demo-Modus | ✅ | |
| Mobile | 🟡 | Desktop-first; Mobile folgt separat |

## Für Backend

| Punkt | Status | Anmerkung |
|---|---|---|
| Echte Anmeldung (Google, Apple, Magic Link) | ❌ | Login ist ein Mock-Nutzerwechsel |
| Echte Datenquelle | ❌ | `emptyAdapter` ohne Backend; der Mock lebt im Browser |
| Stripe (Connect Express, Payment Element, Identity) | ❌ | `StripePaymentsAdapter` mit TODO je Methode; Webhooks, Server-Routen, Geheimnisse auf dem Server |
| Versand von E-Mail und Push | ❌ | Vorlagen fertig (`lib/emails`), Versand und Zustell-Einstellungen fehlen |
| Uhr und Regeln auf dem Server | ❌ | Zahlungs- und Wartelisten-Fristen, Ablauf von Anfragen (48h), Antwortquote, Einladungs-Ablauf, Kontaktdaten-Schutz, Profil-Privatsphäre, Stornoregeln laufen im Browser |
| Einladungs-Tokens serverseitig | ❌ | Danach zeigt das OG-Bild von `/invite/[token]` das konkrete House |
| Support-Fälle | ❌ | `/admin/support` liest den Browser-Zustand; Antwort an den Gast in Messages |
| Admin-Zugriffsschutz | ❌ | Nur über Modus/Flag |
| Bewertungen, Kennenlern-Call | ❌ | Laut CLAUDE.md nach dem Launch |

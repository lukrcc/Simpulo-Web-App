# CLAUDE.md – Stand 2. Nov 2026

## Schönheit als Grundprinzip
**Geltungsbereich:** Gilt für die gesamte Marke: Web (Desktop, iPad, Mobile), eine spätere native App, E-Mails, Share-Bilder und Präsentationen. Geräte unterscheiden sich nur im Layout (Spalten, Seitenpanel vs. Bottom-Sheet, Hover vs. Wischen), nie in Material, Farben, Komponenten oder Bewegung.

**Grundsatz:** Simpulo ist eine Consumer-App. Jede Fläche soll sich warm, weich und hochwertig anfühlen – „funktioniert“ reicht nicht. Vorbild: Explore-Spotlight, Apple, Airbnb.

**Regeln:**
1. **Material:** Keine reinweißen Flächen, keine harten Kontraste. Flächen sind warm (bg #F2F0EB, surface #FBFAF7) oder warmes Milchglas (Token `--glass-*`). Panels, Sheets, Popover, Modals und Menüs nutzen das Milchglas.
2. **Farbe:** Schwarz (ink) nur für Text und die EINE Hauptaktion pro Bildschirm. Ausgewählt = Pfirsich #F7D9C8 + orangenes Häkchen/Akzent, nie Schwarz. Orange #F0633A nur für ausgewählt, Hinweise und Live-Status.
3. **Bedienelemente:** nur die gemeinsamen Komponenten `<Chip>`, `<SegmentedControl>`, `<GlassPanel>`, `<IconButton>`, `<Sheet>`. Keine eigenen Varianten pro Seite.
4. **Tiefe statt Linien:** Trennung über Abstand, Fläche und weiche Schatten; keine 1px-Trennlinien zwischen Inhalten (Ausnahme: Kante des Headers).
5. **Bewegung macht Freude, aber nur als Antwort auf Interaktion:** Auswahl bekommt kleines Feedback (Häkchen scale-in, Knopf gleitet, Zahl rollt, Avatar fliegt in den Stapel). Nur transform/opacity, 140–450ms, cubic-bezier(0.32,0.72,0,1). `prefers-reduced-motion` respektieren.
6. **Bilder und Menschen zuerst:** Fotos und Avatare tragen die Seiten, Text ist kurz.
7. **Gleich auf allen Geräten:** Komponenten passen sich im Layout an (Sheet = Seitenpanel am Desktop, Bottom-Sheet auf Touch), behalten aber Material, Farben und Bewegung.

**Pflicht vor jeder UI-Fertigmeldung:** Seite gegen diese 7 Regeln prüfen und Abweichungen nennen.

## Umgebungen
`NEXT_PUBLIC_APP_MODE` = `dev` | `demo` | `production` (`src/lib/appMode.ts`). Nicht gesetzt: `dev` unter `next dev`, sonst `production`.
- dev: Mock-Daten, Dev-Menü sichtbar.
- demo: Mock-Daten fest auf „Full“, kein Dev-Menü, Passwortschutz (siehe „Demo“).
- production: echte Datenquelle (vorerst leerer Adapter `src/lib/data/emptyAdapter.ts` mit derselben Schnittstelle), kein Dev-Menü, kein Mock.
- Datenschnittstelle: Alle Datenzugriffe laufen über `src/lib/data/index.ts` (`getHouses`, `getHouse`, `getDestinations` …), die je nach Modus Mock oder echten Adapter liefert. Keine Komponente importiert Mock-Dateien direkt.

## Datenzustände
Nur in dev, im Dev-Menü: Pre-launch (3 Houses, unlisted) · Launch (15 Houses, Bangkok + Lisbon, gemischte Kategorien, Termine März–Mai 2027, Crew-Stände von „Just opened“ bis „1 spot left“) · Full (100 Houses). Themen-Regale testet man durch Senken der Schwellen in `src/config/explore.ts`.

## Pre-launch-Modus
- Automatisch, solange weniger als `LAUNCH_MIN_HOUSES` (10) veröffentlichte Houses existieren. Ab 10 werden alle unlisted Houses gelistet, Explore zeigt den normalen Aufbau (Spotlight ab `SPOTLIGHT_MIN` = 5, Regale nach den bestehenden Schwellen).
- Houses sind `visibility: "unlisted"`: voll nutzbar über ihren direkten Link (House-Seite, Join, Teilen, Crew), aber nicht auf Explore und nicht in öffentlichen Listen. Der Host sieht auf der House-Seite: „Your House is live via your link. It appears on Explore once Simpulo opens in your city.“
- Explore: kein Spotlight, kein Grid, kein Griff, keine Beispiel-Houses. Bühne mit Ambient-Verlauf (Eyebrow „OPENING MARCH 2027“, Headline display, Text body-lg muted), Eingabe-Karte (Destination, Monats-Chips, E-Mail, Einwilligung + Privacy, primary „Count me in“, Bestätigung inline „You're #N for Lisbon in March.“). Darunter die Reihe „Where do you want to go next“, nur Destinations mit ≥ 3 Interessierten. Host-Block „Open the first House in your city.“ + secondary „Open a House“.
- `DestinationInterest { destinationId, months[], email, consent, createdAt }`: vorerst nur localStorage, speist die Zählungen.

## Demo
- Nur `NEXT_PUBLIC_APP_MODE=demo`. `src/proxy.ts` leitet ohne gültiges Cookie `simpulo_demo` auf `/demo-login` um; richtiges `DEMO_PASSWORD` setzt ein httpOnly-Cookie (30 Tage, signiert, nie das Passwort). Ohne gesetztes Passwort kommt niemand hinein.
- Hinweisband 28px über dem Header (`--band-h`), rechts Link zu `NEXT_PUBLIC_PRODUCTION_URL/host`.
- Join, Zahlung, Messages, Open a House zeigen statt der Aktion einen Toast mit Link (`DemoGuard`, `data-preview-action`).
- Nie indexiert (meta robots, X-Robots-Tag, robots.txt Disallow: /), nie öffentlich verlinkt.

## Destinations
- 100 kuratierte Orte in `src/lib/data/destinations.ts`, immer `approved`. Alles verweist auf `Destination.id`, nie auf Freitext; auch „Somewhere else?“ und das Profil („Next stop“).
- Bild-Konvention: `public/destinations/<slug>.jpg`, Querformat, mind. 1600px breit, keine Personen oder Markenlogos. Existiert die Datei, ist `imageSource` „curated“, sonst „fallback“ (`scripts/sync-destination-images.ts` läuft vor dev und build, fehlende stehen in `MISSING.md`). Keine Bild-URLs aus dem Gedächtnis.
- Fallback-Karte: Stadtname h2 ink + Land small muted auf `--stage-peach`/`--stage-mist`-Verlauf, gleiche Kartenform. Nur in Destination-Suche/„Somewhere else?“-Modal, Profil „Next stop“, /dev/destinations.
- Öffentliche Karten (Reihe, Grid-Füller, /destinations, Pre-launch-Reihe): nur `imageSource` „curated“ oder „pexels“, in dev auch „fallback-dev“ (`hasCardImage`). Die Karte „Somewhere else?“ am Ende der Reihe bleibt im Fallback-Stil, sie ist eine Aktion, kein Ziel.
- Pexels nur für neue, nicht kuratierte Orte: genau eine Suche pro Ort („{name} {country} skyline“, Querformat), URL + Fotograf bleiben gespeichert, nie erneut abfragen; Credit „Photo: {Name} · Pexels“ unten rechts (small, weiß 60 %, verlinkt). API-Key nur serverseitig. Vorerst nur Schnittstelle + Mock (`destinationImages.ts`).
- Karte öffentlich erst mit `status: "approved"` und `interestedCount ≥ DESTINATION_MIN_INTEREST` (3). Kuratierte Orte ab `DESTINATIONS_ALL_FROM_HOUSES` gelisteten Houses auch darunter. Sortierung nach interestedCount.
- „Somewhere else?“ ist Suche, keine Erstellung (`PlaceCombobox`, kein Freitext; 100 + 300 Städte, später Places-API). Hat der gewählte Ort eine Karte: Interesse speichern, Modal schließen, zur Karte scrollen, Ring 2px accent 1.2s (nicht auf der Seite: `/destinations?focus=`). Sonst, neue Orte als `status: "pending"`: Interesse speichern, Bestätigung inline „Saved. Lisbon-style cards appear once 3 people want to go.“, keine sichtbare Karte.
- Pro Nutzer, Ort und Monat nur ein Interesse (`mergeMonths`): eine zweite Auswahl ergänzt neue Monate, zählt die Person aber nicht doppelt. „Change months“ ersetzt sie.
- Übersichtsseite `/destinations` (`/next` leitet um): Titel display „Where do you want to go?“, Untertitel muted, Suchfeld 56px, surface, Radius 28px, gleiche Logik wie „Somewhere else?“, keine „Somewhere else?“-Karte. Kontinent-Chips (All · Southeast Asia · East Asia · Europe · Americas · Africa · Oceania · Middle East; South Asia zählt zu Southeast Asia) und Monats-Chips (nächste 12 Monate, mehrfach). Ohne Filter: Regal YOUR PICKS (entfällt wenn leer), dann ein Regal pro Kontinent mit Eyebrow, Titel und Badge „N places“, nach interestedCount sortiert. Mit Filter: ein Raster, Trefferzahl im Kopf.
- Karte: Meta-Zeile einzeilig mit Ellipsis „14 want to go · Mar–Apr“, Jahr nur außerhalb der nächsten 12 Monate. „I'm interested“ helle Kapsel; nach Klick fliegt der eigene Avatar vom Button in den Stapel (450ms), der Zähler rollt hoch, Button „You're in ✓“ (Häkchen accent); erneuter Klick: Menü „Change months / Remove“. „Host it“ weißer Textlink.
- Dev-Ersatzbilder: nur mit `APP_MODE` „dev“ bekommen Orte ohne eigenes Bild ein Mock-Hausfoto (`imageSource` „fallback-dev“, `mock-destination-images.ts`), nie in demo oder production. Mock-Interesse im Zustand Full: 60 der 100 Orte, 3–20 Personen, gestreute Monate.
- Neue Orte danach `status: "pending"`. Freigabe-Liste `/dev/destinations` (nur dev): Orte mit erreichter Schwelle, „Approve“, „Replace image“, „Hide“.

## Gestaltungsprinzipien
- Ein Fokus pro Bildschirm: wenige Elemente, eins klar hervorgehoben (Vorbild Spotlight, Apple TV, Netflix).
- Hauptliste Open Houses als Grid; zusätzliche Regale nur, wenn genug Houses vorhanden sind (Schwellen in config/explore.ts). Nie dieselben Houses in mehreren Regalen auffüllen.
- Bewegung nur als Antwort auf Interaktion, flüssig (nur transform/opacity), nie Deko-Animation.
- Keine Flip-Karten; Detailansicht entsteht, indem die Karte in die House-Ansicht wächst (Shared-Element-Übergang).
- House-Seite nach Apple-TV-Muster: großes Bild oben mit Titel, Fakten und Join ohne Scrollen; darunter Regale; keine stehende Seitenleiste; schmale Join-Leiste erst nach dem Hero (Abschnitt „House-Seite“).
- Reihenfolge: Spotlight stabil → House-Seite + Übergang → Explore-Regale.

**Leichtigkeit statt Formular – gilt für jede Seite:**
- Keine Trennlinien zwischen Abschnitten; Abstand (`--space-section` zwischen Abschnitten, `--space-inner` innerhalb) trennt.
- Keine harten Rahmen; Felder, Panels und Chat heben sich über Fläche und weichen Schatten ab; erklärender Inhalt liegt frei auf der Fläche.
- Pro Bildschirm ein dominantes Element (Bild, Zitat, Zahl); alles andere eine Stufe leiser (muted, kleiner).
- Inhalte visuell statt als Text: Bilder, Avatare, Stationen/Kacheln, Zitate; Fließtext max. 3 Zeilen am Stück, max. 640px breit.
- Eine Hauptaktion pro Bildschirm; weitere Aktionen secondary oder als Text-Link.
- Keine stehenden Seitenleisten; Aktion als schwebende Leiste, wenn der Hauptbereich aus dem Blick ist.
- Labels klein (small muted) über dem Wert, nie „Label: Wert“ in einer Zeile.
- Vor Fertigmeldung jeder UI-Aufgabe: Seite gegen diese Liste prüfen und Abweichungen nennen.

## Responsive
Desktop-Breiten; Mobile folgt separat (unter md bleiben 16px Rand).
- Ein Container für alle Seiten (`.page-container`, `<Container>`): `min(100% − 2×--page-margin, 1680px)`, Rand clamp(20px, 3vw, 48px). Hintergründe, Header und Footer-Fläche full-bleed, Inhalt immer im Container. Fließtext höchstens 680px, Formulare/Settings höchstens 720px.
- Fließende Tokens statt fester Größen: display clamp(36px, 3.2vw + 8px, 56px), stage clamp(44px, 3.6vw, 64px), h1 clamp(28px, 2vw + 8px, 40px), h2 clamp(22px, 1.2vw + 8px, 28px); h3 und kleiner fest. Abschnittsabstand `--space-section` clamp(56px, 6vw, 96px), innerhalb `--space-inner` clamp(20px, 2vw, 32px). Wo in dieser Datei noch feste Werte für diese Stufen stehen, gelten die Tokens.
- Kartenraster: `.card-grid` mit `--card-min` und `--card-cols`, also `repeat(auto-fill, minmax(…, 1fr))` mit Höchstspaltenzahl, keine festen Breakpoints. Spaltenzahlen im Code immer aus dem Browser messen, nie aus Fensterbreiten ableiten.
- Mehrspaltige Bereiche (House-Seite, Host-Hero, Your houses/Messages, Formulare mit Preview, How it works) brechen unter 1100px auf eine Spalte um (`split:`, `useIsDesktop`).
- Header: unter 1200px Abstände 24px, unter 1000px nur Icons mit Tooltip, „Open a House“ immer sichtbar.
- Keine Elemente mit fester Breite über 100 % des Fensters, kein horizontales Scrollen der Seite.
- **Prüfmatrix, Pflicht vor jeder UI-Fertigmeldung:** Fensterbreiten 1024, 1280, 1440, 1728, 2560px, Höhe 800 und 1100px. Je Breite melden: Spaltenzahl der Raster, ob etwas umbricht, überlappt oder abgeschnitten ist.

## Header (verbindlich, Maße nicht ohne ausdrückliche Anweisung ändern)
- Genau EINE Komponente `<SiteHeader>`, im Root-Layout genau einmal gerendert (über `AppShell`). Auf allen Seiten identisch, ändert sich beim Scrollen nicht. Kein zweiter Zustand, kein Crossfade, keine Icon-Kreis-Nav, keine zweite Zeile.
- Leiste 64px, `position: fixed; top: 0`, `--header-bg` (horizontaler Verlauf #F6E7DD 0 %, #F6F1EB 40 %, #F5EFE8 100 %, je 0.94 Deckkraft, auf allen Seiten) + `backdrop-filter` und `-webkit-backdrop-filter: blur(24px) saturate(1.3)`, volle Breite, über dem Seiteninhalt (nur Dialoge liegen darüber). Inhalt beginnt 16px unter der Leiste (80px) und verschiebt sich nie, auch nicht beim Zustandswechsel der Lasche. Höhe und Inhalt der Leiste ändern sich beim Scrollen nie.
- Lasche, Zustand „nav“ (Standard): hängt mittig aus der Leiste, gleiche Fläche, 6px tief (70px dort), Breite = Nav + 64px. Griff 10px unter dem Nav-Unterstrich, 6px über der Unterkante.
- Lasche, Zustand „filters“: Container-Breite (Kanten des Seiteninhalts), 76px tief (140px dort), konkave Übergänge bleiben. Im unteren Teil Chips 36px (so viele wie passen, letzter Platz „More ▾“), rechts Sort-Kapsel + Filters 36px; gleicher State wie die Zeile im Inhalt (`useExploreFilters`). Ersetzt die frühere sticky Filterleiste.
- Automatisch „filters“, solange Open Houses hinter dem Header liegt: an, wenn die Filterzeile den Header passiert hat (80px), aus, wenn sie wieder 24px unter die offene Lasche kommt (164px) oder das Ende der Liste (letztes Grid-Element, eingestreute Regale zählen dazu) die Lasche erreicht. IntersectionObserver, kein Scroll-Listener. Hook `useNotchState { mode, source: "auto" | "manual" }`.
- Lasche von Hand geöffnet: darunter, über dem Seiteninhalt, eine Scrim-Ebene rgba(34,30,27,0.12) + blur 6px, Stärke aus p, Klick schließt. Der Spotlight bewegt sich nie. Chip-Auswahl in der Lasche: Lasche bleibt offen, Seite scrollt zum Grid, Scrim verschwindet. Automatisch geöffnet (im Open-Houses-Bereich): kein Scrim.
- Griff unten mittig in der Lasche, nur auf Explore. Klick/Tippen schaltet auf der ganzen Seite um; Escape oder Klick außerhalb schließt, außer in Open Houses. Ziehen: Tiefe folgt dem Zeiger (0–60px, Breite proportional), Einrasten offen bei > 50 % oder > 0.4px/ms nach unten, nach oben entsprechend zu; Schwelle 6px. Filterwahl bei manuell offener Lasche scrollt zum Grid und geht in „auto“ über.
- Griff je Eingabegerät, Verhalten überall gleich: Griff ist EIN SVG-Linienzug aus drei Punkten (`NotchGrip`), stroke muted 60 %, 3px, Enden und Ecke rund, nur der mittlere Punkt bewegt sich (180ms ease-out): in Ruhe gerade, Hover zum Öffnen nach unten (y 9), offen + Hover nach oben (y −1). accent-Punkt rechts neben dem Griff. Maus: 32px breit, Trefferfläche 44×20px, Hover nur auf der Trefferfläche, nach 400ms Tooltip „Show categories“ / „Hide categories“. Nur bei aktiven Filtern. Touch (`pointer: coarse`) gleich, nur 40px breit, immer sichtbar, Trefferfläche 64×28px, Ziehen ist die Hauptgeste. Gleiche Logik für die spätere mobile Ansicht.
- Fortschritt p (0 = zu, 1 = offen) ist die einzige Quelle: notchWidth, notchDepth, Inhalt und Griff werden in jedem Frame aus p berechnet, beim Ziehen live, bei Klick und Scroll über dieselbe Animation von p (420ms, cubic-bezier(0.32,0.72,0,1)), keine getrennten Timeouts. Loslassen: p läuft vom aktuellen Wert auf 0 oder 1, gleiche Kurve, Dauer proportional zur Restdistanz, min. 180ms. Reduced motion: ohne Animation.
- Filterinhalt: in einem Container mit `clip-path: path(...)`, exakt derselbe Pfad wie die Form, pro Frame aktualisiert. opacity = clamp((p − 0.6) / 0.4, 0, 1), translateY = (1 − opacity) × −8px, unter p 0.6 pointer-events none. Popover liegen per Portal außerhalb. Griff immer 6px über der aktuellen Unterkante, z-index über dem Hintergrund, unter Popovern; was vom Inhalt den Griff erreichen würde, wird abgeschnitten (6px Abstand zu seiner Mitte), er liegt also nie über einem Chip.
- Leiste und Lasche sind EINE Form (ein path, Parameter notchWidth/notchDepth, ResizeObserver auf Header und Nav), keine zusammengestückelten divs. Rundungen sind echte Kreisbögen, konkav 12px, konvex 16px, in beiden Zuständen gleich; nur Breite und Tiefe animieren. Unter 28px Tiefe werden die Bögen kürzer und treffen sich tangential, die Radien bleiben. Alle Maße auf ganzen Pixeln. Drei Ebenen, keine weitere Fläche: Glas per `clip-path` (einziges `backdrop-filter`), darunter weicher Schatten, darüber die Kante.
- Kante: SVG-Linie rgba(0,0,0,0.08), 1px, `vector-effect: non-scaling-stroke`, 0.5px außerhalb der Form, damit sie exakt auf einer Pixelzeile liegt. Schatten: dieselbe Form schwarz 4 %, blur 8px, 4px tiefer, innen ausgeschnitten.
- Die konkave Laschen-Form gibt es nur an der Header-Nav und an der Host-Lasche der Karten, nirgends sonst.
- Links Logo 22px/700, keine Tagline.
- Mitte Nav, vertikal mittig in den 64px, in jedem Zustand an derselben Stelle, Text 16px/500, Icon 20px, Icon → Text 8px, Punkte 36px auseinander (unter 1200px 14px, 16px, 24px; unter 1000px nur Icons, Wort als Tooltip; „Open a House“ immer sichtbar), aktiv ink + 2px Unterstrich + gefülltes Icon (gleiche Form, `FilledNavIcons.tsx`), inaktiv muted + Umriss-Icon, Wechsel per Crossfade 150ms, keine Farben außer ink/muted. Eingeloggt: Explore · Your houses · Messages (accent-Punkt 6px bei ungelesen). Ausgeloggt: Explore · Host · How it works.
- Rechts (vertikal mittig in den 64px) ausgeloggt: „Log in" 14px/500 + „Open a House" 36px ink 14px/600. Eingeloggt: Glocke 36px (accent-Punkt) + Avatar 36px + „Open a House". Nie Zahlen-Badges im Header.

## Farben
Auf `surface`-Karten wird `--chip-bg` automatisch zu einem warmen Hauch (rgba(34,30,27,.05)), auf Milchglas ist es wieder Weiß 55 %; Felder sind überall `bg-ink/5` ohne Rahmen. Tokens in `globals.css`: ink #221E1B, muted #77706A, bg #F2F0EB, surface #FBFAF7, accent #F0633A, Auswahl `--select-bg` #F7D9C8, Milchglas `--glass-*`, Chips `--chip-bg`/`--chip-bg-hover`. `--line` nur für die Kante des Headers. Text- und Button-Farben immer über die Tokens.

## Schriftskala (verbindlich)
Tokens in `globals.css`, Klassen `text-<name>`. Keine anderen Schriftgrößen: kein `text-[…]`, keine Tailwind-Stufen (`text-sm` …), kein `font-size` außerhalb der Tokens.

| Token | Größe/Gewicht | Einsatz |
|---|---|---|
| `text-display` | clamp(36px, 3.2vw + 8px, 56px)/700, line-height 1.05, letter-spacing −0.035em, `--font-display` | Hero-Headlines (Host, Pre-launch) |
| `text-stage` | clamp(44px, 3.6vw, 64px)/700 (neben der Mittelkarte per Fit stufenweise bis 36px), line-height 1.05, letter-spacing −0.02em, `--font-display` (Telefone `text-stage-sm` 44px) | nur Spotlight-Text (Slogan, Begrüßung) |
| `text-h1` | clamp(28px, 2vw + 8px, 40px)/700, line-height 1.05, letter-spacing −0.03em, `--font-display` | Seitentitel |
| `text-h2` | clamp(22px, 1.2vw + 8px, 28px)/600, line-height 1.15, letter-spacing −0.02em, `--font-display` | Abschnittstitel |
| `text-h3` | 20px/600 | Kartentitel (Grid, Karussell, Spotlight), Kartenüberschriften |
| `text-greeting` | 22px/600 | nur „Hi {Vorname}.“ im Spotlight |
| `text-quote` | 24px/500, line-height 1.4 | nur das Zitat auf der House-Seite |
| `text-body-lg` | 17px/400 | Einleitungstexte |
| `text-body` | 15px/400 | Standard |
| `text-small` | 13px/500 | Meta: Datum, Ort, Preis-Zusatz |
| `text-eyebrow` + `uppercase` | 12px/600, letter-spacing 0.08em | Eyebrows |

`--font-display` ist Inter Tight (600/700) nur für display, stage, h1 und h2; h3 und kleiner bleiben in Inter, das Logo in seiner eigenen Schrift, und keine Überschrift nutzt die Logo-Schrift. Kein `tracking-*` oder `leading-*` neben diesen Tokens. Zweifarbige Überschrift (ink + muted) ist nur für Bühnen-Headlines erlaubt: Spotlight ausgeloggt, Host-Hero, Pre-launch.

Nur für Header und Filterzeile (feste Maße): `text-logo` 22px/700, `text-nav` 14px/500 (Nav und Chips). Ausnahme ohne Tokens: die OG-Bilder (`opengraph-image.tsx`), sie werden serverseitig ohne CSS gerendert. Ein `font-*` neben einem Body-Token überschreibt nur das Gewicht (z. B. Buttons `text-body font-semibold`).

## Explore – Spotlight und Filterleiste
- Über dem Spotlight nur für Ausgeloggte Titel und Untertitel (Maße: Abschnitt „Hero / Spotlight“).
- Aufbau Open Houses: SectionHeader (Eyebrow „ALL HOUSES", Titel, Badge) → Filterzeile → Grid → „Show 24 more".
- Aufbau Explore: Spotlight → Open Houses mit eingestreuten Regalen (nach je 3 Reihen) → Footer. Open Houses ist die einzige Hauptliste, „Show 24 more“ lädt nach. Grid: `repeat(auto-fill, minmax(300px, 1fr))`, gap 24px, höchstens 5 Spalten, Karten 4:5, höchstens 62vh hoch (`HOUSE_GRID`). Erwartet: 1280 → 3, 1440/1512 → 4, ab 1728 → 5. Eine Seite endet immer auf vollen Reihen: bei 3 und 4 Spalten 24 Karten, bei 5 Spalten 25 („Show 25 more“).
- Regale in der Liste: nach je 3 vollen Reihen der tatsächlichen Spaltenzahl, im Browser gemessen (bei 4 Spalten nach 12, 24, 36 … Houses) zuerst Short trips (ab 8 Houses mit ≤ 5 Nächten), dann Where do you want to go next, dann Themen-Regale (ab 300 Houses insgesamt, je Regal ≥ 12 eigene Houses, höchstens 4). Volle Container-Breite mit SectionHeader, `--space-section` oben und unten. Ein im Grid darüber schon sichtbares House erscheint nicht im Regal (Ausnahme: Short trips, wenn es sonst unter 8 fiele); kein House in zwei Regalen.
- Suchmodus: Sobald ein Chip außer „All“ oder ein Filter aktiv ist, sind alle eingestreuten Regale weg; es bleibt das gefilterte Grid, Trefferzahl im Badge („12 houses“). Der Spotlight bleibt. „All“ blendet sie wieder ein.
- Mock-Szenarien (DevSwitcher „Data“): empty 0 · launch 20 · growing 40 · full 100 · huge 600 Houses. Der Spotlight wählt aus diesen Houses, keine eigene Liste.
- Filters-Button überall: `<Chip>`-Fläche, 36px, 14px/600, ink-Text (keine Hauptaktion, also nicht schwarz); bei aktiven Filtern rechts die Zahl als accent-Kreis 18px mit weißer Ziffer.
- `ExploreFilterBar` (ab md): normale, nicht klebende Zeile unter dem SectionHeader, ohne eigenen Hintergrund. Chips 36px 14px/500 (so viele wie passen, letzter Platz „More ▾" mit Popover), rechts Sort-Kapsel + Filters, beide in `<Chip>`-Fläche. Sobald sie unter dem Header verschwindet, übernimmt die Lasche (siehe „Header“). Es ist immer nur einer der beiden Chip-Sätze sichtbar.
- Kein Vorfahre des Inhalts bis zum body darf overflow, transform, filter oder contain tragen; `PageGlow` ist Geschwister des Inhalts, nie Vorfahre.
- Chip-/Filter-Wechsel scrollt den Anfang des Grids 24px unter die offene Lasche (164px); die Lasche bleibt dabei, wie sie ist. `scroll-margin-top` aller Abschnitte auf Explore ist dieselbe Höhe (`--scroll-under-tab`). Chips und Filter wirken nur auf das Grid; der Spotlight bleibt fix.
- Nur auf Explore (und Collections). Host, How it works, App-Seiten: nur der Header. Telefone sowie Stadt-/Vibe-Seiten behalten ihre eigene Chip-Zeile.

## Explore – Abschnitte
- Abschnitte ohne eigene Fläche, transparent, keine Trennlinien, kein Rahmen, kein Schatten. Abstand überall `--space-section`, von der Unterkante der Karten oder des Buttons bis zur Eyebrow; „Show 24 more“ `--space-inner` unter dem Grid. Alle Werte als Konstanten in `EXPLORE_SPACING` (`src/config/explore.ts`).
- SectionHeader: Eyebrow 12px/600 accent, Großbuchstaben, letter-spacing 0.08em (ein bis zwei Wörter, nie gleicher Inhalt wie Untertitel) · Titel h2 · Untertitel body muted · rechts „See all" secondary. Open Houses: Eyebrow „ALL HOUSES", Badge „N houses · N countries" neben dem Titel, kein See all, unten „Show 24 more".
- Abstand SectionHeader → Karussell 32px.
- Überschriften nie in der Logo-Schrift.
- „Where do you want to go next“: Karten 16:10, Breite 560px, Radius und Hover wie die anderen Karten, Foto der Stadt (siehe „Destinations“) mit dem Verlauf der House-Karten. Unten links weiß: Stadtname (h3), darunter bis zu 4 überlappende Avatare 28px + „14 people want to go · Mar–Apr 2027“. Unten rechts: „I'm interested“ als surface-Kapsel 36px + „Host it“ als weißer Textlink. Keine Porträt-Collage, keine weißen Karten. Am Ende der Reihe die Karte „Somewhere else?“ (Fallback-Stil, Plus-Icon) mit Modal.

## Karten
- Genau ein Element trägt Radius 24px, overflow hidden, background surface, Transform und Schatten. Kein border/outline/ring auf Karte oder Kindern; Link-/Button-Wrapper ohne eigenen Hintergrund.
- Hover: Grid-Karten translateY(−12px) scale(1.04); Karussell-Karten nur scale(1.03). Schatten nur bei Hover: 0 16px 40px rgba(0,0,0,0.18).
- Karussell-Scroller: padding 40px oben/unten, 24px seitlich, gleiches negatives margin (Schatten nicht abschneiden). Kartenbreite 360px, gap 24px.
- Share/Herz-Kreise mindestens 12px Abstand zur Host-Lasche.
- Datenmodell: `coverImage` (Hochformat 3:4, Ort/Aktivität passend zur Kategorie) + optional `focalPoint {x,y}`; `host.avatar` nur für den Avatar der Lasche. Keine Porträts als Kartenbild, ausgenommen als letzter Notbehelf bei in der App eröffneten Houses ohne eigenes Foto. Kein Foto doppelt in derselben Reihe.

**Textblock aller House-Karten (Grid, Karussell, Spotlight), unten links, Weiß:**
- Titel 700, letter-spacing −0.01em (h3).
- Zeile 1: Datum · „Stadt, Land“ – small, 85 %. Zeile 2: Preis – body/600, 100 %. Zeile 3: Host-Notiz mit Sprechblase – small, 75 %, eine Zeile mit Ellipsis. Dann Crew-Avatare + Crew-Zeile + Social-Icons.
- Preis nur in der Währung des Betrachters (Profil, sonst Browser; feste Mock-Kurse), Zahlformat nach `navigator.language`: „€450 pp“, „€400–550 pp“, „Price set with crew“. Kein „≈“ auf Karten.
- Verlauf `linear-gradient(to top, rgba(0,0,0,.78) 0%, rgba(0,0,0,.55) 30%, rgba(0,0,0,.2) 55%, rgba(0,0,0,0) 70%)`, text-shadow `0 1px 3px rgba(0,0,0,.35)`.
- Crew-Zeile (`CrewLine`, auch Spotlight und House-Seite): „Just opened · N spots“ · „X of N in“ · „1 spot left“ (accent) · „Crew complete“ (muted). Volle Houses bleiben sichtbar, aber nicht im Spotlight.
- `stay.location { city, country, area }`: `area` nur auf der House-Seite.

## Hero / Spotlight
- Embla Carousel (`SpotlightCoverflow`, ab lg; `embla-carousel-react`, `-autoplay`, `-wheel-gestures`): loop, align center, skipSnaps true, dragFree false, duration 22, containScroll false. Keine eigene Drag-/Wheel-/Animationslogik. Keine 3D-Effekte. Karussell so hoch wie die Mittelkarte, alle Karten auf einer Mittellinie, kein Bodenschatten, full-bleed. Höhe Mittelkarte `--spot-h` clamp(440px, 100vh − Header − 160px, 680px), Breite 3:4. Oberkante `--spot-top` clamp(96px, 100vh − Höhe − 32px, 280px): das Karussell steht so tief wie möglich, 32px Abstand zum Fensterrand, der Platz darüber gehört dem Text. Unterste Karte → Eyebrow „ALL HOUSES“ Abschnitts-Token. Abschnitt und Verlauf beginnen direkt an der Unterkante der Header-Leiste, die Lasche ragt in den Verlauf. Pfeile auf der Mittellinie, 16px vom Fensterrand, über den äußeren Karten.
- 12–20 Houses (Mock 16). Ist die Liste kürzer als 3× die Fensterbreite, wird sie intern wiederholt (Keys `${id}-copy`), damit der Loop nie aus ist. `WheelGesturesPlugin({ forceWheelAxis: "x" })`. Optionen konstant, Plugins per `useMemo`, kein reInit beim Wischen.
- Slides `--spot-w` × `--spot-h` (3:4). Bei „scroll“, „reInit“ und „slideFocus“ direkt per `style` auf dem inneren Element (der Embla-Loop bewegt die Slide selbst), kein React-State pro Frame: im Ruhezustand scale 1 · 0.78 · 0.66, Overlay schwarz 0 · 0.25 · 0.38, dazu translateX, damit der sichtbare Spalt in jedem Frame 20px ist. Dazwischen Fokus-Kurve `f = max(0, 1 − d)³` (d = Abstand zur Mitte): scale `d ≤ 1 ? 0.78 + 0.22·f : 0.78 − 0.12·min(1, d−1)`, Overlay `d ≤ 1 ? 0.25·(1−f) : 0.25 + 0.13·min(1, d−1)`. z-index aus f, die Karte nächst der Mitte liegt oben. Keine CSS-transition auf transform der Slides, kein dauerhaftes will-change.
- Alle Karten zeigen denselben Inhalt an derselben Stelle: Host-Lasche (Avatar, Name, Verified; immer sichtbar, skaliert mit der Karte), Titel, Datum · Ort, Preis, Host-Notiz, Crew/„Just opened“, Social-Icons. Keine inhaltsabhängigen Animationen; die Karte wird nur als Ganzes skaliert und abgedunkelt. Kein Badge, kein Share/Herz im Spotlight.
- Text am Spotlight: position absolute, kein Einfluss auf Höhe oder Position des Karussells. Platz: über den Host-Laschen der Nachbarkarten (mindestens 32px Abstand), neben der Mittelkarte (48px). Er passt sich an (ResizeObserver), sonst steht er über dem Karussell, das als Ganzes nach unten rückt.
- Ausgeloggt: links Slogan (2 Zeilen, ink/muted) + Untertitel, gleicher Platz und gleiche Größenregel wie „Where to next?“, dann Text darunter 15px, sonst zentriert darüber; rechts nichts. Beide Texte liegen über dem Karussell (`z-2`), nur der Link nimmt den Zeiger.
- Eingeloggt, eine Zeile mit gemeinsamer Oberkante. Links, statisch: „Hi {Vorname}.“ `text-greeting` 22px/600 muted, 8px darunter „Where to next?“ `text-stage` ink, stufenweise bis 36px. Rechts rechtsbündig an der Container-Innenkante, max. 340px: Eyebrow Kategorie, 6px darunter Satz aus `SPOTLIGHT_THEME_LINES` `--font-display` 28px/600 ink (stufenweise 24, 20px), 10px darunter Link „10 houses open →“ body/600, Klick setzt den Chip und scrollt zum Grid. Jede der 12 Kategorien hat einen Satz; nur ein House ohne Kategorie bekäme „10 houses open right now.“ + „See houses →“. Nur der rechte Block wechselt, beim Embla-Event „settle“, Crossfade 250ms, bei gleicher Kategorie gar nicht; zwei Zeilen Satz immer reserviert. Passt es nicht daneben: dieselbe Zeile über dem Karussell.
- Klick auf Seitenkarte: `scrollTo`; Klick auf die mittlere öffnet die House-Seite. Pfeile 44px: `<IconButton>` (rgba(210,208,204,.55) + blur(12px) saturate(1.4), kein Rahmen, kein Schatten, Chevron 2.5px #4A4642; Hover rgba(200,197,192,.75); Klick scale .94, 120ms; ohne Loop am Ende opacity 0), Tastatur ← →: `scrollPrev`/`scrollNext`. Eine Geste ab 40px geht mindestens eine Karte weiter (sonst rastet Embla zurück). Autoplay 8s, `stopOnInteraction: true`, `stopOnMouseEnter: true`; nach 20s ohne Interaktion wieder `play()`.
- Mobile (später): dieselbe Komponente mit 1 Karte + angeschnittenen Nachbarn. Bis dahin unter lg `SpotlightHero`.

## Prüfungen
Screenshots, Messungen und Prüfmatrix immer mit Playwright headless (kein sichtbares Browserfenster, kein Dock-Icon). Den dafür nötigen Server nur kurz starten und danach beenden. Nicht das installierte Google Chrome des Nutzers öffnen.

## Hintergrund
- Mitscrollende warme Flecken: `<PageGlow>` (position absolute, inset 0, volle Seitenhöhe, z-index −1, pointer-events none), radiale Verläufe ohne blur-Filter. Nie aus Bildfarben, keine Karte bekommt eigene Farbe, Kartenschatten bleiben neutral.
- Oben: Verlauf im Spotlight/Host-Hero (`StageBand`, `.stage-gradient`, beginnt an der Unterkante der Header-Leiste, Pfirsich links oben, rechts oben ein warmer Gegenfleck `--stage-apricot` #F3E2CC 70 %, etwa halb so stark, `--stage-mist` nur noch 30 % unten Mitte, unten 200px Auslauf). Tokens `--stage-peach` #F7D9C8, `--stage-sand` #F2EBDF, `--stage-mist` #E6E9EE.
- Explore und Host: in jeder Lücke zwischen zwei Abschnitten (`data-glow-section`) ein Fleck 1100×700px, abwechselnd rechter und linker Rand, peach 70 %, zentriert auf die Lücke; Abstand der Flecken höchstens 1200px (längere Abschnitte bekommen zusätzliche). Kein Fleck am Footer. Footer auf allen Seiten sichtbar (außer mobiler Chat). Eltern-Element der Ebene: `body` mit relative + isolate, kein overflow, keine feste Höhe.
- App-Seiten (Your houses, Messages, Settings) nur der obere Fleck, sonst ruhig.
- Abschnitte ohne Hintergrund, transparent, Abstand `--space-section`, Trennung nur über Abstand und SectionHeader. Container-Karten bleiben surface mit weichem Schatten.
- Header (`.milk-glass`): `--header-bg` + `backdrop-filter` UND `-webkit-backdrop-filter: blur(24px) saturate(1.3)`; ohne Support deckend #F6F1EB.

## House-Seite
`/house/[slug]`, `StayDetail` mit `HouseStage` + `HouseSections`. Keine zweispaltige Textspalte, keine stehenden Seitenkarten, keine Bild-Collage.
- Bühne im Container, Radius 24px, Höhe clamp(420px, 60vh, 640px), Cover object-cover, Verlauf von unten links rgba(0,0,0,.72) → transparent bei 60 % (dazu derselbe von unten rechts bis 50 %, damit der Preis auf hellen Fotos lesbar bleibt). Oben links Host-Lasche, oben rechts Herz, Teilen, „…“ als Glas-Kreise 40px. Unten rechts „1 / 6“ + Pfeile über dem Preisblock; Fotowechsel Crossfade 300ms, Swipe/Drag ab 40px. Klick aufs Bild: Vollbild-Galerie (Raster aller Fotos, Escape schließt).
- Unten links weiß, max. 640px: Eyebrow Kategorie, Titel display, „Datum · Nächte · Ort“ body-lg 85 %, Crew-Avatare 32px + `CrewLine`. Unten rechts auf derselben Grundlinie: Preis h2, „You pay only when the crew is complete“ small 75 %, dann „Join this House“ als helle Kapsel 48px (einzige Hauptaktion, jeder Zustand von `StayCta` steht an dieser Stelle) + „Message {Host}“ Glas-Kapsel. Preis nur in Betrachterwährung, ohne Tilde und „≈“; Abrechnungswährung erst im Join-Flow.
- Faktenband 32px darunter: Dates · Crew · Included · Languages, ohne Rahmen, Icon 20px muted, Label small muted über dem Wert body/600. Darunter nur bei Bedarf die Zustandskarten (Anfrage abgelehnt, Einladung, Host-Hinweise, Crew-Gruppe, eigener Anteil, Foto).
- Abschnitte im Abschnitts-Token, keine Linien, Überschrift ist die Eyebrow (`SectionHeader` ohne `title`): WHY I'M HOSTING (Zitat `text-quote` max. 640px, rechts Host-Karte) · THE CREW (Regal, Host zuerst mit Badge, freie Plätze gestrichelt „Your spot“ + Join) · A TYPICAL DAY (Regal, Karten 220px, Radius 20px, Zeit small accent, Aktivität body/600; `typicalDay: {time, label}[]`, sonst `typicalDayOf` aus `dayText`) · WHO I'M LOOKING FOR + HOUSE RULES (zwei gleich hohe Container-Karten, Häkchen accent) · ggf. Host-Angebot · WHERE YOU'LL BE (Karte volle Breite, 420px, Radius 24px, gedämpft per CSS-Filter, Unterkunft als kleine Karte unten links 16px; „Open in Google Maps ↗“ im SectionHeader) · MORE HOUSES LIKE THIS (Karussell, gleiche Kategorie oder Stadt).
- Join-Leiste: erst wenn die Bühne komplett aus dem Fenster ist und der Footer noch nicht sichtbar: schwebende Kapsel unten mittig, 24px über dem Rand, 64px, `--header-bg` + blur, Schatten 0 12px 32px rgba(0,0,0,.12), Thumbnail 40px rund · Titel · Preis · Aktion primary 44px. Einblenden translateY(16px→0) + opacity 300ms.
- Unter 1100px: Preis und Buttons unter dem Titel, Host-Karte unter dem Zitat, die zwei Karten untereinander.

## Privatsphäre Profil
Eine Stelle: `src/lib/profilePrivacy.ts` (`profileViewFor(store, user, viewerId, today)`). Keine Komponente sucht Houses oder Mitbewohner einer Person selbst heraus. Mit echtem Backend gelten dieselben Regeln serverseitig: Was nicht sichtbar sein darf, kommt gar nicht erst im Browser an.
- Gehostete Houses (offen/kommend, nicht `unlisted`): öffentlich.
- Kommende Houses als Gast: nur für Mitglieder derselben Crew, und nur dieses House; für alle anderen nicht gerendert, auch nicht als Zahl.
- Vergangene Houses: öffentlich nur „Lived in N Houses“ + Orte, ohne Datum und ohne House-Titel.
- „Lived with“: nur beidseitig bestätigte Verbindungen (`LivedWith.confirmedAt` in beide Richtungen); bestätigt wird auf dem eigenen Profil.
- Next stop: Wünsche sind kein Reiseplan und dürfen öffentlich sein, aber nur mit `interest.visible` und freigegebener Destination.
- Eigenes Profil zeigt alles; „Preview as others see it“ rendert exakt die fremde Ansicht (Betrachter null) unter dem Band „You're seeing your profile as others do · Exit preview“, nichts darin ändert Daten.

## Profilseite
`/u/[id]` und `/profile`, eine Spalte, keine Tabs, keine Linien, leere Abschnitte fehlen ganz. Kopf ohne Rahmen: Avatar 144px, Name h1, „25 · Sweden · based in Chiang Mai“ body-lg muted, Vertrauensband (Label small muted über Wert body/600, was bei 0 steht, fehlt), Social-Kapseln 36px (Markenicon + Handle, max. 4, dann „+N“), „Speaks …“ small muted, Bio body-lg max. 640px. Rechts oben nie ein gefüllter Button: fremd „Message“ secondary 40px (nur mit gemeinsamem House, offener Anfrage oder offenem House der Person) + Teilen + „…“; eigen „Edit profile“ + „…“ (Preview, Share). Abschnitte: HOSTING NOW (`HOUSE_GRID`; eigen mit „Open another House“, ohne offenes House die Zeile „No open House right now · Open a House →“) · LIVED WITH (Avatare 48px überlappend, Name beim Hover, darunter Orte) · PHOTOS (Masonry, max. 9) · NEXT STOP (Destination-Karten, Fallback-Stil erlaubt) · UPCOMING (mit Schloss, nur Crew/eigen).

## Messaging
`/inbox`, `InboxList` + `ThreadView`. Füllt mit dem `SlimFooter` genau die Fensterhöhe, nur Liste und Chat scrollen.
- Liste: Gruppen HOUSES (aktuelle und kommende), DIRECT, nach letzter Nachricht sortiert; am Ende zugeklappt PAST (House-Chats, deren Enddatum vorbei ist). House-Chats: Cover als abgerundetes Quadrat 48px, unter dem Titel das Datum small muted. Direktchats: Profilbild rund 48px. Ungelesen: Punkt 8px accent, Titel 600.
- Chat-Kopf: Cover 40px, Titel (Link zur House-Seite), „Feb 18–22 · 4 of 5 in“ small muted, Avatar-Stapel öffnet die Mitgliederliste; Crew komplett: secondary „Open group chat ↗“ (Link des Hosts).
- Nachrichten: eigene rechts, Pfirsich `--select-bg` mit ink-Text (Schwarz bleibt der Hauptaktion vorbehalten), ohne Avatar/Namen; fremde links, surface mit ink-Text; aufeinanderfolgende gruppiert (Name/Avatar nur bei der ersten, 4px), Zeit klein in der Bubble. Systemzeilen zentriert, small muted, ohne Bubble. Die Nachrichtenfläche bleibt `bg`, sonst wären fremde Bubbles auf der surface-Karte unsichtbar.
- Eingabe: Senden 40px, deaktiviert `--chip-bg`/muted, aktiv ink mit surface-Pfeil (die Hauptaktion des Chats); Enter sendet, Shift+Enter Zeilenumbruch.
- Kontaktdaten-Schutz (`src/lib/contactFilter.ts`, vorerst nur Frontend/Mock, später auch serverseitig): Telefonnummern, E-Mail-Adressen und Links zu wa.me, t.me, WhatsApp-/Telegram-Gruppen werden beim Senden durch „•••“ ersetzt, darunter small muted „Contact details are shared once the crew is complete.“ Gilt in Direktchats immer und in House-Chats bis Crew-complete; danach keine Filterung im House-Chat, der Gruppen-Link erscheint im Chat-Kopf.

## Übergang Karte → House-Seite
- View Transitions API (`src/lib/houseTransition.ts`): Navigation in `document.startViewTransition`, ohne API oder bei reduced motion normale Navigation. Namen pro House: `house-image-{id}`, `house-title-{id}`, `house-host-{id}`; auf der Karte nur solange sie die geklickte ist, auf der House-Seite immer.
- 450ms cubic-bezier(0.32,0.72,0,1), restliche Seite blendet in 200ms über. Hauptbild der House-Seite ist das Cover, damit dasselbe Bild wächst.
- Zurück (Browser, Escape, Zurück-Button) läuft rückwärts; Scrollposition, Karussell-Reihen und Spotlight-Karte werden wiederhergestellt.

## App-Seiten
- Keine h1-Seitentitel (Messages, Houses, Open a House). Inhalt 32px unter dem Header.
- Container-Karten (Formulare, Chat, Your-houses-Karten): surface, kein Rahmen, Schatten 0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06), Radius 24px, Innenabstand 40px. House-Karten mit Bild sind davon ausgenommen.
- Open a House: erste Zeile „Step X of 9" + Fortschrittsbalken; Preview rechts startet auf Höhe der Schritt-Karte, Eyebrow „PREVIEW", sticky.

## Sheet
Eine Komponente `<Sheet>`. `variant="panel"` (`PanelSheet`) für Filter und künftige Panels (Galerie-Details, Teilnehmerliste): Dialoge wie Anfrage oder Login bleiben zentrierte Modale.
- Maus (`pointer: fine`): schwebend rechts, 24px zu oben, unten und rechts, Breite clamp(440px, 34vw, 560px), Radius 28px, `<GlassPanel>`. Einfahren translateX 360ms cubic-bezier(0.32,0.72,0,1). Seite dahinter blur 16px + Overlay rgba(34,30,27,0.18).
- Touch oder unter 768px: dieselbe Komponente von unten, 85 % hoch, Griff oben; nach unten schließen, nach oben auf volle Höhe.
- Schließen: `<IconButton>` X, Escape, Klick aufs Overlay, Griff (`NotchGrip`, am linken Rand senkrecht): nach rechts ziehen, Einrasten bei > 40 % oder > 0.4px/ms. Fortschritt p wie an der Lasche, Drag und Einrasten aus dem gemeinsamen Hook `useSheetDrag`.
- Kopf (Titel + X) und Fuß fest, nur der Mittelteil scrollt. z-index 70, über Header und Dev-Knopf.

## Filter-Panel
- `<Sheet variant="panel" wide>`: Breite clamp(720px, 52vw, 880px), schwebend mit 24px Rand, `<GlassPanel>`, Radius 28px. Category, When und Language-Feld in `<Chip>`-Stil (Feld `--chip-bg`, kein Rahmen), Length und Spots left als `<SegmentedControl>`. Preis-Histogramm: Balken außerhalb des Bereichs rgba(34,30,27,0.15), innerhalb #F0633A 70 %; Slider-Schiene im Bereich #F0633A, Griffe weiß mit accent-Rand. Einziges ink-Element: „Show N houses“. Abschnittstitel 13px/600 muted.
- Zweispaltig, Abstand 40px: links Category (die 12 Kategorien, Einzelauswahl, erneut klicken hebt auf; derselbe State wie die Chips), When (Monate 2 Reihen à 6); rechts Length, Price per person (Doppel-Slider + Histogramm), Spots left, Language. Kein Sort (Kapsel). Unter 900px Fensterbreite einspaltig mit Scrollen.
- Kopf: „Filters“, daneben live „N houses“ small muted, X. Fuß fest: „Clear all“ tertiary (leert auch die Kategorie), „Show N houses“ primary. Kein Scrollen im Panel ab 800px Fensterhöhe. Der Filters-Button zählt nur die Filter ohne Kategorie. Während das Panel offen ist, bleibt die Seite stehen; nach dem Schließen geht sie zum Grid, wenn sich etwas geändert hat.
- Keine eigene dunkle/futuristische Variante.

## Kategorien
Zwölf (`VIBES`): Fitness · Surf & Water · Remote work · Founder · Creator · Wellness · Adventure · Culture · Party · Holiday · Social · Students. „Short trip“ ist keine Kategorie, sondern der Length-Filter. Ein eigenes Label des Hosts (`customVibe`) zählt zu Social.

## Host-Seite
Reihenfolge: Hero auf dem stärkeren Verlauf, 64px oben/unten (Headline display 48px, Text body-lg, Karte 560px, drei Mini-Punkte) → „Two ways to host" (Share the cost / Add what only you can bring mit 3-Zeilen-Rechnung, gleich gewichtet) → Houses people opened → How it works (3 Karten, Icons statt „€0") → Questions (inkl. „Where does the 10 % go?") → Schlussband auf Pfirsich mit der einen Hauptaktion. „Explore by city and vibe" entfernt. Abstände 96px, keine Linien.

## Sonstiges
- Favicon: Smiley unverändert auf kreisrundem Hintergrund, Ecken transparent (svg + png 32/192/512); apple-touch-icon quadratisch.
- Ein Login-Button (Modal mit „Create an account"), kein separater Sign-up.
- Footer: vier Linkspalten Explore · Hosting · Simpulo · Popular. Popular: bis zu 8 Links, zuerst die Städte mit den meisten Houses („Co-living in Lisbon“ …), dann Vibes („Surf houses“ …). Kein Block „Explore by city and vibe“ mehr. Eigene Fläche `--footer-surface` #EFE9E2, einfarbig, volle Breite, keine Linie (die Fläche trennt), innen 64px oben / 40px unten. Großer Footer nur auf Explore (mit Collections), Host, How it works; alle anderen Seiten `SlimFooter` (`FooterByRoute`): gleiche Fläche, eine Zeile, 72px, small muted, links „© 2026 Simpulo · Impressum · Privacy · Terms“, rechts Social-Icons. Abstand letzter Inhalt → Footer `--space-section`.

## Nicht bauen
Logo-Schrift für Überschriften · CTA mittig im Header · Pfeile in der Chip-Zeile · Zahlen-Badges im Header · Compact-Header/Crossfade · zweite Chip-Zeile · Trennlinien/Verlaufslinien zwischen Abschnitten · Bubble-Hero · futuristisches/dunkles Filter-Panel · Kategorie-Mehrfachauswahl.

## Nach dem Launch prüfen
- Kennenlern-Call (Termin + externer Link, kein eigenes Video).

## Offene Prompts (Reihenfolge)
1. Compact-Chips mit „More"-Popover + Filter-Panel neu
2. Hover-Linie unter Karussell-/„Where do you want to go next"-Karten endgültig prüfen
3. Spotlight: coverImage-Daten + Set-Wechsel
4. Host-Seite neu
5. Favicon
6. Danach weiter wie bisher: Orange Auswahl-Zustände → Share + Anfrage-Karte → Open-a-House-Flow → Your houses Detail → Settings/Edit profile → Profilseite mit Tabs

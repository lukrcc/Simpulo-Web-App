# CLAUDE.md – Stand 2. Nov 2026

## Ein Objekt: das House
Simpulo hat ein einziges Objekt: das House. Keine Ort-Karten, keine Orts-Seiten. Nachfrage ist eine `SavedSearch` aus der Suche auf Explore, der Zeitraum immer genau ein Monat, die Weltkarte gibt es nur auf der Host-Seite.

## Schönheit als Grundprinzip
**Geltungsbereich:** Gilt für die gesamte Marke: Web (Desktop, iPad, Mobile), eine spätere native App, E-Mails, Share-Bilder und Präsentationen. Geräte unterscheiden sich nur im Layout (Spalten, Seitenpanel vs. Bottom-Sheet, Hover vs. Wischen), nie in Material, Farben, Komponenten oder Bewegung.

**Grundsatz:** Simpulo ist eine Consumer-App. Jede Fläche soll sich warm, weich und hochwertig anfühlen – „funktioniert“ reicht nicht. Vorbild: Explore-Spotlight, Apple, Airbnb.

**Regeln:**
1. **Material:** Keine reinweißen Flächen, keine harten Kontraste. Flächen sind warm (bg #F2F0EB, surface #FBFAF7) oder warmes Milchglas (Token `--glass-*`). Panels, Sheets, Popover, Modals und Menüs nutzen das Milchglas.
2. **Farbe:** Schwarz (ink) nur für Text und die EINE Hauptaktion pro Bildschirm. Ausgewählt = Pfirsich #F7D9C8 + orangenes Häkchen/Akzent, nie Schwarz. Orange #F0633A nur für ausgewählt, Hinweise und Live-Status.
3. **Bedienelemente:** nur die gemeinsamen Komponenten `<Chip>`, `<SegmentedControl>`, `<GlassPanel>`, `<IconButton>`, `<Sheet>`. Keine eigenen Varianten pro Seite. Auf Fotos immer `<IconButton variant="onImage">` (rgba(20,18,16,0.28), Hover 0.42, blur(12px) saturate(1.4), kein Rahmen, kein Schatten, Icon weiß 90 %, Strich 2px, Klick scale 0.94); die hellgraue Variante nur auf hellen Flächen (Seite, Panels), nie auf Fotos. Das Herz auf Karten hat keinen Kreis: Icon 24px, Kontur weiß 2px, Füllung rgba(0,0,0,0.18), drop-shadow(0 1px 3px rgba(0,0,0,0.35)), gemerkt Füllung accent mit weißer Kontur und scale 1→1.2→1 in 220ms, Trefferfläche 40px. Kategorie-Navigation (Header-Lasche, Filterzeile) als Text-Chips `<Chip variant="text">` mit gleitendem Pfirsich-Indikator (`ChipIndicator`); Kapsel-Chips nur in Panels und Popovers.
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
- Datenschnittstelle: Alle Datenzugriffe laufen über `src/lib/data/index.ts` (`getHouses`, `getHouse`, `getSavedSearches` …), die je nach Modus Mock oder echten Adapter liefert. Keine Komponente importiert Mock-Dateien direkt.

## Datenzustände
Nur in dev, im Dev-Menü: Pre-launch (3 Houses, unlisted) · Launch (15 Houses, Bangkok + Lisbon, gemischte Kategorien, Termine März–Mai 2027, Crew-Stände von „Just opened“ bis „1 spot left“) · Full (100 Houses). Themen-Regale testet man durch Senken der Schwellen in `src/config/explore.ts`.

## Pre-launch-Modus
- Automatisch, solange weniger als `LAUNCH_MIN_HOUSES` (10) veröffentlichte Houses existieren. Ab 10 werden alle unlisted Houses gelistet, Explore zeigt den normalen Aufbau (Spotlight ab `SPOTLIGHT_MIN` = 5, Regale nach den bestehenden Schwellen).
- Houses sind `visibility: "unlisted"`: voll nutzbar über ihren direkten Link (House-Seite, Join, Teilen, Crew), aber nicht auf Explore und nicht in öffentlichen Listen. Der Host sieht auf der House-Seite: „Your House is live via your link. It appears on Explore once Simpulo opens in your city.“
- Explore: kein Spotlight, kein Grid, kein Griff, keine Beispiel-Houses. Bühne mit Slogan (`ExplorePrelaunch`, Eyebrow „OPENING MARCH 2027“, Headline display, Text body-lg muted), darunter Where?/When? und dieselbe Logik wie „Leeres Ergebnis“ (`NoHouseYet`: Open the first House / Notify me).

## Demo
- Nur `NEXT_PUBLIC_APP_MODE=demo`. `src/proxy.ts` leitet ohne gültiges Cookie `simpulo_demo` auf `/demo-login` um; richtiges `DEMO_PASSWORD` setzt ein httpOnly-Cookie (30 Tage, signiert, nie das Passwort). Ohne gesetztes Passwort kommt niemand hinein.
- Hinweisband 28px über dem Header (`--band-h`), rechts Link zu `NEXT_PUBLIC_PRODUCTION_URL/host`.
- Join, Zahlung, Messages, Open a House zeigen statt der Aktion einen Toast mit Link (`DemoGuard`, `data-preview-action`).
- Nie indexiert (meta robots, X-Robots-Tag, robots.txt Disallow: /), nie öffentlich verlinkt.

## Orte
- 100 kuratierte Städte in `src/lib/data/destinations.ts`, dazu 300 in `moreCities.ts`, Regionen und Länder in `data/places.ts`: nur Datenquelle für die Ortssuche und die Host-Karte. Es gibt keine Ort-Karten, -Kacheln, -Regale oder -Seiten.
- Bild-Konvention: `public/destinations/<slug>.jpg`, Querformat, mind. 1600px breit, keine Personen oder Markenlogos (`scripts/sync-destination-images.ts` läuft vor dev und build, fehlende stehen in `MISSING.md`). Keine Bild-URLs aus dem Gedächtnis. Sichtbar nur als kleines Vorschaubild in der Ortssuche.
- Ortssuche (`PlaceCombobox`, `lib/data/placeProvider.ts`, vorbereitet Google Places Autocomplete und GeoNames): Treffer Stadt, Region oder Land. Kein Freitext als Ort. Vor der Eingabe die Städte mit den meisten Houses.

## Suche auf Explore
- In der Filterzeile und der Lasche links vor den Kategorien, im Filter-Panel oben: „Where?“ (`PlaceField`) und „When?“ (`MonthField`, ein Monat der nächsten 12, Standard „Any month“; in jeder Monatsauswahl nur Monatsnamen, die Jahreszahl nur als kleines Label vor dem ersten Monat eines neuen Jahres: „2027 Jan“). Kompakte Glas-Kapseln 36px, mit Wert Pfirsich. URL: `?place=<id>&month=YYYY-MM`.
- Ort filtert im Umkreis (`stayInPlace`): Stadt 50km, Region ihr Gebiet (Mittelpunkt + Radius), Land und Weltregion das ganze Gebiet.
- Leeres Ergebnis bei gesetztem Ort und/oder Monat (`NoHouseYet`), zentriert statt Grid: Titel h2 „No House in {Ort} in {Monat} yet.“, primary „Open the first House“ (Open a House mit Ort, Monat, Kategorie vorbelegt, `createHrefOf`), darunter tertiary „Notify me when one opens“. Bestätigung inline: „Done. You'll be the first to know – 48h before everyone else.“ Darunter „Houses nearby or in other months“ (max. 4 House-Karten, `housesNearby`), falls vorhanden.
- Bei Treffern mit gesetztem Ort unten eine schlichte Zeile (`NotifyLine`): „Not quite it? Notify me about new Houses in {Ort} →“.
- Ausgeloggt fragt ein kleines Sheet nach E-Mail + Einwilligung bzw. Login (`useSaveSearch`).

## Nachfrage: SavedSearch
`SavedSearch { place: {id, name, country, lat, lng} | null, month: "YYYY-MM" | null, category | null, userId | email, consent, createdAt, notifiedAt }` (`lib/savedSearches.ts`, im Store, gespeicherte Suchen auch in localStorage). Was eine Suche offen lässt, gilt als alles. Dieselbe Suche derselben Person zählt einmal.
- Open a House, Schritte Ort und Termin (`SearchDemandHint`): „N people searched for {Ort} in {Monat}. They'll be notified when you publish.“, gleiche Stadt/Region, gleicher Monat, nur noch nicht benachrichtigte, nur Suchen mit Ort.
- Beim Veröffentlichen (`announceToSearches`): alle passenden Suchen ohne `notifiedAt` hören zuerst davon (Glocke + Systemzeile im eigenen `updates`-Chat; E-Mail später übers Backend), `notifiedAt` wird gesetzt, jede Suche nur einmal. 48h-Vorrang (`SEARCH_HEAD_START_HOURS`): eigener Token-Link (`HouseInvite { priority, invitedUserId }`), `Stay.priorityUntil`, so lange sehen nur sie das House auf Explore (`inHeadStart`, `hasHeadStart`). Vorrang-Tokens halten keinen Platz, bis sie eingelöst sind; wer zuerst einlöst, ist drin. Der Host sieht sie nicht unter seinen Einladungen.
- Host-Seite, Abschnitt „WHERE PEOPLE ARE LOOKING“ (`HostSearchMap`, `host/WorldMap`): volle Container-Breite, Höhe clamp(360px, 48vh, 520px), `<GlassPanel>`, Natural Earth ohne Antarktis (`scripts/generate-world-map.ts`), Land rgba(34,30,27,0.07), keine Grenzen und Beschriftungen. Kreise = gespeicherte Suchen (Ring 2px accent, Füllung accent 15 %, Größe nach Wurzel der Personen, Zahl), nur Orte mit ≥ `MAP_MIN_PEOPLE`. Clustering (`lib/worldMapMarkers.ts`, supercluster): Weltansicht je Region ein Kreis, ab Zoom 1.15 Städte und Cluster, nichts überlappt. Zoom: Klick auf Region/Cluster, Ctrl/⌘ + Scroll, Pinch; ziehen verschiebt; „Reset view“ oben rechts (`<IconButton>`). Am engsten Zoom öffnet ein Cluster eine Liste. Klick auf einen Ort: Popover „N people · {Monate}“ + „Open a House here“. SVG, nur transform, reduced motion ohne Animation. Keine Karte auf Explore.

## Gestaltungsprinzipien
- Ein Fokus pro Bildschirm: wenige Elemente, eins klar hervorgehoben (Vorbild Spotlight, Apple TV, Netflix).
- Hauptliste Open Houses als Grid; zusätzliche Regale nur, wenn genug Houses vorhanden sind (Schwellen in config/explore.ts). Nie dieselben Houses in mehreren Regalen auffüllen.
- Bewegung nur als Antwort auf Interaktion, flüssig (nur transform/opacity), nie Deko-Animation.
- Keine Flip-Karten; Karte → House-Seite ist ein normaler Seitenwechsel mit kurzem Fade.
- House-Seite: große klebende Karte links, Inhaltsspalte rechts (Abschnitt „House-Seite“).
- Reihenfolge: Spotlight stabil → House-Seite → Explore-Regale.

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
- Genau EINE Komponente `<SiteHeader>`, im Root-Layout genau einmal gerendert (über `AppShell`). Auf allen Seiten identisch (einzige Ausnahme: Fokus-Modus von Open a House), ändert sich beim Scrollen nicht. Kein zweiter Zustand, kein Crossfade, keine Icon-Kreis-Nav, keine zweite Zeile.
- Leiste 64px, `position: fixed; top: 0`, `--header-bg` (horizontaler Verlauf #F6E7DD 0 %, #F6F1EB 40 %, #F5EFE8 100 %, je 0.94 Deckkraft, auf allen Seiten) + `backdrop-filter` und `-webkit-backdrop-filter: blur(24px) saturate(1.3)`, volle Breite, über dem Seiteninhalt (nur Dialoge liegen darüber). Inhalt beginnt 16px unter der Leiste (80px) und verschiebt sich nie, auch nicht beim Zustandswechsel der Lasche. Höhe und Inhalt der Leiste ändern sich beim Scrollen nie.
- Lasche, Zustand „nav“ (Standard): hängt mittig aus der Leiste, gleiche Fläche, 6px tief (70px dort), Breite = Nav + 64px. Griff 10px unter dem Nav-Unterstrich, 6px über der Unterkante.
- Lasche, Zustand „filters“: Container-Breite (Kanten des Seiteninhalts), 76px tief (140px dort), konkave Übergänge bleiben. Im unteren Teil Text-Chips 36px (so viele wie passen, letzter Platz „More ▾“), rechts Sortierung als Text-Chip + Filters-Kapsel 36px; gleicher State wie die Zeile im Inhalt (`useExploreFilters`). Ersetzt die frühere sticky Filterleiste.
- Lasche, Zustand „panel“ (nur Maus, ab 768px): kompletter Filter, Container-Breite, so tief wie der Inhalt, höchstens bis 80vh. Fortschritt p läuft dafür von 1 bis 2, die Chip-Zeile blendet aus, das Panel ein (siehe „Filter-Panel“).
- Automatisch „filters“, solange Open Houses hinter dem Header liegt: an, wenn die Filterzeile den Header passiert hat (80px), aus, wenn sie wieder 24px unter die offene Lasche kommt (164px) oder das Ende der Liste (letztes Grid-Element, eingestreute Regale zählen dazu) die Lasche erreicht. IntersectionObserver, kein Scroll-Listener. Hook `useNotchState { mode, source: "auto" | "manual" }`.
- Lasche von Hand geöffnet: darunter, über dem Seiteninhalt, eine Scrim-Ebene rgba(34,30,27,0.12) + blur 6px, Stärke aus p, Klick schließt. Der Spotlight bewegt sich nie. Chip-Auswahl in der Lasche: Lasche bleibt offen, Seite scrollt zum Grid, Scrim verschwindet. Automatisch geöffnet (im Open-Houses-Bereich): kein Scrim.
- Griff unten mittig in der Lasche, nur auf Explore. Klick/Tippen schaltet auf der ganzen Seite um; Escape oder Klick außerhalb schließt, außer in Open Houses. Ziehen: Tiefe folgt dem Zeiger (0–60px, Breite proportional), Einrasten offen bei > 50 % oder > 0.4px/ms nach unten, nach oben entsprechend zu; Schwelle 6px. Filterwahl bei manuell offener Lasche scrollt zum Grid und geht in „auto“ über.
- Griff je Eingabegerät, Verhalten überall gleich: Griff ist EIN SVG-Linienzug aus drei Punkten (`NotchGrip`), stroke muted 60 %, 3px, Enden und Ecke rund, nur der mittlere Punkt bewegt sich (180ms ease-out): in Ruhe gerade, Hover zum Öffnen nach unten (y 9), offen + Hover nach oben (y −1). accent-Punkt rechts neben dem Griff. Maus: 32px breit, Trefferfläche 44×20px, Hover nur auf der Trefferfläche, nach 400ms Tooltip „Show categories“ / „Hide categories“. Nur bei aktiven Filtern. Touch (`pointer: coarse`) gleich, nur 40px breit, immer sichtbar, Trefferfläche 64×28px, Ziehen ist die Hauptgeste. Gleiche Logik für die spätere mobile Ansicht.
- Fortschritt p (0 = zu, 1 = Chip-Zeile, 2 = Panel) ist die einzige Quelle: notchWidth, notchDepth, Inhalt und Griff werden in jedem Frame aus p berechnet, beim Ziehen live, bei Klick und Scroll über dieselbe Animation von p (420ms, cubic-bezier(0.32,0.72,0,1)), keine getrennten Timeouts. Loslassen: p läuft vom aktuellen Wert auf 0 oder 1, gleiche Kurve, Dauer proportional zur Restdistanz, min. 180ms. Reduced motion: ohne Animation.
- Filterinhalt: in einem Container mit `clip-path: path(...)`, exakt derselbe Pfad wie die Form, pro Frame aktualisiert. opacity = clamp((p − 0.6) / 0.4, 0, 1), translateY = (1 − opacity) × −8px, unter p 0.6 pointer-events none. Popover liegen per Portal außerhalb. Griff immer 6px über der aktuellen Unterkante, z-index über dem Hintergrund, unter Popovern; was vom Inhalt den Griff erreichen würde, wird abgeschnitten (6px Abstand zu seiner Mitte), er liegt also nie über einem Chip.
- Leiste und Lasche sind EINE Form (ein path, Parameter notchWidth/notchDepth, ResizeObserver auf Header und Nav), keine zusammengestückelten divs. Rundungen sind echte Kreisbögen, konkav 12px, konvex 16px, in beiden Zuständen gleich; nur Breite und Tiefe animieren. Unter 28px Tiefe werden die Bögen kürzer und treffen sich tangential, die Radien bleiben. Alle Maße auf ganzen Pixeln. Drei Ebenen, keine weitere Fläche: Glas per `clip-path` (einziges `backdrop-filter`), darunter weicher Schatten, darüber die Kante.
- Kante: SVG-Linie rgba(0,0,0,0.08), 1px, `vector-effect: non-scaling-stroke`, 0.5px außerhalb der Form, damit sie exakt auf einer Pixelzeile liegt. Schatten: dieselbe Form schwarz 4 %, blur 8px, 4px tiefer, innen ausgeschnitten.
- Die konkave Laschen-Form gibt es nur an der Header-Nav und an der Host-Lasche der Karten, nirgends sonst.
- Links Logo 22px/700, keine Tagline.
- Mitte Nav, vertikal mittig in den 64px, in jedem Zustand an derselben Stelle, Text 16px/500, Icon 20px, Icon → Text 8px, Punkte 36px auseinander (unter 1200px 14px, 16px, 24px; unter 1000px nur Icons, Wort als Tooltip; „Open a House“ immer sichtbar), aktiv ink + 2px Unterstrich + gefülltes Icon (gleiche Form, `FilledNavIcons.tsx`), inaktiv muted + Umriss-Icon, Wechsel per Crossfade 150ms, keine Farben außer ink/muted. Eingeloggt: Explore · Your houses · Messages (accent-Punkt 6px bei ungelesen). Ausgeloggt: Explore · Host · How it works. Die Lasche folgt der Breite der Nav.
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
| `text-quote` | 22px/500, line-height 1.4 | nur das Zitat auf der House-Seite |
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
- Regale in der Liste (`planShelves`): nach je 3 vollen Reihen der tatsächlichen Spaltenzahl, im Browser gemessen (bei 4 Spalten nach 12, 24, 36 … Houses). Unter `THEME_SHELVES_MIN_TOTAL` (300) Zustands-Regale im Wechsel: Starting soon (Start ≤ 30 Tage, freier Platz) · Last spot (genau 1 Platz frei) · Just opened (≤ 7 Tage alt, nur der Host drin) · Short trips (≤ 5 Nächte), je ≥ 6 eigene Houses (`STATE_SHELF_MIN`), sonst ist das nächste dran. Ab 300 Houses: Short trips, dann Themen-Regale (je ≥ 12 eigene Houses, höchstens 4). Volle Container-Breite mit SectionHeader, `--space-section` oben und unten. Ein Regal enthält kein House aus dem Grid darüber und aus den 3 Reihen direkt darunter; kein House in zwei Regalen.
- Suchmodus: Sobald ein Chip außer „All“ oder ein Filter aktiv ist, sind alle eingestreuten Regale weg; es bleibt das gefilterte Grid, Trefferzahl im Badge („12 houses“). Der Spotlight bleibt. „All“ blendet sie wieder ein.
- Mock-Szenarien (DevSwitcher „Data“): empty 0 · launch 20 · growing 40 · full 100 · huge 600 Houses. Der Spotlight wählt aus diesen Houses, keine eigene Liste.
- Filters-Button überall: Kapsel wie Where?/When?, Glas rgba(255,255,255,0.6) + blur, 36px, Icon + 15px/600 ink (keine Hauptaktion, also nicht schwarz); bei aktiven Filtern rechts die Zahl als accent-Kreis 18px mit weißer Ziffer.
- `ExploreFilterBar` (ab md): normale, nicht klebende Zeile unter dem SectionHeader, ohne eigenen Hintergrund. Text-Chips `<Chip variant="text">`: 36px, 15px/500 muted, 0 14px, Abstand 4px, Hover ink + rgba(255,255,255,0.45); gewählt ink 600 ohne Häkchen auf der einen Pfirsich-Kapsel, die in 240ms cubic-bezier(0.32,0.72,0,1) zur neuen Kategorie gleitet (`ChipIndicator`). Direkt nach Where?/When? der Schalter „Short trips“ in deren Kapsel (setzt Length ≤ 5 nights, an = Pfirsich mit ✕). Letzter Platz „More ▾" mit Popover (Kapsel-Chips), rechts Sortierung als Text-Chip mit Chevron + Filters. Sobald sie unter dem Header verschwindet, übernimmt die Lasche (siehe „Header“). Es ist immer nur einer der beiden Chip-Sätze sichtbar.
- Kein Vorfahre des Inhalts bis zum body darf overflow, transform, filter oder contain tragen; `PageGlow` ist Geschwister des Inhalts, nie Vorfahre.
- Chip-/Filter-Wechsel scrollt den Anfang des Grids 24px unter die offene Lasche (164px); die Lasche bleibt dabei, wie sie ist. `scroll-margin-top` aller Abschnitte auf Explore ist dieselbe Höhe (`--scroll-under-tab`). Chips und Filter wirken nur auf das Grid; der Spotlight bleibt fix.
- Nur auf Explore (und Collections). Host, How it works, App-Seiten: nur der Header. Telefone sowie Stadt-/Vibe-Seiten behalten ihre eigene Chip-Zeile.

## Explore – Abschnitte
- Abschnitte ohne eigene Fläche, transparent, keine Trennlinien, kein Rahmen, kein Schatten. Abstand überall `--space-section`, von der Unterkante der Karten oder des Buttons bis zur Eyebrow; „Show 24 more“ `--space-inner` unter dem Grid. Alle Werte als Konstanten in `EXPLORE_SPACING` (`src/config/explore.ts`).
- SectionHeader: Eyebrow 12px/600 accent, Großbuchstaben, letter-spacing 0.08em (ein bis zwei Wörter, nie gleicher Inhalt wie Untertitel) · Titel h2 · Untertitel body muted · rechts „See all" secondary. Open Houses: Eyebrow „ALL HOUSES", Badge „N houses · N countries" neben dem Titel, kein See all, unten „Show 24 more".
- Abstand SectionHeader → Karussell 32px.
- Überschriften nie in der Logo-Schrift.

## Karten
- Genau ein Element trägt Radius 24px, overflow hidden, background surface, Transform und Schatten. Kein border/outline/ring auf Karte oder Kindern; Link-/Button-Wrapper ohne eigenen Hintergrund.
- Hover: Grid-Karten translateY(−12px) scale(1.04), Schatten 0 16px 40px rgba(0,0,0,0.18). Regal-Karten nur scale(1.03), Schatten wie 0 16px 40px rgba(0,0,0,0.14) (wegen der Lasche als `drop-shadow(0 16px 20px …)`: dessen Unschärfe zählt doppelt). Schatten nur bei Hover.
- Alle horizontalen Reihen nutzen `<Shelf>`; keine eigenen Karussells. Embla (align start, dragFree, containScroll trimSnaps, `WheelGesturesPlugin`). Viewport, Track und Slides transparent, ohne Hintergrund, Rahmen, Schatten, filter oder backdrop-filter. Viewport padding 48px oben, 64px unten mit gleichem negativem margin (der Schatten braucht unten 16 + 40px + scale), nur der Track nimmt den Zeiger. Start bündig mit der Container-Kante, nach rechts bis zum Fensterrand, am Ende der Reihe wieder auf der Container-Kante. Pfeile `<IconButton variant="onImage">` mittig zu den Karten, 16px vom Fensterrand, nur wenn in die Richtung scrollbar. Kartenbreite 360px, gap 24px.
- Trefferfläche des Herzens mindestens 12px Abstand zur Host-Lasche; kein Share-Button auf Karten. Foto-Pfeile der Karte `onImage`, 32px, nur bei Hover.
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
- Klick auf Seitenkarte: `scrollTo`; Klick auf die mittlere öffnet die House-Seite. Pfeile 44px: `<IconButton variant="onImage">` (Klick scale .94, 120ms; ohne Loop am Ende opacity 0), Tastatur ← →: `scrollPrev`/`scrollNext`. Eine Geste ab 40px geht mindestens eine Karte weiter (sonst rastet Embla zurück). Autoplay 8s, `stopOnInteraction: true`, `stopOnMouseEnter: true`; nach 20s ohne Interaktion wieder `play()`.
- Mobile (später): dieselbe Komponente mit 1 Karte + angeschnittenen Nachbarn. Bis dahin unter lg `SpotlightHero`.

## Prüfungen
Screenshots, Messungen und Prüfmatrix immer mit Playwright headless (kein sichtbares Browserfenster, kein Dock-Icon). Den dafür nötigen Server nur kurz starten und danach beenden. Nicht das installierte Google Chrome des Nutzers öffnen.

## Hintergrund
- Mitscrollende warme Flecken: `<PageGlow>` (position absolute, inset 0, volle Seitenhöhe, z-index −1, pointer-events none), radiale Verläufe ohne blur-Filter. Nie aus Bildfarben, keine Karte bekommt eigene Farbe, Kartenschatten bleiben neutral.
- Oben: Verlauf im Spotlight/Host-Hero (`StageBand`, `.stage-gradient`, beginnt an der Unterkante der Header-Leiste, Pfirsich links oben, rechts oben ein warmer Gegenfleck `--stage-apricot` #F3E2CC 70 %, etwa halb so stark, `--stage-mist` nur noch 30 % unten Mitte, unten 200px Auslauf). Tokens `--stage-peach` #F7D9C8, `--stage-sand` #F2EBDF, `--stage-mist` #E6E9EE.
- Explore und Host: in jeder Lücke zwischen zwei Abschnitten (`data-glow-section`) ein Fleck 1100×700px, abwechselnd rechter und linker Rand, peach 70 %, zentriert auf die Lücke; Abstand der Flecken höchstens 1200px (längere Abschnitte bekommen zusätzliche). Kein Fleck am Footer. Footer auf allen Seiten sichtbar (außer mobiler Chat und Open a House). Eltern-Element der Ebene: `body` mit relative + isolate, kein overflow, keine feste Höhe.
- App-Seiten (Your houses, Messages, Settings) nur der obere Fleck, sonst ruhig.
- Abschnitte ohne Hintergrund, transparent, Abstand `--space-section`, Trennung nur über Abstand und SectionHeader. Container-Karten bleiben surface mit weichem Schatten.
- Header (`.milk-glass`): `--header-bg` + `backdrop-filter` UND `-webkit-backdrop-filter: blur(24px) saturate(1.3)`; ohne Support deckend #F6F1EB.

## House-Seite
`/house/[slug]`, `StayDetail` mit `HouseCard` (`stay/HouseCard.tsx`), `HouseSummary` und den Abschnitten aus `stay/HouseSections.tsx`. Keine Bühne, keine Karten um Textabschnitte, keine Trennlinien.
- Ab 1100px zwei Spalten im Container: links 42 %, höchstens 600px, rechts 1fr, gap 64px. Darunter eine Spalte: die Karte oben, höchstens 520px, zentriert.
- Links die House-Karte in groß: dieselbe Komponente wie im Grid (`<StayCard gallery>`), 3:4, Host-Lasche, Fotos per Swipe, Pfeile (`onImage`) und Punkte, Klick öffnet die Vollbild-Galerie, „N photos“ das Raster aller Fotos. Keine Texte auf der Karte (stehen rechts), keine Hover-Bewegung. Sticky, Header + 24px; Höhe höchstens Fenster − Header − 48px, die Breite folgt aus 3:4.
- Rechts, scrollt mit der Seite, Abstand 40px: (a) Eyebrow Kategorie, rechts Herz und „…“ · Titel h1 · „Datum · Nächte · Ort“ body-lg muted · (b) Host-Zeile: Avatar 44px, „Hosted by Nora“, Verified, Social-Icons klein, „View profile“ tertiary · (c) Preis h2 in Betrachterwährung · Crew-Avatare + `CrewLine` · „Request to join“ primary, volle Breite (einzige Hauptaktion, jeder Zustand von `StayCta` steht hier) · „Invite friends“ secondary · „Message {Host}“ tertiary · `JoinSteps` · bei Bedarf Zustandskarten (Anfrage abgelehnt, Einladung, Host-Hinweise, Crew-Gruppe, eigener Anteil, Foto) · (d) Fakten 2 × 2 (Dates · Crew · Included · Languages, Label small muted über dem Wert body/600) · (e) WHY I'M HOSTING (Zitat `text-quote`) · (f) THE CREW (Avatare 56px mit Namen, Host zuerst, freie Plätze gestrichelte Kreise „Your spot“, Klick öffnet die Anfrage), darunter die Abstimmung (`CrewVotes`) · (g) Host experience, falls vorhanden, mit Preis pp und Häkchen · (h) A TYPICAL DAY (Zeit links, Aktivität rechts; `typicalDay: {time, label}[]`, sonst `typicalDayOf` aus `dayText`) · (i) WHO I'M LOOKING FOR · HOUSE RULES (Häkchen accent) · (j) WHERE YOU'LL BE.
- WHERE YOU'LL BE (`HouseWhere`, `HouseMap`): Karte in Spaltenbreite, 260px, Radius 24px, Unterkunfts-Status klein darüber, nicht auf der Karte; „Open in Google Maps ↗“ im SectionHeader. Mit `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` Maps JavaScript API: poi und transit aus, keine Controls, `gestureHandling: "cooperative"`, Googles grauer Hinweis per CSS weg (`.gm-style-moc`, keine öffentliche Klasse), eigener kleiner Hinweis unten rechts über der Attribution. Gebucht: Pin, darüber Name/Link. Nicht gebucht: kein Pin, weicher Kreis (accent 15 %, 1,5 km) über dem Viertel, darüber „Around {Viertel} · exact place decided with the crew“ bzw. „Crew is voting – N options“. Ohne Key oder wenn Google ablehnt: Embed mit CSS-Filter, im offenen Fall als Standbild mit Kreis derselben Größe.
- Danach volle Breite: MORE HOUSES LIKE THIS (`<Shelf>`, gleiche Kategorie oder Stadt).
- Schwebende Join-Kapsel auf allen Größen (`HouseJoinBar`): nur wenn der Block (c) aus dem Fenster ist und der Footer noch nicht sichtbar, unten mittig, 24px über dem Rand, 64px, `--header-bg` + blur, Schatten 0 12px 32px rgba(0,0,0,.12), Thumbnail 40px rund · Titel · Preis · Aktion primary 44px. Einblenden translateY(16px→0) + opacity 300ms.
- Teilen nur hier: „Invite friends“ (`useHouseShare`, Icon user-plus). Desktop Link kopieren + Toast „Link copied – send it to your friends“, Touch `navigator.share`. Karten (Grid, Regale, Spotlight) haben keinen Share-Button, nur das Herz.

## Join-Ablauf
Status pro Mitglied (`lib/joinFlow.ts`, `memberStage`): requested → accepted → payment_due → paid. Der Text überall „Request to join“; nur ein Einladungs-Link heißt „Join“, denn sein Platz ist reserviert und braucht keine Anfrage.
- requested: Klick öffnet ein kurzes Sheet, Nachricht an den Host optional, „Send request“. Der Host antwortet in Your houses (Accept / Decline).
- accepted: Platz reserviert, keine Zahlung.
- payment_due: Crew komplett UND Unterkunft gewählt, für jedes House, egal wie die Unterkunft gewählt wurde; `Stay.paymentDueAt` = jetzt + 48h (`PAYMENT_WINDOW_HOURS`). Die Hauptaktion der House-Seite wird „Pay your share“.
- Nach 48h unbezahlt: Platz wird frei, Host und Crew werden informiert (`settlePayments` in `lib/store.tsx`, Systemzeile + Glocke). Der Anteil des Hosts verfällt nicht, er hat keinen Platz.
- paid: Alle bezahlt → `Stay.allPaidAt`, Auszahlung an den Host, der die Buchung binnen 48h bestätigt (`BOOKING_WINDOW_HOURS`), sonst automatische Rückerstattung, die Unterkunft ist wieder offen.
- Keine Karten-Vorautorisierung (Stripe-Holds verfallen nach ca. 7 Tagen): vor dem Bezahlen passiert nichts mit der Karte, auch nicht über einen Einladungs-Link.
- House-Seite unter dem Button `JoinSteps`: „1 Request · 2 Host accepts · 3 Pay when the crew is complete“, small mit kleinen Kreisen, aktueller Schritt in accent, sobald der Nutzer angefragt hat.
- Die Uhr läuft vorerst im Browser (beim Laden und jede Minute), später als Server-Job. Dev-Menü „Open as“: „Let the 48 hours run out“.

## Privatsphäre Profil
Eine Stelle: `src/lib/profilePrivacy.ts` (`profileViewFor(store, user, viewerId, today)`). Keine Komponente sucht Houses oder Mitbewohner einer Person selbst heraus. Mit echtem Backend gelten dieselben Regeln serverseitig: Was nicht sichtbar sein darf, kommt gar nicht erst im Browser an.
- Gehostete Houses (offen/kommend, nicht `unlisted`): öffentlich.
- Kommende Houses als Gast: nur für Mitglieder derselben Crew, und nur dieses House; für alle anderen nicht gerendert, auch nicht als Zahl.
- Vergangene Houses: öffentlich nur „Lived in N Houses“ + Orte, ohne Datum und ohne House-Titel.
- „Lived with“: nur beidseitig bestätigte Verbindungen (`LivedWith.confirmedAt` in beide Richtungen); bestätigt wird auf dem eigenen Profil.
- Eigenes Profil zeigt alles; „Preview as others see it“ rendert exakt die fremde Ansicht (Betrachter null) unter dem Band „You're seeing your profile as others do · Exit preview“, nichts darin ändert Daten.

## Profilseite
`/u/[id]` und `/profile`, eine Spalte, keine Tabs, keine Linien, leere Abschnitte fehlen ganz. Kopf ohne Rahmen: Avatar 144px, Name h1, „25 · Sweden · based in Chiang Mai“ body-lg muted, Vertrauensband (Label small muted über Wert body/600, was bei 0 steht, fehlt), Social-Kapseln 36px (Markenicon + Handle, max. 4, dann „+N“), „Speaks …“ small muted, Bio body-lg max. 640px. Rechts oben nie ein gefüllter Button: fremd „Message“ secondary 40px (nur mit gemeinsamem House, offener Anfrage oder offenem House der Person) + Teilen + „…“; eigen „Edit profile“ + „…“ (Preview, Share). Abschnitte: HOSTING NOW (`HOUSE_GRID`; eigen mit „Open another House“, ohne offenes House die Zeile „No open House right now · Open a House →“) · LIVED WITH (Avatare 48px überlappend, Name beim Hover, darunter Orte) · PHOTOS (Masonry, max. 9) · UPCOMING (mit Schloss, nur Crew/eigen).

## Messaging
`/inbox`, `InboxList` + `ThreadView`. Füllt mit dem `SlimFooter` genau die Fensterhöhe, nur Liste und Chat scrollen.
- Liste: Gruppen HOUSES (aktuelle und kommende), DIRECT, nach letzter Nachricht sortiert; am Ende zugeklappt PAST (House-Chats, deren Enddatum vorbei ist). House-Chats: Cover als abgerundetes Quadrat 48px, unter dem Titel das Datum small muted. Direktchats: Profilbild rund 48px. Ungelesen: Punkt 8px accent, Titel 600.
- Chat-Kopf: Cover 40px, Titel (Link zur House-Seite), „Feb 18–22 · 4 of 5 in“ small muted, Avatar-Stapel öffnet die Mitgliederliste; Crew komplett: secondary „Open group chat ↗“ (Link des Hosts).
- Nachrichten: eigene rechts, Pfirsich `--select-bg` mit ink-Text (Schwarz bleibt der Hauptaktion vorbehalten), ohne Avatar/Namen; fremde links, surface mit ink-Text; aufeinanderfolgende gruppiert (Name/Avatar nur bei der ersten, 4px), Zeit klein in der Bubble. Systemzeilen zentriert, small muted, ohne Bubble. Die Nachrichtenfläche bleibt `bg`, sonst wären fremde Bubbles auf der surface-Karte unsichtbar.
- Eingabe: Senden 40px, deaktiviert `--chip-bg`/muted, aktiv ink mit surface-Pfeil (die Hauptaktion des Chats); Enter sendet, Shift+Enter Zeilenumbruch.
- Kontaktdaten-Schutz (`src/lib/contactFilter.ts`, vorerst nur Frontend/Mock, später auch serverseitig): Telefonnummern, E-Mail-Adressen und Links zu wa.me, t.me, WhatsApp-/Telegram-Gruppen werden beim Senden durch „•••“ ersetzt, darunter small muted „Contact details are shared once the crew is complete.“ Gilt in Direktchats immer und in House-Chats bis Crew-complete; danach keine Filterung im House-Chat, der Gruppen-Link erscheint im Chat-Kopf.

## Übergang Karte → House-Seite
- Normaler Seitenwechsel mit Fade 150ms (`src/lib/houseTransition.ts`), kein Morph, keine View Transitions. Reduced motion ohne Fade.
- Zurück (Browser, Escape, Zurück-Button): Scrollposition, Karussell-Reihen und Spotlight-Karte werden wiederhergestellt.

## App-Seiten
- Keine h1-Seitentitel (Messages, Houses, Open a House). Inhalt 32px unter dem Header (Your houses: direkt darunter).
- Container-Karten (Formulare, Chat, Your-houses-Karten): surface, kein Rahmen, Schatten 0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06), Radius 24px, Innenabstand 40px. House-Karten mit Bild sind davon ausgenommen.
- Open a House: siehe Abschnitt „Open a House“.

## Your houses
`/my-stays`, `MyStays` + `stay/HouseDetail.tsx`. Füllt mit dem `SlimFooter` genau die Fensterhöhe (`MasterDetail`), die Seite scrollt nicht, nur Liste und Tab-Inhalt. Keine Container-Karten, keine weißen Flächen: alles liegt auf bg, getrennt durch Abstand; nur interaktive Zeilen bekommen beim Hover `--chip-bg`.
- Liste links: Hosting / Joined / Past, zuklappbar, aktives House Pfirsich statt Rahmen.
- Kopf fest, scrollt nie: Thumbnail 56px (Radius 14px) · Titel h2 · „Datum · Ort“ · ein Status-Badge (Taking requests / Crew complete / Booked) · rechts „View page“ tertiary, „Edit“ secondary, „Open House chat“ primary, „…“.
- Tabs: Text-Chips mit `ChipIndicator`, Zustand in `?tab=`, Crossfade 200ms. Host: Overview · Requests (Zahl im accent-Punkt) · Crew · Payments · Share. Gast: Overview · Crew · Payment. Vergangene Houses ohne Tabs.
- Overview = was zu tun ist: je Aufgabe eine Zeile (Icon, Satz, Pfeil), Klick führt dorthin. Nichts offen: „All set.“ + Anreise in N Tagen. Darunter kompakt Crew, Preis pro Person, Auszahlung.
- Requests: Accept primary, Reply secondary, Decline tertiary. Crew: „Remove“ nur im „…“ der Zeile. Payments: Fortschritt + Mitgliederzeilen mit „Remind“ + Payout. Share: Link + Story-Bild, zentriert.
- Dev-Aktionen („Reset payments“, „Unlock accommodation“) nur im Dev-Menü.

## Open a House
Open a House = 4 Pflichtschritte, Rest optional; Unterkunft und Daten können per Crew-Abstimmung entschieden werden. Ein Flow für alle, auch Hosts mit Host-Experience (kein eigener Modus). `CreateStayForm`, `create/HouseSteps.tsx`, `create/model.ts`.
- Fokus-Modus (`/create`, `FocusHeader`): nur Logo + „Save & exit“ (tertiary), keine Nav, keine Lasche, kein Footer. Der Entwurf speichert sich selbst.
- Pflicht, Anzeige „1 / 4“: (1) Thema (Text-Chips + „Custom“) · (2) Wo + Wann (`PlaceCombobox`, Monate 6 × 2, Jahreszahl klein beim Jahreswechsel; „Add exact dates“ tertiary; Nachfrage als eigene Zeile: accent-Icon, Avatar-Stapel, body/600) · (3) Crew-Größe (`<SegmentedControl>` 3–4 · 5–6 · 7–10, gespeichert wird das obere Ende, exakte Zahl beim Bearbeiten) + Budget Min/Max + Slider; Währung ohne Häkchen, Standard des Hosts (Profil, sonst Browser), die Vorschau zeigt genau diese · (4) „Pick a cover“: Upload (Drag & Drop, bis 6, erstes = Cover) oder 6 Vorschläge passend zu Thema + Ort (`lib/coverSuggestions.ts`, später ein Stock-Anbieter), ein Bild ist Pflicht, nie das Profilbild; Titel vorbelegt „{Thema} House {Ort}“, höchstens 40 Zeichen; optional Card note.
- Vorschau (`BuildingCard`) baut sich live auf: weiche Fläche (`--stage-peach` → `--stage-mist`, blur), nur die Host-Lasche, je Zeile ein Platzhalterbalken rgba(255,255,255,0.35). Jede Antwort ersetzt ihren Balken (opacity + translateY 6px, 250ms), das Cover blendet über die Fläche. Social-Icons kommen aus dem Profil; fehlen sie, steht darunter ein Hinweis mit Link zum Profil (neuer Tab).
- Ready („Ready to open?“): Zusammenfassung mit „Edit“ je Zeile, primary „Open House“, tertiary „Add more details first“ klappt die optionale Liste auf: About (Beschreibung, Who I'm looking for, House rules, Languages) · Place (Exact dates, Accommodation) · Extras (Host experience, Group chat link). Wert in muted, leer „Add“, erledigt accent-Häkchen, keine leeren Kreise.
- Erfolg („Your House is open.“): große Karte, „Copy link“ primary, „Story image“ secondary, wie viele zuerst benachrichtigt wurden, „Save as template“ und „Go to Your houses“ tertiary.
- Entwurf: höchstens einer pro Nutzer (Mock: localStorage). Keine Zwischenseite: „Open a House“ führt direkt in den Flow, beim ersten unvollständigen Schritt bzw. auf Ready, darüber small muted „Continuing your draft from {Datum}“ + „Start over“ (Popover „Discard this draft?“ Discard / Keep). Vorbelegung `?place=&month=&category=` bei vorhandenem Entwurf: Popover „Continue draft“ / „Start new with {Ort}“ im Flow. Your houses: Gruppe „Drafts“ oben in der Liste, nur wenn vorhanden, „Continue“ und „Discard“ im „…“.
- Nur Monat: `startDate`/`endDate` sind die Monatsgrenzen, `datesOpen: true`, Anzeige „March 2027“ (`format.stayDates`).
- Gestaltung: kein Formular-Kasten. Frage `text-h1`, Antworten frei auf der Fläche. Weiter mit Enter oder primary unten, Zurück tertiary. Rechts die Vorschau, Eyebrow „PREVIEW“, sticky. Übergang zwischen Fragen: Fade + translateY 12px, 300ms.
- Vorbelegung ohne Entwurf überspringt erledigte Schritte (`firstOpenStep`).
- Bearbeiten (`/my-stays/{id}/edit`) bleibt die Liste aus Pflichtantworten und Details, mit der fertigen Karte als Vorschau.

## Crew-Abstimmung
„Decide with crew“ bei Unterkunft und genauen Daten: Host fügt 1–3 Vorschläge hinzu (Link + Preis pro Person bzw. Datumsbereich), Frist optional. `Stay.accommodationVote`/`datesVote` (`CrewVote`), Logik in `lib/crewVotes.ts`, Anzeige `stay/CrewVotes` auf der House-Seite und angepinnt über dem House-Chat.
- Je Mitglied eine Stimme, änderbar, solange offen. Ende: Frist vorbei, Host beendet, oder Crew komplett und alle haben gestimmt. Meiste Stimmen gewinnen; bei Gleichstand (auch ohne Stimmen) entscheidet der Host.
- Preis bleibt Spanne bis zur Entscheidung; Unterkunft entschieden = gesperrt wie von Hand. Zahlung wie immer erst, wenn die Crew komplett ist (siehe „Join-Ablauf“).

## Sheet
Eine Komponente `<Sheet>`. `variant="panel"` (`PanelSheet`) für Filter auf Touch und künftige Panels (Galerie-Details, Teilnehmerliste): Dialoge wie Anfrage oder Login bleiben zentrierte Modale.
- Maus (`pointer: fine`): schwebend rechts, 24px zu oben, unten und rechts, Breite clamp(440px, 34vw, 560px), Radius 28px, `<GlassPanel>`. Einfahren translateX 360ms cubic-bezier(0.32,0.72,0,1). Seite dahinter blur 16px + Overlay rgba(34,30,27,0.18).
- Touch oder unter 768px: dieselbe Komponente von unten, 85 % hoch, Griff oben; nach unten schließen, nach oben auf volle Höhe.
- Schließen: `<IconButton>` X, Escape, Klick aufs Overlay, Griff (`NotchGrip`, am linken Rand senkrecht): nach rechts ziehen, Einrasten bei > 40 % oder > 0.4px/ms. Fortschritt p wie an der Lasche, Drag und Einrasten aus dem gemeinsamen Hook `useSheetDrag`.
- Kopf (Titel + X) und Fuß fest, nur der Mittelteil scrollt; mit `hero` (ein Panel über eine Sache) scrollt der Kopf mit, nur das X bleibt. z-index 70, über Header und Dev-Knopf; Dialoge darüber z-index 75.

## Filter-Panel
- Maus: dritte Stufe der Header-Lasche (siehe „Header“), über denselben Fortschritt p (0 Nav · 1 Chip-Zeile · 2 kompletter Filter). Weiter ziehen am Griff oder Klick auf „Filters“ öffnet sie: Container-Breite, höchstens 80vh tief, Scrim mit blur 6px. Escape, Klick daneben, ✕ oder Ziehen nach oben schließt; die Seite steht währenddessen. Touch und unter 768px: gleicher Inhalt als `<Sheet variant="panel" wide>` (Bottom-Sheet).
- Oben Where? und When? (Einzelauswahl, dieselben Felder wie in der Zeile). Zweispaltig, Abstand 40px: links Category, Crew size, Who, Crew age; rechts Length, Price per person, Accommodation, Spots left, Language. `<SegmentedControl>` statt eigener Kontrollen (überall: Schiene rgba(255,255,255,0.45), gewählt gleitender Knopf `--select-bg` mit ink 600), Preis-Histogramm: außerhalb des Bereichs rgba(34,30,27,0.15), innerhalb #F0633A 70 %. Einziges ink-Element: „Show N houses“. Kein Sort. Unter 900px Fensterbreite einspaltig.
- Jeder gesetzte Wert hat ein ✕: Where?/When? in der Kapsel, die Kategorie im Chip, der Rest als Pfirsich-Chip (`ActiveFilters`), in der Zeile höchstens 2 + „+N“, im Kopf des Panels alle.
- Crew size (`?crew=` 3–4 · 5–6 · 7–10, nach `spotsTotal`), Who (`?who=` Mixed · Women only, `Stay.who`, ohne Angabe Mixed), Crew age (`?age=` 18–25 · 25–35 · 35+, Überschneidung mit `Stay.ageRange`, ohne Angabe passt jedes Alter), Accommodation (`?stay=` Booked = gesperrt, Decided together = offen).
- Kopf: „Filters“, daneben live „N houses“ small muted, aktive Werte, X. Fuß fest: „Clear all“ tertiary (leert auch die Kategorie), „Show N houses“ primary. Kein Scrollen im Panel ab 800px Fensterhöhe. Der Filters-Button zählt nur die Filter ohne Kategorie. Nach dem Schließen geht die Seite zum Grid, wenn sich etwas geändert hat.
- Keine eigene dunkle/futuristische Variante.

## Kategorien
Zwölf (`VIBES`): Fitness · Surf & Water · Remote work · Founder · Creator · Wellness · Adventure · Culture · Party · Holiday · Social · Students. „Short trip“ ist keine Kategorie, sondern der Length-Filter. Ein eigenes Label des Hosts (`customVibe`) zählt zu Social.

## Host-Seite
Reihenfolge: Hero auf dem stärkeren Verlauf, 64px oben/unten (Headline display 48px, Text body-lg, Karte 560px, drei Mini-Punkte) → „Two ways to host" (Share the cost / Add what only you can bring mit 3-Zeilen-Rechnung, gleich gewichtet) → Houses people opened → Where people are looking (Karte) → How it works (3 Karten, Icons statt „€0") → Questions (inkl. „Where does the 10 % go?") → Schlussband auf Pfirsich mit der einen Hauptaktion. „Explore by city and vibe" entfernt. Abstände 96px, keine Linien.

## Sonstiges
- Fortschrittsbalken immer accent #F0633A, nie grün.
- Toasts (`ui/Toast.tsx`): höchstens einer sichtbar, ein neuer ersetzt ihn, oben rechts unter dem Header, `<GlassPanel>`, nach 4s weg, nur als Antwort auf die eigene Aktion. Alles andere nur in der Glocke. Mock-E-Mails und -Push nie als Toast, sondern im Log des Dev-Menüs.
- Favicon: Smiley unverändert auf kreisrundem Hintergrund, Ecken transparent (svg + png 32/192/512); apple-touch-icon quadratisch.
- Ein Login-Button (Modal mit „Create an account"), kein separater Sign-up.
- Footer: vier Linkspalten Explore · Hosting · Simpulo · Popular. Popular: bis zu 8 Links, zuerst die Städte mit den meisten Houses („Co-living in Lisbon“ …), dann Vibes („Surf houses“ …). Kein Block „Explore by city and vibe“ mehr. Eigene Fläche `--footer-surface` #EFE9E2, einfarbig, volle Breite, keine Linie (die Fläche trennt), innen 64px oben / 40px unten. Großer Footer nur auf Explore (mit Collections), Host, How it works; alle anderen Seiten `SlimFooter` (`FooterByRoute`): gleiche Fläche, eine Zeile, 72px, small muted, links „© 2026 Simpulo · Impressum · Privacy · Terms“, rechts Social-Icons. Abstand letzter Inhalt → Footer `--space-section`.

## Nicht bauen
Logo-Schrift für Überschriften · CTA mittig im Header · Pfeile in der Chip-Zeile · Zahlen-Badges im Header · Compact-Header/Crossfade · zweite Chip-Zeile · Trennlinien/Verlaufslinien zwischen Abschnitten · Bubble-Hero · Ort-Karten oder Orts-Seiten · futuristisches/dunkles Filter-Panel · Kategorie-Mehrfachauswahl.

## Nach dem Launch prüfen
- Kennenlern-Call (Termin + externer Link, kein eigenes Video).

## Offene Prompts (Reihenfolge)
1. Compact-Chips mit „More"-Popover + Filter-Panel neu
2. Hover-Linie unter Karussell-Karten endgültig prüfen
3. Spotlight: coverImage-Daten + Set-Wechsel
4. Host-Seite neu
5. Favicon
6. Danach weiter wie bisher: Orange Auswahl-Zustände → Share + Anfrage-Karte → Open-a-House-Flow → Your houses Detail → Settings/Edit profile → Profilseite mit Tabs

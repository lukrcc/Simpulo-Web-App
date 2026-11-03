# CLAUDE.md – Stand 2. Nov 2026

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
- Fallback-Karte: Stadtname h2 ink + Land small muted auf `--stage-peach`/`--stage-mist`-Verlauf, gleiche Kartenform.
- Pexels nur für neue, nicht kuratierte Orte: genau eine Suche pro Ort („{name} {country} skyline“, Querformat), URL + Fotograf bleiben gespeichert, nie erneut abfragen; Credit „Photo: {Name} · Pexels“ unten rechts (small, weiß 60 %, verlinkt). API-Key nur serverseitig. Vorerst nur Schnittstelle + Mock (`destinationImages.ts`).
- Karte öffentlich erst mit `status: "approved"` und `interestedCount ≥ DESTINATION_MIN_INTEREST` (3). Kuratierte Orte ab `DESTINATIONS_ALL_FROM_HOUSES` gelisteten Houses auch darunter. Sortierung nach interestedCount.
- Neue Orte nur über die Suche (kein Freitext; 100 + 300 Städte, später Places-API), dann `status: "pending"`. Freigabe-Liste `/dev/destinations` (nur dev): Orte mit erreichter Schwelle, „Approve“, „Replace image“, „Hide“.

## Gestaltungsprinzipien
- Ein Fokus pro Bildschirm: wenige Elemente, eins klar hervorgehoben (Vorbild Spotlight, Apple TV, Netflix).
- Hauptliste Open Houses als Grid; zusätzliche Regale nur, wenn genug Houses vorhanden sind (Schwellen in config/explore.ts). Nie dieselben Houses in mehreren Regalen auffüllen.
- Bewegung nur als Antwort auf Interaktion, flüssig (nur transform/opacity), nie Deko-Animation.
- Keine Flip-Karten; Detailansicht entsteht, indem die Karte in die House-Ansicht wächst (Shared-Element-Übergang).
- House-Seite nach Apple-TV-Muster: großes Bild oben mit Titel, Fakten und Join ohne Scrollen; darunter Regale; keine stehende Seitenleiste; schmale Join-Leiste erst nach dem Hero.
- Reihenfolge: Spotlight stabil → House-Seite + Übergang → Explore-Regale.

**Leichtigkeit statt Formular – gilt für jede Seite:**
- Keine Trennlinien zwischen Abschnitten; Abstand (96px zwischen Abschnitten, 24–32px innerhalb) trennt.
- Rahmen/Kästen nur für interaktive Container (Formularfelder, Panels, Chat); erklärender Inhalt liegt frei auf der Fläche.
- Pro Bildschirm ein dominantes Element (Bild, Zitat, Zahl); alles andere eine Stufe leiser (muted, kleiner).
- Inhalte visuell statt als Text: Bilder, Avatare, Stationen/Kacheln, Zitate; Fließtext max. 3 Zeilen am Stück, max. 640px breit.
- Eine Hauptaktion pro Bildschirm; weitere Aktionen secondary oder als Text-Link.
- Keine stehenden Seitenleisten; Aktion als schwebende Leiste, wenn der Hauptbereich aus dem Blick ist.
- Labels klein (small muted) über dem Wert, nie „Label: Wert“ in einer Zeile.
- Vor Fertigmeldung jeder UI-Aufgabe: Seite gegen diese Liste prüfen und Abweichungen nennen.

## Header (verbindlich, Maße nicht ohne ausdrückliche Anweisung ändern)
- Genau EINE Komponente `<SiteHeader>`, im Root-Layout genau einmal gerendert (über `AppShell`). Auf allen Seiten identisch, ändert sich beim Scrollen nicht. Kein zweiter Zustand, kein Crossfade, keine Icon-Kreis-Nav, keine zweite Zeile.
- Leiste 64px, `position: fixed; top: 0`, `--header-bg` (#F7F4EF bei 0.94) + `backdrop-filter` und `-webkit-backdrop-filter: blur(24px) saturate(1.3)`, volle Breite, über dem Seiteninhalt (nur Dialoge liegen darüber). Inhalt beginnt 16px unter der Leiste (80px) und verschiebt sich nie, auch nicht beim Zustandswechsel der Lasche. Höhe und Inhalt der Leiste ändern sich beim Scrollen nie.
- Lasche, Zustand „nav“ (Standard): hängt mittig aus der Leiste, gleiche Fläche, 16px tief (80px dort), Breite = Nav + 32px links/rechts, untere Ecken 20px, Übergang zur Leiste konkav 16px.
- Lasche, Zustand „filters“: Container-Breite (Kanten des Seiteninhalts), 76px tief (140px dort), konkave Übergänge bleiben. Im unteren Teil Chips 36px (so viele wie passen, letzter Platz „More ▾“), rechts Sort-Kapsel + Filters 36px; gleicher State wie die Zeile im Inhalt (`useExploreFilters`). Ersetzt die frühere sticky Filterleiste.
- Automatisch „filters“, solange Open Houses hinter dem Header liegt: an, wenn die Filterzeile den Header passiert hat (80px), aus, wenn sie wieder unter die offene Lasche kommt (140px) oder das Ende der Liste (letztes Grid-Element, eingestreute Regale zählen dazu) die Lasche erreicht. IntersectionObserver, kein Scroll-Listener. Hook `useNotchState { mode, source: "auto" | "manual" }`.
- Griff unten mittig in der Lasche, nur auf Explore. Klick/Tippen schaltet auf der ganzen Seite um; Escape oder Klick außerhalb schließt, außer in Open Houses. Ziehen: Tiefe folgt dem Zeiger (0–60px, Breite proportional), Einrasten offen bei > 50 % oder > 0.4px/ms nach unten, nach oben entsprechend zu; Schwelle 6px. Filterwahl bei manuell offener Lasche scrollt zum Grid und geht in „auto“ über.
- Griff je Eingabegerät, Verhalten überall gleich: Maus (`hover: hover`, `pointer: fine`) 32×4px, muted 40 %, Trefferfläche 44×20px, über der Lasche Kapsel „Filters ⌄“ 28px. Touch (`pointer: coarse`) 40×5px, immer sichtbar, Trefferfläche 64×28px, Ziehen ist die Hauptgeste. Gleiche Logik für die spätere mobile Ansicht.
- Übergang: notchWidth und notchDepth per requestAnimationFrame, 420ms cubic-bezier(0.32,0.72,0,1). Öffnen: erst Form, nach 140ms Inhalt (opacity + translateY −8px, 220ms). Schließen: erst Inhalt (140ms), dann Form. Reduced motion: ohne Animation.
- Leiste und Lasche sind EINE Form (ein path, Parameter notchWidth/notchDepth, ResizeObserver auf Header und Nav), keine zusammengestückelten divs. Daraus zwei Ebenen: Glas per `clip-path`, Schatten als SVG, innen ausgeschnitten. Passt die Tiefe nicht für beide Radien (unter 36px), teilen sie sich die Tiefe (elliptische Bögen).
- Keine border/line: `filter: drop-shadow(0 1px 0 rgba(0,0,0,0.06)) drop-shadow(0 6px 16px rgba(0,0,0,0.05))` auf der Schatten-Ebene.
- Die konkave Laschen-Form gibt es nur an der Header-Nav und an der Host-Lasche der Karten, nirgends sonst.
- Links Logo 22px/700, keine Tagline.
- Mitte Nav, vertikal mittig in den 64px, in jedem Zustand an derselben Stelle, als Text mit Icon 16px, 14px/500, gap 28px, aktiv ink + 2px Unterstrich, inaktiv muted. Eingeloggt: Explore · Your houses · Messages (accent-Punkt 6px bei ungelesen). Ausgeloggt: Explore · Host · How it works.
- Rechts (vertikal mittig in den 64px) ausgeloggt: „Log in" 14px/500 + „Open a House" 36px ink 14px/600. Eingeloggt: Glocke 36px (accent-Punkt) + Avatar 36px + „Open a House". Nie Zahlen-Badges im Header.

## Schriftskala (verbindlich)
Tokens in `globals.css`, Klassen `text-<name>`. Keine anderen Schriftgrößen: kein `text-[…]`, keine Tailwind-Stufen (`text-sm` …), kein `font-size` außerhalb der Tokens.

| Token | Größe/Gewicht | Einsatz |
|---|---|---|
| `text-display` | 48px/700, line-height 1.05, letter-spacing −0.02em | nur Hero-Headline der Host-Seite |
| `text-h1` | 36px/700 | Seitentitel |
| `text-h2` | 28px/600 | Abschnittstitel |
| `text-h3` | 20px/600 | Kartentitel (Grid, Karussell, Spotlight), Kartenüberschriften |
| `text-body-lg` | 17px/400 | Einleitungstexte |
| `text-body` | 15px/400 | Standard |
| `text-small` | 13px/500 | Meta: Datum, Ort, Preis-Zusatz |
| `text-eyebrow` + `uppercase` | 12px/600, letter-spacing 0.08em | Eyebrows |

Nur für Header und Filterzeile (feste Maße): `text-logo` 22px/700, `text-nav` 14px/500 (Nav und Chips). Ausnahme ohne Tokens: die OG-Bilder (`opengraph-image.tsx`), sie werden serverseitig ohne CSS gerendert. Ein `font-*` neben einem Body-Token überschreibt nur das Gewicht (z. B. Buttons `text-body font-semibold`).

## Explore – Spotlight und Filterleiste
- Über dem Spotlight (Maße: Abschnitt „Hero / Spotlight“) keine Überschrift, kein Slogan. „Share a place. Find your people." nur noch im `<title>` und auf der Host-Seite.
- Aufbau Open Houses: SectionHeader (Eyebrow „ALL HOUSES", Titel, Badge) → Filterzeile → Grid → „Show 24 more".
- Aufbau Explore: Spotlight → Open Houses mit eingestreuten Regalen (nach je 3 Reihen) → Footer. Open Houses ist die einzige Hauptliste, „Show 24 more“ lädt nach. Grid: 4 Spalten ab 1600px, 3 ab 1100px, 2 ab 700px, darunter 1.
- Regale in der Liste: nach je 3 vollen Reihen (bei 4 Spalten nach 12, 24, 36 … Houses) zuerst Short trips (ab 8 Houses mit ≤ 5 Nächten), dann Where do you want to go next, dann Themen-Regale (ab 300 Houses insgesamt, je Regal ≥ 12 eigene Houses, höchstens 4). Volle Container-Breite mit SectionHeader, 96px oben und unten. Ein im Grid darüber schon sichtbares House erscheint nicht im Regal (Ausnahme: Short trips, wenn es sonst unter 8 fiele); kein House in zwei Regalen.
- Suchmodus: Sobald ein Chip außer „All“ oder ein Filter aktiv ist, sind alle eingestreuten Regale weg; es bleibt das gefilterte Grid, Trefferzahl im Badge („12 houses“). Der Spotlight bleibt. „All“ blendet sie wieder ein.
- Mock-Szenarien (DevSwitcher „Data“): empty 0 · launch 20 · growing 40 · full 100 · huge 600 Houses. Der Spotlight wählt aus diesen Houses, keine eigene Liste.
- Filters-Button überall: ink, Text und Icon surface, 36px, 14px/600; bei aktiven Filtern rechts die Zahl als accent-Kreis 18px mit weißer Ziffer.
- `ExploreFilterBar` (ab md): normale, nicht klebende Zeile unter dem SectionHeader, ohne eigenen Hintergrund. Chips 36px 14px/500 (so viele wie passen, letzter Platz „More ▾" mit Popover), rechts Sort-Kapsel (surface, line) + Filters. Sobald sie unter dem Header verschwindet, übernimmt die Lasche (siehe „Header“). Es ist immer nur einer der beiden Chip-Sätze sichtbar.
- Kein Vorfahre des Inhalts bis zum body darf overflow, transform, filter oder contain tragen; `PageGlow` ist Geschwister des Inhalts, nie Vorfahre.
- Chip-/Filter-Wechsel scrollt den Anfang des Grids direkt unter die offene Lasche (140px). Chips und Filter wirken nur auf das Grid; der Spotlight bleibt fix.
- Nur auf Explore (und Collections). Host, How it works, App-Seiten: nur der Header. Telefone sowie Stadt-/Vibe-Seiten behalten ihre eigene Chip-Zeile.

## Explore – Abschnitte
- Abschnitte ohne eigene Fläche, transparent, keine Trennlinien, kein Rahmen, kein Schatten. Abstand überall 96px, von der Unterkante der Karten oder des Buttons bis zur Eyebrow; „Show 24 more“ 40px unter dem Grid. Alle Werte als Konstanten in `EXPLORE_SPACING` (`src/config/explore.ts`).
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
- Embla Carousel (`SpotlightCoverflow`, ab lg; `embla-carousel-react`, `-autoplay`, `-wheel-gestures`): loop, align center, skipSnaps true, dragFree false, duration 22, containScroll false. Keine eigene Drag-/Wheel-/Animationslogik. Keine 3D-Effekte. Karussell 640px, full-bleed, padding-top 48px, keine Überschrift darüber. Abschnitt und Verlauf beginnen direkt an der Unterkante der Header-Leiste (64px), die Lasche ragt in den Verlauf.
- 12–20 Houses (Mock 16). Ist die Liste kürzer als 3× die Fensterbreite, wird sie intern wiederholt (Keys `${id}-copy`), damit der Loop nie aus ist. `WheelGesturesPlugin({ forceWheelAxis: "x" })`. Optionen konstant, Plugins per `useMemo`, kein reInit beim Wischen.
- Slides 400×533 (3:4). Bei „scroll“, „reInit“ und „slideFocus“ direkt per `style` auf dem inneren Element (der Embla-Loop bewegt die Slide selbst), kein React-State pro Frame: im Ruhezustand scale 1 · 0.78 · 0.66, Overlay schwarz 0 · 0.25 · 0.38, dazu translateX, damit der sichtbare Spalt in jedem Frame 20px ist. Dazwischen Fokus-Kurve `f = max(0, 1 − d)³` (d = Abstand zur Mitte): scale `d ≤ 1 ? 0.78 + 0.22·f : 0.78 − 0.12·min(1, d−1)`, Overlay `d ≤ 1 ? 0.25·(1−f) : 0.25 + 0.13·min(1, d−1)`. Bodenschatten: opacity = f. z-index aus f, die Karte nächst der Mitte liegt oben. Keine CSS-transition auf transform der Slides, kein dauerhaftes will-change.
- Alle Karten zeigen denselben Inhalt an derselben Stelle: Host-Lasche (Avatar, Name, Verified; immer sichtbar, skaliert mit der Karte), Titel, Datum · Ort, Preis, Host-Notiz, Crew/„Just opened“, Social-Icons. Keine inhaltsabhängigen Animationen; die Karte wird nur als Ganzes skaliert und abgedunkelt. Kein Badge, kein Share/Herz im Spotlight.
- Klick auf Seitenkarte: `scrollTo`; Klick auf die mittlere öffnet die House-Seite. Pfeile 44px (surface, line), Tastatur ← →: `scrollPrev`/`scrollNext`. Eine Geste ab 40px geht mindestens eine Karte weiter (sonst rastet Embla zurück). Autoplay 8s, `stopOnInteraction: true`, `stopOnMouseEnter: true`; nach 20s ohne Interaktion wieder `play()`. Bodenschatten unter der Mitte rgba(0,0,0,0.28).
- Mobile (später): dieselbe Komponente mit 1 Karte + angeschnittenen Nachbarn. Bis dahin unter lg `SpotlightHero`.

## Hintergrund
- Mitscrollende warme Flecken: `<PageGlow>` (position absolute, inset 0, volle Seitenhöhe, z-index −1, pointer-events none), radiale Verläufe ohne blur-Filter. Nie aus Bildfarben, keine Karte bekommt eigene Farbe, Kartenschatten bleiben neutral.
- Oben: Verlauf im Spotlight/Host-Hero (`StageBand`, `.stage-gradient`, beginnt an der Unterkante der Header-Leiste, Pfirsich links oben, Mist rechts, unten 200px Auslauf). Tokens `--stage-peach` #F7D9C8, `--stage-sand` #F2EBDF, `--stage-mist` #E6E9EE.
- Explore und Host: in jeder Lücke zwischen zwei Abschnitten (`data-glow-section`) ein Fleck 1100×700px, abwechselnd rechter und linker Rand, peach 70 %, zentriert auf die Lücke; Abstand der Flecken höchstens 1200px (längere Abschnitte bekommen zusätzliche). Am Footer ein breiter Fleck (volle Breite, 500px hoch) aus peach 75 % + mist 50 %, zentriert auf seine Oberkante, zur Hälfte hinter dem Footer. Footer auf allen Seiten sichtbar (außer mobiler Chat). Eltern-Element der Ebene: `body` mit relative + isolate, kein overflow, keine feste Höhe.
- App-Seiten (Your houses, Messages, Settings) nur der obere Fleck, sonst ruhig.
- Abschnitte ohne Hintergrund, transparent, Abstand 96px, Trennung nur über Abstand und SectionHeader. Container-Karten bleiben surface mit weichem Schatten.
- Header (`.milk-glass`): `--header-bg` + `backdrop-filter` UND `-webkit-backdrop-filter: blur(24px) saturate(1.3)`; ohne Support deckend #F7F4EF.

## Übergang Karte → House-Seite
- View Transitions API (`src/lib/houseTransition.ts`): Navigation in `document.startViewTransition`, ohne API oder bei reduced motion normale Navigation. Namen pro House: `house-image-{id}`, `house-title-{id}`, `house-host-{id}`; auf der Karte nur solange sie die geklickte ist, auf der House-Seite immer.
- 450ms cubic-bezier(0.32,0.72,0,1), restliche Seite blendet in 200ms über. Hauptbild der House-Seite ist das Cover, damit dasselbe Bild wächst.
- Zurück (Browser, Escape, Zurück-Button) läuft rückwärts; Scrollposition, Karussell-Reihen und Spotlight-Karte werden wiederhergestellt.

## App-Seiten
- Keine h1-Seitentitel (Messages, Houses, Open a House). Inhalt 32px unter dem Header.
- Container-Karten (Formulare, Panels, Chat, Your-houses-Karten): surface, kein Rahmen, Schatten 0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06), Radius 24px, Innenabstand 40px. House-Karten mit Bild sind davon ausgenommen.
- Open a House: erste Zeile „Step X of 9" + Fortschrittsbalken; Preview rechts startet auf Höhe der Schritt-Karte, Eyebrow „PREVIEW", sticky.

## Filter-Panel
- Rechts 400px, schwebend (8px Abstand zum Rand, Radius 24px links), surface, Overlay 12 % ink + blur 4px, Einfahren translateX 360ms.
- Kein Sort, keine Categories (die machen Kapsel bzw. Chips).
- Abschnitte: When (Monats-Chips, mehrfach) · Length (Any / Weekend ≤5 nights / 1–2 weeks / 3+ weeks) · Price per person (Doppel-Slider + Histogramm, Balken im Bereich ink) · Spots left (Any / 1+ / 3+) · Language (Combobox).
- Fuß fest: „Clear all" tertiary, „Show N houses" primary (Zahl live). Passt bei 900px Höhe ohne Scrollen.
- Keine eigene Farbe, keine dunkle/futuristische Variante.

## Host-Seite
Reihenfolge: Hero auf dem stärkeren Verlauf, 64px oben/unten (Headline display 48px, Text body-lg, Karte 560px, drei Mini-Punkte) → „Two ways to host" (Share the cost / Add what only you can bring mit 3-Zeilen-Rechnung, gleich gewichtet) → Houses people opened → How it works (3 Karten, Icons statt „€0") → Questions (inkl. „Where does the 10 % go?") → dunkles Schlussband (einziger dunkler Block). „Explore by city and vibe" entfernt. Abstände 96px, keine Linien.

## Sonstiges
- Favicon: Smiley unverändert auf kreisrundem Hintergrund, Ecken transparent (svg + png 32/192/512); apple-touch-icon quadratisch.
- Ein Login-Button (Modal mit „Create an account"), kein separater Sign-up.
- Footer: vier Linkspalten Explore · Hosting · Simpulo · Popular. Popular: bis zu 8 Links, zuerst die Städte mit den meisten Houses („Co-living in Lisbon“ …), dann Vibes („Surf houses“ …). Kein Block „Explore by city and vibe“ mehr.

## Nicht bauen
Logo-Schrift für Überschriften · CTA mittig im Header · Pfeile in der Chip-Zeile · Zahlen-Badges im Header · Compact-Header/Crossfade · zweite Chip-Zeile · Trennlinien/Verlaufslinien zwischen Abschnitten · Bubble-Hero · futuristisches/dunkles Filter-Panel · Kategorie-Mehrfachauswahl.

## Offene Prompts (Reihenfolge)
1. Compact-Chips mit „More"-Popover + Filter-Panel neu
2. Hover-Linie unter Karussell-/„Where do you want to go next"-Karten endgültig prüfen
3. Spotlight: coverImage-Daten + Set-Wechsel
4. Host-Seite neu
5. Favicon
6. Danach weiter wie bisher: Orange Auswahl-Zustände → Share + Anfrage-Karte → Open-a-House-Flow → Your houses Detail → Settings/Edit profile → Profilseite mit Tabs

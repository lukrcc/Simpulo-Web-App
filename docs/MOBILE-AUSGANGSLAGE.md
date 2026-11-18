# Mobile-Ausgangslage – Stand 18. Nov. 2026

Nur aus dem Code gelesen, kein Dev-Server. „390 px“ = Schätzung aus den Klassen, außer wo „gemessen“ steht (Playwright-Messungen aus früheren Admin-Prompts).

## 1 Routen

### Produkt

| Pfad | Zweck |
|---|---|
| `/`, `/explore` | Explore: Spotlight, Raster, dunkle Bänder, Suche |
| `/co-living/[city]` | SEO-Stadtseite: Houses einer Stadt |
| `/collections/[slug]` | Themen-Sammlung |
| `/house/[slug]` | Öffentliche House-Seite (indexiert) |
| `/h/[id]` | House-Seite je Rolle (Besucher, Mitglied, Host) |
| `/h/[id]/manage` | Verwaltung für den Host |
| `/your-houses` | Dashboard: Up next, Needs you, Reihen |
| `/your-houses/all/[group]` | Alle Kacheln einer Reihe |
| `/your-houses/[id]` | Weiterleitung auf `/h/[id]` bzw. manage |
| `/your-houses/[id]/edit` | House bearbeiten |
| `/your-houses/payouts` | Einnahmen, Auszahlungen, Tabelle |
| `/create` | Open a House (Fokus-Modus) |
| `/messages`, `/messages/[threadId]` | Chats: Liste + Verlauf |
| `/profile`, `/u/[userId]` | Eigenes / fremdes Profil |
| `/people` | Your people, Lived with, Saved profiles |
| `/saved` | Gemerkte Houses |
| `/settings` | Einstellungen (Apple-Stil) |
| `/settings/profile` | Edit profile + Onboarding (`?setup=1`) |
| `/settings/payouts` | Auszahlungskonto, Status |
| `/invite/[token]` | Einladung annehmen |
| `/claim/[token]` | Vorbereitetes House übernehmen |
| `/welcome` | Willkommen / Onboarding |
| `/get`, `/get/card` | App installieren, Druckkarten mit QR |
| `/faq` | Fragen (Joining · Hosting) |
| `/ideas` | Ideen-Liste (Schalter aus → 404) |
| `/about`, `/contact`, `/safety`, `/cancellation` | Infoseiten |
| `/impressum`, `/privacy`, `/terms` | Recht |
| `/demo-login` | Passwort für Demo-Modus |
| `/dev/emails`, `/dev/identity-check`, `/dev/stripe-onboarding` | Nur dev: Simulationen |
| `manifest.webmanifest`, OG-Bilder, `/api/static-map`, `/api/link-preview` | Technik, keine Seite |

### Admin

| Pfad | Zweck |
|---|---|
| `/admin` | Übersicht: Gewinn, vier Bereiche, Diagramm |
| `/admin/houses` | Houses: Gefährdet · Läuft gut · Alle, Hebel |
| `/admin/houses/prepared`, `/admin/houses/new` | Vorbereitete Houses |
| `/admin/hosts` | Hosts nach Stufe, Detail |
| `/admin/growth` | Wachstum: Kanäle, Empfehler, Houses, Verhalten |
| `/admin/traffic` | Traffic (ohne eigenen Eintrag) |
| `/admin/topics` | Analyse nach Blickrichtung |
| `/admin/data` | Algorithmus: Fluss, Thesen, Datenpunkte |
| `/admin/labore` | Labore: Pyramide, Karte, Liste, Fluss, Potenzial |
| `/admin/vision` | Vision: Karte, Zeitleiste, Zoom |
| `/admin/funding` | Finanzierung inkl. Firmenstruktur |
| `/admin/posteingang` | Posteingang (alle Aufgaben + Tickets) |
| `/admin/money`, `/admin/money/taxes` | Geld, Steuern |
| `/admin/platform` | System: Einstellungen, Backlog, Tools |
| `/admin/log` | Log |
| `/admin/waitlist` | Warteliste + Launch-Kriterien |
| `/admin/applications` | Host-Bewerbungen |
| `/admin/overview`, `/admin/algorithm` | Weiterleitungen |

## 2 Layout-Bausteine

| Baustein | Datei | Mobile-Regeln heute |
|---|---|---|
| Header (Desktop) | `layout/header/SiteHeader.tsx` | ja – erst ab md (`hidden md:block`); 768–1099 Symbole statt Text-Tabs |
| Mobiler Kopf | `layout/MobileHeader.tsx` | ja – unter md, Graphit, Logo |
| Untere Tab-Leiste | `layout/BottomTabBar.tsx`, `TabBarSpacer.tsx`, `mobileChrome.ts` | ja – unter md, `--tabbar-clear`, `--safe-bottom` |
| Fokus-Kopf | `layout/header/FocusHeader.tsx` | teilweise – auf `/get` erst ab md |
| Footer groß | `layout/Footer.tsx` | ja – 1 → 2 → 12 Spalten, QR `max-md:hidden`, Links 44px hoch unter md |
| Footer schlank | `layout/Footer.tsx` (`SlimFooter`) | unklar – feste 72px, eine Zeile; Umbruch nicht geregelt |
| Footer-Abstand | `config/footer.ts`, `FooterByRoute.tsx` | ja – Telefone 96px |
| Bühne | `components/HeroBand.tsx` | ja – unter 1100: Foto oben 4:5, Fläche darunter |
| Streifen | `.ember-strip`, `StripFig.tsx` | teilweise – Höhe fest ab md, Your houses „unter 768 umbrechend“ |
| Container | `layout/Container.tsx`, `.page-container` | ja – Rand `--page-margin` |
| MasterDetail | `layout/MasterDetail.tsx` | ja – 1100 (Messages, Settings) |
| Sheet / Panel | `ui/Sheet.tsx` | ja – Touch oder unter 768: Bottom-Sheet 85 %, Griff |
| Dialog / Modal | `ui/Sheet.tsx` (`DialogSheet`) | ja – unter md unten, volle Breite, `h-dvh` beim Bezahl-Sheet |
| BarSheet (Leisten-Menüs) | `ui/BarSheet.tsx` | nein – hängt am Desktop-Header; Telefone nutzen eigene Chip-Zeile + Sheet |
| MoreMenu | `ui/MoreMenu.tsx` | nein – Popover über `Anchored`, keine eigene Telefon-Form |
| Avatar-Menü | `layout/header/AvatarMenu.tsx` | nein – nur im Desktop-Header |
| Tooltip | `ui/Tooltip.tsx` | ja – nie auf Touch |
| TabBar (Seiten-Tabs) | `ui/TabBar.tsx` | nein – keine Regeln; kein Scrollen bei vielen Tabs |
| CapsuleGroup | `ui/CapsuleGroup.tsx` | nein – feste Spur 44px, kein Umbruch |
| ScrollRow | `ui/ScrollRow.tsx` | ja – auf Touch keine Pfeile |
| Shelf | `components/Shelf.tsx` | ja – Embla, `.explore-slide` = 1 Spalte |
| HouseCard | `components/HouseCard.tsx` | ja – Punkte immer auf Touch, `wide` erst ab 3 Spalten |
| MyHouseTile | `components/MyHouseTile.tsx` | ja – `--my-cols` 2 unter 768 |
| Raster | `.explore-grid`, `.card-grid` | ja – 1 Spalte unter 640 |
| Admin-Rahmen | `admin/AdminShell.tsx` (`AdminFrame`) | ja – Seitenleiste unter lg weg, Bereiche als `ScrollRow` |
| AdminPageHeader | `admin/AdminLayout.tsx` | teilweise – `flex-wrap`, Tabs brechen um |
| AdminTabs | `admin/AdminLayout.tsx` | teilweise – Umbruch statt Scrollen |
| AdminListDetail | `admin/AdminLayout.tsx` | ja – unter lg erst Liste, dann Detail mit „‹ Liste“ |
| BlockMap | `admin/BlockMap.tsx` | ja – unter lg eine Spalte, Linien aus |

## 3 Breakpoints und Tokens

### Breakpoints

| Name | Wert | Wo |
|---|---|---|
| sm | 640px (40rem) | Tailwind-Standard; Raster 2 Spalten |
| md | 768px (48rem) | Tailwind; Header vs. MobileHeader, Sheets |
| lg | 1024px (64rem) | Tailwind; Admin-Seitenleiste, Settings, 3 Spalten |
| `nav-text` | 1024px (64rem) | `globals.css` `--breakpoint-nav-text` |
| `split` | 1100px (68.75rem) | `globals.css` `--breakpoint-split`; Bühne, Messages, Create |
| `nav` | 1200px (75rem) | `globals.css` `--breakpoint-nav` |
| `fit` | ≥ 1100 breit und ≥ 760 hoch | `@custom-variant fit` |
| xl-Raster | 1440px (90rem) | `globals.css`, `--explore-cols` 4 |
| `useIsDesktop()` | 1100px | `lib/useIsDesktop.ts` (JS) |
| Container `bar` | 603 / 473 / 339px, Höhe 132px | `globals.css`, Header-Schnellsuche |
| `max-width: 767px` | Telefon | `globals.css` (`--tabbar-clear`) |

Doppelt: 1100 einmal als `split:` und als `max-[1099px]:` und als `useIsDesktop` (16 Dateien).

### Tokens

| Gruppe | Tokens |
|---|---|
| Sichere Ränder | `--safe-top`, `--safe-bottom` (Simulation 47 / 34) |
| Header | `--header-h` 64, `--header-total`, `--band-h`, `--header-open-total`, `--header-row-total` 108 |
| Telefon | `--tabbar-clear` (76 bzw. 56 + safe-bottom) |
| Seite | `--page-margin` 16px, `--page-top` 64, `--page-top-offset`, `--gap` 16, `--radius-hero` 24 |
| Abstände | `--space-section` clamp(56, 6vw, 96), `--space-inner` clamp(20, 2vw, 32) |
| Raster | `--explore-cols` 1–4, `--explore-gap` 24 / 16, `--explore-w`, `--card-min`, `--card-cols`, `--my-cols` |
| Schrift (fließend) | `text-display`, `text-stage`, `text-hero`, `text-price`, `text-h1`, `text-h2`, `text-name`, `text-section`, `text-figure`, `text-greeting`, `text-stage-quote` |
| Schrift (fest) | `text-h3` 20, `text-row` 24, `text-subhead` 22, `text-lead` 24, `text-body-lg` 17, `text-body` 15, `text-small` 13, `text-eyebrow` 12, `text-nav` 14, `text-nav-main` 15, `text-stage-sm` 44 |
| Spotlight | `--spot-h`, `--spot-w`, `--spot-top` |
| Bühne | `--hero-h` 736, `--stage-image-h`, `--stage-bar-h` 120, `--stage-peek` 70, `--stage-pad` 40, `--stage-bar-num` 30, `--stage-bar-label` 14, `--band-edge` |
| Footer | `--footer-gap` 64 / 0, `--footer-slim-h` 72, `--footer-slim-pad` 12, `--footer-surface` |
| Admin | `--adm-page` 32, `--admin-page-pad` 32, `--adm-section` 40, `--adm-inner` 16, `--adm-row-h` 44, `--adm-capsule-h` 32, `--sidebar-item-h`; Schrift `text-adm-hero` 40, `text-adm-figure` 28, `text-adm-block` 16, `text-adm-motto` 20 |

## 4 Seiten bei 390 px (Schätzung)

| Seite | Einschätzung | Grund |
|---|---|---|
| Explore | ok | Telefon-Chip-Zeile, `SpotlightHero`, 1 Spalte |
| Stadt / Sammlung | ok | `CategoryRow` + Raster |
| House-Seite (Besucher/Host) | ok mit Lücken | HeroBand gestapelt, Streifen als fixe Leiste; 2 feste Breiten in `StayDetail` prüfen |
| House-Seite (Mitglied) | unklar | `MemberHero` nicht auf HeroBand; Stepper nur Punkte laut Regel |
| Manage (Host) | ok | eine Spalte 720px max, Kapsel-Leiste kann umbrechen |
| Your houses | ok mit Lücken | Band gestapelt; Needs you 3 Spalten → Stapel?; Streifen bis 5 Werte |
| Your houses › all | ok | Raster `--my-cols` 2 |
| Payouts | ok | eigene Telefon-Liste; Tabelle mit `min-w` nur ab md |
| Open a House | ok | eine Spalte unter 1100, Vorschau hinter „Preview“; Monate in einer Reihe → Scrollen |
| Messages | ok | Liste / Chat getrennt unter 1100 |
| Profil | zu voll | ganze Bühne inkl. „Your people“ und Places untereinander; Streifen 4 Zahlen + 2–3 Knöpfe |
| Your people | unklar | 2 feste Breiten, keine Breakpoints |
| Saved | ok | Raster |
| Settings | ok | iOS-Muster unter 1024 |
| Edit profile | ok | Liste + Preview-Sheet |
| Invite / Claim | ok | eine Karte; Claim mit `split:` |
| FAQ, Recht, Info | ok | Text max 720px |
| /get | ok | Telefon-Fassung vorhanden |
| Dialoge (Anfrage, Bezahlen, Auth) | ok | unten, volle Höhe beim Bezahlen |
| Admin Übersicht | zu voll | auf eine Desktop-Höhe gebaut; Diagramm + Meilenstein-Leiter nebeneinander erst ab lg |
| Admin Houses / Hosts / Posteingang | ok | AdminListDetail stapelt; Hosts-Liste 52px mit vielen Spalten → eng |
| Admin Wachstum | ok mit Lücken | Funnel-Balken je Zeile; Kennzahlen-Zeile 4 Werte |
| Admin Analyse | läuft aus dem Bild (Tabelle) | Tabelle mit 5 Spalten, nur Tabelle scrollt wenn gekapselt |
| Admin Algorithmus | ok | gemessen 390: Datenpunkt-Zeilen ohne Überlauf (Kapseln `max-sm` aus) |
| Admin Labore | ok | gemessen 390: kein Seitenüberlauf, Grafiken scrollen im eigenen Streifen |
| Admin Vision | ok mit Lücken | gemessen 390 (Der Hof) ok; Zeitleiste 4 Spalten, 13 feste Breiten in der Datei |
| Admin Finanzierung | ok | gemessen 390 (Firmenstruktur) ok; Cap-Table-Rechner nicht gemessen |
| Admin Geld / Steuern | läuft aus dem Bild (Tabellen) | 3 `min-w-[…px]`-Tabellen, 5 Hauptzahlen in einer Reihe |
| Admin Warteliste / Bewerbungen / Log / System | unklar | nicht gezielt geprüft |

## 5 PWA

| Teil | Stand |
|---|---|
| Manifest | ja – `src/app/manifest.ts`, Hintergrund/Theme #111111 |
| Icons | ja – `icon-192/512.png`, `icon-maskable-192/512.png`, `apple-touch-icon.png`, `favicon.svg/.ico/-16/-32/-48`, `icon-1024.png` (nur Stores) |
| Service Worker | nein – keine `sw.js`, keine `navigator.serviceWorker`-Registrierung |
| Offline | nein |
| Push | nein – nur Mock (`lib/notify/channels/push`) |
| Standalone-Erkennung | ja – `lib/install.ts`, Klasse `is-standalone`, Safe Areas |
| Install-Hinweise | ja – `InstallPrompt.tsx`, `/get` |
| App-Badge | ja – `AppBadge.tsx` (`navigator.setAppBadge`) |

## 6 Größte Mobile-Probleme im Code

| # | Problem | Wo |
|---|---|---|
| 1 | Kein Service Worker → keine Installierbarkeit auf Android-Chrome-Niveau, kein Push, kein Offline | PWA |
| 2 | Drei Wege für denselben Umbruch (1100): `split:`, `max-[1099px]:`, `useIsDesktop()` | 16 Dateien |
| 3 | Viele Seiten auf eine Desktop-Höhe ohne Scrollen gebaut (Übersicht, Analyse, Vision, Bühne mit `--stage-peek`) – auf Telefonen bedeutungslos, teils mit festen Höhen | Admin, HeroBand |
| 4 | Admin-Tabellen mit Mindestbreiten (`min-w-[…px]`) und feste Breiten (`w-[…px]`) | AdminVision (13), AdminTaxes, AdminLabs, AdminAreas, Payouts |
| 5 | Menüs ohne Telefon-Form: MoreMenu, Avatar-Menü, BarSheet sind Popover am Knopf; kein Bottom-Sheet | `ui/MoreMenu.tsx`, `AvatarMenu.tsx`, `ui/BarSheet.tsx` |
| 6 | TabBar, AdminTabs, CapsuleGroup ohne Scrollen – viele Tabs (Hosts 6, Posteingang 8) brechen in mehrere Zeilen | `ui/TabBar.tsx`, `admin/AdminLayout.tsx` |
| 7 | Profil: alles in der Bühne – auf Telefonen eine sehr lange Säule; Regel „nichts unter dem Streifen“ passt nicht | `views/ProfileView.tsx` |
| 8 | Streifen mit vielen Zahlen + Knöpfen (Your houses 5, Profil 4 + Knöpfe), Höhe `--stage-bar-h` fest ab md | `.ember-strip` |
| 9 | Schlanker Footer: feste 72px eine Zeile, Umbruch nicht geregelt | `layout/Footer.tsx` |
| 10 | `--page-margin` 16px fest, in CLAUDE.md steht clamp(20px, 3vw, 48px) – Widerspruch | `globals.css` |
| 11 | Hover-Funktionen ohne Touch-Ersatz: Uhrzeiten der Chat-Blasen, Hover-Aktionen, Hover-Hinweise im Admin (Linien der BlockMap) | Messages, BlockMap |
| 12 | Mitglieder-Ansicht `MemberHero` nicht auf HeroBand – eigener, ungeprüfter Telefon-Weg | `stay/MemberHouse.tsx` |
| 13 | Viele Prüfungen in CLAUDE.md nennen nur Desktop-Maße (1280–2560); Prüfmatrix ohne 390 | CLAUDE.md „Responsive“ |

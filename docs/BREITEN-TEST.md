# Breiten-Test

Prüft alle Seiten der App bei allen Breiten der Prüfmatrix (CLAUDE.md › Responsive) und macht von jeder Seite ein Bild. Die Seiten stehen in `src/config/test-routes.ts`; jeder Production-Build bricht ab, wenn dort eine Seite fehlt („Neue Seite /xyz nicht im Breiten-Test“).

## Starten

```bash
npm run test:breiten
```

- Läuft schon ein Server auf `http://localhost:3000`, nutzt der Test ihn. Ist es ein Demo-Server mit Passwort, gib das Passwort mit: `DEMO_PASSWORD=… npm run test:breiten` (es wird nur in die Passwortseite getippt, nie gespeichert oder ausgegeben).
- Läuft keiner, startet der Test selbst einen Server im Demo-Modus (Port 3124, mit einem Einmal-Passwort) und beendet ihn danach. Der erste Start dauert 1–2 Minuten.
- Nur die Hauptseiten (schneller): `KERN=1 npm run test:breiten`.
- Nur einige Seiten oder Breiten: `SEITEN=explore,admin-houses BREITEN=393,1470 npm run test:breiten` – die Namen (`key`) stehen in `src/config/test-routes.ts`.
- Anderer Server: `BASE_URL=http://localhost:3005 npm run test:breiten`.

Angemeldet als Lukas (u1), heller Modus. Ein ganzer Lauf (alle Seiten × 13 Breiten) dauert etwa 30–40 Minuten, `KERN=1` etwa 10–15.

## Neue Seite

Jede neue Seite in `src/config/test-routes.ts` eintragen: Route wie im Ordner `src/app` (`/house/[slug]`), ein kurzer Schlüssel (Dateiname des Bilds), ein Name; bei dynamischen Routen ein Beispiel aus den Demo-Daten (`example`). Seiten, die nur weiterleiten oder nur im Dev-Modus da sind, mit `skip` und einem Grund. Prüfen ohne Build: `npx tsx scripts/check-test-routes.ts`.

## Ergebnisse

- Bilder: `test-results/breiten/<breite>/<seite>.png`, z. B. `test-results/breiten/393/explore.png`
- Bericht: `test-results/breiten/bericht.md` (Zusammenfassung pro Seite, darunter jede Breite mit Link zum Bild)
- Im Terminal am Ende: die Anzahl Fehler pro Seite. Mit Fehlern endet der Befehl mit Code 1.

## Was geprüft wird

1. **Seitlicher Überlauf**: die Seite ist breiter als das Fenster.
2. **Text unter Leisten**: Text, der von einer festen Leiste verdeckt wird (Kopf, Tab-Leiste, Buchungsleiste, Speichern-Leisten), oben und ganz unten gescrollt.
3. **Klickflächen unter 44 px**: nur bei Telefon- und Tablet-Breiten (Touch).
4. **Admin-Seitenleiste scrollbar**: sie darf nie scrollen.

`test-results/` steht in `.gitignore`.

## In GitHub

Der Test läuft automatisch bei jedem Push auf `main` (`.github/workflows/breiten-test.yml`) und lässt sich auch von Hand starten.

1. Im Repository auf **Actions** gehen, links **Breiten-Test** wählen.
2. Den Lauf zum Push öffnen. Grün = keine Fehler, rot = Fehler gefunden. Rot blockiert nichts: der Push ist drin, ein Deployment läuft trotzdem.
3. Auf der Seite des Laufs steht oben die **Zusammenfassung** (Fehler pro Seite) und je Seite mit Fehlern eine Warnung.
4. Ganz unten unter **Artifacts** liegt **breiten-test** (ZIP, 30 Tage): darin `bericht.md` und die Bilder `<breite>/<seite>.png`.
5. Von Hand starten: Actions › Breiten-Test › **Run workflow**.

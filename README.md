This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Auf Mac, iPad und iPhone testen (lokales Netzwerk)

Den Dev-Server starten:

```bash
npm run dev
```

Er hört immer auf das ganze Netzwerk (`next dev -H 0.0.0.0 -p 3000`). Danach auf **allen Geräten im selben WLAN** öffnen:
**http://simpulo.local:3000** – der Bonjour-Name des Macs, bleibt gleich, auch wenn sich die IP ändert. Auf dem Mac selbst geht auch
http://localhost:3000.

Den Namen zeigt `scutil --get LocalHostName` (Systemeinstellungen › Allgemein › Freigaben › Lokaler Hostname). Über die IP des Macs
(`ipconfig getifaddr en0`) geht es ebenfalls, solange sie in 192.168.178.* liegt. Wer einen anderen Namen oder ein anderes Netz nutzt,
trägt ihn in `allowedDevOrigins` in `next.config.ts` ein und startet den Dev-Server neu – sonst blockiert Next.js Hot Reload und
Server-Aufrufe von diesem Gerät.

Über http (statt https/localhost) fehlen dem Browser einige APIs (`navigator.clipboard`, `crypto.randomUUID`, Push). Die App fragt sie nur
mit Prüfung ab; Kopieren läuft über `copyText` (`src/lib/clipboard.ts`) mit Rückfallweg. Mock-Daten und Dev-Menü hängen an
`NODE_ENV` (`src/lib/appMode.ts`), nicht am Hostnamen – in Produktion bleiben beide aus.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

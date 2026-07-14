# pnw-auslastung — Kilanka-Applet

Team-Auslastung für Praxis NeueWege, direkt in Kilanka eingebettet:
Kontingent-Wochenstunden (bewilligte Budgets) je Betreuer (Haupt- und
Mitbetreuer, anteilig) gegen ambulante Sollstunden (Soll minus
Nordstern-Anteile: Schicht, Rufbereitschaft, Bezugsklienten, Leads).

Portierung der verifizierten PowerShell-Auswertung v9 (07/2026).
API-Erkenntnisse: siehe docs/kilanka-api.md im pnw-app-Repo.

## Struktur

- `src/kilanka.ts`   — API-Zugriff + Entpacken der Kilanka-Typen ($date/$decimal/$interval)
- `src/auslastung.ts` — Fachlogik inkl. Nordstern-Parameter (dort pflegen!)
- `src/App.tsx`       — Darstellung (Summen, Detail-Toggle, Pflegestand)
- `kilanka.json`      — deklarierter Daten-Graph des Applets (Datensparsamkeit)

## Setup

Voraussetzungen: Node >= 22, pnpm >= 10 (`corepack enable`).

1. In Kilanka: Konfiguration -> Schnittstellen -> Applet anlegen,
   Applet-Token kopieren.
2. Token AUSSERHALB des Repos ablegen:
   `~/.config/kilanka/pnw-auslastung.env` (chmod 600):
   ```
   KILANKA_APPLET_TOKEN=<Token>
   KILANKA_APPLET_URL=https://neue-wege.kilanka.de
   ```
3. `pnpm install`
4. Entwicklung: `pnpm dev` (Vite-Proxy leitet /be/api/public/v2 mit Token weiter)
5. Veröffentlichen: `pnpm applet:publish`

## Bekannte Einschränkung

Die API v2 liefert quotas.deletedAt noch nicht aus (Support-Fix
angefragt 07/2026) — ersetzte Kontingente werden bis dahin mitgezählt.
Betroffene Zeilen sind mit "mehrere Kontingente" markiert. Der Filter
in `src/auslastung.ts` greift automatisch, sobald das Feld kommt.

## Datenquelle: API v2 (Applet-Token)

Das Applet nutzt ausschliesslich die oeffentliche API v2 ueber den
Applet-Token. Der in `kilanka.json` deklarierte Graph bestimmt, welche
Felder verfuegbar sind.

### Warum nicht der interne RPC?

Kilanka berechnet in der Klientenuebersicht bereits alles, was wir brauchen
(`client.Client.getActionStatus` liefert approvedWeek/performedWeek und
weeklyHours je Betreuer, bereinigt um geloeschte Kontingente). Dieser Weg
ist im Applet jedoch **nicht nutzbar**:

- Applets laufen sandboxed auf eigener Origin (`applet.kilanka.de/<id>/`),
  ohne Session-Cookies der Hauptanwendung.
- Die Content Security Policy blockiert Verbindungen zu
  `neue-wege.kilanka.de/be/api/v2/rpc` (`connect-src`-Whitelist).

Das ist so gewollt: Ein Applet soll nur die Rechte seines Tokens haben.
Die RPC-Module (`src/rpc.ts`, `src/auslastungRpc.ts`) bleiben im Repo, falls
Kilanka die berechneten Werte spaeter offiziell ueber die v2 anbietet — der
Umstieg waere dann ein kleiner Eingriff.

### Bekannte Einschraenkungen (Stand 07/2026)

1. **Geloeschte Kontingente** werden von der v2 ohne Kennzeichnung
   mitgeliefert (`quotas.deletedAt` ist nicht angebunden). Betroffene
   Klienten sind mit "mehrere Kontingente (evtl. Altlasten!)" markiert;
   ihre Summen sind zu hoch. Der Filter in `src/auslastung.ts` greift
   automatisch, sobald Kilanka das Feld liefert. Support-Anfrage laeuft.
2. **Geleistete Stunden** sind ueber die v2 nicht abrufbar — die Auswertung
   zeigt daher nur bewilligte Budgets, keine Soll-Ist-Sicht.

## Schriftart

Kodchasan muss lokal eingebunden werden (die CSP des Applets blockiert
Google Fonts). Die drei .woff2-Dateien (400/600/700) nach `public/fonts/`
legen:

    public/fonts/kodchasan-400.woff2
    public/fonts/kodchasan-600.woff2
    public/fonts/kodchasan-700.woff2

Quelle: https://fonts.google.com/specimen/Kodchasan (Download family).
Ohne die Dateien faellt die Darstellung auf Segoe UI / System-Schrift zurueck.

## Wichtig: Datenabruf nur über das SDK

Ein eigenes `fetch()` funktioniert im veröffentlichten Applet NICHT. Applets
laufen sandboxed auf eigener Origin (`applet.kilanka.de/<id>/`); die Content
Security Policy blockiert Verbindungen zur Kilanka-Instanz. Das SDK löst das,
indem es Anfragen per `postMessage` an die Host-Anwendung weiterreicht (im
Dev-Modus fällt es automatisch auf den Vite-Proxy zurück).

SDK erzeugen (einmalig bzw. nach Graph-Änderungen):

    pnpm sdk:get

### Bekannter SDK-Generator-Bug

Der Generator quotet Property-Namen mit Sonderzeichen nicht. Euer UDF-Feld
`Weiter/Fortbildung` (Schrägstrich!) erzeugt daher ungültiges TypeScript:

    Weiter/Fortbildung?: TextFieldFilter | string | null;   // Syntaxfehler

Nach jedem `pnpm sdk:get` muss das nachgezogen werden (3 Vorkommen):

    'Weiter/Fortbildung'?: ...
    'Weiter/Fortbildung': ...

An Kilanka gemeldet werden — bis zum Fix ist es Handarbeit.

# Orientierungsgespräch (Beta) — Kennzahlen in Teil 4

> App: `orientierungsgespraech-beta.html` · Ablage: SharePoint-Liste `PNW-Orientierungsgespraeche`
> Stand: 20.09.2026

## Datenquellen

| Kennzahl | Quelle | Endpunkt |
|---|---|---|
| Fälle, abrechenbare Stunden, Urlaub, Krankheit | wie Mitarbeiter-Cockpit | `/api/mitarbeiter-cockpit` |
| Arbeitszeitkonto | `rosters/accounts` (`totalHours`, Typ ≠ Urlaub) | `/api/og-kennzahlen` |
| Zeitanteile (Klient / Fahrt / Doku / medial / intern) | `clients/timeSheets` der letzten 3 vollen Monate, Kategorie über den Leistungsnamen (`ogKategorie`), `drivingTime` zählt zu Fahrt; `rosters/timeSheets` ohne Klientbezug zählt zu intern | `/api/og-kennzahlen` |
| Fahrzeug privat / dienstlich | `tour` an `clients/timeSheets` | `/api/og-kennzahlen` |
| Vertragliche Laufleistung | `data/fahrzeuge.json` (aus „KFZ Übersicht PNW.xlsx") | Frontend |

## Fahrzeug-Logik (Vorgabe Markus, 20.09.2026)

- Aktuelles Fahrzeug = Fahrzeug der jüngsten eigenen Fahrt.
- **km-Stand bei Übernahme** = `mileageStartKm` der ersten eigenen Fahrt mit diesem Fahrzeug
  (Vorbesitzer:innen bleiben außen vor).
- **Gefahren** = letzter plausibler km-Stand − km-Stand bei Übernahme.
- **Dienstlich** = Summe aller Fahrtenbuch-Einträge im Zeitraum (alle Einträge gelten als dienstlich;
  `privateTour = true` wird nicht als dienstlich gezählt).
- **Privat** = gefahren − dienstlich.
- Plausibilisierung: km-Stände, die mehr als 3.000 km über dem letzten akzeptierten Stand liegen
  (Tippfehler wie 491.387), und Strecken > 1.000 km werden ignoriert und als Hinweis ausgewiesen.
- Eine Tour hängt ggf. an mehreren Leistungsnachweisen → Deduplizierung über `tour.id`.

## Verifiziert gegen Produktion (20.09.2026)

- Kilanka-IDs sind **UUID-Strings** (nicht numerisch). `$filter: { user: { id: "<uuid>" } }` filtert serverseitig;
  `{ user: "<uuid>" }` und `{ "user.id": … }` ergeben 400 „malformed $filter". Ebenso wirkt `{ tour: { car: { id } } }`
  → alle Fahrten eines Fahrzeugs (alle Fahrer:innen) seit Übernahme sind abrufbar.
- Eine leere Antwort auf den user-Filter heißt „keine Daten" (neue Mitarbeitende), nicht „Filter unwirksam".
- `clients/timeSheets.tour.car` liefert nur die `id`, keinen Namen → Kennzeichen/Leasingdaten kommen über den
  Nachnamen aus `data/fahrzeuge.json`. Privat-PKW (Kilometerabrechnung) haben km-Stand 0 → „kein Dienstwagen".
- `rosters/accounts`: je Person ~11 Konten (Krank, Urlaub, Geburtstag, Fortbildung …). Relevant ist **„Stundenkonto"**;
  der Saldo steht vorzeichenrichtig in `totalQuantity`, `totalHours` ist der Betrag.
- `rosters/timeSheets` ohne `clientTimeSheet` tragen die Kostenstelle: „Nordstern  Erziehung und Betreuung"
  (Gruppendienst → Kategorie *stationär*, keine Overhead-Zeit), „Team", „Fachlicher Austausch" (→ *intern*).
- Typische Fehler im Fahrtenbuch: Tippfehler (200.595 statt 20.595), falsches Fahrzeug gewählt, Nachträge in
  anderer Reihenfolge → Ausreißer nur bei > +3.000 km bzw. < −1.000 km gegenüber dem letzten akzeptierten Stand.
- Abgleich: letzter km-Stand FS-NW 922 aus der API = 28.006 km = Wert der KFZ-Übersicht vom 18.09.2026.

## Abruf-Strategie

Ob Kilanka nach `user` filtert, ist nicht dokumentiert; ein unwirksamer Filter liefert still alle
oder keine Zeilen. Der Worker probt deshalb drei Filter-Varianten mit 50 Zeilen und nutzt nur eine
nachweislich wirksame (dann Historie ab 2023). Sonst Fallback: alle Mitarbeitenden, letzte 12 Monate,
10 Minuten gecacht — der Privatanteil wird dann konsistent innerhalb dieses Fensters berechnet und
Fahrten anderer Personen mit demselben Fahrzeug werden abgezogen.

## Berechtigung

`/api/og-kennzahlen`: eigene Sicht oder Geschäftsführung — bewusst **keine** Teamleitungs-Sicht.
Jeder Zweig ist fail-soft (`{ vorhanden:false, fehler|grund }`); der Bogen zeigt dann das manuelle Feld.

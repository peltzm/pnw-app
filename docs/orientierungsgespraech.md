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

## Abruf-Strategie

Ob Kilanka nach `user` filtert, ist nicht dokumentiert; ein unwirksamer Filter liefert still alle
oder keine Zeilen. Der Worker probt deshalb drei Filter-Varianten mit 50 Zeilen und nutzt nur eine
nachweislich wirksame (dann Historie ab 2023). Sonst Fallback: alle Mitarbeitenden, letzte 12 Monate,
10 Minuten gecacht — der Privatanteil wird dann konsistent innerhalb dieses Fensters berechnet und
Fahrten anderer Personen mit demselben Fahrzeug werden abgezogen.

## Berechtigung

`/api/og-kennzahlen`: eigene Sicht oder Geschäftsführung — bewusst **keine** Teamleitungs-Sicht.
Jeder Zweig ist fail-soft (`{ vorhanden:false, fehler|grund }`); der Bogen zeigt dann das manuelle Feld.

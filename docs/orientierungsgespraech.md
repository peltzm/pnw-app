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

## Abruf-Strategie (gegen Prod verifiziert am 20.09.2026)

- Kilanka-IDs sind **UUID-Strings**. `$filter: { user: { id: "<uuid>" } }` filtert serverseitig;
  `{ user: "<uuid>" }` und `{ "user.id": … }` ergeben 400 „malformed $filter".
- `$filter: { tour: { car: { id: "<uuid>" } } }` funktioniert ebenfalls → nach Ermittlung von Fahrzeug
  und Übernahmedatum lädt der Worker **alle** Fahrten des Fahrzeugs (alle Fahrer:innen) nach.
- Eine leere Probe heißt „keine Daten" (z. B. neue Mitarbeitende), nicht „Filter unwirksam" —
  der 12-Monats-Vollabruf ist nur noch Fallback, falls der Filter fremde Zeilen liefert.
- `clients/timeSheets.tour.car` liefert nur die `id` (kein `recName`) → Kennzeichen/Leasingdaten
  kommen über den Nachnamen aus `data/fahrzeuge.json`.
- Privat-PKW (Kilometerabrechnung) haben Fahrten ohne km-Stand → „kein Dienstwagen".
- `rosters/accounts`: je Person ~11 Konten (Krank, Urlaub, Geburtstag …). Relevant ist das
  **Stundenkonto**; der vorzeichenrichtige Saldo steht in `totalQuantity` (`totalHours` = Betrag).
- `rosters/timeSheets` ohne `clientTimeSheet` tragen die Kostenstelle: „Nordstern  Erziehung und
  Betreuung" = Gruppendienst (zählt als Klientenarbeit **stationär**), „Team"/„Fachlicher Austausch" = intern.
- Typische Fahrtenbuch-Fehler: Ziffer zu viel (200.595 statt 20.595), falsches Fahrzeug gewählt.
  Stände > +3.000 km oder < −1.000 km gegenüber dem letzten akzeptierten Stand werden ignoriert.

## GF-Übersicht

Button „📊 Kennzahlen" je Zeile zeigt alle Werte vorab — auch bevor die Person ihren Bogen angelegt hat
(gleiche Endpunkte mit `?mitarbeiter=`; Berechtigung prüft der Worker). Ergebnis je Sitzung gecacht.

## Berechtigung

`/api/og-kennzahlen`: eigene Sicht oder Geschäftsführung — bewusst **keine** Teamleitungs-Sicht.
Jeder Zweig ist fail-soft (`{ vorhanden:false, fehler|grund }`); der Bogen zeigt dann das manuelle Feld.

## Überarbeitung nach Prüfung durch GF und Teamleitungen (20.09.2026)

- **Skala 1–5 + k. A.**, dazu je Zeile ein Kommentarfeld (`antworten.kommentar[id]`). Letzter Punkt in Teil 1 überall:
  „Ich finde die Orientierungsgespräche hilfreich und wichtig" (`og_nutzen`).
- **Versionen:** Struktur `sektionen: [[Überschrift, Items]]`. Teamleitung = A „Meine Fallarbeit" (Punkte des ambulanten
  Bogens) + B „Meine Teamleitung"; Teil 2 und 3 um die ambulanten Punkte ergänzt. Ambulant + stationär: ASD-Austausch nach
  Dienstplan, Themen „Gesund bleiben" und „Team & Austausch" ergänzt.
- **Wochenstunden / Team:** Team = Name der Teamleitung (Vorgesetzte:r in Entra, `/me/manager` bzw. `/users/{upn}/manager`);
  bei Teamleitungen der eigene Name, bei direkter GF-Unterstellung „Geschäftsführung".
- **Leserkreis:** Sonja, Markus und die Teamleitung. Die Ablage bleibt auf „eigene Elemente + GF" beschränkt; die Teamleitung
  erhält den Bogen bei der Abgabe als E-Mail aus dem Postfach der Person (`Mail.Send`, GF in Kopie). Der Hinweis steht im
  Bogen, im Abgabe-Dialog und in der Einladung.
- **Teil 4:** ohne Quelle-Spalte; Urlaub genommen / verplant / offen; Abwesenheitstage Krankheit / Weiterbildung
  (`krankheit.fortbildungTage` neu im Cockpit-Response, Abwesenheitstyp „Fortbildung"); Arbeitszeitkonto als Saldo zum Tag
  der Freigabe (Kennzahlen werden bei „Final abgeben" neu geladen); Zeile „gefahren seit Übernahme" entfällt.
- **Rufbereitschaft:** über die API nicht abrufbar (geprüft: `onCallExternal` praktisch ungenutzt, keine Leistung/Kostenstelle,
  Dienstplan-Schichten nicht im Graphen) → Feld der Leitung „eine Woche alle … Wochen (Soll: alle 8)".
- **Papier-Option:** „Auf Papier ausfüllen" druckt ein leeres Formular mit Stammdaten und Zahlen & Fakten, Status `Papier`,
  Abgabefrist zwei Tage vor dem Termin (wird aus dem Termin berechnet).

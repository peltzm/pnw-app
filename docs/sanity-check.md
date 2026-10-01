# Sanity Check (sanity-check-beta.html)

Findet vor der Rechnungsstellung Auffälligkeiten in den in Kilanka erfassten Leistungen.
Zugriff: nur Geschäftsführung (Worker: `GF_UPNS`, zusätzlich Entra-Gruppe `PNW-App-Sanity`,
sobald `SANITY_GRUPPE_ID` im Worker gesetzt ist). Gruppe/Redirect-URI: `scripts/erstelle-pnw-app-sanity.ps1`.

## Endpunkte (Worker)
- `GET /api/sanity?monat=YYYY-MM[&frisch=1]` — Treffer + Bearbeitungsstatus (Standard: Vormonat, Cache 5 min)
- `POST /api/sanity/status` `{ monat, key, status: offen|erledigt|ignoriert }` — Status in Workers KV
  (`PNW_DATEN`, Schlüssel `sanity:status:<YYYY-MM>`)

## Regeln
| Regel | Bedingung |
|---|---|
| `ausfall` | Tätigkeit „Termin ausgefallen“, Amt Kelheim oder Regensburg, Dauer > 0,5 h |
| `telefon` | Amt ND/IN/EI/PAF, Kommentar enthält „Telefon…“, Leistung ist weder medialer Kontakt noch Fahrt |
| `medial` | Amt ND/IN/EI/PAF, Leistung „Mediale Kontakte“, Dauer > 15 min |
| `kurz` | Termin-Leistung < 1 h; ausgenommen Tätigkeit Ausfall/Hilfeplangespräch sowie „Übergabe“ in Tätigkeit oder Kommentar; Fahrt, Bericht, Dokumentation, mediale Kontakte zählen nicht als Termin |
| `zeit` | `rosters/timeSheets` ohne `clientTimeSheet`, Kommentar nennt den Nachnamen eines aktiven Klienten (Mitarbeiternamen ausgenommen); `eindeutig` = genau ein Klient, `familie` = mehrere Klienten gleichen Nachnamens, `pruefen` = mehrere Familien |

## Amt-Zuordnung
Leistung → `invoiceSet.id` → `accounting/invoiceSets.action.id` → `clients.actions[].department.name`.
Rückfall, falls kein Abrechnungsprofil greift: Klient mit genau einem Amt.
`department.recName` und `invoiceSet.recipient` liefern über die API nichts — nur `department.name` funktioniert.
Bereichsfilter `{"date":{"$gte":{"$date":…},"$lte":{"$date":…}}}` ist verifiziert (01.10.2026).

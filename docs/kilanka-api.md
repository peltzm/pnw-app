# Kilanka API v2 — Erkundungsergebnisse (verifiziert)

**Instanz:** `https://neue-wege.kilanka.de/be/api/public/v2/`
**Stand:** Juli 2026 · Praxis NeueWege · alle Punkte per Test gegen die Live-API verifiziert

---

## 1. Grundlagen

- **Auth:** `Authorization: Bearer <TOKEN>` — Token wird in Kilanka unter Konfiguration → Schnittstellen erstellt. Der dort konfigurierte Graph bestimmt, welche Felder abfragbar sind.
- **Abfrage:** Immer `POST` mit JSON-Body. Der Body ist ein Feld-Graph (`"feld": 1`), Teilmenge des freigegebenen Graphen.
- **Encoding:** Body zwingend als **UTF-8-Bytes** senden, sobald Umlaute enthalten sind (PowerShell 5.1: `[System.Text.Encoding]::UTF8.GetBytes($body)` + `charset=utf-8`). Sonst: `Request body size did not match Content-Length`.
- **Unbekannte/nicht freigegebene Felder werden stillschweigend ignoriert** (kein Fehler!) — Ausnahme: strukturelle Fehler wie `"udf": 1` beim Abruf ergeben eine Validierungsmeldung.

## 2. Verfügbare Modelle (Endpunkte)

| Modell | Inhalt |
|---|---|
| `clients` | Klienten: Stammdaten, Maßnahmen (actions), Kontingente (quotas), Betreuer (attendants), Kontakte, Konten, Pflegegrade, Gruppen, UDFs |
| `users` | Mitarbeitende: Stammdaten, Verträge, Sollstunden (targetHours), Qualifikationen, Kostenstellen, UDFs |
| `users/absences` | Abwesenheiten: Zeiträume, Typ/Untertyp, Status, Workflow, Atteste, Kind-krank, Urlaubsanspruch, Logs |
| `contacts` | Adressbuch: Kostenträger, Kontaktpersonen, IK-Nummer, EDI, Sammelrechnung, Geokoordinaten |
| `accounting/invoices` | Rechnungen: Nummer, Status, Positionen, dueDate, dunningLevel, isOverdue, paid, deposits, balance |
| `rosters` | Dienstpläne: Pläne je Bereich, Mitarbeiter, Veröffentlichungsstatus |

Namenslogik: teils mit Modul-Präfix (`users/absences`, `accounting/invoices`).

## 3. Pagination & Rate Limit

- **`$limit`** im Body: Standard 10, **Maximum 1000** → bei aktuellen Datenmengen reicht ein Request (Klienten: 289 gesamt, 158 aktiv)
- **`$offset`** im Body für Folgeseiten
- **`$cursor`** im Body (MIT $-Präfix!): Fortsetzungs-Cursor. Der offizielle Power-BI-Connector paginiert so: `$cursor` aus der letzten Antwort in den nächsten Request-Body, Schleife bis data leer oder Cursor sich wiederholt. Gespeichert und später wiederverwendet wirkt er als **Delta-Sync** (liefert seither geänderte Datensätze). Achtung: `cursor` ohne $-Präfix bzw. als Query-Parameter wird ignoriert (kostete uns eine Testrunde).
- **Rate Limit: 10 Anfragen / 5 Sekunden** → bei Schleifen `Start-Sleep` einbauen; gelegentliche `502 Bad Gateway` → Retry einplanen

## 3a. Meta-Endpunkt `allowed-graphs`

`GET /be/api/public/v2/allowed-graphs` (Bearer-Auth) liefert den **kompletten freigegebenen Graphen als JSON** — maschinenlesbare Referenz der eigenen Schnittstellen-Konfiguration. Quelle: offizieller Kilanka-Power-BI-Connector. Nützlich für: Feldreferenz ohne manuelles Kopieren aus der UI, automatischer Abgleich nach Graphen-Änderungen. Zeigt NUR freigegebene Felder, nicht den Maximal-Katalog der API — fehlende Felder findet man über die Graphen-Vorlage in der Kilanka-UI oder den Support.

## 4. Filter (`$filter` im Body)

- **Gleichheitsfilter funktionieren:** `"$filter": { "type": "vacation" }` ✔ (verifiziert)
- **Vergleichsoperatoren (`$gte` etc.) funktionieren NICHT** → `internal server error` (500)
- Datumsbereiche daher clientseitig filtern

## 5. Spezielle Datentypen (müssen entpackt werden!)

| Typ | Beispiel | Entpacken |
|---|---|---|
| Datum | `{ "$date": "2024-04-15" }` | `wert.'$date'` → `[datetime]` |
| Dezimal | `{ "$decimal": "1.00000000" }` | `wert.'$decimal'` → `[double]` |
| Intervall | `{ "$interval": "PT117H" }` | ISO 8601, z.B. `[System.Xml.XmlConvert]::ToTimeSpan(...).TotalHours` |

Betroffen u.a.: `validFrom/Until`, `begin/end`, `reportDueDate`, `deletedAt` ($date); `totalDays` ($decimal); `quotas.approvals.hours`, `overheadHours` ($interval).

## 6. UDFs (benutzerdefinierte Felder)

- In der **Graphen-Konfiguration**: `"udf": 1` gibt alle frei
- Beim **Abruf**: `udf` muss IMMER ein Objekt mit exakten Rufnamen sein — `"udf": 1` → Fehler `body/udf must be object`
- Die „UDF ID" ist der **Rufname des Feldes** (exakte Schreibweise inkl. Umlaute/Leerzeichen)
- Unbekannte UDF-Namen liefern stillschweigend leer

**Mitarbeiter-UDFs (users):** BEH Ausbildung · Datenschutz · Erhöhung · Führerschein · Führungszeugnis · Verfassungstreue · Weiter/Fortbildung (Werte: Datumsangaben)

**Klienten-UDFs (clients):** Bewilligungs-Status · Datenschutz · Entbindung SP · AZR- Nummer · D-Nummer · Deutschland-Ticket · Auszahlung · IBAN · Steuer ID · Transponder · Aufenthalt bis
⚠️ IBAN, Steuer ID, AZR-/D-Nummer sind hochsensibel — nicht in App-Profile aufnehmen, idealerweise aus dem Graphen kürzen.

## 7. Archiv-Logik

- Archivierte **Klienten**: `deletedAt` gesetzt UND `recName` beginnt mit `[archiviert]` (beide Kriterien deckungsgleich, verifiziert: 131 von 289)
- Archivierte **Mitarbeiter** tauchen weiter in `attendants` auf (`recName` mit `[archiviert]`-Präfix) → bei Betreuer-Auswertungen zusätzlich filtern

## 8. Fachliche Strukturen (verifiziert)

**Betreuer-Rollen** (`attendants.attendantKind.name`): `Hauptbetreuer`, `Mitbetreuer`, `Vertretung` — Zuordnungen haben `validFrom/validUntil`.

**Abwesenheiten:** Rohfeld `status` = interne engl. Werte (z.B. `approved`); `type` = engl. Code bei Standard-Typen (`vacation`), **leer bei eigenen Typen** (Regenerationstage, Geburtstag). `absenceType.internalName` analog. Historie reicht mind. bis 04/2024 zurück.

**Kontingente (quotas):** `type` = `single`/`agg` (Einzel-/Sammelkontingent); `limitPeriod` = `approval`/`nolimit`/`month`/`quarter` (Buchungslimit). `approvals` tragen `hours` als $interval mit `validFrom/Until`; bei Mengen-Kontingenten zählt `quantity` ($decimal) statt `hours`. Wochenstunden-Bewilligungen haben oft KEINE validFrom/Until (unbefristet) — Null-Daten einplanen.

**Bewilligungsart = Feld `timeBase`** (per HAR-Mitschnitt der UI identifiziert, RPC `client.ActionQuota.save`):
| UI | Wert | Wochenstunden-Umrechnung |
|---|---|---|
| Poolstunden | `pool` | hours ÷ Wochen des approval-Zeitraums |
| Wochenstunden | `week` | hours unverändert |
| Monatsstunden | `month_current` | hours × 12 ÷ 52 |
| Anzahl | `quantity` | keine Stunden; `quantity`-Feld nutzen |

✅ **UPDATE 07/2026: behoben.** Nach Support-Anfrage hat Kilanka `timeBase` in der API v2 angebunden — das Feld wird jetzt ausgeliefert (Voraussetzung: `"timeBase": 1` im quotas-Block des Graphen freigegeben). Umrechnung verifiziert an Echtdaten: pool 52h/13Wo=4,0 · week 3,0 · month_current 20h×12÷52=4,6. Hinweis: Zwischen Freigabe-Akzeptanz und tatsächlicher Anbindung lagen einige Tage — das Feld war zunächst nur intern (RPC) vorhanden.

**Wichtige Meta-Erkenntnis:** Die Graphen-Konfiguration validiert Feldnamen NICHT — beliebige Felder lassen sich „freigeben" und erscheinen in allowed-graphs, ohne dass die API sie liefert. Freigabe in allowed-graphs ≠ Verfügbarkeit. Verlässlicher Test: Abfrage ausführen und prüfen, ob die Eigenschaft in den Antwort-Objekten existiert (`$obj.PSObject.Properties.Name`).

## 9. Bekannte Fehlermeldungen

| Meldung | Bedeutung |
|---|---|
| `feature not available` | API für Instanz nicht freigeschaltet |
| `invalid authorization header` | Token falsch/fehlt |
| `too many requests` | Rate Limit (10/5s) |
| `Request body size did not match Content-Length` | Umlaute ohne UTF-8-Byte-Encoding |
| `body/udf must be object` | `"udf": 1` beim Abruf statt Objekt |
| `Route POST:... not found` (404) | Modellname existiert nicht |
| `internal server error` (500) | u.a. bei Operator-Syntax in $filter |
| `502 Bad Gateway` | vorübergehend, Retry |

## 10. Architektur-Entscheidung pnw-apps

Zugriff aus den Apps NIE direkt (Token wäre im Client-Code lesbar), sondern über **Cloudflare Worker als Proxy**: Token als Worker-Secret, Entra-ID-Token-Validierung (MSAL), serverseitig definierte Query-Profile (Datensparsamkeit), Pagination/Retry/Archiv-Filter im Worker. Worker-Grundgerüst existiert (kilanka-proxy: wrangler.toml, src/index.js, README).

**Vor Produktivgang:** Token rotieren (Test-Token ist kompromittiert — stand mehrfach im Chat) · sensible Felder aus Graphen kürzen (`notes`, `socialSecurityNumber`, `insuranceNumber`, sensible UDFs) · Tenant-/Client-ID in wrangler.toml · `wrangler secret put KILANKA_TOKEN`.

## 11. Erprobte Auswertungen (PowerShell-Muster vorhanden)

1. **Zuständigkeitsliste:** aktive Klienten → Hauptbetreuer/Mitbetreuer (Ergebnis 07/2026: 158 aktiv, 118 mit HB, 40 ohne = Pflegeliste; 6 Fälle mit verwaistem archiviertem Betreuer; Testklient „Mustermann" im Bestand)
2. **Kontingent-Wochenstunden je Betreuer:** Summe der approvals ÷ Bewilligungszeitraum (vorläufig — korrekt nur für Pool-Bewilligungen, s. Punkt 8; 31 von 120 Zuordnungen ohne gepflegtes Kontingent)
3. **Modell-/Feld-Probing:** unbekannte Felder werden ignoriert → Existenz nur über zurückgelieferte Properties prüfbar, verlässliche Referenz ist die Graphen-Konfiguration in Kilanka bzw. der Endpunkt `allowed-graphs`

## 12. Power BI (offizieller Connector)

Kilanka liefert einen Custom Connector als `.mez` (Publisher: Kilanka GmbH, Beta).

- **Installation:** Datei nach `Dokumente\Power BI Desktop\Custom Connectors\` kopieren; in Power BI Desktop unter Optionen → Sicherheit → Datenerweiterungen das Laden ohne Zertifikatsprüfung zulassen (Connector ist unsigniert)
- **Verbindung:** „Daten abrufen" → „Kilanka" → Hostname `https://neue-wege.kilanka.de` → Auth-Art „Key" = API-Token
- **Verhalten:** Ruft `allowed-graphs` ab und zeigt alle freigegebenen Modelle als Navigationstabelle; paginiert selbständig per `$cursor` in 100er-Schritten
- ⚠️ Nutzt dasselbe API-Token → bei Token-Rotation auch in Power BI aktualisieren. Spezialtypen ($date/$decimal/$interval) kommen als Records an und müssen in Power Query expandiert werden.

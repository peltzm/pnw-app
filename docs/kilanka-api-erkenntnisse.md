# Kilanka API v2 & Applets — Erkenntnisse aus dem Stammdatenblatt-Projekt

Stand: 11.07.2026 · Instanz: neue-wege.kilanka.de · CLI: @kilanka/applet-cli 0.4.0
Referenzimplementierung: Projekt `pnw-stammdatenblatt` (Stammdatenblatt-Applet)
Zweck dieses Dokuments: Wiederverwendung im neuen Berichtsgenerator (Standalone-Web-App
mit Cloudflare-Worker-Proxy, siehe Architekturentscheidung vom 02.07.2026 — Applets
laufen nicht in der Kilanka-Mobile-App, daher dort kein Applet-Ansatz).

---

## 1. Toolchain (Applet-Weg)

Das Starter-Template (`github.com/kilanka/applet-starter-template`) ist React 19 +
TypeScript + Vite, pnpm-only (Node ≥ 22, pnpm ≥ 10, npm/yarn per preinstall-Guard
blockiert). Der Applet-Token liegt außerhalb des Repos in
`~/.config/kilanka/<projektname>.env` (KILANKA_APPLET_TOKEN, KILANKA_APPLET_URL);
die lokale `.env` enthält nur `KILANKA_APPLET_ENV_FILE=<pfad>`. `pnpm sdk:get` lädt
die fertig generierte `src/sdk.ts` von `GET /be/api/public/v2/applets/sdk`
(instanz- und token-spezifisch). `pnpm dev` proxied `/be/api/public/v2` mit
Bearer-Token serverseitig (vite.config.ts). `pnpm applet:publish` baut und lädt
`kilanka.json` + `dist/` als ZIP an `POST /be/api/public/v2/applets/upload`.
Für Builds ohne echten Token genügt eine Dummy-env-Datei — der Token wird nur
für dev-Proxy, sdk:get und publish gebraucht, nicht für `pnpm build`.

Die generierte `sdk.ts` ist tokenfrei (nur Typen + Endpunkt-Wrapper) und gehört
ins Repo. Der SDK-Client unterscheidet zur Laufzeit: im Dev-Modus direkte
Fetches über den Vite-Proxy, im veröffentlichten Applet postMessage-Handshake
mit dem Kilanka-Host (`window.parent.postMessage`).

## 2. Bug: SDK-Generator erzeugt ungültiges TypeScript (Ticket 11.07.2026)

UDF-Namen mit Sonderzeichen werden ungequotet ausgegeben. Konkret erzeugte unser
Mitarbeiter-UDF `Weiter/Fortbildung` an drei Stellen der sdk.ts Zeilen wie
`Weiter/Fortbildung?: 1;` → PARSE_ERROR in Vite/tsc, Template nach sdk:get
unbenutzbar. Das UDF `'BEH Ausbildung'` (Leerzeichen) wird dagegen korrekt
gequotet — die Quoting-Logik kennt Leerzeichen, aber keine Schrägstriche u. Ä.
Workaround: die betroffenen Property-Namen manuell in Anführungszeichen setzen.
Wichtig: Der Workaround geht bei jedem erneuten `sdk:get` verloren — die
reparierte sdk.ts committen und sdk:get nur bewusst neu ausführen, bis der
Generator gefixt ist.

## 3. Sondertypen der API und ihr Parsing

Alle Datums-/Zeit-/Zahlwerte kommen als Wrapper-Objekte, nie als nackte Strings:

| Typ | Beispiel | Bedeutung |
|---|---|---|
| LocalDate | `{ "$date": "2026-03-30" }` | Datum |
| LocalDateTime | `{ "$datetime": "2026-03-30T13:55:21" }` | Zeitstempel (z. B. deletedAt) |
| Duration | `{ "$duration": "PT52H" }` | Stunden (ISO-8601-Dauer) |
| Decimal | `{ "$decimal": "12.3456" }` | Dezimalzahl als String |
| Time | `{ "$time": "13:55:21" }` | Uhrzeit |

Bewährte Parser (siehe `kilankaData.ts`): `kDate()` entpackt $date/$datetime,
`durationToHours()` parst ISO-Dauern inkl. Tage/Minuten und toleriert zusätzlich
$interval-Wrapper, "HH:MM(:SS)" und nackte Zahlen, `decimalToNumber()` entpackt
$decimal. Defensive Toleranz hat sich gelohnt — Formate zwischen Endpunkten
nicht als identisch voraussetzen.

## 4. Kritisches Endpunkt-Verhalten: nicht angebundene Felder

Zentrale Erkenntnis des Tages, für den Berichtsgenerator unbedingt beachten:

Der Schnittstellen-Endpunkt (`/clients` mit Schnittstellen-Token) lässt nicht
angebundene Felder **still weg** — Anfrage mit `timeBase: 1` lief durch,
Quota-Objekte kamen ohne die Property zurück (Befund vom Vormittag, PowerShell).

Der Applet-Endpunkt (gleicher Pfad, Applet-Token bzw. Dev-Proxy) reagiert
härter: Ein problematisches Feld im quotas-Block ließ den **gesamten
quotas-Zweig** kommentarlos wegfallen — kein Fehler, kein Hinweis, einfach keine
Kontingente mehr in der Antwort. Beim Test mit `timeBase` + `quantity` fielen
alle quotas weg; nach Entfernen beider kamen sie; mit `timeBase` allein wieder
angefragt funktionierte es inklusive ausgeliefertem timeBase-Wert. Damit ist
`quantity` (im approvals-Block) als Auslöser überführt, und: **timeBase wird
über den Applet-Endpunkt ausgeliefert** — anders als über den
Schnittstellen-Endpunkt. Diese Diskrepanz gehört als Nachtrag ins
timeBase-Support-Ticket.

Konsequenz als Muster (implementiert in `loadClients()`): Graphen mit
riskanten Feldern selbstheilend laden — erst mit dem Wunschfeld anfragen,
per `hasAnyQuota()`-Prüfung Totalausfall erkennen, dann automatisch mit
reduziertem Graph nachladen und den Vorfall in die Konsole loggen. So bleibt
die App funktionsfähig, und sobald Kilanka ein Feld anbindet, erscheint es
ohne Codeänderung.

## 5. timeBase (Bewilligungsart)

Interner Feldname am Kontingent: `timeBase`. Werte und UI-Begriffe:
`pool` = Poolstunden, `week` = Wochenstunden, `month_current` = Monatsstunden,
`quantity` = Anzahl (Mengen-Kontingent). Ohne timeBase sind die Stundenwerte
der approvals fachlich nicht interpretierbar (52 h gesamt vs. 52 h/Woche).
Anzeige-Konvention im Stammdatenblatt: `"52 h (Poolstunden)"`, Fallback auf
den Kontingentnamen, wenn timeBase fehlt.

## 6. Datenmodell — bestätigte Feldnamen (Clients-Graph)

IDs sind durchgehend **Strings**, nicht Zahlen.

**Klient:** `recName`, `name` (Nachname), `firstName`, `fullName`, `dayOfBirth`
(LocalDate), `street`, `zip`, `city`, `codeName`, `gender.name`,
`currentBirthday`, `cityOfBirth`, `deletedAt` (LocalDateTime),
`contactMechanisms[]` (type, mechanismType.name, value, comment),
`residencePermitStatus`, `socialSecurityNumber`, Versicherungsfelder, `notes`.

**Kontakte des Klienten** (`contacts[]`): `kind.name` (Beziehung, z. B.
Mutter/Vater/Geschwister), **`custodian` (boolean — Sorgeberechtigt!)**,
`contact` mit recName/name/firstName/street/zip/city/contactType/
contactMechanisms, `legalAuthorities[]` (Befugnisse), `comment`.
Sorgeberechtigte = `contacts.filter(c => c.custodian === true)`.
Geschwister/weitere Kinder heuristisch über `kind.name` (Regex
geschwister|bruder|schwester). Achtung: Geburtsdatum der Kontaktperson ist im
Untermodell nicht enthalten.

**Maßnahme** (`actions[]`): `recName` (Anzeigename), `name` (Beschreibung),
`deletedAt`, `mainAction` (boolean), `legalBasis.name` (Rechtsgrundlage),
`validFrom`/`validUntil` (LocalDate, null = offen), **`department.name` (Amt /
Jugendamt)**, **`departmentResponsible.recName` (Ansprechpartner =
Sachbearbeitung)**, `location` (Einsatzort mit Adresse/Telefon),
**`fileReference` (Aktenzeichen)**, **`reportDueDate` (Nächster Bericht)**,
**`nextMeeting` (Nächstes HPG)** — ein "letztes HPG" existiert nicht im Modell.

**Betreuer-Zuordnung** (`actions[].attendants[]`): `validFrom`/`validUntil`,
`user` (id, recName — **keine** E-Mail/Telefon im Untermodell),
`amount` (Decimal — Anteil, z. B. 50 % bei Tandem), `attendantKind.name` mit den
Werten `Hauptbetreuer`, `Mitbetreuer`, `Vertretung`, `comment`.

**Kontingente** (`actions[].quotas[]`): `name`, `type` (single/agg),
`limitPeriod` (approval/nolimit/month/quarter), `timeBase` (s. o.),
`corrections[]` (date, hours, overheadHours, quantity, comment),
`approvals[]` (validFrom/validUntil — bei Wochenstunden oft **beide null** =
unbefristet!, `hours` als Duration, `overheadHours`, `quantity` als Decimal —
**quantity im Graph derzeit nicht anfragen**, killt den quotas-Zweig, s. Punkt 4).

**Users-Modell** (getUsers): name, firstName, dayOfBirth, Adresse,
`weeklyHours`, contracts (mit orgUnit/company), targetHours (Sollstunden),
workQualifications, workCostCenters, orgUnits, udf (u. a. Führungszeugnis,
Datenschutz, "Weiter/Fortbildung", 'BEH Ausbildung'), deletedAt.
**Keine E-Mail-/Telefonfelder im Token-Scope.** E-Mail-Ableitung nach
PNW-Konvention: `recName "Peltz, Sonja"` → `sonja.peltz@praxisneuewege.de`
(lowercase, Umlaute ae/oe/ue/ss, Akzente strippen, nur a–z und Bindestrich;
implementiert in `deriveEmail()`).

## 7. Gültigkeits- und Archivlogik

Archivierte Klienten über **zwei** Kriterien ausschließen: `deletedAt` gesetzt
ODER `recName` beginnt mit `[archiviert]` — deletedAt kommt über das
Applet-Token nicht bei allen Altfällen durch (Befund pnw-auslastung: Sonja
18 → 9 Klienten nach dem Doppel-Filter). Gültigkeitsprüfung überall:
`validFrom ≤ heute ≤ validUntil`, wobei null/fehlend als offen (= gültig)
zählt — das betrifft Maßnahmen, Attendant-Zuordnungen und approvals
gleichermaßen. Bei approvals ohne aktuelle Gültigkeit lieber die jüngste mit
Hinweis anzeigen ("abgelaufen TT.MM.JJJJ" / "ab TT.MM.JJJJ") statt stumm "—".

## 8. Abfrage-Mechanik

Graph-Prinzip: gewünschte Felder mit `1` markieren, verschachtelt; `as const`
am Graph erhält die Literaltypen, sodass das SDK den Ergebnis-Typ exakt
inferiert. Typ-Casts (`as never`) vermeiden — ohne Cast validiert tsc jeden
Feldnamen gegen das generierte Modell (hat alle unsere Best-Guess-Namen in
einem Rutsch verifiziert). Pagination über `$limit`/`$offset` im Request-Body
(bewährt: Seiten à 100, Schleife bis page.length < limit). Delta-Sync über
`$cursor` verfügbar. Jeder genutzte Graph muss in `kilanka.json` deklariert
sein (Obermenge deklarieren ist zulässig — die CLI validiert beim Publish,
zur Laufzeit darf eine Teilmenge angefragt werden). Applets sind strikt
read-only.

## 9. Fachliche Auswahllogik (wiederverwendbar im Berichtsgenerator)

Mitarbeiterliste aus den Attendants ableiten statt getUsers — dann erscheinen
nur Personen, die tatsächlich aktiv als Hauptbetreuer/Mitbetreuer/Vertretung
eingetragen sind. Klientenliste je Mitarbeiter: alle Klienten mit aktiver
Maßnahme, in der die Person eine der drei Rollen hat; bei mehreren Rollen
zählt die höchste (HB > MB > V), Kürzel im Dropdown. Hat ein Klient mehrere
aktive Maßnahmen mit dem Mitarbeiter, drittes Auswahlfeld Maßnahme einblenden.
Sortierung mit `localeCompare(…, "de")`.

## 10. Offene Punkte / Tickets

Ticket timeBase (11.07., Vormittag): Feld im quotas-Graphen der
Schnittstellen-API v2 anbinden — Nachtrag fällig: Applet-Endpunkt liefert es
bereits aus, Schnittstellen-Endpunkt nicht (Diskrepanz), und `quantity` im
approvals-Block lässt am Applet-Endpunkt den gesamten quotas-Zweig wegfallen.
Ticket SDK-Generator (11.07., Nachmittag): ungequotete UDF-Namen mit
Sonderzeichen erzeugen ungültiges TypeScript. Bis zum Fix: reparierte sdk.ts
im Repo halten, sdk:get nicht blind neu ausführen.

## 11. Relevanz für den Berichtsgenerator

Der geplante Cloudflare-Worker-Proxy spricht denselben `/be/api/public/v2`-
Endpunkt mit Schnittstellen-Token — also gilt dort das mildere Verhalten
(Felder werden still weggelassen), aber timeBase fehlt dort bis zum
Support-Fix. Das Stammdatenblatt-Feldmapping (Abschnitt 6) deckt die
S1-Stammdatenseite des Berichtsgenerators nahezu vollständig ab; es fehlen
nur "Letztes HPG" (existiert nicht, stattdessen nextMeeting) und
Kontaktdaten der Fachkräfte (per E-Mail-Konvention ableiten). Die Parser
aus Abschnitt 3 und die Gültigkeits-/Archivlogik aus Abschnitt 7 sind 1:1
übernehmbar — `kilankaData.ts` aus dem Stammdatenblatt-Projekt ist als
Modul dafür geschnitten.

## Support-Fixes vom 13.07.2026

- **quotas.deletedAt verfügbar:** Das Feld `deletedAt` wurde vom Kilanka-Support
  an den Kontingenten (quotas) ergänzt. Worker filtert gelöschte Kontingente
  jetzt in Berichtsgenerator- und Cockpit-Logik aus (zuvor konnten gelöschte
  Kontingente das FLS-Soll verfälschen).
- **SDK-Escaping verbessert:** Das gemeldete Problem, dass UDF-Namen mit
  Sonderzeichen bei der Applet-SDK-Generierung ungültiges TypeScript erzeugten
  (manuell reparierte sdk.ts nötig), wurde laut Support behoben. Beim nächsten
  Applet-Build SDK neu generieren und die manuelle Reparatur entfernen.

## Update 15.07.2026 — offizieller `/documentation`-Endpunkt

`GET /be/api/public/v2/documentation` liefert eine OpenAPI-Spec (Version
2.0.0-wip) als offizielle Feldreferenz → vollständige Auswertung in
**docs/kilanka-api-referenz-offiziell.md**. Wichtigste Konsequenzen für diese
Doku: (1) `$filter` mit Operator-Katalog existiert offiziell (serverseitiges
Filtern statt Vollabzug — Feld-Verdrahtung per Testrequest klären).
(2) `quotas.timeBase` steht offiziell im `/clients`-Graphen → der
timeBase-Widerspruch aus §8/kilanka-api.md löst sich Richtung „verfügbar",
Retest gegen Prod ausstehend. (3) `approvals.quantity` ist offiziell
dokumentiert — der Killt-quotas-Befund vom 11.07. ist damit vermutlich ein
behobener bzw. behebbarer Bug, bis zum Retest gilt weiter: nicht anfragen.
(4) Neu entdeckte Modelle/Felder: `/rosters` (Dienstpläne), `/contacts`
eigenständig, `quotas.corrections`, `users.contracts`/`targetHours`,
Abwesenheits-Workflow inkl. AU-Daten, `invoices.lines.approval` + Mahnwesen/
Zahlungen, `clients.careLevels` (SGB-XI-relevant). Die Spec ist ein
Maximal-Katalog — Freischaltung weiterhin über `allowed-graphs` bzw.
Response-Probing verifizieren.

## Verifikation 21.07.2026 — Scorecard-Probe (Prod, Schnittstellen-Token)

Temporäre Worker-Route `/api/scorecard-probe` (Commit a5d548b, wieder entfernt),
alle sechs Tests bestanden:

- **`/accounting/invoices` freigeschaltet** inkl. `paid`, `balance`,
  `isOverdue`, `dunningLevel`, `depositsTotal`, `totalWithTax` → Finanz-KPIs
  (Umsatz, Forderungen, Mahnwesen) direkt baubar.
- **`users.targetHours` + `contracts` freigeschaltet** — offizielle VZÄ-Quelle.
  `recName` wird am `/users`-Endpunkt weiterhin still ignoriert (Name aus
  `name` + `firstName` bauen).
- **timeBase-Retest bestanden:** `quotas.timeBase` kommt jetzt auch über den
  Schnittstellen-Endpunkt an → Widerspruch aus §4/§10 aufgelöst, Ticket vom
  11.07. erledigt; timeBase-Fallbacks können bei Gelegenheit entfallen.
- **`$filter` verifiziert:** `{ date: { $gte: { $date: … } } }` greift
  serverseitig an `/accounting/invoices` (Plausibilitätsprüfung: keine Treffer
  vor dem Filterdatum) → Monatsabzüge ohne Vollabzug + Client-Filterung.
- **`/documentation` unverändert** seit 15.07.: Version 2.0.0-wip, dieselben
  sieben Endpunkte — kein Spec-Diff nötig.
- `approvals.quantity` bewusst **nicht** getestet (Killt-quotas-Risiko, §4) —
  Retest weiterhin offen, wird für die Scorecard nicht gebraucht.

Produktive Nutzung: Worker-Route `/api/scorecard` (Rechnungen der letzten
12 Monate per $filter, Team-Aggregation über buildCockpit, Akquise über
`hbUpn` in alleHbFaelle).

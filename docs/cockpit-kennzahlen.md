# Cockpit-Modul: FLS-Quote, Regenerationstage & Dienstfahrzeug

> Ablage: `docs/cockpit-kennzahlen.md` im Repo `peltzm/pnw-app`
> Stand: 13.07.2026 · Betrifft: `mitarbeiter-cockpit-beta.html`

## Zweck

Das Modul zeigt jedem Mitarbeitenden im Cockpit drei Kacheln:

1. **FLS-Quote** – abrechenbare Klientenzeit gegen Soll aus den Entgeltkalkulationen
2. **Regenerationstage** – Status je Halbjahr (TVöD SuE: 2 Tage/Jahr)
3. **Dienstfahrzeug** – Zuordnung, Rückgabetermin, DGUV-70-Status

## Dateien

| Datei | Inhalt |
|---|---|
| `mitarbeiter-cockpit-beta.html` | Alles inline (Single-File-Muster wie alle PNW-Apps): Feiertags-Helper, Kalkulations-Benchmark, Regenerationstag-Chips, Fuhrpark-Anreicherung |
| `data/fahrzeuge.json` | Fuhrpark-Stammdaten, generiert aus `KFZ_Übersicht_PNW.xlsx`; wird zur Laufzeit per fetch geladen (graceful fallback, wenn nicht vorhanden) |

Integration in die bestehende Architektur: Die Karten (Urlaub, FLS, Firmenwagen)
werden im gemeinsamen `renderCards()` erweitert — funktioniert damit identisch
im Demo- und im Live-Modus (Worker-Response).

## Kennzahlen-Definition (Herleitung aus Entgeltkalkulationen)

Beide vorliegenden Kalkulationen (eigene HzE-Kalkulation 93,46 €, Stand 04.07.2024,
sowie KEH/Regensburg-Vorlage 92,30 €, Stand 01.11.2023) führen auf dieselbe Quote:

| Kalkulation | Face-to-Face | Netto-Anwesenheit | Quote |
|---|---|---|---|
| Eigene HzE-Kalkulation | 995 h | 1.560 h | **63,8 %** |
| KEH-Vorlage (implizit) | ~971 h | 1.517 h | **64,0 %** |

**Definitionen im Cockpit:**

- **FLS-Quote** = abgerechnete Face-to-Face-Stunden ÷ Netto-Anwesenheitsstunden
  - Soll: **≥ 64 %** · Warnung (gelb): < 58 % · Kritisch (rot): < 50 %
- **FLS+Fahrt-Quote** = (FLS + Fahrzeit) ÷ Netto-Anwesenheit · Soll: **≥ 80 %**
- **Netto-Anwesenheit** = Arbeitstage im Zeitraum (Mo–Fr abzgl. Feiertage Bayern)
  × Tagesstunden (Wochenstunden ÷ 5) − Abwesenheitstage (Urlaub, Krankheit,
  Fortbildung, Regenerationstag)

**Warum Anwesenheit als Nenner?** Auf die vertragliche Jahresstundenzahl
(39 h × 52 = 2.028 h) gerechnet läge die Quote nur bei ~49 % – Urlaub und
Krankheit würden die Kennzahl optisch drücken, obwohl die Leistung identisch
ist. Der Anwesenheits-Nenner macht die Quote fair vergleichbar, auch für
Teilzeitkräfte (Soll skaliert 1:1: 20-h-Kraft → ~12,8 h/Woche am Klienten).

**Diagnose-Logik:** FLS-Quote niedrig, FLS+Fahrt im Soll → Fahrtanteil zu hoch
(Tourenplanung/Fallverteilung prüfen). Beide niedrig → indirekte Zeiten prüfen
(Doku, Meetings).

## Feiertags-Helper Bayern (inline)

- Berechnet gesetzliche Feiertage **dynamisch für jedes Jahr** – keine
  hartcodierten Listen, keine jährliche Pflege nötig.
- Bewegliche Feiertage (Karfreitag, Ostermontag, Himmelfahrt, Pfingstmontag,
  Fronleichnam) über die Gauß'sche Osterformel; verifiziert gegen die
  Referenz-Ostertermine 2024–2027.
- **Mariä Himmelfahrt (15.08.)** ist per Default aktiv (gilt in überwiegend
  katholischen Gemeinden – trifft auf unser gesamtes Einzugsgebiet zu).
  Abschaltbar via `opts.mariaeHimmelfahrt = false`.
- Augsburger Friedensfest (08.08.) per Default aus.
- Exportiert `berechneArbeitstage(vonIso, bisIso, opts)` – Mo–Fr abzüglich
  Feiertage, beide Grenzen inklusive. Referenzwert: **2026 = 252 Arbeitstage**.

## Regenerationstage

- Quelle: Kilanka-Abwesenheiten mit Typ `Regenerationstag`
- Datenfeld im Cockpit-Response: `urlaub.regeneration = { h1: ISO|null, h2: ISO|null }`
- Anzeige als zwei Chips: **H1 (01.01.–30.06.)** und **H2 (01.07.–31.12.)**
- Status: „genommen am TT.MM.JJJJ" (grün) · „offen" (gelb, Halbjahr läuft noch)
  · „nicht genommen" (rot, Halbjahr vorbei)

## Fahrzeug-Kachel

- Quelle: `data/fahrzeuge.json` (18 Fahrzeuge, Stand Juli 2026); Match zuerst
  über Kennzeichen (falls der Worker eins liefert), sonst über Nachname der
  angezeigten Person gegen das Feld `fahrer`
- Anzeige: Fahrzeug, Kennzeichen, Finanzierungsart, km/Jahr, Rückgabedatum
- **Warnungen:**
  - DGUV-70-Prüfung überfällig (Datum ≤ heute) → rot
  - Leasingrückgabe in < 90 Tagen → terrakotta, Hinweis km-Stand prüfen
- Pflegeprozess: Bei Änderung der KFZ-Übersicht die JSON neu generieren und
  per Zwei-Commit-Muster deployen (Feature-Commit + APP_VERSION-Bump)

## Offene Punkte / To-dos

- [ ] FLS-Ist bleibt limitiert: Leistungsdokumentation ist noch nicht im
      Kilanka-API-Graphen freigegeben (Support-Anfrage offen) — bis dahin
      Ist aus Rechnungen (invoices) des Vormonats
- [ ] Regenerationstage im Worker-Endpunkt befüllen: Abwesenheitstyp in
      `users/absences` identifizieren (Feldnamen gegen
      `docs/kilanka-api-erkenntnisse.md` prüfen — stille Feldignorierung!)
- [ ] Worker-Route für Buchhaltungs- und Abwesenheitsendpunkt im
      `pnw-kilanka-proxy` freischalten (rollenbasiert: Mitarbeiter sieht nur
      eigene Daten)
- [x] `fahrzeuge.json` im Repo unter `data/` abgelegt (dieser Commit)
- [ ] Hinweis Datenbestand: 5 Fahrzeuge ohne DGUV-70-Datum (FS-NW 916, 918,
      919, 922 sowie Feld leer bei 918); alle übrigen tragen 09.12.2025 –
      **damit sind Stand heute alle erfassten DGUV-Prüfungen überfällig**,
      bitte Prüftermine aktualisieren

## Soll-Korrektur & Team-Aggregat (Nachtrag 13.07.2026)

**Problem:** Das Monats-Soll wurde naiv als Wochensoll × 52 ÷ 12 gerechnet.
Ein Juni mit Fronleichnam und Urlaub wirkt dann wie Minderleistung
(Beispiel: 77,8 h Ist / 107,5 h Soll = 72 %, korrigiert = 98 %).

**Lösung:** `flsAuswertung(d)` — zentrale Berechnung für Einzelkarte und
Team-Aggregat: Soll korr. = Wochensoll ÷ 5 × verfügbare Arbeitstage des
Ist-Monats. Verfügbare Arbeitstage = Mo–Fr abzgl. Feiertage Bayern
(`berechneArbeitstage`) abzgl. `fls.abwesenheitsTageImMonat`.

**Worker-To-do:** Das Feld `fls.abwesenheitsTageImMonat` (Urlaub + Krankheit
+ Fortbildung + Regenerationstag im Ist-Monat, aus `users/absences`) muss der
Worker noch liefern. Bis dahin korrigiert das Cockpit nur um Feiertage und
zeigt einen entsprechenden Hinweis in der Legende.

**Team-Aggregat:** Wide-Card „Team-Auslastung" für TL (eigenes Team) und GF
(alle) — lädt per Button die Cockpit-Daten aller sichtbaren Mitarbeiter
(Batches à 4, Cache), Tabelle sortiert nach Auslastung aufsteigend
(kritischste zuerst), Summenzeile Σ Ist / Σ Soll korr. Berechtigung bleibt
serverseitig im Worker (Entra-Gruppen) — das Frontend aggregiert nur, was
die Sicht ohnehin hergibt.

## Worker-Patch (13.07.2026, Nachtrag 2)

`worker/src/index.js` liefert jetzt:

- **`fls.abwesenheitsTageImMonat`** — genehmigte Abwesenheiten aller Typen,
  anteilig als Arbeitstags-Überlappung mit dem Ist-Monat (Mo–Fr, Feiertage
  Bayern), gedeckelt auf `totalDays` (halbe Tage bleiben halbe Tage).
  Damit greift die Soll-Korrektur im Cockpit vollständig.
- **`urlaub.regeneration = { h1, h2 }`** — frühester genehmigter
  Regenerationstag je Halbjahr; `classifyAbsence` erkennt den
  Abwesenheitstyp über Name/internalName „regeneration". Befüllt die
  H1/H2-Chips in der Urlaubskarte.
- Feiertags-Helper Bayern (Gauß-Osterformel) als Port aus dem Frontend.

**Deployment:** Worker wird nicht über GitHub Pages ausgerollt —
`cd worker && npx wrangler deploy` lokal ausführen.

**Prüfen nach Deploy:** Falls die Regenerations-Chips leer bleiben, den
tatsächlichen `absenceType.name`/`internalName` des Regenerationstags in
Kilanka prüfen (Response im Netzwerk-Tab) und das Matching in
`classifyAbsence` anpassen — Kilanka-Typbezeichnungen sind konfigurativ.

## Fixes 13.07.2026 (Nachtrag 3)

- **Absences-Cache im Worker:** Transiente Kilanka-Fehler (429/5xx, z. B.
  durch die Team-Aggregat-Abfrage mit 23 Personen) wurden 10 Minuten als
  „Modell nicht freigegeben" gecacht → Urlaub/Krankheit erschienen bei
  einzelnen Mitarbeitern leer. Jetzt: Fehlschläge nur 45 s halten,
  strukturelle Fehler (400/403) von transienten unterscheiden, bei
  transienten Fehlern vorhandene Daten stale weiterverwenden.
- **FLS-Legende:** unterscheidet jetzt „keine Abwesenheiten im Monat" (Feld
  = 0) von „Abwesenheitsdaten gerade nicht verfügbar" (Feld fehlt).
- **Profilfotos aus M365:** Avatar lädt asynchron das Foto über Graph
  (`/users/{upn}/photos/96x96/$value`, Scope User.ReadBasic.All), Blob-URL
  pro UPN gecacht, Fallback bleiben die Initialen. Kein Foto hinterlegt →
  Graph 404 → Initialen.

## Kommende Urlaube (Nachtrag 4)

`urlaub.geplanteTermine = [{ von, bis, tage }]` — genehmigte Urlaube mit
Beginn in der Zukunft, chronologisch sortiert. Die Urlaubskarte zeigt die
nächsten vier Termine mit Datum und Tageszahl, weitere als „+ n weitere".

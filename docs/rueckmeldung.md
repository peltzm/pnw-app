# Zweimonatliche Rückmeldung der Teamleitungen (rueckmeldung.html)

Setzt Abschnitt 5 der Stellenbeschreibung „Teamleitung ambulante Hilfen" (09/2026) und deren
Anlage 1 um: Alle zwei Monate gibt die Teamleitung dem Leitungsteam einschließlich der
Geschäftsführung einen schriftlichen Überblick über die Lage ihres Teams. Kennzahlen und
auslaufende Hilfen kommen automatisch aus Kilanka, die Teamleitung ergänzt Beobachtungen,
Fallanfragen, Personal, Aktivitäten und Bitten. Bei der Abgabe entsteht ein PDF im PNW-CI
(Layout wie Anlage 1), es wird in SharePoint abgelegt und an GF + TL-Ambulant gemailt.

Zugriff: Entra-Gruppe `PNW-App-Rueckmeldung` (darin verschachtelt `TL-Ambulant` und `GF`);
Gruppe und Redirect-URI legt `scripts/erstelle-pnw-app-rueckmeldung.ps1` an.
Der Worker-Endpunkt ist zusätzlich rollenbezogen: eine Teamleitung sieht nur ihr Team
(Entra `directReports`), die GF (`GF_UPNS`) wählt ein Team und sieht die Übersicht aller Teams.
Im Berichtsgenerator (RC) gibt es für TL/GF eine Kachel, die auf die Seite verweist.

## Zeiträume und Frist
- Feste Zweimonatsblöcke: Jan/Feb, Mär/Apr, Mai/Jun, Jul/Aug, Sep/Okt, Nov/Dez.
  Schlüssel ist der Startmonat (`2026-09` = September/Oktober 2026).
- Abgabe bis zum 5. Werktag nach Ende des Zeitraums (Mo–Fr, Feiertage Bayern); der Worker
  liefert `abgabeBis`. Beispiel Sep/Okt 2026 → 06.11.2026, Nov/Dez 2026 → 11.01.2027.
- Standardauswahl in der App: der zuletzt abgeschlossene Block; der laufende Block kann
  bereits als Entwurf bearbeitet werden (FLS des laufenden Monats fehlen dann noch).

## Endpunkte (Worker)
- `GET /api/rueckmeldung?zeitraum=YYYY-MM[&als=<tl-upn>]`
  Kennzahlen für Zeitraum und Vorperiode, auslaufende Hilfen, gespeicherter Stand.
  GF ohne `als`: nur die Liste der Teamleitungen (Konten, die in Entra Manager eines aktiven
  Mitarbeiters sind, GF ausgenommen).
- `POST /api/rueckmeldung` `{ zeitraum, team?, daten, status: entwurf|abgegeben }`
  Speichert in Workers KV (`PNW_DATEN`, Schlüssel `rueckmeldung:<tl-upn>:<zeitraum>`).
  Eine abgegebene Rückmeldung kann nur die GF wieder auf `entwurf` setzen. Max. 60 kB.
- `GET /api/rueckmeldung/liste` (nur GF) — Status je Teamleitung für die letzten vier Zeiträume.

## Kennzahlen (automatisch)
Alle Werte entstehen aus den bereits gecachten Kilanka-Rohdaten, je Teammitglied über
`buildCockpit` (gleiche Regeln wie Mitarbeiter-Cockpit und Scorecard):

| Kennzahl | Quelle / Regel |
|---|---|
| Fakturierbare Stunden | Alle abrechenbaren Stunden der Person, unabhängig von der Betreuerrolle: `clients/timeSheets` der Person im Monat, die eine Rechnung tragen (`invoice.id`); solange der Rechnungslauf des Monats im Team noch nicht gelaufen ist, stattdessen nach Leistungsart (`ogKategorie`: alles außer Fahrt/KM und intern, Kennzeichen `vorlaeufig`). Dazu `rosters/timeSheets` ohne Klientbezug mit Kostenstelle Nordstern/Wohngruppe (Gruppendienst) oder Rufbereitschaft |
| Auslastung % | Fakturierbare Stunden ÷ Soll; Soll = Netto-Arbeitstage (Bayern, abzgl. genehmigter Abwesenheiten) × Vertragsstunden ÷ 5 × 80 % (`RM_FAKTURIERBAR_ANTEIL`, Entgeltkalkulation) |
| Laufende Hilfen | Hauptbetreuungen zum Zeitraumende (bzw. heute); neu/beendet = Differenz der HB-Klienten-IDs zwischen Zeitraumbeginn und -ende |
| Fallanfragen | nicht in Kilanka — manuelle Eingabe (angenommen/abgesagt, je Absage Amt und Grund) |
| Krankheitstage | `users/absences`, Art „krank", Arbeitstage im Zeitraum, gedeckelt auf `totalDays` |
| Überstundensaldo | Summe der Stundenkonten (`rosters/accounts`, Typ „Stundenkonto") — **aktueller Stand**, keine Historie |

Vorperiode = die zwei Monate davor, gleiche Berechnung. „Ziel" trägt die Teamleitung ein; es
wird aus der gespeicherten Vorperiode vorbelegt.

## Auslaufende Hilfen
Laufende Maßnahmen (aktiv heute) mit Hauptbetreuung bei einem Teammitglied, deren Ende
innerhalb von 92 Tagen ab heute liegt. Ende = das frühere von `validUntil` der Maßnahme und
`validUntil` der aktuell gültigen Bewilligung (`pickApproval`, nur zeitbasierte Kontingente).
Je Zeile: Klient (in der App mit Name, im PDF nur Klienten-Nr. und Aktenzeichen), Jugendamt
(Kurzname), Hilfeart, Fachkraft, Ende, Typ (Maßnahme/Bewilligung), nächstes HPG, Wochenstunden.
Die Teamleitung ergänzt Verlängerung (ja/nein/offen) und Grund/nächsten Schritt; „nein" ohne
Grund blockiert die Abgabe. Bereits überschrittene Enden werden rot markiert (Kilanka pflegen).

## Abgabe (Frontend)
1. Pflichtprüfung (Beobachtungen, Fallanfragen, Verlängerung je auslaufender Hilfe, Lernen,
   Personal, mindestens eine Aktivität).
2. PDF mit pdfmake (Kodchasan/Libre Baskerville aus `assets/fonts`, Logo) — Layout wie
   Anlage 1 der Stellenbeschreibung.
3. Upload nach SharePoint `Dokumente/Rueckmeldungen/Rueckmeldung_<zeitraum>_<TL>.pdf`
   (Ordner wird bei 404 angelegt).
4. Mail über Graph `/me/sendMail` an `TL-Ambulant@`, Sonja, Markus mit PDF-Anhang und den
   Beobachtungen im Text.
5. Status `abgegeben` in KV; danach nur lesend. SharePoint- oder Mailfehler brechen die
   Abgabe nicht ab, sie werden angezeigt.

Scopes der Seite: `User.Read`, `Mail.Send`, `Files.ReadWrite.All`, `Sites.ReadWrite.All`
(alle bereits für die App-Registrierung „Verlaufsbericht-App" zugestimmt, vgl. Berichtsgenerator).

## Bekannte Grenzen
- Vorperiode der Fallanfragen zeigt „–" (sie steht nur in der gespeicherten Vorperiode;
  der Worker liefert sie nicht).
- Überstundensaldo ist der Stand beim Abruf, nicht zum Zeitraumende.
- `actions.id` ist im Klienten-Graph nicht angefragt (Freigabe nicht verifiziert) —
  Schlüssel je Hilfe ist `<klientId>|<recName>`.
- Teamzugehörigkeit kommt aus Entra (Manager/directReports), nicht aus Kilanka-OrgUnits.

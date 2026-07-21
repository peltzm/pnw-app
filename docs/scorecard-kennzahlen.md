# Business Scorecard: Kennzahlen, Datenquellen & Worker-Kontrakt

> Ablage: `docs/scorecard-kennzahlen.md` im Repo `peltzm/pnw-app`
> Stand: 21.07.2026 · Betrifft: `business-scorecard-beta.html` + Worker-Route `/api/scorecard`

## Zweck

Eigenständige Scorecard-App für GF-Gesamtblick mit TL-Drilldown. Vier Bereiche:
Finanzen, Auslastung & FLS, Personal, Fallentwicklung. Kopfkarte mit vier
Bereichs-Scores (Ampel → 100/60/20 Punkte im Ring).

## Kennzahlen & Ampellogik

| KPI | Definition | Grün | Gelb | Rot | Quelle |
|---|---|---|---|---|---|
| Umsatz Monat | Σ `totalWithTax` der Rechnungen mit Leistungszeitraum im Monat | Trend | — | — | `/accounting/invoices` |
| Überfällige Forderungen | Σ `balance` mit `isOverdue` ÷ Σ offene `balance` | < 10 % | 10–25 % | > 25 % | `/accounting/invoices` |
| Team-Auslastung | HB-Fälle ÷ VZÄ (Vertragsstunden ÷ 39) | ≥ 7,5 | ≥ 6,8 | < 6,8 | `/clients` + `/users` |
| FLS-Quote Ø | wie Cockpit (`flsAuswertung`, Soll korr.), VZÄ-gewichtet | ≥ 64 % | ≥ 58 % | < 58 % | Cockpit-Logik |
| Krankheitsquote | AU-Tage ÷ verfügbare Arbeitstage (Mo–Fr, Feiertage BY) | < 5 % | 5–8 % | > 8 % | `/users/absences` |
| Netto-Akquise | Zugänge − Abgänge je Team/Quartal (Bestandsdifferenz-Approximation wie Manager-Cockpit) | ≥ +2/Team | ≥ 0 | < 0 | `/clients` Stichtage |

Auslastungs- und Akquise-Ziele aus LuV Teamleitung §5; FLS-Ziel aus den
Entgeltkalkulationen (63,8 %/64,0 %). **Krankheitsquoten-Schwellen sind ein
Vorschlag** (sozialwirtschaftsüblich) — vor Produktivgang mit Sonja abstimmen.

## Architektur

- Single-File-App nach PNW-Muster (MSAL 2.38, CFG identisch zu Cockpit,
  Kodchasan, gleiche CSS-Variablen, Demo-/Live-Modus, Version-Badge).
- Berechtigung **serverseitig** im Worker: Zugriff AUSSCHLIESSLICH für
  GF_UPNS (Sonja + Markus Peltz) — Vorgabe 21.07.2026. Teamleitungen und
  Mitarbeitende erhalten 403; das Frontend zeigt dann eine Zugriffsmeldung
  (kein Demo-Fallback). Die Beta-Store-Kachel bleibt sichtbar, trägt aber
  den Hinweis "nur Geschäftsführung".
- **Team-Zuordnung über die Entra-Hierarchie** (Manager laut Azure AD, wie
  Organisation-App): GF und direkt der GF Zugeordnete → "GF & Verwaltung",
  Führungskräfte führen ihr eigenes Team, alle anderen folgen ihrer
  Führungskraft. Die Kilanka-orgUnits bilden die realen Teams NICHT ab
  (Befund 21.07.2026: 18 Personen in "Ambulante Jugendhilfe"); sie dienen
  nur als Fallback ohne Graph-Token.
- **FLS-Verdachtsmarker:** Quote > 105 % ⇒ Soll vermutlich unvollständig
  (Maßnahme ohne bewertetes Kontingent) — als ⚠ ausgewiesen, nicht als
  Überperformance zu lesen. Teamleitungs-Quoten zusätzlich mit Vorsicht
  (Leitungsanteil mindert das FLS-Soll fachlich).
- Fällt der Live-Endpunkt aus, wechselt die App transparent in den
  Demo-Modus mit Hinweisleiste (kein weißer Bildschirm).

## Worker-Kontrakt (neu zu bauen)

`GET /api/scorecard?monat=YYYY-MM` → JSON, Struktur = `DEMO`-Konstante in der
App. Kernfelder: `rolle` (tl|gf, serverseitig ermittelt), `finanzen`
(umsatzMonat/-Vormonat/-Verlauf, forderungen, topSchuldner, umsatzNachAmt),
`teams[]` (vzae, faelle, flsQuote, krankQuoten, akquiseQuartal, mitarbeiter[]
nur in der berechtigten Sicht), `fallbestandVerlauf`, `hinweise[]`.

Empfohlene Umsetzung im `pnw-kilanka-proxy`:

1. **Invoices-Route freischalten** und cachen (15 min): Vollabzug des
   Monats via `$filter` auf `date`/`deliveryFrom` testen — falls `$filter`
   noch nicht verdrahtet ist (WIP-Spec!), Fallback Pagination + Client-Filter.
2. **Team-Mapping** `AMT_TEAMS` vom Frontend in den Worker ziehen (eine
   Quelle für Cockpit und Scorecard).
3. **Stichtags-Snapshots** für Akquise: bestehenden `stichtag`-Mechanismus
   des Manager-Cockpits wiederverwenden; mittelfristig `$cursor`-Delta-Sync.
4. **VZÄ** aus `users.targetHours` (offizielle Soll-Stunden-Historie) statt
   `weeklyHours`, gültigkeitsgefiltert zum Monatsende.

## Offene Zugriffe / Vorbedingungen

- [x] `/accounting/invoices` verifiziert (21.07.2026): paid, balance,
      isOverdue, dunningLevel, depositsTotal, totalWithTax kommen an
- [x] `$filter` verifiziert (21.07.2026): date-$gte greift serverseitig an
      /accounting/invoices — produktiv in fetchScorecardInvoices im Einsatz
- [x] `users.targetHours`/`contracts` verifiziert (21.07.2026)
- [x] `/documentation` geprüft (21.07.2026): unverändert 2.0.0-wip
- [ ] Redirect-URI `business-scorecard-beta.html` in Entra-App-Registrierung
      nachtragen (bekanntes Muster, s. Cockpit-Beta)
- [ ] Kostendaten (BWA/DATEV) sind nicht in Kilanka — Personalkostenquote &
      Deckungsbeitrag erst in Ausbaustufe 2 (monatlicher Upload o. manuelle
      Eingabe mit SharePoint-Ablage statt localStorage)
- [ ] FLS-Ist bleibt bis zur Freigabe der Leistungsdoku im API-Graphen aus
      Rechnungen des Vormonats (Support-Anfrage offen, s. Cockpit-Doku)

## Deployment

Zwei-Commit-Muster: Feature-Commit + `APP_VERSION`-Badge-Bump (Git-SHA).
Worker separat: `cd worker && npx wrangler deploy`.

## Live-Befunde 21.07.2026 (Erstabruf Juni 2026)

Umsatz Juni 134,8 T€ (Ø H1 ca. 143 T€), Fallbestand 118 (Ende Juni), Netto-
Akquise Q2 gesamt +16. **Handlungsbedarf Forderungen:** 58,8 T€ offen und
vollständig überfällig bei durchgängig Mahnstufe 0 — kein Mahnlauf in Kilanka
aktiv; größter Posten Kelheim 32,5 T€ (älteste Fälligkeit 50 Tage). FLS-Quoten
> 100 % bei drei Personen → Soll-Lücken in den Kontingenten prüfen (Marker in
der App). Offen für v2: flsVormonat (zweiter Stichtagslauf), Kostendaten (BWA).

## BWA-Modul (Ausbaustufe 2, umgesetzt 21.07.2026)

Quelle: SharePoint-Liste **PNW-BWA** (Website praxisneuewegesonjapeltz978),
Zugriff clientseitig via Graph mit Sites.ReadWrite.All (wie Spesenabrechnung),
nur in der GF-Sicht. Spalten (Typ Zahl): `Umsatzerloese`, `Personalkosten`,
`Gesamtkosten`, `Betriebsergebnis`; `Title` = Monat im Format JJJJ-MM;
optional `Kommentar` (Text). Erfassung in der Scorecard: DATEV-CSV-Import
(Zeilenerkennung Umsatzerlöse/Personalkosten/Gesamtkosten/Betriebsergebnis,
letzter Zahlenwert der Zeile, windows-1252) mit manueller Prüfung, oder
Direkteingabe. Kennzahlen: **Personalkostenquote** = Personalkosten ÷
BWA-Umsatz (Schwellen-VORSCHLAG: grün < 82 %, gelb 82–88 %, rot > 88 % —
mit Entgeltkalkulation abgleichen!), **Betriebsergebnis**, **Abgleich**
BWA-Umsatz vs. Kilanka-Umsatz (Toleranz 5 % grün). Kein Worker-Anteil.

## Zahlungsabgleich (umgesetzt 21.07.2026)

Karte "Zahlungsabgleich" (nur GF): Kontoauszug als CSV hochladen → Abgleich
gegen die offenen Kilanka-Rechnungen (`finanzen.offeneRechnungen` aus dem
Worker: Nummer, Saldo, Brutto, Empfänger, Fälligkeit). **Verarbeitung
vollständig im Browser** — Bankdaten werden weder hochgeladen noch
gespeichert; kein Bank-API-Zugriff (bewusste Entscheidung). Parser: Header-
Erkennung (Betrag/Verwendungszweck/Datum/Auftraggeber, ; oder , als
Trenner, Anführungszeichen, windows-1252, deutsche Zahlenformate), nur
Gutschriften. Matching zweistufig: (1) normalisierte Rechnungsnummer im
Verwendungszweck+Auftraggeber = sicherer Treffer, (2) Betragsgleichheit
(Saldo oder Brutto, ±1 Cent) = Treffer mit Prüfhinweis. Ergebnis: Liste
"bezahlt, aber in Kilanka noch offen" → manuell im Kilanka-Rechnungswesen
als bezahlt erfassen.

### Rechnungsnummern-Format (Hinweis Markus, 21.07.2026)

`RE<Jahr>-<Monat>-<Fortlaufnummer>`, Fortlaufnummer beginnt am Jahresanfang
neu. Ämter schreiben teils nur die letzten 4–5 Ziffern (Fortlaufnummer) in
den Verwendungszweck. Matching-Konsequenz: Kurzformen (mit RE/Rg/Nr-Marker,
führende Nullen egal) werden erkannt; bei jahresübergreifend mehrdeutiger
Kurznummer bindet die Zuordnung nur mit zusätzlichem Betragsbeweis.
Gutschriften mit fremder Nummern-Referenz sind für Betragsvergleiche gesperrt.

### BWA-PDF-Import (21.07.2026)

DATEV-PDFs werden direkt im Browser geparst (pdf.js, Zeilen aus Y-Koordinaten
rekonstruiert — Stream-Reihenfolge verwürfelt sonst die Spalten):
**KER** → Monat, Umsatzerlöse, Personalkosten, Gesamtkosten, Betriebsergebnis
(jeweils erster Betrag der Label-Zeile = Monatsspalte). **SuSa** → betriebliche
Liquidität (Salden 1600 + 1800–1830, letztes S/H-Paar der Kontozeile) und
Forderungen Kto 1200 als DATEV-Gegenprobe zu Kilanka. Liste PNW-BWA braucht
dafür zwei weitere Zahl-Spalten: `Liquiditaet`, `ForderungenDatev` (App fällt
ohne sie auf Kernwerte zurück). PK-Quoten-Schwellen kalibriert: grün < 60 %,
gelb 60–70 %, rot > 70 % (Ist H1/2026: ≈ 50 %; Juni 54,8 %).
Verifiziert gegen reale Mai-/Juni-PDFs (Liquidität Juni 279.238,42 €,
Forderungen 183.812,94 €).

# Kilanka API v2 — Offizielle Feldreferenz (`/documentation`)

**Quelle:** `GET /be/api/public/v2/documentation` (Bearer-Auth) liefert eine
OpenAPI-Spezifikation. Stand des Abrufs: 15.07.2026 · API-Version laut Spec:
`2.0.0-wip` (Server-Eintrag `localhost:4000`, Beschreibung „wip").

**Einordnung — drei Wahrheiten auseinanderhalten:**
1. `/documentation` = **Maximal-Katalog** der API (Work in Progress, kann der
   Produktions-Freischaltung vorauslaufen).
2. `allowed-graphs` = was für **unser Token tatsächlich freigeschaltet** ist.
3. Die Response selbst = was **wirklich ankommt** (stille Feldignorierung gilt
   weiterhin, s. Erkenntnisse §3).

Neue Felder aus dieser Referenz daher vor Produktivnutzung einmal per
Testrequest verifizieren.

## Endpunkte

| Endpunkt | Methode | Inhalt |
|---|---|---|
| `/documentation` | GET | diese OpenAPI-Spec |
| `/clients` | POST | Klienten inkl. Maßnahmen, Kontingente, Konten, Pflegegrade |
| `/users` | POST | Mitarbeitende inkl. Verträge, Soll-Stunden, Kostenstellen |
| `/users/absences` | POST | Abwesenheiten inkl. Workflow, AU-Daten, Kind-krank |
| `/contacts` | POST | Kontakte als **eigenständiges Modell** (neu für uns) |
| `/rosters` | POST | **Dienstpläne** (neu für uns): Pläne, Veröffentlichung, Bereiche |
| `/accounting/invoices` | POST | Rechnungen inkl. Mahnwesen, Zahlungen, Salden |

## Request-Mechanik (offiziell bestätigt bzw. neu)

- `$limit` / `$offset`: Pagination wie bekannt.
- `$cursor`: offiziell dokumentiert — „Fetch records newer than previously
  fetched records; safe to store and reuse" → bestätigt den Delta-Sync-Befund
  aus der Power-BI-Analyse.
- **`$filter` (NEU):** Alle sechs Modelle akzeptieren ein `$filter`-Objekt.
  Die Spec definiert typisierte Filter-Schemas mit den Operatoren
  `$eq`, `$neq`, `$in`, `$notIn`, `$lt`, `$lte`, `$gt`, `$gte`, `$range`
  (2-Tupel), `$contains`, `$notContains`, `$startsWith`, `$endsWith` —
  je Feldtyp (text/integer/date/dateTime/decimal/duration/time/uuid, jeweils
  auch als Null-Variante). Die Feld-Verdrahtung ist im WIP-Spec als freies
  Objekt gehalten (`additionalProperties: true`) — welche Felder konkret
  filterbar sind, per Testrequest klären. Potenzial: Stichtags- und
  Aktiv-Filter serverseitig statt Vollabzug + Client-Filterung.

## Sondertypen

`date`, `dateTime`, `time`, `decimal`, `duration` — jeweils plus
Null-Variante. Deckt sich mit den bekannten `$date`/`$datetime`/`$decimal`/
`$interval`-Wrappern aus Erkenntnisse §2.

## Abgleich mit unserem Reverse-Engineering-Stand

| Befund (Erkenntnisse-Doku) | Status laut offizieller Referenz |
|---|---|
| `quotas.timeBase` nur im Applet-Endpunkt | **Widerspruch aufgelöst:** timeBase steht offiziell im `/clients`-Graphen des Schnittstellen-Endpunkts → Retest, dann Fallback im Berichtsgenerator entfernen |
| `approvals.quantity` killt quotas-Zweig | quantity ist **offiziell dokumentiert** (approvals: id, validFrom, validUntil, hours, overheadHours, quantity) → Bug vom 11.07. gegen Prod retesten; bis dahin weiter nicht anfragen |
| `quotas.deletedAt` seit 13.07. | offiziell bestätigt |
| Pagination/Cursor | offiziell bestätigt (s. o.) |
| Feld-Probing nötig | bleibt nötig (WIP-Katalog ≠ Freischaltung) |

## Für uns neue, relevante Felder

- **`clients.careLevels`** (+ `currentCareLevels`, Beratungsdaten): Pflegegrade —
  direkt relevant für die SGB-IX/XI-Expansion (BEW/TWG).
- **`clients.accounts`** komplett: Kontotypen, Salden (`totalAmount`,
  `totalOpen`), `prescriptions` (Verordnungen mit Stunden), Buchungszeilen.
- **`actions.location`** (Einrichtung mit Adresse), `actions.name`,
  **`quotas.corrections`** (Datum, Stunden, Menge, Kommentar) — Korrekturen
  waren uns bisher unbekannt und erklären ggf. Differenzen FLS-Ist vs. Rechnung.
- **`attendants.comment`**.
- **`users.contracts`** (Vertrag, OrgUnit, Firma, Gültigkeit) und
  **`users.targetHours`** (Modell, Monats-/Wochenstunden, Gültigkeit) —
  offizielle Quelle für Soll-Stunden-Historie; `employmentId`, `workCostCenters`.
- **`absences`**: kompletter Genehmigungs-Workflow (`workflowStage`,
  `absenceStatus`, `logs`), AU-Daten (`attestationType/Date/Since/Until`),
  Kind-krank-Felder (`childName/FirstName/DayOfBirth`), `vacationEntitlement`,
  `accountLines` (Stunden-Buchungen je Abwesenheit).
- **`invoices`**: `lines.approval` (Rechnungszeile ↔ Bewilligung — die präzise
  FLS-Zuordnung), Mahnwesen (`dunningLevel`, `dunningDueDate`, `isOverdue`),
  Zahlungen (`paid`, `deposits`, `depositsTotal`, `balance`, `totalWithTax`).
- **`/rosters`**: Dienstpläne mit `plans` (Gültigkeit, `published`, Nutzer,
  Bereiche) — Kandidat für eine Nordstern-Dienstplan-Sicht im Cockpit.

## Vollständige Feldbäume (aus der Spec generiert)

Fettdruck = Relation/Unterobjekt. `udf` = Zusatzfelder (Struktur
konfigurationsabhängig, nicht in der Spec ausdetailliert).


### `/clients`

- id
- deletedAt
- createDate
- writeDate
- **createUser**
  - id
  - fullName
  - recName
- **writeUser**
  - id
  - fullName
  - recName
- addressLatitude
- addressLongitude
- name
- recName
- firstName
- fullName
- codeName
- **gender**
  - id
  - name
- dayOfBirth
- currentBirthday
- avatarColor
- street
- streetAddition
- zip
- city
- cityOfBirth
- accountNumber
- costCenter
- **residencePermitStatus**
  - id
  - recName
- socialSecurityNumber
- insuranceNumber
- insuranceIk
- **insuranceCompany**
  - id
  - recName
  - locationName
- notes
- **contactMechanisms**
  - id
  - type
  - **mechanismType**
    - id
    - name
  - value
  - comment
  - invoice
- **contacts**
  - id
  - **kind**
    - name
  - custodian
  - **contact**
    - id
    - recName
    - name
    - firstName
    - street
    - zip
    - city
    - **contactType**
      - id
      - name
    - **contactMechanisms**
      - id
      - type
      - **mechanismType**
        - id
        - name
      - value
      - comment
  - comment
  - **legalAuthorities**
    - id
    - name
- **accounts**
  - id
  - createDate
  - **createUser**
    - id
    - recName
  - writeDate
  - **writeUser**
    - id
    - recName
  - **client**
    - id
    - fullName
  - **type**
    - id
    - name
  - totalAmount
  - totalDirect
  - totalOpen
  - kurzzeitPflege
  - validFrom
  - openedUntil
  - validUntil
  - recName
  - **prescriptions**
    - id
    - hours
    - validFrom
    - validUntil
    - description
  - **lines**
    - id
    - date
    - **origin**
      - id
      - name
    - **type**
      - id
      - name
    - **account**
      - id
      - **type**
        - **type**
      - validUntil
    - quantity
    - amount
    - unitPrice
    - direct
    - balance
    - balanceDirect
    - description
- **actions**
  - id
  - name
  - deletedAt
  - recName
  - **client**
    - id
  - mainAction
  - **legalBasis**
    - id
    - name
  - validFrom
  - validUntil
  - **department**
    - id
    - name
  - **departmentResponsible**
    - id
    - recName
  - **location**
    - id
    - name
    - street
    - zip
    - city
    - phone
    - mobilePhone
  - fileReference
  - reportDueDate
  - nextMeeting
  - **attendants**
    - validFrom
    - validUntil
    - **user**
      - id
      - recName
    - amount
    - **attendantKind**
      - id
      - name
    - comment
  - **quotas**
    - name
    - type
    - limitPeriod
    - timeBase
    - deletedAt
    - **corrections**
      - id
      - date
      - hours
      - overheadHours
      - quantity
      - comment
    - **approvals**
      - id
      - validFrom
      - validUntil
      - hours
      - overheadHours
      - quantity
- **orgUnit**
  - id
  - recName
  - name
  - deletedAt
- **groups**
  - id
  - **group**
    - id
    - recName
    - name
    - color
  - validFrom
  - validUntil
  - comment
- **validTags**
  - id
  - color
  - name
- **careLevels**
  - id
  - validFrom
  - validUntil
  - **careLevel**
    - id
    - level
    - name
- currentCareLevels
- careLevelNextConsultation
- careLevelInternalConsultation
- **careLevelInternalConsultant**
  - id
  - recName
- udf

### `/users`

- id
- writeDate
- addressLatitude
- addressLongitude
- **gender**
  - name
- titleName
- firstName
- name
- dayOfBirth
- employmentId
- street
- streetAddition
- zip
- city
- weeklyHours
- **contracts**
  - **contract**
    - id
    - name
  - **orgUnit**
    - id
    - name
    - **company**
      - id
      - name
  - validFrom
  - validUntil
- **targetHours**
  - **model**
    - name
  - monthlyHours
  - weeklyHours
  - validFrom
  - validUntil
- **workQualifications**
  - **qualification**
    - name
  - validFrom
  - validUntil
- **workCostCenters**
  - validFrom
  - validUntil
  - **mainCostCenter**
    - name
    - number
  - **costCenters**
    - share
    - **costCenter**
      - name
      - number
- **orgUnits**
  - id
  - name
- udf
- deletedAt

### `/users/absences`

- id
- writeDate
- createDate
- **createUser**
  - id
  - recName
- **writeUser**
  - id
  - recName
- **user**
  - id
  - fullName
  - recName
- begin
- end
- **attestationType**
  - id
  - name
  - internalName
- attestationDate
- attestationSince
- attestationUntil
- status
- type
- **subType**
  - name
- totalDays
- calendarDays
- dirtyForAdmin
- dirtyForUser
- childName
- childFirstName
- childDayOfBirth
- **vacationEntitlement**
  - description
- **absenceResponse**
  - id
  - name
- **workflowStage**
  - id
  - name
  - sequence
- **absenceStatus**
  - id
  - name
  - internalName
- **absenceType**
  - id
  - recName
  - name
  - internalName
  - color
  - **type**
    - id
    - name
    - internalName
  - **accountType**
    - id
    - name
  - **subTypes**
    - id
  - **timeSource**
    - id
    - name
    - internalName
- **absenceSubType**
  - id
  - name
- **logs**
  - id
  - createDate
  - **createUser**
    - fullName
  - text
- automaticDistribution
- customDistribution
- **accountLines**
  - id
  - date
  - hours
  - quantity
  - **account**
    - **type**
      - id
      - name
      - **type**
        - internalName

### `/contacts`

- id
- accountNumber
- ediRoutingId
- ikNumber
- addressLatitude
- addressLongitude
- avatarColor
- avatarImage
- city
- **client**
  - id
  - fullName
- comment
- **company**
  - id
  - name
  - recName
  - **contactType**
    - id
    - name
  - zip
  - city
  - street
  - streetAddition
  - shortName
- **contactMechanisms**
  - id
  - comment
  - type
  - value
  - **mechanismType**
    - id
    - name
  - invoice
- **contactTitle**
  - id
  - name
- **contactType**
  - id
  - name
- **clientContact**
  - **client**
    - id
  - **kind**
    - id
    - name
- deletedAt
- email
- fax
- firstName
- kind
- mobilePhone
- name
- phone
- recName
- locationName
- reference
- shortName
- street
- streetAddition
- **subType**
  - id
  - name
  - deletedAt
- title
- type
- **user**
  - id
  - **orgUnits**
    - id
- zip
- dtaProduction
- doBulkInvoice
- createDate
- writeDate
- **createUser**
  - id
  - fullName
  - recName
- **writeUser**
  - id
  - fullName
  - recName
- udf

### `/rosters`

- id
- name
- comment
- **orgUnit**
  - id
  - recName
- **holidaySet**
  - id
  - recName
- deletedAt
- planCount
- **plans**
  - id
  - name
  - validFrom
  - validUntil
  - published
  - deletedAt
  - **users**
    - id
    - recName
  - **areas**
    - id
    - name
- writeDate

### `/accounting/invoices`

- id
- createDate
- **createUser**
  - id
  - recName
- writeDate
- **writeUser**
  - id
  - recName
- deletedAt
- generated
- date
- deliveryFrom
- deliveryUntil
- number
- displayNumber
- **stateType**
  - id
  - name
- **type**
  - id
  - name
- accountNumber
- **client**
  - id
  - fullName
  - recName
  - customerNumber
- **clientAccount**
  - id
  - recName
  - **type**
    - name
- clientName
- introduction
- closing
- comment
- **tags**
  - id
  - name
  - color
- **orgUnit**
  - id
  - recName
- **company**
  - id
  - name
  - recName
- companyName
- companyStreetAddition
- companyStreet
- companyZip
- companyCity
- **recipient**
  - id
  - **contactTitle**
    - id
    - name
  - recName
  - **company**
    - id
  - firstName
  - name
  - city
  - street
  - streetAddition
  - title
  - type
  - zip
  - locationName
- recipientCompany
- **recipientTitleType**
  - id
  - name
- recipientFirstName
- recipientName
- recipientStreet
- recipientStreetAddition
- recipientZip
- recipientCity
- recipientCountry
- **recipientResponsible**
  - id
  - recName
  - **contactTitle**
    - id
    - name
  - firstName
  - name
- **financialResponsible**
  - id
  - recName
- fileReference
- contraAccountNumber
- costCenter
- **invoiceSet**
  - id
- **lines**
  - id
  - **approval**
    - id
  - costCenter
  - description
  - quantity
  - sequence
  - **service**
    - id
    - name
  - **tax**
    - id
    - name
    - rate
  - taxName
  - taxRate
  - unitPrice
- dueDate
- originalDueDate
- dunningDueDate
- dunningLevel
- isOverdue
- paid
- **deposits**
  - id
  - date
  - amount
- totalWithTax
- depositsTotal
- balance

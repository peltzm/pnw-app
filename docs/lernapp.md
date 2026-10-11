# Lernapp Soziale Arbeit (lernapp.html)

Lernkarten für Sonjas Studium der Sozialen Arbeit (isba). Die App liest die Unterlagen aus dem
OneDrive-Ordner `ISBA` (Stammverzeichnis von Sonjas OneDrive) – Dateien und das dort liegende
OneNote-Notizbuch –, lässt Claude daraus Karten erzeugen und fragt sie nach einem
Wiederholungsplan ab. Vorbilder: retain.cards, StudySmarter.

Zugriff: Entra-Gruppe `PNW-App-Lernapp` (Sonja und Markus als direkte Mitglieder), angelegt mit
`scripts/erstelle-pnw-app-lernapp.ps1`. Kachel im Portal mit `data-scharf`.

## Ablauf

1. **Abgleich beim Öffnen.** Die App listet den Ordner über Graph mit der Anmeldung der Nutzerin
   und vergleicht mit den bereits eingelesenen Quellen (Version = `cTag` der Datei bzw.
   `lastModifiedDateTime` der Notizseite). Es gibt keinen Nachtlauf und keinen Dauerzugang im
   Worker: ohne Öffnen der App passiert nichts.
2. **Zerlegen.** PDF werden im Browser mit pdf-lib in Abschnitte von rund 10 Seiten geteilt
   (bis 14 Seiten ein Abschnitt; Abschnitte über 3,2 MB werden halbiert). Word/PowerPoint
   (`doc, docx, odt, rtf, ppt, pptx, pps, ppsx, odp`) wandelt Graph vorher in PDF um
   (`/content?format=pdf`). Dazu `txt`, `md` und Bilder (`jpg, png, webp, gif`).
3. **Karten erzeugen.** Je Abschnitt ein Aufruf `POST /api/lernapp/erzeugen`; nach jedem
   Abschnitt wird die Quelle gespeichert. Ein abgebrochener Abgleich setzt beim nächsten
   Öffnen am folgenden Abschnitt fort.
4. **Lernen.** Fällige und neue Karten (Standard 15 neue pro Tag), vier Kartentypen:
   offene Frage, Lückentext, Auswahl, Fallfrage. Freie Antworten bewertet Claude
   (`POST /api/lernapp/bewerten`, 0–3 Punkte mit Rückmeldung) und schlägt eine Note vor;
   die Note vergibt immer die Nutzerin.

## Regeln im Ordner

- **Fach** = Modulkürzel am Anfang des Dateinamens (`B01_…`, `B02-…` → B01, B02), sonst der
  oberste Unterordner, sonst „Allgemein“. Bei Notizseiten der Abschnitt des Notizbuchs
  (mit Kürzel, wenn der Abschnittsname eines trägt). Der Fachtitel kommt aus dem
  Abschnittsnamen oder aus der Unterlage (Claude, Feld `modulTitel`).
- Ordner und Dateien, die mit `z_`, `_`, `.` oder `~$` beginnen, werden nicht eingelesen
  (z. B. `z_Organisatorisch`).
- Dateien über 60 MB und andere Dateitypen erscheinen unter „Nicht eingelesen“.
- **Geänderte Unterlage:** Claude bekommt die bisherigen Karten des Abschnitts mit und gibt
  zurück, welche bleiben (`behalten`); nur für Neues entstehen neue Karten. Der Lernstand der
  behaltenen Karten bleibt erhalten.
- **Notizseiten** werden erst eingelesen, wenn sie 20 Minuten unverändert sind (sonst entstünden
  während der Vorlesung laufend neue Karten); „Jetzt abgleichen“ übergeht die Wartezeit.
  PDF-Anhänge in Notizseiten werden bis 15 Seiten mitgelesen, größere gehören als Datei in den Ordner.
- **Gelöschte Unterlage:** Karten bleiben, die Quelle wird als „nicht mehr im Ordner“ markiert
  und kann unter „Unterlagen“ entfernt werden.
- **Fehler:** Eine Quelle mit Fehler wird nicht bei jedem Öffnen erneut versucht (Kosten),
  sondern nur über „Jetzt abgleichen“ oder „neu einlesen“.

- **Kartenmenge:** höchstens eine Karte je gehaltvoller Seite und 12 je Abschnitt (Vorgabe im
  Worker, `LERNAPP_SYSTEM_KARTEN`). Wird die Vorgabe geändert, in `lernapp.html` die Kennung
  `ERZEUGUNG` erhöhen – dann liest die App alle Unterlagen beim nächsten Abgleich einmal neu ein
  (der Lernstand der ersetzten Karten geht dabei verloren).
- **Prüfungsleistungen** aus allen Unterlagen stehen gesammelt im Reiter „Fächer“, auch aus
  Unterlagen ohne Karten (z. B. Abschnitt „Organisatorisch“ im Notizbuch).

## Notizbuch

OneNote lässt sich über Graph nur mit der Anmeldung der Besitzerin lesen (`/me/onenote`,
delegiert `Notes.Read`). Meldet sich Markus an, werden nur die Dateien abgeglichen; die Karten
aus dem Notizbuch bleiben unverändert sichtbar. Gefunden wird das Notizbuch über seine Adresse
(`…/ISBA/…`), ersatzweise über `getNotebookFromWebUrl`. Handschrift (Ink) liefert die API nicht
als Text – nur getippter Text, eingefügte Bilder und kleine PDF-Anhänge werden ausgewertet.

## Endpunkte (Worker, alle hinter `PNW-App-Lernapp`)

| Endpunkt | Zweck |
|---|---|
| `GET /api/lernapp/quellen` | Liste der Quellen (KV-Metadaten), `kiBereit` |
| `GET /api/lernapp/karten?ids=a,b` | Karten mehrerer Quellen, höchstens 25 je Aufruf |
| `POST /api/lernapp/quelle` | Quelle mit Karten speichern (max. 1,5 MB, 1.500 Karten) |
| `POST /api/lernapp/quelle/loeschen` | Quelle samt Karten löschen |
| `POST /api/lernapp/erzeugen` | Karten aus einem Abschnitt (Claude, Antwort als Strom) |
| `POST /api/lernapp/bewerten` | freie Antwort bewerten (Claude) |
| `GET/POST /api/lernapp/stand` | Lernstand des angemeldeten Kontos |
| `GET /api/lernapp/inhalt?item=…[&pdf=1]` | Dateiinhalt aus Sonjas OneDrive mit dem Graph-Token des Aufrufers |

`erzeugen` antwortet immer mit HTTP 200 und füllt die Wartezeit mit Leerzeichen, damit die
Verbindung nicht als untätig getrennt wird; Fehler stehen im JSON (`ok:false`, `error`,
`wiederholbar`, `zuLang`).

## Speicher (Workers KV `PNW_DATEN`)

- `lernapp:q:<quelleId>` – `{ id, meta, karten[] }`; Kurzangaben als KV-Metadaten, damit die
  Liste mit einem Aufruf auskommt. Quellen-ID: `d_<driveItemId>` bzw. `o_<onenotePageId>`.
- `lernapp:stand:<upn>` – Lernstand: je Karte `[fälligTag, Intervall, Leichtigkeit×100,
  Wiederholungen, Fehlversuche]`, ausgeblendete Karten, Tageszähler, Einstellungen.
  Der Browser hält eine Kopie im localStorage; beim Laden gewinnt der jüngere Stand.

## Claude

- Secret `ANTHROPIC_API_KEY` am Worker (Settings → Variables and Secrets). Ohne Schlüssel lädt
  die App, liest aber nichts Neues ein.
- Modelle: Karten `claude-sonnet-5-5`, Bewertung `claude-haiku-5-5`; überschreibbar mit den
  Variablen `LERNAPP_MODELL` und `LERNAPP_MODELL_BEWERTUNG`.
- Strukturierte Ausgabe über `output_config.format` (JSON-Schema); PDF-Abschnitte gehen als
  `document`-Block, Bilder als `image`-Block an die Messages-API.

## Entra

App-Registrierung „Verlaufsbericht-App“: Redirect-URI `https://apps.praxisneuewege.de/lernapp.html`
(Single-Page-Webanwendung), delegierte Berechtigung `Notes.Read`. Für Dateien nutzt die Seite das
bereits zugestimmte `Files.ReadWrite.All`; sie liest nur.

## Bekannte Grenzen

- Die Anbindung an OneNote und die PDF-Umwandlung durch Graph sind nur gegen simulierte
  Antworten getestet, nicht gegen das echte Notizbuch.
- Wird eine Unterlage vollständig neu eingelesen („neu einlesen“), geht der Lernstand ihrer
  Karten verloren.
- Zwei Geräte, die gleichzeitig abgleichen, erzeugen dieselben Abschnitte doppelt; der zuletzt
  gespeicherte Stand gewinnt.

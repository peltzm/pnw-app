<#
============================================================
zugriffsmatrix-pnw-apps.ps1
Erzeugt eine Excel-Datei mit der Zugriffsmatrix der PNW-Apps:
  - Spalte A: Mitarbeitername
  - weitere Spalten: je App eine Spalte (Überschrift = Gruppenname ohne "PNW-App-")
  - Zelle mit X: Mitarbeiter ist (auch über verschachtelte Rollengruppen wie
    Team, TL-Ambulant, GF) Mitglied der App-Gruppe und hat damit Zugriff
  - Markus Peltz hat im Worker immer Zugriff und steht deshalb bei jeder App mit X;
    alle anderen (auch Sonja) nur bei Mitgliedschaft in der App-Gruppe
Nur lesend: es wird nichts in Entra geändert. Die Excel-Datei wird ohne
installiertes Excel erzeugt (reine .xlsx-Datei) und im aktuellen Ordner
gespeichert, zusätzlich erscheint eine Übersicht in der Konsole.

Start (Rechner mit AllSigned, normale PowerShell-Konsole, NICHT ISE):
  cd "<Ordner des Skripts>"
  Unblock-File .\zugriffsmatrix-pnw-apps.ps1
  Set-ExecutionPolicy Bypass -Scope Process -Force
  .\zugriffsmatrix-pnw-apps.ps1
Alternativ in einem Zug:
  powershell.exe -ExecutionPolicy Bypass -File .\zugriffsmatrix-pnw-apps.ps1

Berechtigungen bei der Anmeldung: Group.Read.All, User.Read.All
============================================================
#>

#Requires -Version 5.1

Import-Module Microsoft.Graph.Authentication
Import-Module Microsoft.Graph.Groups
Import-Module Microsoft.Graph.Users
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

Connect-MgGraph -Scopes "Group.Read.All", "User.Read.All" -NoWelcome

# Apps in der Reihenfolge des Portals (Gruppenname = PNW-App-<Name>)
$Erwartet = @(
    "PNW-App-Sozialraum", "PNW-App-Berichtsgenerator", "PNW-App-Spesenabrechnung", "PNW-App-Teamkarte",
    "PNW-App-Signatur", "PNW-App-Formulare", "PNW-App-Meetingprotokoll", "PNW-App-Organisation",
    "PNW-App-Fahrtenbuchcheck", "PNW-App-Orientierungsgespraech", "PNW-App-MitarbeiterCockpit",
    "PNW-App-ManagerCockpit", "PNW-App-JugendamtCockpit", "PNW-App-KlientenCockpit",
    "PNW-App-BusinessScorecard", "PNW-App-Unterschriften", "PNW-App-Mobilfunk", "PNW-App-OPAbgleich",
    "PNW-App-Sanity", "PNW-App-Onboarding", "PNW-App-Fuhrpark"
)
# Nur Markus wird von der Gruppenprüfung im Worker nie betroffen (ZUGRIFF_IMMER_UPNS);
# Sonja Peltz unterliegt der Gruppenprüfung wie alle anderen
$GF = @("markus.peltz@praxisneuewege.de")

# Transitive Mitglieder einer Gruppe (nur Benutzer) als Liste von Objekten Upn/Name
function Get-GruppenBenutzer($GruppenId) {
    $liste = @()
    foreach ($x in (Get-MgGroupTransitiveMember -GroupId $GruppenId -All)) {
        if ($x.AdditionalProperties["@odata.type"] -eq "#microsoft.graph.user") {
            $upn = ([string]$x.AdditionalProperties["userPrincipalName"]).ToLower()
            $name = [string]$x.AdditionalProperties["displayName"]
            if (-not $name) { $name = $upn }
            if ($upn) { $liste += [pscustomobject]@{ Upn = $upn; Name = $name } }
        }
    }
    return $liste
}

Write-Host "Lese Gruppen aus Entra ..." -ForegroundColor Cyan
$Gruppen = Get-MgGroup -Filter "startswith(displayName,'PNW-App-')" -All -ConsistencyLevel eventual -CountVariable gz

# Echte Schreibweise der Gruppennamen verwenden (z. B. FahrtenbuchCheck)
$AppSpalten = @()
$Mitglieder = @{}
$Namen = @{}
foreach ($soll in $Erwartet) {
    $g = $Gruppen | Where-Object { $_.DisplayName -ieq $soll } | Select-Object -First 1
    if ($g) {
        $benutzer = Get-GruppenBenutzer $g.Id
        $Mitglieder[$g.DisplayName] = @($benutzer | ForEach-Object { $_.Upn })
        foreach ($b in $benutzer) { $Namen[$b.Upn] = $b.Name }
        $AppSpalten += $g.DisplayName
    } else {
        $Mitglieder[$soll] = @()
        $AppSpalten += $soll
    }
}

# Alle Mitarbeitenden = Gruppe "Team" plus Geschäftsführung
$team = Get-MgGroup -Filter "displayName eq 'Team'"
$teamBenutzer = Get-GruppenBenutzer $team.Id
foreach ($b in $teamBenutzer) { $Namen[$b.Upn] = $b.Name }
$alle = @(@($teamBenutzer | ForEach-Object { $_.Upn }) + $GF + @($Mitglieder.Values | ForEach-Object { $_ }) | Where-Object { $_ } | Sort-Object -Unique)

# Matrix aufbauen: je Mitarbeiter die Liste der Apps mit Zugriff
$Zeilen = @()
foreach ($u in $alle) {
    $name = $Namen[$u]
    if (-not $name) { $name = $u }
    $istGf = $GF -contains $u
    $zugriff = @{}
    foreach ($app in $AppSpalten) {
        $zugriff[$app] = ($istGf -or ($Mitglieder[$app] -contains $u))
    }
    $Zeilen += [pscustomobject]@{ Upn = $u; Name = $name; GF = $istGf; Zugriff = $zugriff }
}
$Zeilen = @($Zeilen | Sort-Object Name)

# ── Konsolenübersicht ────────────────────────────────────────
Write-Host ""
Write-Host "Gruppen, die FEHLEN:" -ForegroundColor Yellow
$gefunden = $Gruppen | ForEach-Object { $_.DisplayName }
$fehlt = $Erwartet | Where-Object { $gefunden -inotcontains $_ }
if ($fehlt) { $fehlt | ForEach-Object { [pscustomobject]@{ FehlendeGruppe = $_ } } | Format-Table -AutoSize } else { Write-Host "keine" }

Write-Host ""
Write-Host "Je Mitarbeiter: Anzahl Apps mit Zugriff und Apps OHNE Zugriff:" -ForegroundColor Yellow
$Zeilen | ForEach-Object {
    $z = $_
    $ohne = @($AppSpalten | Where-Object { -not $z.Zugriff[$_] } | ForEach-Object { $_ -replace '^PNW-App-', '' })
    [pscustomobject]@{
        Mitarbeiter = $z.Name
        GF          = $(if ($z.GF) { "ja" } else { "" })
        MitZugriff  = $AppSpalten.Count - $ohne.Count
        OhneZugriff = ($ohne -join ", ")
    }
} | Format-Table -AutoSize -Wrap

# ── Excel-Datei (.xlsx) ohne Excel erzeugen ──────────────────
function Get-SpaltenBuchstabe([int]$i) {
    $s = ""
    while ($i -gt 0) {
        $m = ($i - 1) % 26
        $s = ([string][char](65 + $m)) + $s
        $i = [math]::Floor(($i - 1) / 26)
    }
    return $s
}
function ConvertTo-XmlText([string]$t) { return [System.Security.SecurityElement]::Escape($t) }

$anzSpalten = 1 + $AppSpalten.Count
$letzteSpalte = Get-SpaltenBuchstabe $anzSpalten
$letzteZeile = 1 + $Zeilen.Count

$sb = New-Object System.Text.StringBuilder
[void]$sb.Append('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>')
[void]$sb.Append('<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">')
[void]$sb.Append('<sheetViews><sheetView workbookViewId="0"><pane xSplit="1" ySplit="1" topLeftCell="B2" activePane="bottomRight" state="frozen"/></sheetView></sheetViews>')
[void]$sb.Append('<sheetFormatPr defaultRowHeight="15"/>')
[void]$sb.Append('<cols><col min="1" max="1" width="32" customWidth="1"/><col min="2" max="' + $anzSpalten + '" width="17" customWidth="1"/></cols>')
[void]$sb.Append('<sheetData>')

# Kopfzeile
[void]$sb.Append('<row r="1" ht="34" customHeight="1">')
[void]$sb.Append('<c r="A1" s="1" t="inlineStr"><is><t>Mitarbeiter</t></is></c>')
for ($i = 0; $i -lt $AppSpalten.Count; $i++) {
    $ref = (Get-SpaltenBuchstabe ($i + 2)) + "1"
    $kopf = ConvertTo-XmlText ($AppSpalten[$i] -replace '^PNW-App-', '')
    [void]$sb.Append('<c r="' + $ref + '" s="2" t="inlineStr"><is><t>' + $kopf + '</t></is></c>')
}
[void]$sb.Append('</row>')

# Datenzeilen
for ($r = 0; $r -lt $Zeilen.Count; $r++) {
    $zeilenNr = $r + 2
    $z = $Zeilen[$r]
    [void]$sb.Append('<row r="' + $zeilenNr + '">')
    [void]$sb.Append('<c r="A' + $zeilenNr + '" s="3" t="inlineStr"><is><t>' + (ConvertTo-XmlText $z.Name) + '</t></is></c>')
    for ($i = 0; $i -lt $AppSpalten.Count; $i++) {
        if ($z.Zugriff[$AppSpalten[$i]]) {
            $ref = (Get-SpaltenBuchstabe ($i + 2)) + $zeilenNr
            [void]$sb.Append('<c r="' + $ref + '" s="4" t="inlineStr"><is><t>X</t></is></c>')
        }
    }
    [void]$sb.Append('</row>')
}
[void]$sb.Append('</sheetData>')
[void]$sb.Append('<autoFilter ref="A1:' + $letzteSpalte + $letzteZeile + '"/>')
[void]$sb.Append('</worksheet>')
$sheetXml = $sb.ToString()

$contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'
$rootRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
$workbook = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Zugriffsmatrix" sheetId="1" r:id="rId1"/></sheets></workbook>'
$workbookRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'
# Schrift Kodchasan (Excel nimmt Ersatzschrift, falls nicht installiert)
$styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="10"/><name val="Kodchasan"/></font><font><b/><sz val="10"/><name val="Kodchasan"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF5EDE7"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFE2DFD8"/></left><right style="thin"><color rgb="FFE2DFD8"/></right><top style="thin"><color rgb="FFE2DFD8"/></top><bottom style="thin"><color rgb="FFE2DFD8"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf><xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'

$datum = Get-Date -Format "dd.MM.yyyy"
$pfad = Join-Path (Get-Location).Path ("Zugriffsmatrix_PNW-Apps_" + $datum + ".xlsx")
if (Test-Path $pfad) { Remove-Item $pfad -Force }

$utf8 = New-Object System.Text.UTF8Encoding($false)
$zip = [System.IO.Compression.ZipFile]::Open($pfad, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    $teile = [ordered]@{
        "[Content_Types].xml"        = $contentTypes
        "_rels/.rels"                = $rootRels
        "xl/workbook.xml"            = $workbook
        "xl/_rels/workbook.xml.rels" = $workbookRels
        "xl/styles.xml"              = $styles
        "xl/worksheets/sheet1.xml"   = $sheetXml
    }
    foreach ($eintrag in $teile.GetEnumerator()) {
        $e = $zip.CreateEntry($eintrag.Key)
        $w = New-Object System.IO.StreamWriter($e.Open(), $utf8)
        $w.Write($eintrag.Value)
        $w.Dispose()
    }
} finally {
    $zip.Dispose()
}

Write-Host ""
Write-Host "Excel-Datei erstellt: $pfad" -ForegroundColor Green
Write-Host "Markus Peltz ist im Worker fest ausgenommen und hat bei jeder App ein X; alle anderen nur über ihre Gruppen." -ForegroundColor Green
Disconnect-MgGraph | Out-Null
Invoke-Item $pfad

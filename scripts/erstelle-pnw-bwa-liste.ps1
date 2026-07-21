# ============================================================
# Erstellt die SharePoint-Liste "PNW-BWA" fuer die Business
# Scorecard (BWA-/SuSa-Werte je Monat) inkl. aller Spalten.
# Idempotent: existiert die Liste, werden nur fehlende
# Spalten ergaenzt. Ausgabe direkt im Terminal.
# Anmeldung: Microsoft-Login-Fenster, Scope Sites.Manage.All
# ============================================================

$ErrorActionPreference = "Stop"
$SiteHost = "praxisneuewegesonjapeltz978.sharepoint.com"
$ListenName = "PNW-BWA"
$Spalten = @(
    @{ name = "Umsatzerloese";    typ = "number" },
    @{ name = "Personalkosten";   typ = "number" },
    @{ name = "Gesamtkosten";     typ = "number" },
    @{ name = "Betriebsergebnis"; typ = "number" },
    @{ name = "Liquiditaet";      typ = "number" },
    @{ name = "ForderungenDatev"; typ = "number" },
    @{ name = "Kommentar";        typ = "text" }
)

# --- Graph-Modul sicherstellen ---
if (-not (Get-Module -ListAvailable -Name Microsoft.Graph.Authentication)) {
    Write-Host "Installiere Microsoft.Graph.Authentication (einmalig) ..." -ForegroundColor Cyan
    Install-Module Microsoft.Graph.Authentication -Scope CurrentUser -Force
}
Import-Module Microsoft.Graph.Authentication

Write-Host "Anmeldung bei Microsoft Graph (Sites.Manage.All) ..." -ForegroundColor Cyan
Connect-MgGraph -Scopes "Sites.Manage.All" -NoWelcome

# --- Website aufloesen ---
$site = Invoke-MgGraphRequest -Method GET -Uri "https://graph.microsoft.com/v1.0/sites/${SiteHost}:/"
Write-Host "Website: $($site.displayName) ($($site.id))"

# --- Liste suchen bzw. anlegen ---
$suche = Invoke-MgGraphRequest -Method GET -Uri "https://graph.microsoft.com/v1.0/sites/$($site.id)/lists?`$filter=displayName eq '$ListenName'"
if ($suche.value.Count -gt 0) {
    $liste = $suche.value[0]
    Write-Host "Liste '$ListenName' existiert bereits - pruefe Spalten ..." -ForegroundColor Yellow
} else {
    $body = @{
        displayName = $ListenName
        list = @{ template = "genericList" }
    } | ConvertTo-Json -Depth 5
    $liste = Invoke-MgGraphRequest -Method POST -Uri "https://graph.microsoft.com/v1.0/sites/$($site.id)/lists" -Body $body -ContentType "application/json"
    Write-Host "Liste '$ListenName' angelegt." -ForegroundColor Green
}

# --- Fehlende Spalten ergaenzen (idempotent) ---
$vorhanden = (Invoke-MgGraphRequest -Method GET -Uri "https://graph.microsoft.com/v1.0/sites/$($site.id)/lists/$($liste.id)/columns").value.name
$ergebnis = New-Object System.Collections.Generic.List[object]
foreach ($sp in $Spalten) {
    if ($vorhanden -contains $sp.name) {
        $ergebnis.Add([pscustomobject]@{ Spalte = $sp.name; Typ = $sp.typ; Status = "vorhanden" })
        continue
    }
    $def = @{ name = $sp.name }
    if ($sp.typ -eq "number") { $def.number = @{} } else { $def.text = @{} }
    Invoke-MgGraphRequest -Method POST -Uri "https://graph.microsoft.com/v1.0/sites/$($site.id)/lists/$($liste.id)/columns" `
        -Body ($def | ConvertTo-Json -Depth 3) -ContentType "application/json" | Out-Null
    $ergebnis.Add([pscustomobject]@{ Spalte = $sp.name; Typ = $sp.typ; Status = "NEU angelegt" })
}

Write-Host "`n=== Ergebnis ===" -ForegroundColor Cyan
$ergebnis | Format-Table -AutoSize
Write-Host "Titel-Spalte = Monat im Format JJJJ-MM (setzt die Scorecard-App automatisch)."
Write-Host "Fertig - in der Scorecard 'Kilanka-Stand neu laden' bzw. Seite neu laden, dann Speichern." -ForegroundColor Green

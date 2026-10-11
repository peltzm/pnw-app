<#
    PNW-App-Lernapp – Entra-Sicherheitsgruppe und Redirect-URI für die
    „Lernapp Soziale Arbeit“ (lernapp.html)

    Start (Ausführungsrichtlinie AllSigned → Skript ist nicht signiert):
        Unblock-File .\erstelle-pnw-app-lernapp.ps1
        Set-ExecutionPolicy Bypass -Scope Process -Force
        .\erstelle-pnw-app-lernapp.ps1
    Alternativ in einem Schritt:
        powershell.exe -ExecutionPolicy Bypass -File .\erstelle-pnw-app-lernapp.ps1

    Bitte in der normalen PowerShell-Konsole starten (nicht in der ISE – dort scheitert
    die Anmeldung teils am Fensterhandle).

    Was das Skript macht:
      1. legt die Sicherheitsgruppe „PNW-App-Lernapp“ an (falls noch nicht vorhanden)
      2. nimmt Sonja Peltz und Markus Peltz als direkte Mitglieder auf
         (bewusst keine Rollengruppe: die Lernapp ist nur für diese beiden Konten)
      3. ergänzt die Redirect-URI https://apps.praxisneuewege.de/lernapp.html
         in der App-Registrierung „Verlaufsbericht-App“ (Single-Page-Webanwendung),
         falls sie dort noch fehlt
      4. zeigt Gruppe und Mitglieder an

    Mehrfach ausführbar: Vorhandenes wird übersprungen.
    Benötigt nur das Modul Microsoft.Graph.Authentication.
#>

$ErrorActionPreference = 'Stop'

$GruppenName   = 'PNW-App-Lernapp'
$Mitglieder    = @('sonja.peltz@praxisneuewege.de', 'markus.peltz@praxisneuewege.de')
$AppId         = 'f7e00950-2421-43b5-b48a-447bf8e7d4b3'   # App-Registrierung „Verlaufsbericht-App“
$RedirectUri   = 'https://apps.praxisneuewege.de/lernapp.html'
$TenantId      = '1ac059d9-8d39-43ab-a8db-bd9197bde0f4'

if (-not (Get-Module -ListAvailable -Name Microsoft.Graph.Authentication)) {
    Write-Host 'Modul Microsoft.Graph.Authentication fehlt. Installation mit:' -ForegroundColor Red
    Write-Host '    Install-Module Microsoft.Graph.Authentication -Scope CurrentUser' -ForegroundColor Yellow
    return
}
Import-Module Microsoft.Graph.Authentication

Write-Host 'Anmeldung bei Microsoft Graph …' -ForegroundColor Cyan
Connect-MgGraph -TenantId $TenantId -Scopes 'Group.ReadWrite.All', 'GroupMember.ReadWrite.All', 'Application.ReadWrite.All', 'User.Read.All' -NoWelcome

function Get-GruppeId([string]$Name) {
    $f = [uri]::EscapeDataString("displayName eq '" + $Name + "'")
    $g = @((Invoke-MgGraphRequest -Method GET -Uri ('https://graph.microsoft.com/v1.0/groups?$filter=' + $f + '&$select=id,displayName')).value)
    if ($g.Count -eq 0) { return $null }
    return $g[0].id
}

# ── 1. App-Gruppe suchen bzw. anlegen ────────────────────────────
$gruppenId = Get-GruppeId $GruppenName
if ($gruppenId) {
    Write-Host "Gruppe $GruppenName existiert bereits." -ForegroundColor Yellow
} else {
    $body = @{
        displayName     = $GruppenName
        description     = 'Zugriff auf die Lernapp Soziale Arbeit (Lernkarten aus den Studienunterlagen im Ordner ISBA)'
        mailEnabled     = $false
        mailNickname    = 'PNW-App-Lernapp'
        securityEnabled = $true
    } | ConvertTo-Json
    $gruppe = Invoke-MgGraphRequest -Method POST -Uri 'https://graph.microsoft.com/v1.0/groups' -Body $body -ContentType 'application/json; charset=utf-8'
    $gruppenId = $gruppe.id
    Write-Host "Gruppe $GruppenName angelegt." -ForegroundColor Green
}

# ── 2. Mitglieder aufnehmen ──────────────────────────────────────
$vorhanden = @((Invoke-MgGraphRequest -Method GET -Uri "https://graph.microsoft.com/v1.0/groups/$gruppenId/members?`$select=id").value | ForEach-Object { $_.id })
foreach ($upn in $Mitglieder) {
    try {
        $benutzer = Invoke-MgGraphRequest -Method GET -Uri "https://graph.microsoft.com/v1.0/users/$($upn)?`$select=id,displayName"
    } catch {
        Write-Host "  Konto $upn nicht gefunden – bitte prüfen." -ForegroundColor Red; continue
    }
    if ($vorhanden -contains $benutzer.id) { Write-Host "  $($benutzer.displayName) ist bereits Mitglied." -ForegroundColor DarkGray; continue }
    $ref = @{ '@odata.id' = "https://graph.microsoft.com/v1.0/directoryObjects/$($benutzer.id)" } | ConvertTo-Json
    Invoke-MgGraphRequest -Method POST -Uri "https://graph.microsoft.com/v1.0/groups/$gruppenId/members/`$ref" -Body $ref -ContentType 'application/json' | Out-Null
    Write-Host "  $($benutzer.displayName) hinzugefügt." -ForegroundColor Green
}

# ── 3. Redirect-URI in der App-Registrierung ergänzen ────────────
$appFilter = [uri]::EscapeDataString("appId eq '$AppId'")
$app = @((Invoke-MgGraphRequest -Method GET -Uri "https://graph.microsoft.com/v1.0/applications?`$filter=$appFilter&`$select=id,displayName,spa").value)[0]
if (-not $app) {
    Write-Host "App-Registrierung $AppId nicht gefunden – Redirect-URI bitte im Portal eintragen: $RedirectUri" -ForegroundColor Red
} else {
    $uris = @($app.spa.redirectUris)
    if ($uris -contains $RedirectUri) {
        Write-Host "Redirect-URI ist bereits eingetragen ($($app.displayName))." -ForegroundColor DarkGray
    } else {
        $neu = @{ spa = @{ redirectUris = @($uris + $RedirectUri) } } | ConvertTo-Json -Depth 5
        Invoke-MgGraphRequest -Method PATCH -Uri "https://graph.microsoft.com/v1.0/applications/$($app.id)" -Body $neu -ContentType 'application/json' | Out-Null
        Write-Host "Redirect-URI ergänzt ($($app.displayName), Single-Page-Webanwendung)." -ForegroundColor Green
    }
}

# ── 4. Ergebnis anzeigen ─────────────────────────────────────────
Write-Host ''
Write-Host 'Gruppe:' -ForegroundColor Cyan
[pscustomobject]@{ Name = $GruppenName; ObjektId = $gruppenId; Sicherheitsgruppe = $true } | Format-Table -AutoSize

Write-Host 'Mitglieder (transitiv, so prüft es der Worker):' -ForegroundColor Cyan
(Invoke-MgGraphRequest -Method GET -Uri "https://graph.microsoft.com/v1.0/groups/$gruppenId/transitiveMembers/microsoft.graph.user?`$select=displayName,userPrincipalName").value |
    ForEach-Object { [pscustomobject]@{ Name = $_.displayName; Anmeldename = $_.userPrincipalName } } |
    Sort-Object Name | Format-Table -AutoSize

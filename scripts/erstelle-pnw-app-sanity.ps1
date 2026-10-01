<#
    PNW-App-Sanity – Entra-Sicherheitsgruppe und Redirect-URI für die App „Sanity Check“

    Start (Ausführungsrichtlinie AllSigned → Skript ist nicht signiert):
        Unblock-File .\erstelle-pnw-app-sanity.ps1
        Set-ExecutionPolicy Bypass -Scope Process -Force
        .\erstelle-pnw-app-sanity.ps1
    Alternativ in einem Schritt:
        powershell.exe -ExecutionPolicy Bypass -File .\erstelle-pnw-app-sanity.ps1

    Bitte in der normalen PowerShell-Konsole starten (nicht in der ISE – dort scheitert
    die Anmeldung teils am Fensterhandle).

    Was das Skript macht:
      1. legt die Sicherheitsgruppe „PNW-App-Sanity“ an (falls noch nicht vorhanden)
      2. trägt Markus Peltz und Sonja Peltz als Mitglieder ein
      3. ergänzt die Redirect-URI der neuen App in der App-Registrierung „Verlaufsbericht-App“
      4. zeigt Gruppe, Objekt-ID und Mitglieder an

    Benötigt nur das Modul Microsoft.Graph.Authentication (kommt mit Microsoft.Graph.Users),
    alle Aufrufe laufen über Invoke-MgGraphRequest – kein Microsoft.Graph.Groups nötig.
#>

$ErrorActionPreference = 'Stop'

$GruppenName = 'PNW-App-Sanity'
$Mitglieder  = @('markus.peltz@praxisneuewege.de', 'sonja.peltz@praxisneuewege.de')
$AppId       = 'f7e00950-2421-43b5-b48a-447bf8e7d4b3'   # App-Registrierung „Verlaufsbericht-App“
$RedirectUri = 'https://apps.praxisneuewege.de/sanity-check-beta.html'
$TenantId    = '1ac059d9-8d39-43ab-a8db-bd9197bde0f4'

if (-not (Get-Module -ListAvailable -Name Microsoft.Graph.Authentication)) {
    Write-Host 'Modul Microsoft.Graph.Authentication fehlt. Installation mit:' -ForegroundColor Red
    Write-Host '    Install-Module Microsoft.Graph.Authentication -Scope CurrentUser' -ForegroundColor Yellow
    return
}
Import-Module Microsoft.Graph.Authentication

Write-Host 'Anmeldung bei Microsoft Graph …' -ForegroundColor Cyan
Connect-MgGraph -TenantId $TenantId -Scopes 'Group.ReadWrite.All', 'User.Read.All', 'Application.ReadWrite.All' -NoWelcome

# ── 1. Gruppe suchen bzw. anlegen ────────────────────────────────
$filter = [uri]::EscapeDataString("displayName eq '$GruppenName'")
$treffer = (Invoke-MgGraphRequest -Method GET -Uri "https://graph.microsoft.com/v1.0/groups?`$filter=$filter&`$select=id,displayName,securityEnabled").value

if ($treffer -and @($treffer).Count -gt 0) {
    $gruppe = @($treffer)[0]
    Write-Host "Gruppe $GruppenName existiert bereits." -ForegroundColor Yellow
} else {
    $body = @{
        displayName     = $GruppenName
        description     = 'Zugriff auf die PNW-App Sanity Check (Prüfung der erfassten Leistungen vor der Rechnungsstellung)'
        mailEnabled     = $false
        mailNickname    = 'PNW-App-Sanity'
        securityEnabled = $true
    } | ConvertTo-Json
    $gruppe = Invoke-MgGraphRequest -Method POST -Uri 'https://graph.microsoft.com/v1.0/groups' -Body $body -ContentType 'application/json; charset=utf-8'
    Write-Host "Gruppe $GruppenName angelegt." -ForegroundColor Green
}
$gruppenId = $gruppe.id

# ── 2. Mitglieder eintragen ──────────────────────────────────────
$vorhanden = @((Invoke-MgGraphRequest -Method GET -Uri "https://graph.microsoft.com/v1.0/groups/$gruppenId/members?`$select=id").value | ForEach-Object { $_.id })
foreach ($upn in $Mitglieder) {
    $user = Invoke-MgGraphRequest -Method GET -Uri "https://graph.microsoft.com/v1.0/users/$upn`?`$select=id,displayName"
    if ($vorhanden -contains $user.id) {
        Write-Host "  $($user.displayName) ist bereits Mitglied." -ForegroundColor DarkGray
        continue
    }
    $ref = @{ '@odata.id' = "https://graph.microsoft.com/v1.0/directoryObjects/$($user.id)" } | ConvertTo-Json
    Invoke-MgGraphRequest -Method POST -Uri "https://graph.microsoft.com/v1.0/groups/$gruppenId/members/`$ref" -Body $ref -ContentType 'application/json' | Out-Null
    Write-Host "  $($user.displayName) hinzugefügt." -ForegroundColor Green
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

Write-Host 'Mitglieder:' -ForegroundColor Cyan
(Invoke-MgGraphRequest -Method GET -Uri "https://graph.microsoft.com/v1.0/groups/$gruppenId/members?`$select=displayName,userPrincipalName").value |
    ForEach-Object { [pscustomobject]@{ Name = $_.displayName; Anmeldename = $_.userPrincipalName } } |
    Sort-Object Name | Format-Table -AutoSize

Write-Host "Objekt-ID für den Worker (SANITY_GRUPPE_ID): $gruppenId" -ForegroundColor Green

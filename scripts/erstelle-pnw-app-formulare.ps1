<#
    PNW-App-Formulare – Entra-Sicherheitsgruppe für die App „Formulare“ (Produktion seit 03.10.2026)

    Start (Ausführungsrichtlinie AllSigned → Skript ist nicht signiert):
        Unblock-File .\erstelle-pnw-app-formulare.ps1
        Set-ExecutionPolicy Bypass -Scope Process -Force
        .\erstelle-pnw-app-formulare.ps1
    Alternativ in einem Schritt:
        powershell.exe -ExecutionPolicy Bypass -File .\erstelle-pnw-app-formulare.ps1

    Bitte in der normalen PowerShell-Konsole starten (nicht in der ISE – dort scheitert
    die Anmeldung teils am Fensterhandle).

    Was das Skript macht:
      1. legt die Sicherheitsgruppe „PNW-App-Formulare“ an (falls noch nicht vorhanden)
      2. verschachtelt die Rollengruppe „Team“ (alle Mitarbeitenden) als Mitglied
      3. stellt sicher, dass die Redirect-URI der App in der App-Registrierung
         „Verlaufsbericht-App“ eingetragen ist (ist sie bereits, solange formulare.html
         produktiv läuft – das Skript ergänzt nur, falls sie fehlt)
      4. zeigt Gruppe, Objekt-ID und Mitglieder an

    Hinweis: Das neue Zugriffskonzept ist noch nicht live. Die Gruppe steuert aktuell
    nichts – die App und die Kachel im App-Store bleiben für alle Mitarbeitenden sichtbar.
    Die Kachel trägt bereits data-gruppe="PNW-App-Formulare" für die spätere Prüfung.

    Benötigt nur das Modul Microsoft.Graph.Authentication (kommt mit Microsoft.Graph.Users),
    alle Aufrufe laufen über Invoke-MgGraphRequest – kein Microsoft.Graph.Groups nötig.
#>

$ErrorActionPreference = 'Stop'

$GruppenName   = 'PNW-App-Formulare'
$RollenGruppen = @('Team')      # alle Mitarbeitenden; weitere Rollengruppen bei Bedarf ergänzen (z. B. 'GF')
$AppId         = 'f7e00950-2421-43b5-b48a-447bf8e7d4b3'   # App-Registrierung „Verlaufsbericht-App“
$RedirectUri   = 'https://apps.praxisneuewege.de/formulare.html'
$TenantId      = '1ac059d9-8d39-43ab-a8db-bd9197bde0f4'

if (-not (Get-Module -ListAvailable -Name Microsoft.Graph.Authentication)) {
    Write-Host 'Modul Microsoft.Graph.Authentication fehlt. Installation mit:' -ForegroundColor Red
    Write-Host '    Install-Module Microsoft.Graph.Authentication -Scope CurrentUser' -ForegroundColor Yellow
    return
}
Import-Module Microsoft.Graph.Authentication

Write-Host 'Anmeldung bei Microsoft Graph …' -ForegroundColor Cyan
Connect-MgGraph -TenantId $TenantId -Scopes 'Group.ReadWrite.All', 'GroupMember.ReadWrite.All', 'Application.ReadWrite.All' -NoWelcome

# ── 1. Gruppe suchen bzw. anlegen ────────────────────────────────
$filter = [uri]::EscapeDataString("displayName eq '$GruppenName'")
$treffer = (Invoke-MgGraphRequest -Method GET -Uri "https://graph.microsoft.com/v1.0/groups?`$filter=$filter&`$select=id,displayName,securityEnabled").value

if ($treffer -and @($treffer).Count -gt 0) {
    $gruppe = @($treffer)[0]
    Write-Host "Gruppe $GruppenName existiert bereits." -ForegroundColor Yellow
} else {
    $body = @{
        displayName     = $GruppenName
        description     = 'Zugriff auf die PNW-App Formulare (digitale Klientenformulare, Leerformulare, Kilanka-Vorbefüllung)'
        mailEnabled     = $false
        mailNickname    = 'PNW-App-Formulare'
        securityEnabled = $true
    } | ConvertTo-Json
    $gruppe = Invoke-MgGraphRequest -Method POST -Uri 'https://graph.microsoft.com/v1.0/groups' -Body $body -ContentType 'application/json; charset=utf-8'
    Write-Host "Gruppe $GruppenName angelegt." -ForegroundColor Green
}
$gruppenId = $gruppe.id

# ── 2. Rollengruppen verschachteln ───────────────────────────────
$vorhanden = @((Invoke-MgGraphRequest -Method GET -Uri "https://graph.microsoft.com/v1.0/groups/$gruppenId/members?`$select=id").value | ForEach-Object { $_.id })
foreach ($rolle in $RollenGruppen) {
    $rf = [uri]::EscapeDataString("displayName eq '$rolle'")
    $rg = @((Invoke-MgGraphRequest -Method GET -Uri "https://graph.microsoft.com/v1.0/groups?`$filter=$rf&`$select=id,displayName,securityEnabled").value)
    if (-not $rg -or $rg.Count -eq 0) {
        Write-Host "  Rollengruppe '$rolle' nicht gefunden – bitte anlegen und das Skript erneut starten." -ForegroundColor Red
        continue
    }
    $rolleId = $rg[0].id
    if ($vorhanden -contains $rolleId) {
        Write-Host "  Rollengruppe '$rolle' ist bereits Mitglied." -ForegroundColor DarkGray
        continue
    }
    try {
        $ref = @{ '@odata.id' = "https://graph.microsoft.com/v1.0/directoryObjects/$rolleId" } | ConvertTo-Json
        Invoke-MgGraphRequest -Method POST -Uri "https://graph.microsoft.com/v1.0/groups/$gruppenId/members/`$ref" -Body $ref -ContentType 'application/json' | Out-Null
        Write-Host "  Rollengruppe '$rolle' verschachtelt." -ForegroundColor Green
    } catch {
        Write-Host "  Verschachtelung von '$rolle' fehlgeschlagen: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "  Hinweis: Microsoft-365-Gruppen lassen sich nicht in Sicherheitsgruppen verschachteln – dann die Mitglieder direkt eintragen." -ForegroundColor Yellow
    }
}

# ── 3. Redirect-URI in der App-Registrierung prüfen ──────────────
$appFilter = [uri]::EscapeDataString("appId eq '$AppId'")
$app = @((Invoke-MgGraphRequest -Method GET -Uri "https://graph.microsoft.com/v1.0/applications?`$filter=$appFilter&`$select=id,displayName,spa").value)[0]
if (-not $app) {
    Write-Host "App-Registrierung $AppId nicht gefunden – Redirect-URI bitte im Portal prüfen: $RedirectUri" -ForegroundColor Red
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

Write-Host 'Mitglieder (direkt, inkl. verschachtelter Gruppen):' -ForegroundColor Cyan
(Invoke-MgGraphRequest -Method GET -Uri "https://graph.microsoft.com/v1.0/groups/$gruppenId/members?`$select=displayName,userPrincipalName").value |
    ForEach-Object { [pscustomobject]@{ Name = $_.displayName; Anmeldename = $_.userPrincipalName; Typ = $(if ($_.'@odata.type' -eq '#microsoft.graph.group') { 'Gruppe' } else { 'Benutzer' }) } } |
    Sort-Object Name | Format-Table -AutoSize

Write-Host "Objekt-ID der Gruppe: $gruppenId" -ForegroundColor Green

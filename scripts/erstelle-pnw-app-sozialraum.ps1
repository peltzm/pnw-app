<#
    PNW-App-Sozialraum – Entra-Sicherheitsgruppe für die App „Sozialraum“ (fehlte laut Zugriffsmatrix vom 03.10.2026)

    Start (Ausführungsrichtlinie AllSigned → Skript ist nicht signiert):
        Unblock-File .\erstelle-pnw-app-sozialraum.ps1
        Set-ExecutionPolicy Bypass -Scope Process -Force
        .\erstelle-pnw-app-sozialraum.ps1
    Alternativ in einem Schritt:
        powershell.exe -ExecutionPolicy Bypass -File .\erstelle-pnw-app-sozialraum.ps1

    Bitte in der normalen PowerShell-Konsole starten (nicht in der ISE – dort scheitert
    die Anmeldung teils am Fensterhandle).

    Was das Skript macht:
      1. legt die Sicherheitsgruppe „PNW-App-Sozialraum“ an (falls noch nicht vorhanden)
      2. verschachtelt die Rollengruppe „Team“ (alle Mitarbeitenden) als Mitglied
      3. zeigt Gruppe, Objekt-ID und Mitglieder an

    Hinweis: Das neue Zugriffskonzept ist noch nicht live. Die Gruppe steuert aktuell
    nichts – die App und die Kachel im App-Store bleiben für alle Mitarbeitenden sichtbar.
    Die Kachel trägt bereits data-gruppe="PNW-App-Sozialraum"; der Worker steht im Testmodus.

    Benötigt nur das Modul Microsoft.Graph.Authentication (kommt mit Microsoft.Graph.Users),
    alle Aufrufe laufen über Invoke-MgGraphRequest – kein Microsoft.Graph.Groups nötig.
#>

$ErrorActionPreference = 'Stop'

$GruppenName   = 'PNW-App-Sozialraum'
$RollenGruppen = @('Team')      # alle Mitarbeitenden; weitere Rollengruppen bei Bedarf ergänzen (z. B. 'GF')
$TenantId      = '1ac059d9-8d39-43ab-a8db-bd9197bde0f4'

if (-not (Get-Module -ListAvailable -Name Microsoft.Graph.Authentication)) {
    Write-Host 'Modul Microsoft.Graph.Authentication fehlt. Installation mit:' -ForegroundColor Red
    Write-Host '    Install-Module Microsoft.Graph.Authentication -Scope CurrentUser' -ForegroundColor Yellow
    return
}
Import-Module Microsoft.Graph.Authentication

Write-Host 'Anmeldung bei Microsoft Graph …' -ForegroundColor Cyan
Connect-MgGraph -TenantId $TenantId -Scopes 'Group.ReadWrite.All', 'GroupMember.ReadWrite.All' -NoWelcome

# ── 1. Gruppe suchen bzw. anlegen ────────────────────────────────
$filter = [uri]::EscapeDataString("displayName eq '$GruppenName'")
$treffer = (Invoke-MgGraphRequest -Method GET -Uri "https://graph.microsoft.com/v1.0/groups?`$filter=$filter&`$select=id,displayName,securityEnabled").value

if ($treffer -and @($treffer).Count -gt 0) {
    $gruppe = @($treffer)[0]
    Write-Host "Gruppe $GruppenName existiert bereits." -ForegroundColor Yellow
} else {
    $body = @{
        displayName     = $GruppenName
        description     = 'Zugriff auf die PNW-App Sozialraum (regionale Angebote finden und pflegen)'
        mailEnabled     = $false
        mailNickname    = 'PNW-App-Sozialraum'
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

# ── 3. Ergebnis anzeigen ─────────────────────────────────────────
Write-Host ''
Write-Host 'Gruppe:' -ForegroundColor Cyan
[pscustomobject]@{ Name = $GruppenName; ObjektId = $gruppenId; Sicherheitsgruppe = $true } | Format-Table -AutoSize

Write-Host 'Mitglieder (direkt, inkl. verschachtelter Gruppen):' -ForegroundColor Cyan
(Invoke-MgGraphRequest -Method GET -Uri "https://graph.microsoft.com/v1.0/groups/$gruppenId/members?`$select=displayName,userPrincipalName").value |
    ForEach-Object { [pscustomobject]@{ Name = $_.displayName; Anmeldename = $_.userPrincipalName; Typ = $(if ($_.'@odata.type' -eq '#microsoft.graph.group') { 'Gruppe' } else { 'Benutzer' }) } } |
    Sort-Object Name | Format-Table -AutoSize

Write-Host "Objekt-ID der Gruppe: $gruppenId" -ForegroundColor Green

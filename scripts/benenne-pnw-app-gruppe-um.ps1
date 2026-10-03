<#
    Entra-Gruppe umbenennen: PNW-App-Einarbeitung  ->  PNW-App-Onboarding
    Mitglieder, verschachtelte Rollengruppen und die Objekt-ID bleiben unverändert,
    nur der Anzeigename ändert sich. Mehrfach ausführbar.

    Reihenfolge: ERST dieses Skript, DANN sagt Claude Bescheid, wenn Portal und Skripte
    auf den neuen Namen umgestellt werden (sonst verlieren Gruppenmitglieder dazwischen
    kurz die Kachel).

    Start (Ausführungsrichtlinie AllSigned):
        Unblock-File .\benenne-pnw-app-gruppe-um.ps1
        Set-ExecutionPolicy Bypass -Scope Process -Force
        .\benenne-pnw-app-gruppe-um.ps1
    Alternativ in einem Schritt:
        powershell.exe -ExecutionPolicy Bypass -File .\benenne-pnw-app-gruppe-um.ps1

    Bitte in der normalen PowerShell-Konsole starten (nicht in der ISE).
    Benötigt nur das Modul Microsoft.Graph.Authentication.
#>

$ErrorActionPreference = 'Stop'

$AltName  = 'PNW-App-Einarbeitung'
$NeuName  = 'PNW-App-Onboarding'
$TenantId = '1ac059d9-8d39-43ab-a8db-bd9197bde0f4'

if (-not (Get-Module -ListAvailable -Name Microsoft.Graph.Authentication)) {
    Write-Host 'Modul Microsoft.Graph.Authentication fehlt: Install-Module Microsoft.Graph.Authentication -Scope CurrentUser' -ForegroundColor Red
    return
}
Import-Module Microsoft.Graph.Authentication

Write-Host 'Anmeldung bei Microsoft Graph …' -ForegroundColor Cyan
Connect-MgGraph -TenantId $TenantId -Scopes 'Group.ReadWrite.All' -NoWelcome

function Find-Gruppe([string]$Name) {
    $f = [uri]::EscapeDataString("displayName eq '" + $Name + "'")
    return @((Invoke-MgGraphRequest -Method GET -Uri ('https://graph.microsoft.com/v1.0/groups?$filter=' + $f + '&$select=id,displayName,description')).value)
}

$alt = Find-Gruppe $AltName
$neu = Find-Gruppe $NeuName

if ($neu.Count -gt 0 -and $alt.Count -eq 0) {
    Write-Host ("Gruppe '" + $NeuName + "' existiert bereits, '" + $AltName + "' gibt es nicht mehr. Nichts zu tun.") -ForegroundColor Yellow
} elseif ($neu.Count -gt 0 -and $alt.Count -gt 0) {
    Write-Host ("ABBRUCH: Es gibt bereits eine Gruppe '" + $NeuName + "' UND '" + $AltName + "'. Bitte von Hand prüfen, nichts wurde geändert.") -ForegroundColor Red
} elseif ($alt.Count -eq 0) {
    Write-Host ("Gruppe '" + $AltName + "' nicht gefunden.") -ForegroundColor Red
} else {
    $id = $alt[0].id
    $body = '{"displayName":"' + $NeuName + '"}'
    Invoke-MgGraphRequest -Method PATCH -Uri ('https://graph.microsoft.com/v1.0/groups/' + $id) -Body $body -ContentType 'application/json' | Out-Null
    Write-Host ("Gruppe umbenannt: '" + $AltName + "' -> '" + $NeuName + "'") -ForegroundColor Green
}

Write-Host ''
$jetzt = Find-Gruppe $NeuName
if ($jetzt.Count -gt 0) {
    $m = @((Invoke-MgGraphRequest -Method GET -Uri ('https://graph.microsoft.com/v1.0/groups/' + $jetzt[0].id + '/members?$select=displayName,userPrincipalName&$top=999')).value)
    Write-Host ('Gruppe ' + $NeuName + ' – Mitglieder: ' + $m.Count) -ForegroundColor Cyan
    $m | ForEach-Object {
        [pscustomobject]@{ Name = $_.displayName; Konto = $_.userPrincipalName; Typ = $(if ($_.'@odata.type' -eq '#microsoft.graph.group') { 'Gruppe' } else { 'Benutzer' }) }
    } | Sort-Object Name | Format-Table -AutoSize
}
Disconnect-MgGraph -WarningAction SilentlyContinue | Out-Null

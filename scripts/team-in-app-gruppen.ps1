<#
    Team in App-Gruppen verschachteln – macht die Rollengruppe „Team“ (alle Mitarbeitenden)
    zum Mitglied der angegebenen PNW-App-Gruppen. Mehrfach ausführbar: Vorhandenes wird übersprungen.

    Aktuell: PNW-App-Unterschriften (ab 03.10.2026 für alle Mitarbeitenden: Fachkräfte sehen ihre
    eigenen Unterschriften, Teamleitungen/GF wahlweise das Team).

    Start (Ausführungsrichtlinie AllSigned):
        Unblock-File .\team-in-app-gruppen.ps1
        Set-ExecutionPolicy Bypass -Scope Process -Force
        .\team-in-app-gruppen.ps1
    Alternativ in einem Schritt:
        powershell.exe -ExecutionPolicy Bypass -File .\team-in-app-gruppen.ps1

    Bitte in der normalen PowerShell-Konsole starten (nicht in der ISE).
    Benötigt nur das Modul Microsoft.Graph.Authentication.
#>

$ErrorActionPreference = 'Stop'

$AppGruppen  = @('PNW-App-Unterschriften')   # weitere App-Gruppen hier ergänzen
$RollenGruppe = 'Team'
$TenantId    = '1ac059d9-8d39-43ab-a8db-bd9197bde0f4'

if (-not (Get-Module -ListAvailable -Name Microsoft.Graph.Authentication)) {
    Write-Host 'Modul Microsoft.Graph.Authentication fehlt: Install-Module Microsoft.Graph.Authentication -Scope CurrentUser' -ForegroundColor Red
    return
}
Import-Module Microsoft.Graph.Authentication

Write-Host 'Anmeldung bei Microsoft Graph …' -ForegroundColor Cyan
Connect-MgGraph -TenantId $TenantId -Scopes 'Group.ReadWrite.All', 'GroupMember.ReadWrite.All' -NoWelcome

function Get-GruppeId([string]$Name) {
    $f = [uri]::EscapeDataString("displayName eq '" + $Name + "'")
    $g = @((Invoke-MgGraphRequest -Method GET -Uri ('https://graph.microsoft.com/v1.0/groups?$filter=' + $f + '&$select=id,displayName')).value)
    if ($g.Count -eq 0) { return $null }
    return $g[0].id
}

$rolleId = Get-GruppeId $RollenGruppe
if (-not $rolleId) {
    Write-Host ("Rollengruppe '" + $RollenGruppe + "' nicht gefunden.") -ForegroundColor Red
    return
}

$ergebnis = @()
foreach ($name in $AppGruppen) {
    $id = Get-GruppeId $name
    if (-not $id) { $ergebnis += [pscustomobject]@{ AppGruppe = $name; Ergebnis = 'Gruppe nicht gefunden' }; continue }
    $vorhanden = @((Invoke-MgGraphRequest -Method GET -Uri ('https://graph.microsoft.com/v1.0/groups/' + $id + '/members?$select=id&$top=999')).value | ForEach-Object { $_.id })
    if ($vorhanden -contains $rolleId) { $ergebnis += [pscustomobject]@{ AppGruppe = $name; Ergebnis = ("'" + $RollenGruppe + "' war schon Mitglied") }; continue }
    try {
        $ref = @{ '@odata.id' = ('https://graph.microsoft.com/v1.0/directoryObjects/' + $rolleId) } | ConvertTo-Json
        Invoke-MgGraphRequest -Method POST -Uri ('https://graph.microsoft.com/v1.0/groups/' + $id + '/members/$ref') -Body $ref -ContentType 'application/json' | Out-Null
        $ergebnis += [pscustomobject]@{ AppGruppe = $name; Ergebnis = ("'" + $RollenGruppe + "' verschachtelt") }
    } catch {
        $ergebnis += [pscustomobject]@{ AppGruppe = $name; Ergebnis = ('FEHLER: ' + $_.Exception.Message) }
    }
}

Write-Host ''
$ergebnis | Format-Table -AutoSize -Wrap
Disconnect-MgGraph -WarningAction SilentlyContinue | Out-Null

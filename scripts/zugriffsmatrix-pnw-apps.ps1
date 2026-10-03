<#
============================================================
zugriffsmatrix-pnw-apps.ps1
Testmodus der PNW-Zugriffssteuerung: zeigt VOLLSTÄNDIG, wer über die
Entra-Gruppen PNW-App-<Name> (inkl. verschachtelter Rollengruppen) Zugriff
auf welche App hätte — und wer nicht. Nur lesend, ändert nichts.

Start (Rechner mit AllSigned, normale PowerShell-Konsole, NICHT ISE):
  cd "<Ordner des Skripts>"
  Unblock-File .\zugriffsmatrix-pnw-apps.ps1
  Set-ExecutionPolicy Bypass -Scope Process -Force
  .\zugriffsmatrix-pnw-apps.ps1
Alternativ in einem Zug:
  powershell.exe -ExecutionPolicy Bypass -File .\zugriffsmatrix-pnw-apps.ps1

Berechtigungen bei der Anmeldung: Group.Read.All, User.Read.All
(Admin-Zustimmung erforderlich, die Markus als Admin erteilen kann).
============================================================
#>

#Requires -Version 5.1

# Nur die benötigten Untermodule laden (vermeidet Versionskonflikte)
Import-Module Microsoft.Graph.Authentication
Import-Module Microsoft.Graph.Groups
Import-Module Microsoft.Graph.Users

Connect-MgGraph -Scopes "Group.Read.All", "User.Read.All" -NoWelcome

# Erwartete App-Gruppen laut Kacheln im Portal (data-gruppe)
$Erwartet = @(
    "PNW-App-Sozialraum", "PNW-App-Berichtsgenerator", "PNW-App-Spesenabrechnung", "PNW-App-Teamkarte",
    "PNW-App-Signatur", "PNW-App-Formulare", "PNW-App-Meetingprotokoll", "PNW-App-Organisation",
    "PNW-App-Fahrtenbuchcheck", "PNW-App-Orientierungsgespraech", "PNW-App-MitarbeiterCockpit",
    "PNW-App-ManagerCockpit", "PNW-App-JugendamtCockpit", "PNW-App-KlientenCockpit",
    "PNW-App-BusinessScorecard", "PNW-App-Unterschriften", "PNW-App-Mobilfunk", "PNW-App-OPAbgleich",
    "PNW-App-Sanity", "PNW-App-Einarbeitung", "PNW-App-Fuhrpark"
)
# Geschäftsführung wird nie gesperrt (feste Liste im Worker)
$GF = @("markus.peltz@praxisneuewege.de", "sonja.peltz@praxisneuewege.de")

$Gruppen = Get-MgGroup -Filter "startswith(displayName,'PNW-App-')" -All -ConsistencyLevel eventual -CountVariable gz

# Mitglieder je Gruppe (transitiv, nur Benutzerkonten)
$Mitglieder = @{}
foreach ($g in $Gruppen) {
    $m = Get-MgGroupTransitiveMember -GroupId $g.Id -All
    $upns = foreach ($x in $m) {
        if ($x.AdditionalProperties["@odata.type"] -eq "#microsoft.graph.user") {
            ([string]$x.AdditionalProperties["userPrincipalName"]).ToLower()
        }
    }
    $Mitglieder[$g.DisplayName] = @($upns | Where-Object { $_ } | Sort-Object -Unique)
}

# Bezugsgruppe: alle Mitarbeitenden = Gruppe "Team"
$team = Get-MgGroup -Filter "displayName eq 'Team'"
$alle = foreach ($x in (Get-MgGroupTransitiveMember -GroupId $team.Id -All)) {
    if ($x.AdditionalProperties["@odata.type"] -eq "#microsoft.graph.user") {
        ([string]$x.AdditionalProperties["userPrincipalName"]).ToLower()
    }
}
$alle = @($alle + $GF | Where-Object { $_ } | Sort-Object -Unique)

Write-Host ""
Write-Host "1) Erwartete Gruppen, die FEHLEN (Kachel würde für alle außer GF verschwinden):" -ForegroundColor Yellow
$gefunden = $Gruppen | ForEach-Object { $_.DisplayName }
$fehlt = $Erwartet | Where-Object { $gefunden -notcontains $_ }
if ($fehlt) { $fehlt | ForEach-Object { [pscustomobject]@{ FehlendeGruppe = $_ } } | Format-Table -AutoSize } else { Write-Host "keine" }

Write-Host ""
Write-Host "2) Mitglieder je App-Gruppe:" -ForegroundColor Yellow
$Mitglieder.GetEnumerator() | Sort-Object Name | ForEach-Object {
    [pscustomobject]@{ Gruppe = $_.Name; Mitglieder = $_.Value.Count }
} | Format-Table -AutoSize

Write-Host ""
Write-Host "3) Je Konto: Zugriff auf n Apps und Apps OHNE Zugriff (GF immer voll):" -ForegroundColor Yellow
$bekannt = $Erwartet | Where-Object { $gefunden -contains $_ }
$zeilen = foreach ($u in $alle) {
    $istGf = $GF -contains $u
    $ohne = @()
    foreach ($g in $Erwartet) {
        $hat = $istGf -or ($Mitglieder.ContainsKey($g) -and ($Mitglieder[$g] -contains $u))
        if (-not $hat) { $ohne += ($g -replace '^PNW-App-', '') }
    }
    [pscustomobject]@{
        Konto      = $u
        GF         = if ($istGf) { "ja" } else { "" }
        MitZugriff = $Erwartet.Count - $ohne.Count
        OhneZugriff = ($ohne -join ", ")
    }
}
$zeilen | Sort-Object Konto | Format-Table -AutoSize -Wrap

Write-Host ""
Write-Host "Geschäftsführung ist im Worker fest hinterlegt und wird nie ausgesperrt." -ForegroundColor Green
Disconnect-MgGraph | Out-Null

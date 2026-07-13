/* ═══════════════════════════════════════════════════════════════
 * ENTWURF — /api/mitarbeiter-cockpit
 * Für: mitarbeiter-cockpit-beta.html
 *
 * ⚠ NICHT in index.js eingebunden. Diese Datei wird vom Worker
 *   aktuell NICHT deployed/ausgeführt — reiner Bauplan für die
 *   Zusammenführung.
 *
 * ZUSAMMENFÜHRUNG (Kurzweg, ~30 min):
 *   1. Kilanka-Graph erweitern (Konfiguration → Schnittstellen):
 *      users: name, firstName, recName, entryDate, targetHours,
 *             contracts { validFrom, validUntil, weeklyHours, orgUnit { name } },
 *             workQualifications (bereits freigegeben)
 *      users/absences: begin, end, totalDays, type, status,
 *             absenceType { name, internalName }, user { id, recName }
 *   2. Die drei Blöcke unten (GRAPHEN, buildCockpit, Route) nach
 *      index.js kopieren; Route im fetch()-Handler VOR dem
 *      404-Fallback registrieren.
 *   3. Berechtigung: TL/GF-Sicht über Entra-ID-Gruppen-Claims
 *      (groups im Token) ODER über die bestehende SharePoint-Liste
 *      Mitarbeiter_Profil (Feld "Teamleitung") — Entscheidung offen.
 *      V1 unten: jeder sieht NUR sich selbst (?mitarbeiter-Parameter
 *      wird ignoriert, solange keine Gruppenprüfung existiert).
 *   4. Firmenwagen: kommt NICHT aus Kilanka. Vorschlag: SharePoint-
 *      Liste "Fuhrpark" (Kennzeichen, Modell, kmStand, kmStandDatum,
 *      kmBudgetJahr, ZugeordnetUPN) — Abruf clientseitig per Graph
 *      wie in der Organisation-App, NICHT über diesen Worker.
 *   5. FLS-Ist: Leistungsdokumentation ist (Stand 07/2026) nicht im
 *      freigegebenen API-Katalog → Support-Anfrage. Bis dahin liefert
 *      der Endpunkt istWochenstunden: null, istQuelle: "offen".
 * ═══════════════════════════════════════════════════════════════ */

// ── 1. ZUSÄTZLICHE GRAPHEN ────────────────────────────────────────

const USER_COCKPIT_GRAPH = {
  id: 1, recName: 1, name: 1, firstName: 1, deletedAt: 1,
  entryDate: 1,          // Eintrittsdatum ($date) — Feldname per allowed-graphs verifizieren
  targetHours: 1,        // Sollstunden — Struktur beim ersten Echt-Abruf prüfen
  contracts: {
    validFrom: 1, validUntil: 1,
    weeklyHours: 1,      // vertragliche Wochenstunden
    orgUnit: { name: 1 },
  },
  workQualifications: {
    validFrom: 1, validUntil: 1,
    qualification: { name: 1 },
  },
  $limit: 1000,
};

// users/absences: KEINE $gte-Filter möglich (500) → Jahr clientseitig
// (= workerseitig) filtern. Gleichheitsfilter auf user.id wäre zu
// prüfen; sicherer Weg: alles holen + cachen (10 req/5 s beachten).
const ABSENCES_GRAPH = {
  begin: 1, end: 1, totalDays: 1,       // totalDays = $decimal!
  type: 1, status: 1,                    // type leer bei eigenen Typen
  absenceType: { name: 1, internalName: 1 },
  user: { id: 1, recName: 1 },
  $limit: 1000,
};

// ── 2. AUFBEREITUNG ──────────────────────────────────────────────
// Nutzt vorhandene Helfer aus index.js: kDate, isCurrent, isArchived,
// deriveEmail, upnForAttendant, durationToHours, kilankaPost,
// fetchKilankaClients (Klienten + quotas sind dort schon geladen).

function classifyAbsence(a) {
  const t = (a.type || a.absenceType?.internalName || "").toLowerCase();
  const n = (a.absenceType?.name || "").toLowerCase();
  if (t === "vacation" || n.includes("urlaub")) return "urlaub";
  if (n.includes("kind")) return "kindkrank";
  if (t === "sick" || t === "illness" || n.includes("krank")) return "krank";
  return "sonstig"; // Regenerationstage, Geburtstag, Fortbildung …
}

async function buildCockpit(env, upn, now) {
  const jahr = now.getFullYear();

  // a) Mitarbeiter-Stammdaten
  const users = await kilankaPost(env, "users", USER_COCKPIT_GRAPH);
  const me = (users || []).find(
    (u) => !kDate(u.deletedAt) && upnForAttendant(u) === upn
  );
  if (!me) return null;

  const vertrag = (me.contracts || []).find((c) => isCurrent(c.validFrom, c.validUntil, now));
  const quali = (me.workQualifications || [])
    .filter((q) => q.qualification?.name && isCurrent(q.validFrom, q.validUntil, now))
    .sort((a, b) => (kDate(b.validFrom)?.getTime() || 0) - (kDate(a.validFrom)?.getTime() || 0))[0];

  // b) Abwesenheiten des Jahres (nur genehmigte)
  const absences = await kilankaPost(env, "users/absences", ABSENCES_GRAPH);
  let urlaubGenommen = 0, urlaubGeplant = 0, krankTage = 0, kindKrank = 0, letzte = null;
  for (const a of absences || []) {
    if (String(a.user?.id) !== String(me.id)) continue;
    if ((a.status || "").toLowerCase() !== "approved") continue;
    const begin = kDate(a.begin);
    if (!begin || begin.getFullYear() !== jahr) continue; // Jahresgrenzen-Splits später verfeinern
    const tage = parseFloat(a.totalDays?.$decimal ?? a.totalDays ?? 0) || 0;
    const art = classifyAbsence(a);
    if (art === "urlaub") { begin > now ? (urlaubGeplant += tage) : (urlaubGenommen += tage); }
    else if (art === "krank") { krankTage += tage; if (!letzte || begin > letzte) letzte = begin; }
    else if (art === "kindkrank") { kindKrank += tage; }
  }
  // Urlaubsanspruch: laut API-Doku in users/absences enthalten
  // ("Urlaubsanspruch") — exakten Feldnamen per allowed-graphs prüfen.
  const anspruch = 30; // TODO: aus API statt Konstante

  // c) Klienten + FLS-Soll aus dem bereits vorhandenen Client-Cache
  const clients = await fetchKilankaClients(env);
  let hb = 0, mb = 0, v = 0, sollWochenstunden = 0;
  for (const c of clients || []) {
    if (kDate(c.deletedAt) || isArchived(c.recName)) continue;
    for (const act of c.actions || []) {
      if (kDate(act.deletedAt) || !isCurrent(act.validFrom, act.validUntil, now)) continue;
      const att = (act.attendants || []).find(
        (a) => isCurrent(a.validFrom, a.validUntil, now) &&
               !isArchived(a.user?.recName) &&
               upnForAttendant(a.user || {}) === upn
      );
      if (!att) continue;
      const rolle = att.attendantKind?.name;
      if (rolle === "Hauptbetreuer") hb++;
      else if (rolle === "Mitbetreuer") mb++;
      else if (rolle === "Vertretung") v++;
      // FLS-Soll nur für Hauptbetreuung zählen (Doppelzählung vermeiden)
      if (rolle !== "Hauptbetreuer") continue;
      for (const q of act.quotas || []) {
        const ap = (q.approvals || []).find((a) => isCurrent(a.validFrom, a.validUntil, now));
        if (!ap) continue;
        const h = durationToHours(ap.hours);
        if (h == null) continue;
        switch (q.timeBase) {
          case "week": sollWochenstunden += h; break;
          case "month_current": sollWochenstunden += (h * 12) / 52; break;
          case "pool": {
            const vf = kDate(ap.validFrom), vu = kDate(ap.validUntil);
            const wochen = vf && vu ? Math.max(1, (vu - vf) / 6048e5) : null;
            if (wochen) sollWochenstunden += h / wochen;
            break;
          }
          // "quantity": Mengen-Kontingente → keine Stunden
        }
      }
    }
  }

  return {
    upn,
    person: {
      name: me.recName || `${me.name}, ${me.firstName}`,
      rolle: quali?.qualification?.name || "Fachkraft",
      team: vertrag?.orgUnit?.name || "—",
      qualifikation: quali?.qualification?.name || "—",
      eintritt: me.entryDate?.$date || null,
      wochenstundenVertrag: durationToHours(vertrag?.weeklyHours) ?? vertrag?.weeklyHours ?? null,
    },
    urlaub: {
      jahr, anspruchTage: anspruch,
      genommenTage: Math.round(urlaubGenommen * 2) / 2,
      geplantTage: Math.round(urlaubGeplant * 2) / 2,
      restTage: Math.round((anspruch - urlaubGenommen - urlaubGeplant) * 2) / 2,
    },
    krankheit: {
      jahr, tage: Math.round(krankTage * 2) / 2,
      vorjahrTage: null, // 2. Durchlauf mit Vorjahresfilter, wenn gewünscht
      kindKrankTage: Math.round(kindKrank * 2) / 2,
      letzteAbwesenheit: letzte ? letzte.toISOString().slice(0, 10) : null,
    },
    firmenwagen: { vorhanden: false }, // Quelle: SharePoint "Fuhrpark", clientseitig
    klienten: { aktiv: hb + mb + v, hb, mb, v },
    fls: {
      sollWochenstunden: Math.round(sollWochenstunden * 10) / 10,
      istWochenstunden: null,
      istQuelle: "offen", // Leistungsdoku nicht im API-Graphen (Support-Anfrage)
    },
  };
}

// ── 3. ROUTE (in den fetch-Handler von index.js einfügen) ────────
/*
    if (url.pathname === "/api/mitarbeiter-cockpit") {
      const auth = await validateEntraToken(request.headers.get("Authorization"));
      if (!auth.ok) return json({ error: auth.error }, 401, origin);
      // V1: strikt nur die eigene Sicht — ?mitarbeiter=… erst nach
      // Einbau der Entra-Gruppenprüfung (TL/GF) auswerten!
      const data = await buildCockpit(env, auth.upn, new Date());
      if (!data) return json({ error: "Kein Kilanka-Mitarbeiter zum Konto gefunden" }, 404, origin);
      return json(data, 200, origin);
    }
*/

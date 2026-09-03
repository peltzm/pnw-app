/* ═══════════════════════════════════════════════════════════════
 * PNW Kilanka-Proxy — Cloudflare Worker
 * Praxis NeueWege · Berichtsgenerator-Backend (Schritt 1)
 *
 * Endpunkte:
 *   GET /api/meine-klienten   → Klienten des angemeldeten Mitarbeiters
 *                               (HB/MB/V), vorbefüllungsfertig für S1/S2
 *   GET /api/health           → Statuscheck ohne Auth (kein Datenzugriff)
 *
 * Sicherheit:
 *   - Kilanka-Token liegt NUR als Worker-Secret (KILANKA_TOKEN)
 *   - Jeder Datenzugriff erfordert ein gültiges Entra-ID-Token
 *     (Signatur gegen JWKS, Issuer, Audience, Ablauf)
 *   - Need-to-know: Der Worker liefert ausschließlich Klienten,
 *     bei denen der angemeldete Nutzer aktive*r Hauptbetreuer,
 *     Mitbetreuer oder Vertretung ist
 * ═══════════════════════════════════════════════════════════════ */

// ── Konfiguration (nicht geheim) ──────────────────────────────────
const TENANT_ID = "1ac059d9-8d39-43ab-a8db-bd9197bde0f4";
const CLIENT_ID = "f7e00950-2421-43b5-b48a-447bf8e7d4b3";
const KILANKA_BASE = "https://neue-wege.kilanka.de/be/api/public/v2";
const MAIL_DOMAIN = "praxisneuewege.de";

// ── Relution (MDM) — Org PraxisNeueWege1 auf live.relution.io ────
// Auth: statischer Access Token (Portal: Profil → Access Token) als
// Worker-Secret RELUTION_TOKEN im Header X-User-Access-Token.
const RELUTION_BASE = "https://live.relution.io";
const RELUTION_CACHE_TTL_MIN = 10;
let relutionCache = { fetchedAt: 0, geraete: null };

// Nur diese Felder verlassen den Worker — kein Durchreichen unbekannter
// Relution-Strukturen an den Client.
function relutionNormalisieren(d) {
  const info = d.deviceInfo || d.info || {};
  return {
    uuid: d.uuid || d.id || null,
    name: d.name || info.deviceName || null,
    serialNumber: d.serialNumber || info.serialNumber || null,
    imei: d.imei || info.imei || null,
    platform: d.platform || null,
    status: d.status || d.complianceStatus || null,
    model: d.model || d.deviceModel || info.model || null,
    manufacturer: d.manufacturer || info.manufacturer || null,
    osVersion: d.osVersion || d.operatingSystemVersion || info.osVersion || null,
    phoneNumber: d.phoneNumber || info.phoneNumber || null,
    username: d.username || d.userName || (d.user && (d.user.name || d.user.userName)) || null,
    ownership: d.ownership || null,
    enrollmentDate: d.enrollmentDate || d.creationDate || null,
    lastConnectionDate: d.lastConnectionDate || null,
  };
}

async function fetchRelutionGeraete(env) {
  const jetzt = Date.now();
  if (relutionCache.geraete && jetzt - relutionCache.fetchedAt < RELUTION_CACHE_TTL_MIN * 60000) {
    return relutionCache.geraete;
  }
  const body = JSON.stringify({
    limit: 500,
    offset: 0,
    getNonpagedCount: true,
    sortOrder: { sortFields: [{ name: "lastConnectionDate", ascending: false }] },
  });
  const headers = {
    "X-User-Access-Token": env.RELUTION_TOKEN,
    "Content-Type": "application/json",
    Accept: "application/json",
    "Accept-Charset": "UTF-8",
  };
  // Bevorzugt: v2-Query-Endpunkt (laut Relution-Doku). Fallback auf die
  // einfache v1-Liste, falls der Endpunkt der Instanz abweicht.
  let r = await fetch(`${RELUTION_BASE}/api/management/v2/devices/baseInfo/query`, {
    method: "POST", headers, body,
  });
  if (r.status === 404 || r.status === 405) {
    r = await fetch(`${RELUTION_BASE}/api/v1/devices?limit=500`, { headers });
  }
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`Relution ${r.status}: ${t.slice(0, 300)}`);
  }
  const d = await r.json();
  const roh = d.results || d.items || d.value || (Array.isArray(d) ? d : []);
  const geraete = roh.map(relutionNormalisieren);
  relutionCache = { fetchedAt: jetzt, geraete };
  return geraete;
}

const ALLOWED_ORIGINS = [
  "https://apps.praxisneuewege.de",
  "http://localhost:8000", // lokale Entwicklung
  "http://localhost:5173",
];

// Kilanka-Antwort im Worker-Isolate zwischenspeichern (Minuten).
// Schont das Rate-Limit (10 Req / 5 s) und beschleunigt die App.
const CACHE_TTL_MIN = 10;

// Ausnahmen von der E-Mail-Namenskonvention:
// Kilanka user.id (String!) → Entra-UPN (lowercase).
// Befüllen nach dem Abgleich-Script (Spalte KilankaId der PRUEFEN-Zeilen).
const UPN_OVERRIDES = {
  // "1234": "lena.blumoser@praxisneuewege.de", // Blumoser, Lena Marie
};

// timeBase (Kilanka) → Kontingenttyp-Dropdown der App
const TIMEBASE_MAP = {
  week: "Wochenstunden",
  month_current: "Monatsstunden",
  month: "Monatsstunden (30 Tage pro Monat)", // Annahme: timeBase-Wert der 30-Tage-Variante — bei Auftreten prüfen
  pool: "Poolstunden",
};

// ── Kilanka-Graph: exakt die benötigten Felder, nichts Sensibles ──
// Verschachtelte Sammlungen lassen sich NICHT ueber $offset nachladen — es gibt
// nur $limit. Ohne Angabe greift ein undokumentierter Server-Default, der still
// abschneidet. Deshalb hier bewusst grosszuegig und explizit; pruefeGrenzen()
// meldet, sobald eine Sammlung ihr Limit tatsaechlich ausreizt.
const N_LIMIT = {
  actions: 200,            // Massnahmen je Klient ueber die gesamte Fallhistorie
  attendants: 100,         // Betreuer-Zuordnungen je Massnahme
  quotas: 100,             // Kontingente je Massnahme
  approvals: 200,          // Bewilligungen je Kontingent (bei quartalsweiser Bewilligung ~4/Jahr)
  workQualifications: 50,  // Qualifikationseintraege je Mitarbeiter
};

function pruefeGrenzen(clients) {
  const treffer = new Set();
  const pruefe = (name, arr) => {
    if (Array.isArray(arr) && arr.length >= N_LIMIT[name]) treffer.add(`${name} (${arr.length})`);
  };
  for (const c of clients || []) {
    pruefe("actions", c.actions);
    for (const a of c.actions || []) {
      pruefe("attendants", a.attendants);
      pruefe("quotas", a.quotas);
      for (const q of a.quotas || []) pruefe("approvals", q.approvals);
    }
  }
  if (treffer.size) {
    console.warn(
      "Kilanka: verschachtelte Sammlung am $limit — Daten moeglicherweise unvollstaendig: " +
      [...treffer].join(", ") + ". N_LIMIT in worker/src/index.js anheben."
    );
  }
}

const CLIENT_GRAPH = {
  id: 1, recName: 1, name: 1, firstName: 1, dayOfBirth: 1,
  street: 1, zip: 1, city: 1, deletedAt: 1,
  contacts: {
    kind: { name: 1 },
    custodian: 1,
    contact: { recName: 1, name: 1, firstName: 1 },
  },
  actions: {
    recName: 1, mainAction: 1, deletedAt: 1,
    validFrom: 1, validUntil: 1,
    legalBasis: { name: 1 },
    department: { id: 1, name: 1, shortName: 1 }, // shortName = Kurzname (Probe; Fallback: contacts-Map)
    departmentResponsible: { recName: 1 },
    fileReference: 1, reportDueDate: 1, nextMeeting: 1,
    attendants: {
      validFrom: 1, validUntil: 1, amount: 1, // amount = Verteilungsgewicht (z. B. 50/50 bei Tandem)
      user: { id: 1, recName: 1 },
      attendantKind: { name: 1 },
      $limit: N_LIMIT.attendants,
    },
    quotas: {
      name: 1, type: 1, limitPeriod: 1, timeBase: 1,
      deletedAt: 1, // seit 13.07. verfügbar (Kilanka-Support) — gelöschte Kontingente ausfiltern
      // ACHTUNG: "quantity" hier NIE anfragen (killt quotas-Zweig, s. Doku §4)
      approvals: { id: 1, validFrom: 1, validUntil: 1, hours: 1, $limit: N_LIMIT.approvals }, // id seit 13.07. freigegeben → präzise Rechnungs-Zuordnung (FLS-Ist)
      $limit: N_LIMIT.quotas,
    },
    $limit: N_LIMIT.actions,
  },
  $limit: 1000,
};

// Users-Graph: nur ID + aktuell gültige Qualifikation (fuer Betreuer-Vorbefuellung)
const USERS_GRAPH = {
  id: 1,
  deletedAt: 1,
  workQualifications: {
    validFrom: 1,
    validUntil: 1,
    qualification: { name: 1 },
    $limit: N_LIMIT.workQualifications,
  },
  $limit: 1000,
};

// ═══════════════════════════════════════════════════════════════
// Kilanka-Sondertypen entpacken ($date/$datetime/$duration/$interval/$decimal)
// ═══════════════════════════════════════════════════════════════
function kDate(w) {
  if (w == null) return null;
  if (typeof w === "string") return w ? new Date(w) : null;
  const v = w.$date ?? w.$datetime;
  return v ? new Date(v) : null;
}

function durationToHours(w) {
  if (w == null) return null;
  if (typeof w === "number") return w;
  const s = typeof w === "string" ? w : (w.$duration ?? w.$interval ?? null);
  if (s == null) {
    if (w.$decimal != null) return parseFloat(w.$decimal);
    return null;
  }
  if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  const hm = s.match(/^(\d+):(\d{2})(?::(\d{2}))?$/); // "HH:MM(:SS)"
  if (hm) return +hm[1] + +hm[2] / 60 + (hm[3] ? +hm[3] / 3600 : 0);
  // ISO-8601-Dauer, z.B. P2DT3H30M
  const iso = s.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/);
  if (!iso) return null;
  return (+iso[1] || 0) * 24 + (+iso[2] || 0) + (+iso[3] || 0) / 60 + (+iso[4] || 0) / 3600;
}

function isoDate(d) {
  return d ? d.toISOString().slice(0, 10) : null;
}

// Gültigkeit: validFrom ≤ heute ≤ validUntil, null/fehlend = offen
function isCurrent(vfRaw, vuRaw, now) {
  const vf = kDate(vfRaw), vu = kDate(vuRaw);
  if (vf && vf > now) return false;
  if (vu && vu < now) return false;
  return true;
}

function isArchived(recName) {
  return typeof recName === "string" && recName.startsWith("[archiviert]");
}

// ═══════════════════════════════════════════════════════════════
// E-Mail-Ableitung nach PNW-Konvention: "Peltz, Sonja" → sonja.peltz@…
// ═══════════════════════════════════════════════════════════════
function deriveEmail(recName) {
  const m = /^(.+?),\s*(.+)$/.exec(recName || "");
  if (!m) return null;
  let s = `${m[2]}.${m[1]}`.toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFD").replace(/\p{Mn}/gu, "")
    .replace(/[^a-z0-9.\-]/g, "");
  return `${s}@${MAIL_DOMAIN}`;
}

function upnForAttendant(user) {
  return (UPN_OVERRIDES[String(user.id)] ?? deriveEmail(user.recName) ?? "").toLowerCase();
}

// ═══════════════════════════════════════════════════════════════
// Entra-ID-Token-Validierung (RS256 gegen JWKS, mit Key-Cache)
// Akzeptiert ID-Token (aud = CLIENT_ID) oder Access-Token für die
// eigene API (aud = api://CLIENT_ID).
// ═══════════════════════════════════════════════════════════════
let jwksCache = { keys: null, fetchedAt: 0 };

async function getJwks() {
  const MAX_AGE = 6 * 60 * 60 * 1000; // 6 h
  if (jwksCache.keys && Date.now() - jwksCache.fetchedAt < MAX_AGE) return jwksCache.keys;
  const r = await fetch(
    `https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`
  );
  if (!r.ok) throw new Error(`JWKS-Abruf fehlgeschlagen: ${r.status}`);
  const { keys } = await r.json();
  jwksCache = { keys, fetchedAt: Date.now() };
  return keys;
}

function b64urlToBytes(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function validateEntraToken(authHeader) {
  const token = (authHeader || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return { ok: false, error: "Kein Token" };
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, error: "Kein JWT" };

  let header, payload;
  try {
    header = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[0])));
    payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[1])));
  } catch {
    return { ok: false, error: "Token nicht dekodierbar" };
  }
  if (header.alg !== "RS256") return { ok: false, error: "Unerwarteter Algorithmus" };

  const now = Math.floor(Date.now() / 1000);
  // exp ist PFLICHT: ein Token ohne Ablaufangabe waere sonst unbegrenzt gueltig.
  // Entra setzt exp immer — fehlt es, stimmt etwas grundsaetzlich nicht.
  if (typeof payload.exp !== "number") return { ok: false, error: "Token ohne Ablaufzeit" };
  if (payload.exp < now - 60) return { ok: false, error: "Token abgelaufen" };
  if (payload.nbf && payload.nbf > now + 60) return { ok: false, error: "Token noch nicht gültig" };

  const issOk =
    payload.iss === `https://login.microsoftonline.com/${TENANT_ID}/v2.0` ||
    payload.iss === `https://sts.windows.net/${TENANT_ID}/`;
  if (!issOk) return { ok: false, error: "Falscher Issuer" };

  const audOk = payload.aud === CLIENT_ID || payload.aud === `api://${CLIENT_ID}`;
  if (!audOk) return { ok: false, error: "Falsche Audience" };

  // Signatur prüfen
  const keys = await getJwks();
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) {
    jwksCache = { keys: null, fetchedAt: 0 }; // Key-Rollover: Cache verwerfen
    return { ok: false, error: "Signaturschlüssel unbekannt" };
  }
  const key = await crypto.subtle.importKey(
    "jwk", jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["verify"]
  );
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5", key,
    b64urlToBytes(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
  );
  if (!valid) return { ok: false, error: "Signatur ungültig" };

  const upn = (payload.preferred_username || payload.upn || payload.email || "").toLowerCase();
  if (!upn) return { ok: false, error: "Kein UPN im Token" };
  return { ok: true, upn, name: payload.name || "" };
}

// ═══════════════════════════════════════════════════════════════
// Kilanka-Abruf mit Retry (502) und Isolate-Cache
// ═══════════════════════════════════════════════════════════════
let clientCache = { data: null, fetchedAt: 0 };
let rosterCache = { data: null, fetchedAt: 0 };

// Dienstpläne (rosters): Plan-Metadaten + eingeplante User — freigeschaltet
// laut Probe 15.07.2026. Keine Schichten/Stunden in der API, nur Planungs-Status.
const ROSTER_GRAPH = {
  id: 1, name: 1, deletedAt: 1,
  plans: {
    id: 1, name: 1, validFrom: 1, validUntil: 1, published: 1, deletedAt: 1,
    users: { id: 1, $limit: 200 },
    $limit: 500,
  },
  $limit: 100,
};

async function fetchKilankaRosters(env) {
  if (rosterCache.data && Date.now() - rosterCache.fetchedAt < CACHE_TTL_MIN * 60 * 1000) {
    return rosterCache.data;
  }
  // Wie bei clients seitenweise laden — $limit allein liefert nur die erste Seite.
  const data = [];
  const limit = ROSTER_GRAPH.$limit || 100;
  for (let offset = 0; ; offset += limit) {
    const page = await kilankaPost(env, "rosters", { ...ROSTER_GRAPH, $offset: offset });
    if (Array.isArray(page)) data.push(...page);
    if (!Array.isArray(page) || page.length < limit) break;
  }
  rosterCache = { data, fetchedAt: Date.now() };
  return rosterCache.data;
}

// Kilanka-User-ID → aktuell gültiger, veröffentlichter Dienstplan zum Stichtag.
// Bei mehreren Treffern gewinnt der Plan mit dem spätesten Ende.
async function dienstplanMap(env, now) {
  const rosters = await fetchKilankaRosters(env);
  const map = new Map();
  for (const r of rosters || []) {
    if (kDate(r.deletedAt)) continue;
    for (const p of r.plans || []) {
      if (kDate(p.deletedAt) || p.published !== true) continue;
      if (!isCurrent(p.validFrom, p.validUntil, now)) continue;
      const info = {
        plan: [r.name, p.name].filter(Boolean).join(" · "),
        bis: isoDate(kDate(p.validUntil)),
      };
      for (const u of p.users || []) {
        const id = String(u.id);
        const alt = map.get(id);
        if (!alt || (kDate(p.validUntil) || 0) > (kDate(alt._bis) || 0)) {
          map.set(id, { ...info, _bis: p.validUntil });
        }
      }
    }
  }
  for (const v of map.values()) delete v._bis;
  return map;
}
let qualiCache = { map: null, fetchedAt: 0 };

async function kilankaPost(env, model, graph) {
  const body = JSON.stringify(graph);
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await fetch(`${KILANKA_BASE}/${model}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.KILANKA_TOKEN}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body,
    });
    if (r.ok) {
      const json = await r.json();
      return json.data ?? json;
    }
    lastErr = `Kilanka ${r.status} bei ${model}`; // Modell im Text: sonst ist bei 403 nicht erkennbar, welche Freigabe fehlt
    if (r.status === 502 || r.status === 429) {
      await new Promise((res) => setTimeout(res, 800 * attempt));
      continue;
    }
    break;
  }
  throw new Error(lastErr || "Kilanka nicht erreichbar");
}

async function fetchKilankaClients(env) {
  if (clientCache.data && Date.now() - clientCache.fetchedAt < CACHE_TTL_MIN * 60 * 1000) {
    return clientCache.data;
  }
  // Paginiert laden: mit dem Archiv (Jugendamt-Cockpit wertet Fälle ab 04/2024
  // aus, inkl. archivierter) kann der Bestand die alte 1000er-Seite sprengen.
  const data = [];
  const limit = CLIENT_GRAPH.$limit || 1000;
  for (let offset = 0; ; offset += limit) {
    const page = await kilankaPost(env, "clients", { ...CLIENT_GRAPH, $offset: offset });
    if (Array.isArray(page)) data.push(...page);
    if (!Array.isArray(page) || page.length < limit) break;
  }
  pruefeGrenzen(data);
  clientCache = { data, fetchedAt: Date.now() };
  return data;
}

// Map: Kilanka user.id -> aktuell gueltige Qualifikation (Wortlaut aus Kilanka)
async function fetchQualiMap(env, now) {
  if (qualiCache.map && Date.now() - qualiCache.fetchedAt < CACHE_TTL_MIN * 60 * 1000) {
    return qualiCache.map;
  }
  const map = {};
  try {
    const users = await kilankaPost(env, "users", USERS_GRAPH);
    for (const u of users || []) {
      if (kDate(u.deletedAt)) continue;
      const gueltige = (u.workQualifications || [])
        .filter((q) => q.qualification?.name && isCurrent(q.validFrom, q.validUntil, now))
        .sort((a, b) => (kDate(b.validFrom)?.getTime() || 0) - (kDate(a.validFrom)?.getTime() || 0));
      if (gueltige.length) map[String(u.id)] = gueltige[0].qualification.name;
    }
    qualiCache = { map, fetchedAt: Date.now() };
  } catch (e) {
    // Qualifikationen sind nice-to-have: bei Fehler ohne sie weitermachen
    console.warn("Quali-Abruf fehlgeschlagen:", e.message);
  }
  return map;
}

// ═══════════════════════════════════════════════════════════════
// Fachlogik: Klienten des Nutzers, vorbefüllungsfertig
// ═══════════════════════════════════════════════════════════════
const ROLE_RANK = { Hauptbetreuer: 3, Mitbetreuer: 2, Vertretung: 1 };
const ROLE_SHORT = { Hauptbetreuer: "HB", Mitbetreuer: "MB", Vertretung: "V" };

function pickApproval(approvals, now) {
  const list = (approvals || []).map((a) => ({
    von: kDate(a.validFrom),
    bis: kDate(a.validUntil),
    stunden: durationToHours(a.hours),
  }));
  const current = list.filter(
    (a) => (!a.von || a.von <= now) && (!a.bis || a.bis >= now)
  );
  if (current.length) {
    // Bei mehreren gültigen: jüngster Beginn gewinnt
    return { ...current.sort((x, y) => (y.von?.getTime() || 0) - (x.von?.getTime() || 0))[0], status: "aktuell" };
  }
  if (!list.length) return null;
  const past = list.filter((a) => a.bis && a.bis < now)
    .sort((x, y) => y.bis.getTime() - x.bis.getTime());
  if (past.length) return { ...past[0], status: "abgelaufen" };
  const future = list.filter((a) => a.von && a.von > now)
    .sort((x, y) => x.von.getTime() - y.von.getTime());
  if (future.length) return { ...future[0], status: "zukuenftig" };
  return { ...list[0], status: "unbekannt" };
}

// Bewilligte Wochenstunden (FLS) einer Massnahme aus dem aktuell gültigen
// Kontingent ableiten — gleiche Umrechnung wie sollWochenstunden im
// Mitarbeiter-Cockpit (week 1:1, month_current ×12/52, pool ÷ Bewilligungswochen).
// Mengen-Kontingente (timeBase quantity, z. B. Fahrten) und nicht (mehr)
// gültige Bewilligungen liefern null.
function bewilligteWochenstunden(action, now) {
  for (const q of action.quotas || []) {
    if (kDate(q.deletedAt)) continue;
    if (q.timeBase === "quantity") continue;
    const appr = pickApproval(q.approvals, now);
    if (!appr || appr.stunden == null || appr.status !== "aktuell") continue;
    switch (q.timeBase) {
      case "week":
        return Math.round(appr.stunden * 100) / 100;
      case "month_current":
        return Math.round(((appr.stunden * 12) / 52) * 100) / 100;
      case "pool": {
        const wochen = appr.von && appr.bis ? Math.max(1, (appr.bis - appr.von) / 6048e5) : null;
        return wochen ? Math.round((appr.stunden / wochen) * 100) / 100 : null;
      }
      default:
        return null;
    }
  }
  return null;
}

function buildClientProfile(client, action, role, now, qualiMap) {
  // Kontingent: mit timeBase gültige Bewilligung suchen; Mengen-Kontingente
  // (timeBase quantity) für Fachleistungsstunden ignorieren
  let stunden = null, stundenTyp = "", kontingentHinweis = "", bewVon = null, bewBis = null;
  for (const q of action.quotas || []) {
    if (kDate(q.deletedAt)) continue; // gelöschtes Kontingent
    if (q.timeBase === "quantity") continue;
    const appr = pickApproval(q.approvals, now);
    if (!appr || appr.stunden == null) continue;
    let wert = appr.stunden;
    bewVon = appr.von; bewBis = appr.bis;
    stundenTyp = TIMEBASE_MAP[q.timeBase] || "";
    if (!stundenTyp) kontingentHinweis = q.name || "Kontingenttyp in Kilanka nicht gepflegt";
    if (appr.status !== "aktuell") {
      kontingentHinweis = appr.status === "abgelaufen"
        ? `Bewilligung abgelaufen ${isoDate(appr.bis)}`
        : appr.status === "zukuenftig"
          ? `Bewilligung ab ${isoDate(appr.von)}`
          : kontingentHinweis;
    }
    stunden = Math.round(wert * 100) / 100;
    break; // erstes verwertbares Kontingent der Maßnahme
  }

  const sorgeberechtigte = (client.contacts || [])
    .filter((c) => c.custodian === true && c.contact)
    .map((c) => ({
      vorname: c.contact.firstName || "",
      familienname: c.contact.name || "",
      beziehung: c.kind?.name || "",
    }));

  const weitereKinder = (client.contacts || [])
    .filter((c) => /geschwister|bruder|schwester/i.test(c.kind?.name || "") && c.contact)
    .map((c) => ({
      vorname: c.contact.firstName || "",
      familienname: c.contact.name || "",
    }));

  // Alle aktiven Betreuer der Maßnahme (HB zuerst, dann MB, dann V) —
  // Namen in Anzeigeform "Vorname Nachname" (passend zur M365-Auswahlliste)
  const betreuerMap = new Map();
  for (const att of action.attendants || []) {
    if (!att.user || isArchived(att.user.recName)) continue;
    if (!isCurrent(att.validFrom, att.validUntil, now)) continue;
    const rolle = att.attendantKind?.name;
    if (!ROLE_RANK[rolle]) continue;
    const prev = betreuerMap.get(String(att.user.id));
    if (!prev || ROLE_RANK[rolle] > ROLE_RANK[prev.rolle]) {
      const m = /^(.+?),\s*(.+)$/.exec(att.user.recName || "");
      betreuerMap.set(String(att.user.id), {
        name: m ? `${m[2]} ${m[1]}` : att.user.recName,
        rolle, rolleKurz: ROLE_SHORT[rolle],
        quali: (qualiMap && qualiMap[String(att.user.id)]) || "",
      });
    }
  }
  const betreuer = [...betreuerMap.values()].sort(
    (a, b) => ROLE_RANK[b.rolle] - ROLE_RANK[a.rolle] || a.name.localeCompare(b.name, "de")
  );

  return {
    kilankaId: String(client.id ?? ""),
    anzeigeName: client.recName,
    rolle: role,
    rolleKurz: ROLE_SHORT[role],
    massnahme: {
      name: action.recName || "",
      hauptmassnahme: action.mainAction === true,
    },
    // ── Vorbefüllung S1 ──
    Jugendamt: action.department?.name || "",
    Hilfeart: action.legalBasis?.name || "",
    Sachbearbeitung_JA: action.departmentResponsible?.recName || "",
    Hilfebeginn: isoDate(kDate(action.validFrom)),
    Hilfe_Ende: isoDate(kDate(action.validUntil)),
    Naechstes_HPG: isoDate(kDate(action.nextMeeting)),
    Bericht_faellig: isoDate(kDate(action.reportDueDate)),
    Aktenzeichen: action.fileReference || "",
    Fachleistungsstunden: stunden,
    Stunden_Typ: stundenTyp,
    Kontingent_Hinweis: kontingentHinweis,
    Bewilligung_Von: isoDate(bewVon),
    Bewilligung_Bis: isoDate(bewBis),
    Betreuer: betreuer,
    // ── Vorbefüllung S2 ──
    Kind_Vorname: client.firstName || "",
    Kind_Familienname: client.name || "",
    Kind_Geburtsdatum: isoDate(kDate(client.dayOfBirth)),
    Kind_Strasse: client.street || "",
    Kind_PLZ_Ort: [client.zip, client.city].filter(Boolean).join(" "),
    Sorgeberechtigte: sorgeberechtigte,
    WeitereKinder: weitereKinder,
  };
}

function clientsForUser(allClients, upn, now, qualiMap) {
  const result = [];
  for (const client of allClients) {
    if (kDate(client.deletedAt) || isArchived(client.recName)) continue;

    // Beste (höchste) Rolle über alle aktiven Maßnahmen sammeln
    const matches = [];
    for (const action of client.actions || []) {
      if (kDate(action.deletedAt)) continue;
      if (!isCurrent(action.validFrom, action.validUntil, now)) continue;
      for (const att of action.attendants || []) {
        if (!att.user || isArchived(att.user.recName)) continue;
        if (!isCurrent(att.validFrom, att.validUntil, now)) continue;
        const role = att.attendantKind?.name;
        if (!ROLE_RANK[role]) continue;
        if (upnForAttendant(att.user) !== upn) continue;
        matches.push({ action, role });
      }
    }
    if (!matches.length) continue;

    // Je Maßnahme die höchste Rolle, Maßnahmen einzeln ausliefern
    const perAction = new Map();
    for (const m of matches) {
      const key = m.action.recName || JSON.stringify(m.action.validFrom);
      const prev = perAction.get(key);
      if (!prev || ROLE_RANK[m.role] > ROLE_RANK[prev.role]) perAction.set(key, m);
    }
    for (const m of perAction.values()) {
      result.push(buildClientProfile(client, m.action, m.role, now, qualiMap));
    }
  }
  return result.sort(
    (a, b) =>
      ROLE_RANK[b.rolle] - ROLE_RANK[a.rolle] ||
      a.anzeigeName.localeCompare(b.anzeigeName, "de")
  );
}

// ═══════════════════════════════════════════════════════════════
// Cockpit-Berechtigungen
// GF sehen alle, Teamleitungen ihr Team (Azure-AD directReports,
// dieselbe Hierarchie wie die Organisation-App), alle anderen nur sich.
// ═══════════════════════════════════════════════════════════════
const GF_UPNS = [
  "sonja.peltz@praxisneuewege.de",
  "markus.peltz@praxisneuewege.de",
];

// Graph-Sammlungen vollständig einlesen. Graph liefert pro Antwort nur EINE
// Seite und verlinkt den Rest über @odata.nextLink. Bei $expand ist die
// Seitengröße zudem deutlich kleiner als ein angefordertes $top — ohne diese
// Schleife wäre das Ergebnis still unvollständig.
// Fehler werden geworfen, nicht verschluckt: die Aufrufer sind fail-closed und
// sollen lieber leer als halb befüllt weiterarbeiten.
async function graphAlleSeiten(startUrl, graphToken, kontext) {
  const alle = [];
  let url = startUrl;
  for (let seite = 0; url && seite < 50; seite++) { // Sicherheitslimit: 50 Seiten
    const r = await fetch(url, { headers: { Authorization: `Bearer ${graphToken}` } });
    if (!r.ok) throw new Error(`Graph ${kontext}: HTTP ${r.status} auf Seite ${seite + 1}`);
    const j = await r.json();
    alle.push(...(j.value || []));
    url = j["@odata.nextLink"] || null;
  }
  return alle;
}

// directReports des Aufrufers über SEIN Graph-Token (X-Graph-Token).
// /me/... garantiert: Es sind zwingend die eigenen Reports — nicht fälschbar.
// Rueckgabe { reports, fehler }: "keine Reports" und "Graph nicht erreichbar"
// sind NICHT dasselbe. Vorher fuehrten beide zu rolle="fk" — ein Graph-429 oder
// abgelaufenes X-Graph-Token sperrte damit eine Teamleitung mit der irrefuehrenden
// Meldung aus, das Cockpit sei ihr "vorbehalten".
// Fehlendes Token ist bewusst KEIN Fehler: dann greift wie bisher der fk-Pfad.
async function fetchDirectReports(graphToken) {
  if (!graphToken) return { reports: [], fehler: null };
  try {
    const value = await graphAlleSeiten(
      "https://graph.microsoft.com/v1.0/me/directReports?$select=displayName,userPrincipalName,mail&$top=999",
      graphToken,
      "me/directReports"
    );
    const reports = value
      .map((u) => ({
        upn: (u.mail || u.userPrincipalName || "").toLowerCase(),
        name: u.displayName || u.userPrincipalName || "",
      }))
      .filter((u) => u.upn.endsWith(`@${MAIL_DOMAIN}`));
    return { reports, fehler: null };
  } catch (e) {
    console.warn("directReports nicht ermittelbar:", e.message);
    return { reports: [], fehler: e.message };
  }
}

// 503 statt 403, wenn die Rolle wegen eines Graph-Ausfalls nicht bestimmbar war.
// Ein echter Fachkraft-Zugriff liefert 200 mit leerer Liste und damit fehler=null,
// bekommt also weiterhin sauber 403.
function graphAusfall(dr, origin) {
  if (!dr.fehler) return null;
  return json(
    { error: "Berechtigung derzeit nicht prüfbar — Microsoft Graph antwortet nicht. Bitte in einer Minute erneut versuchen.", detail: dr.fehler },
    503, origin
  );
}

// Betreuer-Namen aus den Klienten-Zuordnungen (upn → recName).
// Immer verfügbar — der attendants-Zweig trägt die ganze App.
async function attendantNamen(env) {
  const map = new Map();
  const clients = await fetchKilankaClients(env);
  for (const client of clients || []) {
    if (kDate(client.deletedAt)) continue;
    for (const action of client.actions || []) {
      for (const att of action.attendants || []) {
        const u = att.user;
        if (!u || isArchived(u.recName)) continue;
        const upn = upnForAttendant(u);
        if (upn && !map.has(upn)) map.set(upn, u.recName);
      }
    }
  }
  return map;
}

// Vorgesetzten-Zuordnung aller Nutzer über EINE Graph-Abfrage
// (gleiche Hierarchie-Quelle wie die Organisation-App).
async function fetchManagerMap(graphToken) {
  const map = new Map();
  if (!graphToken) return map;
  try {
    // Bewusst OHNE $top: mit $expand begrenzt Graph die Seitengröße selbst und
    // lehnt große $top-Werte teilweise ab. Die Seitengröße bestimmt Graph,
    // den Rest holt graphAlleSeiten über @odata.nextLink nach.
    const value = await graphAlleSeiten(
      "https://graph.microsoft.com/v1.0/users?$select=userPrincipalName,mail&$expand=manager($select=displayName,userPrincipalName,mail)",
      graphToken,
      "users/$expand=manager"
    );
    for (const u of value) {
      const upn = (u.mail || u.userPrincipalName || "").toLowerCase();
      const m = u.manager;
      if (!upn || !m) continue;
      map.set(upn, {
        upn: (m.mail || m.userPrincipalName || "").toLowerCase(),
        name: m.displayName || m.userPrincipalName || "",
      });
    }
  } catch (e) {
    // Leere Map = GF-Vorschau zeigt nur die Leitung selbst. Ohne Log war nicht
    // unterscheidbar, ob jemand wirklich kein Team hat oder Graph gescheitert ist.
    console.warn("Manager-Map nicht ermittelbar:", e.message);
  }
  return map;
}

// Alle aktiven Mitarbeitenden aus Kilanka (für die GF-Auswahlliste).
// Fallback: Betreuer aus den Klienten-Zuordnungen (immer verfügbar).
async function alleAktivenMitarbeiter(env) {
  const seen = new Set();
  const list = [];
  const add = (upn, name) => {
    if (!upn || seen.has(upn)) return;
    seen.add(upn);
    list.push({ upn, name: name || upn });
  };
  try {
    const users = await fetchCockpitUsers(env);
    for (const u of users || []) {
      const rn = userRecName(u);
      if (kDate(u.deletedAt) || isArchived(rn)) continue;
      if (/^\s*nicht\s/i.test(rn || "")) continue; // Alteinträge
      add((UPN_OVERRIDES[String(u.id)] ?? deriveEmail(rn) ?? "").toLowerCase(), rn);
    }
  } catch (e) { console.warn("users nicht verfügbar → Fallback unten —", e.message); }
  if (list.length === 0) {
    // recName im users-Graphen nicht freigegeben → Namen aus den
    // Klienten-Zuordnungen ableiten
    const map = await attendantNamen(env);
    for (const [upn, name] of map) add(upn, name);
  }
  return list.sort((a, b) => a.name.localeCompare(b.name, "de"));
}

// ═══════════════════════════════════════════════════════════════
// Mitarbeiter-Cockpit (mitarbeiter-cockpit-beta.html)
// Defensiv: nicht freigegebene Kilanka-Zweige liefern null statt Fehler.
// ═══════════════════════════════════════════════════════════════

// users: Stammdaten fürs Cockpit — unbekannte Felder ignoriert Kilanka still
// Graph exakt entlang der Freigabe vom 13.07.2026:
// kein recName (Name aus name+firstName), kein entryDate (frühester
// Vertragsbeginn), Vertragsstunden in targetHours.weeklyHours.
const COCKPIT_USER_GRAPH = {
  id: 1, name: 1, firstName: 1, deletedAt: 1, weeklyHours: 1,
  targetHours: { validFrom: 1, validUntil: 1, weeklyHours: 1, monthlyHours: 1 },
  contracts: { validFrom: 1, validUntil: 1, orgUnit: { name: 1 } },
  workQualifications: { validFrom: 1, validUntil: 1, qualification: { name: 1 } },
  // Zusatzfelder: Schlüssel = exakte UI-Labels, Werte als {$date} (Doku §14).
  // "Ersthelfer" und "UVV" ergänzen, sobald in Kilanka als Zusatzfeld angelegt.
  udf: {
    "Erhöhung": 1, "Führungszeugnis": 1, "Führerschein": 1, "Datenschutz": 1,
    "Verfassungstreue": 1, "BEH Ausbildung": 1, "Weiter/Fortbildung": 1,
  },
  $limit: 1000,
};

// users liefert kein recName → "Nachname, Vorname" selbst bauen
function userRecName(u) {
  if (u.recName) return u.recName;
  if (u.name && u.firstName) return `${u.name}, ${u.firstName}`;
  return u.name || null;
}

const COCKPIT_ABSENCES_GRAPH = {
  begin: 1, end: 1, totalDays: 1, type: 1, status: 1,
  absenceType: { name: 1, internalName: 1 },
  vacationEntitlement: { description: 1 }, // Urlaubsanspruch (Text, Zahl wird geparst)
  attestationType: 1, attestationDate: 1,  // eAU/AU (lt. offizieller Referenz; Freischaltung wird zur Laufzeit erkannt)
  user: { id: 1, recName: 1 },
  $limit: 1000,
};

// accounting/invoices: FLS-Ist (verifiziert 13.07.2026, s. docs/kilanka-api.md §13)
const COCKPIT_INVOICES_GRAPH = {
  id: 1, number: 1, deletedAt: 1,
  deliveryFrom: 1, deliveryUntil: 1,
  client: { id: 1 },
  lines: { approval: { id: 1 }, quantity: 1, costCenter: 1 },
};

let cockpitUsersCache = { data: null, fetchedAt: 0 };
let cockpitAbsencesCache = { data: null, fetchedAt: 0, verfuegbar: null };
let cockpitInvoicesCache = { data: null, fetchedAt: 0 };

// Minimal-Graph: nur Felder, die nachweislich freigegeben sind (Stand 11.07.)
const COCKPIT_USER_GRAPH_MINIMAL = {
  id: 1, name: 1, firstName: 1, deletedAt: 1,
  workQualifications: { validFrom: 1, validUntil: 1, qualification: { name: 1 } },
  $limit: 1000,
};

async function fetchCockpitUsers(env) {
  if (cockpitUsersCache.data && Date.now() - cockpitUsersCache.fetchedAt < CACHE_TTL_MIN * 60 * 1000)
    return cockpitUsersCache.data;
  let data, voll = true;
  try {
    data = await kilankaPost(env, "users", COCKPIT_USER_GRAPH);
  } catch (e) {
    // Erweiterte Felder (contracts/entryDate/targetHours) noch nicht freigegeben
    // → strukturelle Validierung (Kilanka 400). Rückfall auf Minimal-Graph.
    data = await kilankaPost(env, "users", COCKPIT_USER_GRAPH_MINIMAL);
    voll = false;
  }
  cockpitUsersCache = { data, fetchedAt: Date.now(), voll };
  return data;
}

async function fetchCockpitAbsences(env) {
  const alter = Date.now() - (cockpitAbsencesCache.fetchedAt || 0);
  // Erfolgreiche Antworten: volle TTL. Fehlschläge: nur 45 s halten, damit ein
  // transienter 429 (z. B. durch die Team-Aggregat-Abfrage) den Zweig nicht
  // 10 Minuten lang als "Modell nicht freigegeben" erscheinen lässt.
  if (cockpitAbsencesCache.fetchedAt) {
    if (cockpitAbsencesCache.verfuegbar === true && alter < CACHE_TTL_MIN * 60 * 1000) return cockpitAbsencesCache;
    if (cockpitAbsencesCache.verfuegbar === false && alter < 45 * 1000) return cockpitAbsencesCache;
  }
  try {
    // Die attestation-Felder stammen aus dem WIP-Katalog. Falls der Endpunkt
    // sie (anders als /clients) NICHT still ignoriert, sondern den Request
    // ablehnt, würde die komplette Abwesenheitslogik ausfallen — deshalb:
    // erst mit AU-Feldern versuchen, bei Fehlschlag ohne sie wiederholen.
    const laden = async (graph) => {
      const data = [];
      const limit = graph.$limit || 1000;
      for (let offset = 0; ; offset += limit) {
        const page = await kilankaPost(env, "users/absences", { ...graph, $offset: offset });
        if (Array.isArray(page)) data.push(...page);
        if (!Array.isArray(page) || page.length < limit) break;
      }
      return data;
    };
    let data;
    try {
      data = await laden(COCKPIT_ABSENCES_GRAPH);
    } catch (e) {
      const { attestationType, attestationDate, ...ohneAu } = COCKPIT_ABSENCES_GRAPH;
      data = await laden(ohneAu);
    }
    cockpitAbsencesCache = { data, fetchedAt: Date.now(), verfuegbar: true };
  } catch (e) {
    const strukturell = /Kilanka 4(00|03)/.test(e.message || ""); // Graph nicht freigegeben
    if (!strukturell && cockpitAbsencesCache.verfuegbar === true && cockpitAbsencesCache.data) {
      // Transient (429/5xx) und alte Daten vorhanden → stale weiterverwenden
      cockpitAbsencesCache.fetchedAt = Date.now() - CACHE_TTL_MIN * 60 * 1000 + 60 * 1000; // Retry in ~1 min
      return cockpitAbsencesCache;
    }
    cockpitAbsencesCache = { data: null, fetchedAt: Date.now(), verfuegbar: false, transient: !strukturell };
  }
  return cockpitAbsencesCache;
}

async function fetchCockpitInvoices(env) {
  if (cockpitInvoicesCache.data && Date.now() - cockpitInvoicesCache.fetchedAt < CACHE_TTL_MIN * 60 * 1000)
    return cockpitInvoicesCache.data;
  const alle = [];
  for (let offset = 0; offset < 10000; offset += 1000) {
    const g = { ...COCKPIT_INVOICES_GRAPH, $limit: 1000, $offset: offset };
    const batch = await kilankaPost(env, "accounting/invoices", g);
    if (!batch || !batch.length) break;
    alle.push(...batch);
    if (batch.length < 1000) break;
    await new Promise((r) => setTimeout(r, 700)); // Rate Limit 10/5s
  }
  cockpitInvoicesCache = { data: alle, fetchedAt: Date.now() };
  return alle;
}

// ── Feiertage Bayern (Gauß'sche Osterformel) — identisch zum Frontend-Helper
// in mitarbeiter-cockpit-beta.html, für das arbeitstags-korrigierte Soll ──
function ostersonntag(jahr) {
  const a = jahr % 19, b = Math.floor(jahr / 100), c = jahr % 100, d = Math.floor(b / 4),
    e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
    h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4,
    l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  return new Date(Date.UTC(jahr, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1));
}
function feiertageBayern(jahr) { // inkl. Mariä Himmelfahrt (gesamtes Einzugsgebiet)
  const plus = (d, t) => { const x = new Date(d); x.setUTCDate(x.getUTCDate() + t); return x; };
  const iso = (d) => d.toISOString().slice(0, 10);
  const o = ostersonntag(jahr);
  return new Set([`${jahr}-01-01`, `${jahr}-01-06`, iso(plus(o, -2)), iso(plus(o, 1)),
    `${jahr}-05-01`, iso(plus(o, 39)), iso(plus(o, 50)), iso(plus(o, 60)),
    `${jahr}-08-15`, `${jahr}-10-03`, `${jahr}-11-01`, `${jahr}-12-25`, `${jahr}-12-26`]);
}
function arbeitstageBayern(von, bis) { // Date-Objekte (UTC), Grenzen inklusive
  if (!von || !bis || bis < von) return 0;
  const ft = new Set();
  for (let j = von.getUTCFullYear(); j <= bis.getUTCFullYear(); j++) feiertageBayern(j).forEach((t) => ft.add(t));
  let n = 0;
  for (let d = new Date(von); d <= bis; d.setUTCDate(d.getUTCDate() + 1)) {
    const wt = d.getUTCDay();
    if (wt !== 0 && wt !== 6 && !ft.has(d.toISOString().slice(0, 10))) n++;
  }
  return n;
}

function decimalToNumber(w) {
  if (w == null) return 0;
  if (typeof w === "number") return w;
  return parseFloat(w.$decimal ?? w) || 0;
}

// Urlaubsanspruch aus vacationEntitlement.description parsen:
// "30 + 4" (Anspruch + Übertrag) → Summe (explizit inkl. Übertrag),
// sonst größte plausible Zahl 20–60 (Jahreszahlen wie "2026" zählen nicht).
function parseAnspruch(beschr) {
  if (!beschr) return null;
  const plus = /(\d{1,2})\s*\+\s*(\d{1,2})/.exec(beschr);
  if (plus) return { wert: parseInt(plus[1], 10) + parseInt(plus[2], 10), explizitInklUebertrag: true };
  const kandidaten = (beschr.match(/\d+/g) || []).map(Number).filter((n) => n >= 20 && n <= 60);
  return kandidaten.length ? { wert: Math.max(...kandidaten), explizitInklUebertrag: false } : null;
}

// Anteiliger Jahresanspruch bei Eintritt im Jahr (Zwölftelung, volle Monate)
function anteiligerAnspruch(anspruch, eintrittIso, jahr) {
  const e = eintrittIso ? new Date(eintrittIso + "T12:00:00Z") : null;
  if (!e || e.getUTCFullYear() !== jahr) return anspruch;
  let monate = 12 - e.getUTCMonth();
  if (e.getUTCDate() > 1) monate -= 1; // angebrochener Eintrittsmonat zählt nicht
  return Math.round(anspruch * Math.max(0, monate) / 12 * 2) / 2;
}

function classifyAbsence(a) {
  const t = (a.type || a.absenceType?.internalName || "").toLowerCase();
  const n = (a.absenceType?.name || "").toLowerCase();
  if (n.includes("regeneration") || t.includes("regeneration")) return "regeneration";
  if (t === "vacation" || n.includes("urlaub")) return "urlaub";
  if (n.includes("kind")) return "kindkrank";
  if (t === "sick" || t === "illness" || n.includes("krank")) return "krank";
  return "sonstig";
}

// Klienten-Status (UDFs): Datenschutz, Schweigepflichtentbindung, Bewilligungs-Status
const CLIENT_STATUS_GRAPH = {
  id: 1, deletedAt: 1,
  udf: { "Datenschutz": 1, "Entbindung SP": 1, "Bewilligungs-Status": { recName: 1 } },
  $limit: 1000,
};
let clientStatusCache = { map: null, fetchedAt: 0 };
async function fetchClientStatusMap(env) {
  if (clientStatusCache.map && Date.now() - clientStatusCache.fetchedAt < CACHE_TTL_MIN * 60 * 1000)
    return clientStatusCache.map;
  const map = new Map();
  try {
    const data = await kilankaPost(env, "clients", CLIENT_STATUS_GRAPH);
    for (const cl of data || []) {
      if (kDate(cl.deletedAt)) continue;
      const u = cl.udf || {};
      map.set(String(cl.id), {
        ds: !!kDate(u["Datenschutz"]),
        spe: !!kDate(u["Entbindung SP"]),
        bew: /bewilligt/i.test(u["Bewilligungs-Status"]?.recName || ""),
        bewText: u["Bewilligungs-Status"]?.recName || null,
      });
    }
  } catch (e) { console.warn("Status optional —", e.message); }
  clientStatusCache = { map, fetchedAt: Date.now() };
  return map;
}

// Alle HB-Fälle über ALLE Mitarbeitenden zum Stichtag (id, Name, Amt, Hilfeart,
// Maßnahme) — Grundlage der Amt-basierten Zielerreichung im Manager-Cockpit,
// unabhängig davon, wessen Team in der Tabellen-Sicht steht.
async function alleHbFaelle(env, now) {
  // Karenz für Anschluss-Maßnahmen: Endet eine Maßnahme und folgt die nächste
  // mit einer Lücke von maximal 7 Tagen, gilt der Fall als durchlaufend aktiv —
  // auch wenn der Stichtag genau in die Lücke fällt (typisch: Quartalswechsel,
  // Maßnahme bis 30.06., Anschluss ab 01.07.). Verhindert Schein-Zu-/Abgänge.
  const KARENZ_MS = 7 * 24 * 3600 * 1000;
  const clients = await fetchKilankaClients(env);
  const map = new Map();

  // Archivierte Klienten und Betreuer bleiben in der HISTORISCHEN Auswertung —
  // maßgeblich ist, ob Maßnahme/Betreuung zum Stichtag lief. Das Archiv-Flag hat
  // keinen Zeitstempel; ohne diese Regel fehlen beendete Fälle in alten
  // Beständen und Abgänge werden unsichtbar. Schutz gegen Datenlücken: bei
  // archivierten Einträgen zählen nur Zeiträume MIT Enddatum (sonst würde ein
  // vergessenes validUntil den Fall für immer als aktiv werten).
  const hbAktuell = (action, t) => (action.attendants || []).some((a) => {
    if (!a.user || a.attendantKind?.name !== "Hauptbetreuer") return false;
    if (isArchived(a.user.recName) && !kDate(a.validUntil)) return false;
    return isCurrent(a.validFrom, a.validUntil, t);
  });
  // Für Brücken-Maßnahmen (liegen zeitlich neben dem Stichtag) genügt ein HB.
  const hbVorhanden = (action) => (action.attendants || []).some(
    (a) => a.user && a.attendantKind?.name === "Hauptbetreuer"
  );

  for (const client of clients || []) {
    // Kilanka-Archiv nutzt ZWEI Marker (s. docs/kilanka-api-erkenntnisse.md §7):
    // deletedAt gesetzt ODER recName-Präfix "[archiviert]". Beides bedeutet
    // "Fall beendet und archiviert", NICHT "Datensatz ungültig" — für
    // historische Stichtage müssen diese Fälle mitzählen.
    const archiviertAm = kDate(client.deletedAt);
    const archiviert = !!archiviertAm || isArchived(client.recName);
    const acts = (client.actions || []).filter((a) => {
      if (kDate(a.deletedAt)) return false;
      if (!archiviert) return true;
      const bis = kDate(a.validUntil);
      if (!bis) return false; // Archiv ohne Maßnahmen-Enddatum: nicht werten
      // deletedAt VOR Maßnahmen-Ende → Fehlanlage/Löschung, kein Archiv
      if (archiviertAm && archiviertAm < bis) return false;
      return true;
    });

    // 1) Regulär: Maßnahme mit aktivem HB läuft zum Stichtag
    let treffer = acts.find((a) => isCurrent(a.validFrom, a.validUntil, now) && hbAktuell(a, now));

    // 2) Karenz: Stichtag liegt in einer Übergangs-Lücke ≤ 7 Tage
    if (!treffer) {
      let vorher = null, nachher = null;
      for (const a of acts) {
        if (!hbVorhanden(a)) continue;
        const von = kDate(a.validFrom), bis = kDate(a.validUntil);
        if (bis && bis < now && (!vorher || bis > kDate(vorher.validUntil))) vorher = a;
        if (von && von > now && (!nachher || von < kDate(nachher.validFrom))) nachher = a;
      }
      if (vorher && nachher) {
        const luecke = kDate(nachher.validFrom) - kDate(vorher.validUntil);
        if (luecke >= 0 && luecke <= KARENZ_MS) treffer = nachher; // Amt/Hilfeart der Anschluss-Maßnahme
      }
    }

    if (treffer && !map.has(String(client.id))) {
      map.set(String(client.id), {
        id: String(client.id),
        name: client.recName || String(client.id),
        amt: treffer.department?.name || "",
        hilfeart: treffer.legalBasis?.name || "",
        massnahme: treffer.recName || "",
      });
    }
  }
  return [...map.values()];
}

// ═══════════════════════════════════════════════════════════════
// Jugendamt-Cockpit: alle Hilfen (Maßnahmen) ab 01.04.2024, inkl. Archiv.
// Eine Zeile je (Klient, Maßnahme) mit Amt, Sachbearbeitung, Hilfeart,
// Laufzeit und PNW-Betreuung — Aggregation macht das Frontend.
// ═══════════════════════════════════════════════════════════════
let amtKurznameCache = { map: null, fetchedAt: 0 };
async function fetchAmtKurznamen(env) {
  if (amtKurznameCache.map && Date.now() - amtKurznameCache.fetchedAt < CACHE_TTL_MIN * 60 * 1000) {
    return amtKurznameCache.map;
  }
  const map = new Map();
  try {
    for (let offset = 0; ; offset += 1000) {
      const page = await kilankaPost(env, "contacts", {
        id: 1, shortName: 1, deletedAt: 1, $limit: 1000, $offset: offset,
      });
      if (!Array.isArray(page)) break;
      for (const k of page) {
        if (k?.shortName) map.set(String(k.id), k.shortName);
      }
      if (page.length < 1000) break;
    }
    amtKurznameCache = { map, fetchedAt: Date.now() };
  } catch (e) {
    // Kurznamen sind nice-to-have: bei Fehler (z. B. contacts nicht im
    // Token-Scope) mit vollen Amtsnamen weiterarbeiten
    console.warn("Kurzname-Abruf (contacts) fehlgeschlagen:", e.message);
  }
  return map;
}

const JA_ZEITRAUM_VON = "2024-04-01";

function jugendamtFaelle(clients, now, amtKurz) {
  const von0 = new Date(JA_ZEITRAUM_VON + "T00:00:00Z");
  const rows = [];
  for (const client of clients || []) {
    const archiviertAm = kDate(client.deletedAt);
    const archiviert = !!archiviertAm || isArchived(client.recName);
    const klientName = (client.recName || String(client.id))
      .replace(/^\[archiviert\]\s*/i, "");

    for (const a of client.actions || []) {
      if (kDate(a.deletedAt)) continue; // gelöschte Maßnahme = Fehlanlage
      const von = kDate(a.validFrom);
      let bis = kDate(a.validUntil);

      // Archiv-Schutzregeln (identisch zu alleHbFaelle, s. Doku §7):
      // - Archiv ohne Maßnahmen-Ende: vergessenes validUntil → Archivdatum
      //   als Ende werten (ohne Archivdatum: nicht werten)
      // - Archivierung VOR Maßnahmen-Ende: Fehlanlage/Löschung → nicht werten
      if (archiviert && !bis) {
        if (!archiviertAm) continue;
        bis = archiviertAm;
      } else if (archiviert && archiviertAm && archiviertAm < bis) {
        continue;
      }

      // Zeitraumfilter: Hilfe überlappt [01.04.2024, heute]
      if (bis && bis < von0) continue;       // vor dem Fenster beendet
      if (von && von > now) continue;        // noch nicht begonnen

      const laufend = !bis || bis >= now;
      const endeEff = laufend ? now : bis;
      const dauerMonate = von
        ? Math.round(((endeEff - von) / (30.44 * 864e5)) * 10) / 10
        : null;

      // PNW-Betreuung: alle Zuordnungen mit Rolle; Hauptbetreuer bevorzugt
      // die zum (effektiven) Ende gültige Zuordnung, sonst die jüngste.
      const betreuer = (a.attendants || [])
        .filter((t) => t.user?.recName)
        .map((t) => ({
          name: t.user.recName.replace(/^\[archiviert\]\s*/i, ""),
          rolle: t.attendantKind?.name || "",
          aktuell: isCurrent(t.validFrom, t.validUntil, endeEff),
          _von: kDate(t.validFrom)?.getTime() || 0,
        }));
      const hbs = betreuer.filter((b) => b.rolle === "Hauptbetreuer");
      const hb =
        hbs.find((b) => b.aktuell)?.name ||
        hbs.sort((x, y) => y._von - x._von)[0]?.name ||
        betreuer.find((b) => b.aktuell)?.name || null;
      for (const b of betreuer) delete b._von;

      rows.push({
        klientId: String(client.id),
        klient: klientName,
        archiviert,
        jugendamt:
          a.department?.shortName ||
          (amtKurz && amtKurz.get(String(a.department?.id))) ||
          a.department?.name || "— ohne Amt —",
        jugendamtLang: a.department?.name || null,
        sachbearbeitung: a.departmentResponsible?.recName || null,
        rechtsgrundlage: a.legalBasis?.name || null,
        hilfe: a.recName || null,
        aktenzeichen: a.fileReference || null,
        beginn: isoDate(von),
        ende: laufend ? null : isoDate(bis),
        laufend,
        dauerMonate,
        hb,
        betreuer: betreuer.map(({ name, rolle, aktuell }) => ({ name, rolle, aktuell })),
        wochenstunden: bewilligteWochenstunden(a, now),
      });
    }
  }
  return rows;
}

// Werktage (Mo–Fr) zwischen zwei ISO-Daten, beide inklusive
function werktage(vonIso, bisIso) {
  let n = 0;
  const d = new Date(vonIso + "T12:00:00Z"), ende = new Date(bisIso + "T12:00:00Z");
  while (d <= ende) {
    const w = d.getUTCDay();
    if (w >= 1 && w <= 5) n++;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return n;
}

// Vertretungslage: HB-Fälle einer Person mit der Frage, ob im Zeitraum
// [von, bis] eine Vertretung (attendantKind "Vertretung") eingetragen ist.
async function vertretungsLage(env, kilankaUserId, von, bis) {
  const clients = await fetchKilankaClients(env);
  const ueberlappt = (a) =>
    (!kDate(a.validFrom) || kDate(a.validFrom) <= bis) &&
    (!kDate(a.validUntil) || kDate(a.validUntil) >= von);
  const res = [];
  for (const client of clients || []) {
    if (kDate(client.deletedAt) || isArchived(client.recName)) continue;
    for (const action of client.actions || []) {
      if (kDate(action.deletedAt)) continue;
      const aVon = kDate(action.validFrom), aBis = kDate(action.validUntil);
      if ((aBis && aBis < von) || (aVon && aVon > bis)) continue;
      const atts = (action.attendants || []).filter((a) => a.user);
      const istHB = atts.some((a) => String(a.user.id) === kilankaUserId &&
        a.attendantKind?.name === "Hauptbetreuer" && ueberlappt(a));
      if (!istHB) continue;
      const vertr = atts.find((a) => String(a.user.id) !== kilankaUserId &&
        a.attendantKind?.name === "Vertretung" && ueberlappt(a) && !isArchived(a.user.recName));
      res.push({ fall: client.recName || String(client.id), vertretung: vertr ? (vertr.user.recName || "unbekannt") : null });
      break; // ein Eintrag je Fall genügt
    }
  }
  return res.sort((x, y) => x.fall.localeCompare(y.fall, "de"));
}

async function buildCockpit(env, upn, now) {
  const jahr = now.getFullYear();

  // ── a) Klienten, FLS-Soll, approval-IDs, HB-Klienten-IDs ──
  let clients;
  try {
    clients = await fetchKilankaClients(env);
  } catch (e) {
    throw new Error(`Klienten-Abruf: ${e.message}`);
  }
  let hb = 0, mb = 0, v = 0, sollWochenstunden = 0;
  const approvalIds = new Set();
  const hbClientIds = new Set();
  const hbFallNamen = new Map(); // id → recName (für Zu-/Abgangs-Listen im Manager-Cockpit)
  const alleClientIds = new Set(); // HB+MB+V — für Status-Aggregation
  const rolleFaelle = { hb: [], mb: [], v: [] }; // Klientenlisten je Rolle (Detail-Ansicht)
  const clientNamen = new Map();   // id → recName (für Fehlt-Listen der Status-Chips)
  for (const client of clients || []) {
    if (kDate(client.deletedAt) || isArchived(client.recName)) continue;
    let besteRolle = 0;
    for (const action of client.actions || []) {
      if (kDate(action.deletedAt) || !isCurrent(action.validFrom, action.validUntil, now)) continue;
      const att = (action.attendants || []).find(
        (a) => a.user && !isArchived(a.user.recName) &&
               isCurrent(a.validFrom, a.validUntil, now) &&
               ROLE_RANK[a.attendantKind?.name] &&
               upnForAttendant(a.user) === upn
      );
      if (!att) continue;
      const rang = ROLE_RANK[att.attendantKind.name];
      if (rang > besteRolle) besteRolle = rang;
      alleClientIds.add(String(client.id));
      clientNamen.set(String(client.id), client.recName || String(client.id));
      if (rang !== 3) continue; // Soll/Ist nur über Hauptbetreuung (keine Doppelzählung)
      hbClientIds.add(String(client.id));
      hbFallNamen.set(String(client.id), { name: client.recName || String(client.id), amt: action.department?.name || "", hilfeart: action.legalBasis?.name || "", massnahme: action.recName || "" });
      // Anteil aus Kilanka-Zuordnung (amount, z. B. 50/100 bei geteilter Betreuung);
      // Fallback: 1/AnzahlHauptbetreuer, sonst 1.
      const aktuelleHbMb = (action.attendants || []).filter(
        (a) => a.user && ["Hauptbetreuer", "Mitbetreuer"].includes(a.attendantKind?.name) &&
               isCurrent(a.validFrom, a.validUntil, now)
      );
      const amtWert = (v) => {
        const h = durationToHours(v);
        if (h != null) return h;
        const n = parseFloat(v?.$decimal ?? v);
        return Number.isFinite(n) ? n : null;
      };
      const amounts = aktuelleHbMb.map((a) => amtWert(a.amount));
      const meinAmt = amtWert(att.amount);
      const summe = amounts.every((v) => v != null && v > 0) ? amounts.reduce((s, v) => s + v, 0) : null;
      let anteil = 1;
      if (summe && meinAmt) anteil = meinAmt / summe;
      else {
        const hbAnzahl = aktuelleHbMb.filter((a) => a.attendantKind?.name === "Hauptbetreuer").length;
        if (hbAnzahl > 1) anteil = 1 / hbAnzahl;
      }
      for (const q of action.quotas || []) {
        if (kDate(q.deletedAt)) continue; // gelöschtes Kontingent
        if (q.timeBase === "quantity") continue;
        for (const ap of q.approvals || []) {
          if (ap.id) approvalIds.add(String(ap.id));
        }
        const appr = pickApproval(q.approvals, now);
        if (!appr || appr.stunden == null || appr.status !== "aktuell") continue;
        switch (q.timeBase) {
          case "week": sollWochenstunden += appr.stunden * anteil; break;
          case "month_current": sollWochenstunden += ((appr.stunden * 12) / 52) * anteil; break;
          case "pool": {
            const wochen = appr.von && appr.bis ? Math.max(1, (appr.bis - appr.von) / 6048e5) : null;
            if (wochen) sollWochenstunden += (appr.stunden / wochen) * anteil;
            break;
          }
        }
        break; // erstes verwertbares Kontingent der Maßnahme
      }
    }
    if (besteRolle === 3) { hb++; rolleFaelle.hb.push(client.recName || String(client.id)); }
    else if (besteRolle === 2) { mb++; rolleFaelle.mb.push(client.recName || String(client.id)); }
    else if (besteRolle === 1) { v++; rolleFaelle.v.push(client.recName || String(client.id)); }
  }

  // Klienten-Status (UDF) über die betreuten Klienten aggregieren
  let klientenStatus = null;
  try {
    const statusMap = await fetchClientStatusMap(env);
    if (statusMap.size) {
      const zaehle = (f) => {
        let ok = 0, gesamt = 0;
        const fehlt = [];
        for (const id of alleClientIds) {
          const s = statusMap.get(id);
          if (!s) continue;
          gesamt++;
          if (f(s)) ok++;
          else fehlt.push(clientNamen.get(id) || "Fall-ID " + id);
        }
        fehlt.sort((a, b) => a.localeCompare(b, "de"));
        return { ok, gesamt, fehlt };
      };
      klientenStatus = { ds: zaehle((s) => s.ds), spe: zaehle((s) => s.spe), bew: zaehle((s) => s.bew) };
    }
  } catch (e) { console.warn("Klienten-Status (DS/SPE/Bewilligung) nicht ermittelbar —", e.message); }

  // ── b) Stammdaten ──
  let person = null, nachweise = null, erhoehung = null;
  try {
    const users = await fetchCockpitUsers(env);
    const me = (users || []).find((u) => {
      if (kDate(u.deletedAt)) return false;
      const rn = userRecName(u);
      return ((UPN_OVERRIDES[String(u.id)] ?? deriveEmail(rn) ?? "").toLowerCase()) === upn;
    });
    if (me) {
      const vertrag = (me.contracts || []).find((ct) => isCurrent(ct.validFrom, ct.validUntil, now));
      const soll = (me.targetHours || []).find((t) => isCurrent(t.validFrom, t.validUntil, now));
      const quali = (me.workQualifications || [])
        .filter((q) => q.qualification?.name && isCurrent(q.validFrom, q.validUntil, now))
        .sort((a, b) => (kDate(b.validFrom)?.getTime() || 0) - (kDate(a.validFrom)?.getTime() || 0))[0];
      // Vertragsstunden: targetHours.weeklyHours, sonst monthlyHours/(52/12), sonst users.weeklyHours
      let wochenstunden = durationToHours(soll?.weeklyHours);
      if (wochenstunden == null) {
        const mh = durationToHours(soll?.monthlyHours);
        if (mh != null) wochenstunden = (mh * 12) / 52;
      }
      if (wochenstunden == null) wochenstunden = durationToHours(me.weeklyHours);
      // Eintritt: frühester Vertragsbeginn (entryDate nicht im Graphen)
      const eintritt = (me.contracts || [])
        .map((ct) => kDate(ct.validFrom))
        .filter(Boolean)
        .sort((a, b) => a - b)[0] || null;
      const u = me.udf || {};
      const udfDatum = (k) => isoDate(kDate(u[k]));
      nachweise = {
        fuehrungszeugnis: udfDatum("Führungszeugnis"),
        verfassungstreue: udfDatum("Verfassungstreue"),
        datenschutz: udfDatum("Datenschutz"),
        fuehrerschein: udfDatum("Führerschein"),
        behAusbildung: udfDatum("BEH Ausbildung"),
        weiterFortbildung: u["Weiter/Fortbildung"] || null,
      };
      erhoehung = udfDatum("Erhöhung"); // Sichtbarkeit wird in der Route beschränkt
      person = {
        name: userRecName(me),
        kilankaId: String(me.id),
        rolle: quali?.qualification?.name || "Fachkraft",
        team: vertrag?.orgUnit?.name || null,
        qualifikation: quali?.qualification?.name || null,
        eintritt: isoDate(eintritt),
        wochenstundenVertrag: wochenstunden != null ? Math.round(wochenstunden * 100) / 100 : null,
      };
    }
  } catch (e) { console.warn("users-Zweig optional —", e.message); }

  if (!person) {
    // recName im users-Graphen nicht freigegeben → Name aus attendants
    try {
      const nm = (await attendantNamen(env)).get(upn);
      if (nm) {
        person = { name: nm, kilankaId: null, rolle: "Fachkraft", team: null,
                   qualifikation: null, eintritt: null, wochenstundenVertrag: null };
      }
    } catch (e) { console.warn("Personenzuordnung ueber attendantNamen fehlgeschlagen —", e.message); }
  }

  // ── c) Abwesenheiten ──
  let urlaub = null, krankheit = null, abwesenheiten = [];
  const abs = await fetchCockpitAbsences(env);
  if (abs.verfuegbar && person && person.kilankaId) {
    let uGenommen = 0, uGeplant = 0, kTage = 0, kindKrank = 0, letzte = null;
    let regenH1 = null, regenH2 = null, anspruch = null, anspruchQuelle = null;
    let anspruchInklUebertrag = false;
    const abwesenheitenAktuell = []; // laufend krank / Urlaub jetzt + 6 Wochen
    const wegFenster = [];            // alle Abwesenheiten im Fenster (Block-Bildung)
    const uProJahr = new Map();       // Jahr → genommene Urlaubstage (für Übertrag)
    const anspruchProJahr = new Map(); // Jahr → geparster Anspruch
    const geplanteTermine = []; // kommende genehmigte Urlaube inkl. Datum
    for (const a of abs.data || []) {
      if (String(a.user?.id) !== person.kilankaId) continue;
      if ((a.status || "").toLowerCase() !== "approved") continue;
      const begin = kDate(a.begin);
      if (!begin) continue;
      const beginJahr = begin.getFullYear();
      const tage = decimalToNumber(a.totalDays);
      const art = classifyAbsence(a);
      // Urlaube ALLER Jahre sammeln — Basis der Übertragsberechnung
      if (art === "urlaub") {
        uProJahr.set(beginJahr, (uProJahr.get(beginJahr) || 0) + tage);
        const p = parseAnspruch(a.vacationEntitlement?.description || "");
        if (p && (!anspruchProJahr.has(beginJahr) || p.wert > anspruchProJahr.get(beginJahr).wert)) {
          anspruchProJahr.set(beginJahr, { ...p, quelle: a.vacationEntitlement.description });
        }
      }
      // Abwesenheits-Übersicht: laufende Krankmeldungen sowie Urlaube, die
      // jetzt laufen oder in den nächsten 6 Wochen beginnen (jahresunabhängig)
      const abwEnde = kDate(a.end) || begin;
      const horizont = new Date(now.getTime() + 42 * 24 * 3600 * 1000);
      // Für die Wochen-Regel zählen ALLE Abwesenheitsarten (auch Fortbildung,
      // Freizeitausgleich …) — ein Urlaub, der von einer anderen Abwesenheit
      // unterbrochen wird, bleibt dadurch ein zusammenhängender Block.
      if (abwEnde >= now && begin <= horizont) {
        wegFenster.push({ von: begin.getTime(), bis: abwEnde.getTime() });
      }
      if (art === "krank" && begin <= now && abwEnde >= now) {
        // eAU: stille Feldignorierung erkennen — nur werten, wenn die AU-Felder
        // überhaupt im Datensatz ankommen (sonst keine falschen "fehlt"-Warnungen)
        const auFelderDa = a.attestationType !== undefined || a.attestationDate !== undefined;
        const kalendertage = Math.round((abwEnde - begin) / 86400000) + 1;
        abwesenheitenAktuell.push({
          art: "krank", von: isoDate(begin), bis: isoDate(abwEnde),
          kalendertage,
          au: auFelderDa ? !!(a.attestationType || a.attestationDate) : null,
        });
      } else if (art === "urlaub" && abwEnde >= now && begin <= horizont) {
        abwesenheitenAktuell.push({ art: "urlaub", von: isoDate(begin), bis: isoDate(abwEnde) });
      }
      if (beginJahr !== jahr) continue;
      if (art === "urlaub") {
        if (begin > now) {
          uGeplant += tage;
          geplanteTermine.push({ von: isoDate(begin), bis: isoDate(kDate(a.end) || begin), tage });
        } else uGenommen += tage;
      }
      else if (art === "krank") { kTage += tage; if (!letzte || begin > letzte) letzte = begin; }
      else if (art === "kindkrank") { kindKrank += tage; }
      else if (art === "regeneration") {
        // TVöD SuE: je 1 Tag pro Halbjahr — frühesten Termin je Halbjahr merken
        if (begin.getUTCMonth() < 6) { if (!regenH1 || begin < regenH1) regenH1 = begin; }
        else { if (!regenH2 || begin < regenH2) regenH2 = begin; }
      }
    }
    const pAktuell = anspruchProJahr.get(jahr);
    if (pAktuell) { anspruch = pAktuell.wert; anspruchQuelle = pAktuell.quelle; anspruchInklUebertrag = pAktuell.explizitInklUebertrag; }
    if (anspruch == null || anspruch < 20 || anspruch > 60) anspruch = 30; // Plausibilitätsrahmen
    anspruch = anteiligerAnspruch(anspruch, person.eintritt, jahr);

    // Übertrag als JAHRESKETTE ab Eintritt (wie Kilankas Stundenkonto):
    // Rest(J) = Rest(J−1) + anteiliger Anspruch(J) − genommen(J).
    // Nur der Saldo des Eintrittsjahrs darf ohne erfasste Urlaube starten;
    // ein volles Beschäftigungsjahr ganz ohne Urlaubsbuchungen gilt als
    // Datenlücke → Übertrag nicht berechenbar (statt falscher Riesenwerte).
    // Entfällt, wenn der Anspruch den Übertrag explizit enthält ("30+4").
    let uebertragTage = null, uebertragBasis = null;
    const eintrittJahr = person.eintritt ? parseInt(person.eintritt.slice(0, 4), 10) : null;
    if (anspruchInklUebertrag) {
      uebertragTage = 0;
      uebertragBasis = "im Anspruch bereits enthalten (" + anspruchQuelle + ")";
    } else if (eintrittJahr != null && eintrittJahr >= jahr) {
      uebertragTage = 0;
      uebertragBasis = `Eintritt ${person.eintritt} — kein Vorjahresanspruch`;
    } else {
      const startJahr = eintrittJahr ?? Math.min(jahr, ...[...uProJahr.keys()].filter((y) => y < jahr));
      if (!Number.isFinite(startJahr) || startJahr >= jahr) {
        uebertragBasis = "keine Vorjahresdaten in Kilanka — Übertrag nicht berechenbar";
      } else {
        let rest = 0, belastbar = true;
        const schritte = [];
        for (let y = startJahr; y < jahr; y++) {
          const gY = uProJahr.get(y);
          if (gY == null && y !== eintrittJahr) { belastbar = false; uebertragBasis = `${y} ohne erfasste Urlaube — Übertrag nicht berechenbar`; break; }
          const aY = anteiligerAnspruch(anspruchProJahr.get(y)?.wert ?? 30, person.eintritt, y);
          rest = rest + aY - (gY || 0);
          schritte.push(`${y}: +${aY} −${Math.round((gY || 0) * 2) / 2}`);
        }
        if (belastbar) {
          uebertragTage = Math.round(rest * 2) / 2;
          uebertragBasis = schritte.join(" · ") + ` → ${uebertragTage} Tage`;
        }
      }
    }

    // Zusammenhängende Blöcke: Überlappungen und Lücken ≤ 3 Kalendertage
    // (Wochenende/Brückentag) verschmelzen. Vertretung ist ab einer Woche
    // (≥ 5 Werktage) nötig — gemessen am Block, nicht am Einzeleintrag.
    wegFenster.sort((x, y) => x.von - y.von);
    const bloecke = [];
    for (const w of wegFenster) {
      const letzter = bloecke[bloecke.length - 1];
      if (letzter && w.von - letzter.bis <= 3 * 86400000) letzter.bis = Math.max(letzter.bis, w.bis);
      else bloecke.push({ ...w });
    }
    for (const e of abwesenheitenAktuell) {
      const von = Date.parse(e.von + "T12:00:00Z");
      const block = bloecke.find((b) => von >= b.von - 86400000 && von <= b.bis + 86400000);
      e.wochenlang = block
        ? werktage(isoDate(new Date(block.von)), isoDate(new Date(block.bis))) >= 5
        : werktage(e.von, e.bis) >= 5;
    }
    abwesenheiten = abwesenheitenAktuell.sort((x, y) => x.von.localeCompare(y.von));
    urlaub = {
      jahr,
      anspruchTage: anspruch,
      anspruchQuelle,
      uebertragTage,
      uebertragBasis,
      genommenTage: Math.round(uGenommen * 2) / 2,
      geplantTage: Math.round(uGeplant * 2) / 2,
      restTage: Math.round((anspruch + (uebertragTage || 0) - uGenommen - uGeplant) * 2) / 2,
      regeneration: { h1: isoDate(regenH1), h2: isoDate(regenH2) },
      geplanteTermine: geplanteTermine.sort((x, y) => x.von.localeCompare(y.von)),
    };
    krankheit = {
      jahr,
      tage: Math.round(kTage * 2) / 2,
      vorjahrTage: null,
      kindKrankTage: Math.round(kindKrank * 2) / 2,
      letzteAbwesenheit: letzte ? isoDate(letzte) : null,
    };
  }

  // ── d) FLS-Ist aus Rechnungen (Vormonat) ──
  let fls = { sollWochenstunden: Math.round(sollWochenstunden * 10) / 10,
              istMonatsstunden: null, istMonat: null, istQuelle: null };
  try {
    const vormonat = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const monatIso = vormonat.toISOString().slice(0, 7);
    const invoices = await fetchCockpitInvoices(env);
    let summe = 0, treffer = 0;
    for (const inv of invoices || []) {
      if (kDate(inv.deletedAt)) continue;
      const von = kDate(inv.deliveryFrom);
      if (!von || von.toISOString().slice(0, 7) !== monatIso) continue;
      // Präzise Zuordnung über approval.id; Fallback: HB-Klient + approval-Zeile
      const perApproval = approvalIds.size > 0;
      const clientMatch = hbClientIds.has(String(inv.client?.id));
      let hit = false;
      for (const l of inv.lines || []) {
        const apId = l.approval?.id ? String(l.approval.id) : null;
        if (!apId) continue; // Pauschalen/Kilometer raus
        if (perApproval ? !approvalIds.has(apId) : !clientMatch) continue;
        summe += decimalToNumber(l.quantity);
        hit = true;
      }
      if (hit) treffer++;
    }
    fls.istMonatsstunden = Math.round(summe * 100) / 100;
    fls.istMonat = monatIso;
    fls.istQuelle = approvalIds.size > 0 ? "rechnungen (approval-id)" : "rechnungen (klient-fallback)";
    fls.istRechnungen = treffer;

    // Abwesenheitstage im Ist-Monat — Basis für das arbeitstags-korrigierte
    // Soll im Cockpit (fls-Soll ÷ 5 × [Arbeitstage − Abwesenheitstage]).
    // Alle genehmigten Abwesenheiten zählen (Urlaub, Krankheit, Kind krank,
    // Regeneration, Fortbildung/Sonstiges) — jede reduziert die Verfügbarkeit.
    // Anteilige Zählung: Arbeitstage der Überlappung mit dem Monat (Mo–Fr,
    // Feiertage Bayern), gedeckelt auf totalDays (halbe Tage, Teilzeitmuster).
    if (abs.verfuegbar && person && person.kilankaId) {
      const mStart = new Date(Date.UTC(vormonat.getUTCFullYear(), vormonat.getUTCMonth(), 1));
      const mEnde = new Date(Date.UTC(vormonat.getUTCFullYear(), vormonat.getUTCMonth() + 1, 0));
      let abwTage = 0;
      for (const a of abs.data || []) {
        if (String(a.user?.id) !== person.kilankaId) continue;
        if ((a.status || "").toLowerCase() !== "approved") continue;
        const b = kDate(a.begin), e = kDate(a.end) || kDate(a.begin);
        if (!b || !e || e < mStart || b > mEnde) continue;
        const at = arbeitstageBayern(b > mStart ? b : mStart, e < mEnde ? e : mEnde);
        const total = decimalToNumber(a.totalDays);
        abwTage += total > 0 ? Math.min(at, total) : at;
      }
      fls.abwesenheitsTageImMonat = Math.round(abwTage * 2) / 2;
      // Benchmark aus Entgeltkalkulation: 64 % (am Klienten) / 80 % (inkl. Fahrt)
      // der Vertragsstunden, bezogen auf Netto-Anwesenheit
      const atMonat = arbeitstageBayern(mStart, mEnde);
      const nettoAT = Math.max(0, atMonat - abwTage);
      fls.arbeitstageMonat = atMonat;
      fls.nettoArbeitstage = Math.round(nettoAT * 2) / 2;
      if (person && person.wochenstundenVertrag) {
        const tagesStd = person.wochenstundenVertrag / 5;
        fls.benchmark64 = Math.round(nettoAT * tagesStd * 0.64 * 10) / 10;
        fls.benchmark80 = Math.round(nettoAT * tagesStd * 0.8 * 10) / 10;
      }
    }
  } catch (e) { console.warn("Rechnungs-Zweig optional —", e.message); }

  return {
    upn,
    person: person || { name: null, rolle: null, team: null, qualifikation: null, eintritt: null, wochenstundenVertrag: null },
    personVerfuegbar: !!person,
    urlaub, krankheit,
    abwesenheitenVerfuegbar: abs.verfuegbar === true,
    abwesenheiten,
    nachweise,
    erhoehung, // nur TL/GF — Route entfernt das Feld für Fachkraft-Sicht
    firmenwagen: { vorhanden: false, quelle: "fuhrpark-liste folgt" },
    klienten: { aktiv: hb + mb + v, hb, mb, v,
      rolleFaelle: { hb: rolleFaelle.hb.sort((a, b) => a.localeCompare(b, "de")), mb: rolleFaelle.mb.sort((a, b) => a.localeCompare(b, "de")), v: rolleFaelle.v.sort((a, b) => a.localeCompare(b, "de")) },
      status: klientenStatus, hbIds: [...hbClientIds], hbFaelle: [...hbFallNamen].map(([id, f]) => ({ id, name: f.name, amt: f.amt, hilfeart: f.hilfeart, massnahme: f.massnahme })) },
    fls,
    stand: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════
// HTTP-Handling
// ═══════════════════════════════════════════════════════════════
function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Graph-Token",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

// ═══════════════════════════════════════════════════════════════
// Unterschriften — offene Leistungsnachweise (clients/timeSheets)
//
// Loest den bisherigen XLSX-Upload der Unterschriften-App ab: die
// Nachweise kommen direkt aus Kilanka. Sichtbarkeit wie im
// Manager-Cockpit: GF alle, Teamleitung ihr Team (Entra-directReports),
// alle anderen nur sich selbst.
// ═══════════════════════════════════════════════════════════════

// Status, die KEINE offene Unterschrift bedeuten (Kilanka liefert Klartext).
const SIG_ERLEDIGT = new Set(["unterschrieben", "nicht erforderlich"]);

// Bewusst schmal: keine Adressen, keine GPS-Koordinaten. Der Kommentar
// bleibt drin, weil er im Erinnerungsmail die Zuordnung erst moeglich macht.
const TIMESHEET_GRAPH = {
  id: 1, date: 1, start: 1, end: 1, total: 1, state: 1, comment: 1,
  signatureStatus: 1,
  client: { id: 1 },
  user: { id: 1 },
  service: { id: 1 },
  activity: { recName: 1 },
  invoice: { id: 1 },
  $limit: 1000,
};

let timeSheetCache = new Map();          // "YYYY-MM-DD" → { data, fetchedAt }
let serviceNameCache = { map: null, fetchedAt: 0 };
let kilankaUserCache = { list: null, fetchedAt: 0 };

// "HH:MM" aus $datetime/$time/String. Format der Felder start/end ist nicht
// dokumentiert — deshalb wird jede Variante akzeptiert statt zu raten.
function kZeit(w) {
  if (!w) return "";
  const s = typeof w === "string" ? w : (w.$datetime || w.$time || w.$date || "");
  const m = /(\d{2}):(\d{2})/.exec(String(s));
  return m ? `${m[1]}:${m[2]}` : "";
}

// ISO-8601-Dauer ($interval, z. B. "PT1H30M") → Stunden.
function kStunden(w) {
  if (!w) return 0;
  const s = typeof w === "string" ? w : w.$interval || "";
  const m = /^P(?:(-?[\d.]+)D)?(?:T(?:(-?[\d.]+)H)?(?:(-?[\d.]+)M)?(?:(-?[\d.]+)S)?)?$/.exec(String(s));
  if (!m) return 0;
  const [, d, h, min, sec] = m.map((x) => (x == null ? 0 : Number(x)));
  return (d || 0) * 24 + (h || 0) + (min || 0) / 60 + (sec || 0) / 3600;
}

async function kilankaSeiten(env, model, graph, maxSeiten = 40) {
  const alle = [];
  const limit = graph.$limit || 1000;
  for (let seite = 0; seite < maxSeiten; seite++) {
    const page = await kilankaPost(env, model, { ...graph, $offset: seite * limit });
    if (!Array.isArray(page)) break;
    alle.push(...page);
    if (page.length < limit) break;
  }
  return alle;
}

async function serviceNamen(env) {
  if (serviceNameCache.map && Date.now() - serviceNameCache.fetchedAt < 60 * 60 * 1000) {
    return serviceNameCache.map;
  }
  const map = new Map();
  try {
    const data = await kilankaSeiten(env, "accounting/services", { id: 1, recName: 1, $limit: 1000 }, 5);
    for (const s of data) map.set(String(s.id), s.recName || "");
  } catch (e) {
    console.warn("Leistungsnamen nicht ladbar:", e.message); // Fallback: leere Spalte
  }
  serviceNameCache = { map, fetchedAt: Date.now() };
  return map;
}

async function kilankaUser(env) {
  if (kilankaUserCache.list && Date.now() - kilankaUserCache.fetchedAt < CACHE_TTL_MIN * 60 * 1000) {
    return kilankaUserCache.list;
  }
  const list = await kilankaSeiten(env, "users", { id: 1, name: 1, firstName: 1, deletedAt: 1, $limit: 1000 }, 5);
  kilankaUserCache = { list, fetchedAt: Date.now() };
  return list;
}

// Offene Nachweise ab Stichtag. Serverseitiges Vorfiltern halbiert die
// Seitenzahl; ob signatureStatus filterbar ist, ist nicht dokumentiert —
// deshalb mit Fallback auf den reinen Datumsfilter.
async function offeneNachweise(env, von) {
  const cached = timeSheetCache.get(von);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MIN * 60 * 1000) return cached.data;

  const datumsFilter = { date: { $gte: { $date: von } } };
  const varianten = [
    { ...TIMESHEET_GRAPH, $filter: { ...datumsFilter, signatureStatus: { $neq: "unterschrieben" } } },
    { ...TIMESHEET_GRAPH, $filter: datumsFilter },
  ];
  let rows = null, fehler = null;
  for (const graph of varianten) {
    try { rows = await kilankaSeiten(env, "clients/timeSheets", graph); break; }
    catch (e) { fehler = e; }
  }
  if (!rows) throw fehler || new Error("clients/timeSheets nicht abrufbar");

  const offen = rows.filter((t) => {
    const st = String(t.signatureStatus || "").trim().toLowerCase();
    return st && !SIG_ERLEDIGT.has(st);
  });
  if (timeSheetCache.size > 8) timeSheetCache.clear();
  timeSheetCache.set(von, { data: offen, fetchedAt: Date.now() });
  return offen;
}

// Offene Nachweise, gruppiert je Mitarbeiter (mit UPN fuer die Rechtepruefung).
async function unterschriftenGruppen(env, von) {
  const [offen, clients, users, svc] = await Promise.all([
    offeneNachweise(env, von),
    fetchKilankaClients(env),
    kilankaUser(env),
    serviceNamen(env),
  ]);

  const kMap = new Map();
  for (const c of clients || []) kMap.set(String(c.id), c.recName || c.name || "");

  const uMap = new Map();
  for (const u of users || []) {
    const recName = userRecName(u);
    uMap.set(String(u.id), {
      name: recName || "",
      upn: upnForAttendant({ id: u.id, recName }),
      archiviert: !!kDate(u.deletedAt) || isArchived(recName),
    });
  }

  const gruppen = new Map();
  for (const t of offen) {
    const uid = String(t.user?.id ?? "");
    const info = uMap.get(uid) || { name: "Unbekannt", upn: "", archiviert: false };
    if (!gruppen.has(uid)) {
      gruppen.set(uid, {
        kilankaId: uid, name: info.name, upn: info.upn,
        archiviert: info.archiviert, count: 0, stunden: 0, rows: [],
      });
    }
    const g = gruppen.get(uid);
    const std = kStunden(t.total);
    g.count++;
    g.stunden += std;
    g.rows.push({
      datum: t.date?.$date || "",
      von: kZeit(t.start),
      bis: kZeit(t.end),
      std: Math.round(std * 100) / 100,
      klient: kMap.get(String(t.client?.id ?? "")) || "",
      leistung: svc.get(String(t.service?.id ?? "")) || "",
      taetigkeit: t.activity?.recName || "",
      kommentar: t.comment || "",
      status: t.signatureStatus || "",
      abgerechnet: !!t.invoice,
    });
  }

  const liste = [...gruppen.values()];
  for (const g of liste) {
    g.stunden = Math.round(g.stunden * 100) / 100;
    g.rows.sort((a, b) => a.datum.localeCompare(b.datum));
  }
  return liste.sort((a, b) => b.count - a.count);
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders(origin) },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // Offene Unterschriften — ersetzt den XLSX-Upload der Unterschriften-App.
    // Sichtbarkeit: GF alle, Teamleitung ihr Team, Fachkraft nur sich selbst.
    if (url.pathname === "/api/unterschriften" && request.method === "GET") {
      const auth = await validateEntraToken(request.headers.get("Authorization"));
      if (!auth.ok) return json({ error: auth.error }, 401, origin);
      const caller = (auth.upn || "").trim().toLowerCase();
      if (!caller.endsWith(`@${MAIL_DOMAIN}`)) {
        return json({ error: "Konto gehört nicht zur Organisation" }, 403, origin);
      }
      try {
        const istGf = GF_UPNS.some((g) => g.trim().toLowerCase() === caller);
        const dr = istGf
          ? { reports: [], fehler: null }
          : await fetchDirectReports(request.headers.get("X-Graph-Token"));
        const rolle = istGf ? "gf" : dr.reports.length ? "tl" : "fk";

        // Stichtag: Standard 3 volle Monate zurueck. Aeltere Zeitraeume kosten
        // Seiten (>1000 Nachweise je Seite) und sind fachlich selten relevant.
        let von = (url.searchParams.get("von") || "").trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(von)) {
          const d = new Date();
          d.setMonth(d.getMonth() - 3, 1);
          von = d.toISOString().slice(0, 10);
        }

        const alle = await unterschriftenGruppen(env, von);
        const erlaubt = istGf
          ? null
          : new Set([caller, ...dr.reports.map((r) => r.upn)].filter(Boolean));
        const gruppen = erlaubt ? alle.filter((g) => erlaubt.has(g.upn)) : alle;

        return json(
          {
            nutzer: caller,
            rolle,
            // true = Rolle konnte wegen Graph-Ausfall nicht sicher bestimmt
            // werden; das Frontend weist dann darauf hin, statt eine
            // unvollstaendige Teamsicht als vollstaendig auszugeben.
            rolleUnsicher: !!dr.fehler,
            von,
            stand: new Date().toISOString(),
            gesamt: gruppen.reduce((s, g) => s + g.count, 0),
            gruppen,
          },
          200, origin
        );
      } catch (e) {
        return json({ error: `Kilanka-Abruf fehlgeschlagen: ${e.message}` }, 502, origin);
      }
    }

    if (url.pathname === "/api/health") {
      return json({ ok: true, version: "v3.2-git", ts: new Date().toISOString() }, 200, origin);
    }

    if (url.pathname === "/api/meine-klienten" && request.method === "GET") {
      const auth = await validateEntraToken(request.headers.get("Authorization"));
      if (!auth.ok) return json({ error: auth.error }, 401, origin);
      if (!auth.upn.endsWith(`@${MAIL_DOMAIN}`)) {
        return json({ error: "Konto gehört nicht zur Organisation" }, 403, origin);
      }
      try {
        const now = new Date();
        const [all, qualiMap] = await Promise.all([
          fetchKilankaClients(env),
          fetchQualiMap(env, now),
        ]);
        const klienten = clientsForUser(all, auth.upn, now, qualiMap);
        // Alle vergebenen Qualifikationen als Auswahlliste (ohne "NICHT verwenden"-Alteintraege)
        const qualifikationen = [...new Set(Object.values(qualiMap))]
          .filter((q) => !/^\s*nicht\s/i.test(q))
          .sort((a, b) => a.localeCompare(b, "de"));
        return json(
          {
            nutzer: auth.upn,
            stand: new Date(clientCache.fetchedAt).toISOString(),
            anzahl: klienten.length,
            qualifikationen,
            klienten,
          },
          200, origin
        );
      } catch (e) {
        return json({ error: `Kilanka-Abruf fehlgeschlagen: ${e.message}` }, 502, origin);
      }
    }

    if (url.pathname === "/api/manager-cockpit" && request.method === "GET") {
      const auth = await validateEntraToken(request.headers.get("Authorization"));
      if (!auth.ok) return json({ error: auth.error }, 401, origin);
      const caller = (auth.upn || "").trim().toLowerCase();
      if (!caller.endsWith(`@${MAIL_DOMAIN}`)) {
        return json({ error: "Konto gehört nicht zur Organisation" }, 403, origin);
      }
      try {
        const istGf = GF_UPNS.some((g) => g.trim().toLowerCase() === caller);
        // GF-Vorschau: ?als=<upn> zeigt der GF exakt die Sicht einer Teamleitung
        // (Rolle, Zeilen, Zielerreichung) — für alle anderen wirkungslos.
        const alsParam = (url.searchParams.get("als") || "").trim().toLowerCase();
        const vorschau = istGf && alsParam && alsParam !== caller && alsParam.endsWith(`@${MAIL_DOMAIN}`);
        const dr = istGf ? { reports: [], fehler: null } : await fetchDirectReports(request.headers.get("X-Graph-Token"));
        const reports = dr.reports;
        const rolle = istGf ? (vorschau ? "tl" : "gf") : reports.length ? "tl" : "fk";
        if (rolle === "fk") {
          const ausfall = graphAusfall(dr, origin);
          if (ausfall) return ausfall;
          return json({ error: "Manager-Cockpit ist Teamleitungen und GF vorbehalten" }, 403, origin);
        }
        const mgrMap = await fetchManagerMap(request.headers.get("X-Graph-Token"));
        let liste;
        if (vorschau) {
          // Team der simulierten Leitung über die Manager-Map aufbauen
          const alle = await alleAktivenMitarbeiter(env);
          const kopf = alle.find((m) => (m.upn || "").toLowerCase() === alsParam) || { upn: alsParam, name: alsParam };
          liste = [kopf];
          for (const m of alle) {
            const mu = (m.upn || "").toLowerCase();
            if (mu !== alsParam && ((mgrMap.get(m.upn)?.upn) || "").toLowerCase() === alsParam) liste.push(m);
          }
        } else if (istGf) {
          liste = await alleAktivenMitarbeiter(env);
        } else {
          const seen = new Set([caller]);
          liste = [{ upn: caller, name: auth.name || caller }];
          for (const r of reports) if (!seen.has(r.upn)) { seen.add(r.upn); liste.push(r); }
        }
        // Stichtag (?stichtag=YYYY-MM-DD): kompletter Rechenkern arbeitet
        // datumsbezogen → historische Quartals-Momentaufnahme. 12:00 UTC
        // vermeidet Zeitzonen-Kanten. Nachweise (UDFs) sind immer aktueller Stand.
        let now = new Date();
        const stichtagParam = url.searchParams.get("stichtag");
        if (stichtagParam && /^\d{4}-\d{2}-\d{2}$/.test(stichtagParam)) {
          const st = new Date(stichtagParam + "T12:00:00Z");
          if (!isNaN(st) && st.getUTCFullYear() >= 2024 && st <= new Date()) now = st;
        }
        let dpMap = null;
        try { dpMap = await dienstplanMap(env, now); } catch (e) { console.warn("Dienstplan optional —", e.message); }
        const rows = [];
        for (const m of liste) {
          const d = await buildCockpit(env, m.upn, now); // Kilanka-Caches → nur 1. Person kostet Netz
          // Vertretung ist erst ab einer Woche Abwesenheit (≥ 5 Werktage) nötig —
          // kürzere Abwesenheiten werden nur angezeigt, ohne Vertretungs-Analyse.
          const abwesenheiten = (d.abwesenheiten || []).map((x) => ({ ...x, wochenlang: x.wochenlang ?? (werktage(x.von, x.bis) >= 5) }));
          const lange = abwesenheiten.filter((x) => x.wochenlang);
          let vertretungsFaelle = null;
          if (lange.length && d.person.kilankaId) {
            const von = new Date(lange[0].von + "T00:00:00Z");
            const bis = new Date(lange.map((x) => x.bis).sort().pop() + "T23:59:59Z");
            try { vertretungsFaelle = await vertretungsLage(env, d.person.kilankaId, von, bis); } catch (e) { console.warn("Vertretungslage nicht ermittelbar —", e.message); }
          }
          rows.push({
            upn: m.upn,
            abwesenheiten,
            vertretungsFaelle,
            dienstplan: (dpMap && d.person.kilankaId && dpMap.get(d.person.kilankaId)) || null,
            leitung: mgrMap.get(m.upn) || null,
            name: d.person.name || m.name || m.upn,
            team: d.person.team,
            wochenstunden: d.person.wochenstundenVertrag,
            klienten: d.klienten,
            fls: d.fls,
            urlaub: d.urlaub,
            krankheit: d.krankheit,
            nachweise: d.nachweise,
            erhoehung: d.erhoehung, // Endpunkt ist TL/GF-exklusiv
          });
        }
        let amtFaelle = [];
        try { amtFaelle = await alleHbFaelle(env, now); } catch (e) { console.warn("Ziel-Basis optional —", e.message); }
        return json({ rolle, vorschauAls: vorschau ? alsParam : null, stand: new Date().toISOString(), stichtag: stichtagParam || null, rows, amtFaelle }, 200, origin);
      } catch (e) {
        return json({ error: `Manager-Cockpit fehlgeschlagen: ${e.message}` }, 502, origin);
      }
    }

    if (url.pathname === "/api/jugendamt-cockpit" && request.method === "GET") {
      const auth = await validateEntraToken(request.headers.get("Authorization"));
      if (!auth.ok) return json({ error: auth.error }, 401, origin);
      const caller = (auth.upn || "").trim().toLowerCase();
      if (!caller.endsWith(`@${MAIL_DOMAIN}`)) {
        return json({ error: "Konto gehört nicht zur Organisation" }, 403, origin);
      }
      try {
        const istGf = GF_UPNS.some((g) => g.trim().toLowerCase() === caller);
        const dr = istGf ? { reports: [], fehler: null } : await fetchDirectReports(request.headers.get("X-Graph-Token"));
        const reports = dr.reports;
        const rolle = istGf ? "gf" : reports.length ? "tl" : "fk";
        if (rolle === "fk") {
          const ausfall = graphAusfall(dr, origin);
          if (ausfall) return ausfall;
          return json({ error: "Jugendamt-Cockpit ist Teamleitungen und GF vorbehalten" }, 403, origin);
        }
        const now = new Date();
        const [clients, amtKurz] = await Promise.all([
          fetchKilankaClients(env),
          fetchAmtKurznamen(env),
        ]);
        const rows = jugendamtFaelle(clients, now, amtKurz);
        return json(
          { rolle, zeitraumVon: JA_ZEITRAUM_VON, stand: new Date(clientCache.fetchedAt).toISOString(), anzahl: rows.length, rows },
          200, origin
        );
      } catch (e) {
        return json({ error: `Jugendamt-Cockpit fehlgeschlagen: ${e.message}` }, 502, origin);
      }
    }

    if (url.pathname === "/api/mitarbeiter-cockpit" && request.method === "GET") {
      const auth = await validateEntraToken(request.headers.get("Authorization"));
      if (!auth.ok) return json({ error: auth.error }, 401, origin);
      if (!auth.upn.endsWith(`@${MAIL_DOMAIN}`)) {
        return json({ error: "Konto gehört nicht zur Organisation" }, 403, origin);
      }
      try {
        const caller = (auth.upn || "").trim().toLowerCase();
        const istGf = GF_UPNS.some((g) => g.trim().toLowerCase() === caller);
        const dr = istGf ? { reports: [], fehler: null } : await fetchDirectReports(request.headers.get("X-Graph-Token"));
        // Hier ist "fk" ein regulaerer Zustand (eigene Daten). Nur bei echtem
        // Graph-Ausfall abbrechen, damit eine TL nicht stillschweigend auf die
        // Einzelsicht zurueckfaellt.
        const ausfallDr = graphAusfall(dr, origin);
        if (ausfallDr) return ausfallDr;
        const reports = dr.reports;
        const rolle = istGf ? "gf" : reports.length ? "tl" : "fk";

        // Sichtbare Mitarbeiter für das Dropdown
        let sichtbar;
        if (istGf) {
          sichtbar = await alleAktivenMitarbeiter(env);
          if (!sichtbar.some((m) => m.upn === caller)) {
            sichtbar.unshift({ upn: caller, name: auth.name || caller });
          }
        } else {
          const seen = new Set([caller]);
          sichtbar = [{ upn: caller, name: auth.name || caller }];
          for (const r of reports) {
            if (seen.has(r.upn)) continue;
            seen.add(r.upn);
            sichtbar.push(r);
          }
        }

        // Ziel: eigener Account oder berechtigte Fremd-Sicht
        const target = (url.searchParams.get("mitarbeiter") || "").toLowerCase() || caller;
        const erlaubt = target === caller || istGf || reports.some((r) => r.upn === target);
        if (!erlaubt) {
          return json({ error: "Keine Berechtigung für diese Mitarbeiter-Sicht" }, 403, origin);
        }

        const data = await buildCockpit(env, target, new Date());
        if (rolle === "fk") delete data.erhoehung; // Gehaltsdaten nur für TL/GF
        data.sicht = {
          rolle,
          mitarbeiter: sichtbar,
          debug: { caller, istGf, reports: reports.length, anzahlSichtbar: sichtbar.length },
        };
        return json(data, 200, origin);
      } catch (e) {
        return json({ error: `Cockpit-Abruf fehlgeschlagen: ${e.message}` }, 502, origin);
      }
    }

    if (url.pathname === "/api/relution/geraete" && request.method === "GET") {
      const auth = await validateEntraToken(request.headers.get("Authorization"));
      if (!auth.ok) return json({ error: auth.error }, 401, origin);
      const caller = (auth.upn || "").trim().toLowerCase();
      // Mobilfunk-Daten (Zuordnung Gerät ↔ Person) sind GF-exklusiv
      if (!GF_UPNS.some((g) => g.trim().toLowerCase() === caller)) {
        return json({ error: "Relution-Daten sind der Geschäftsführung vorbehalten" }, 403, origin);
      }
      if (!env.RELUTION_TOKEN) {
        return json({ error: "RELUTION_TOKEN ist nicht konfiguriert (Cloudflare → Settings → Variables and Secrets, Typ Secret)" }, 503, origin);
      }
      try {
        const geraete = await fetchRelutionGeraete(env);
        return json({ stand: new Date(relutionCache.fetchedAt).toISOString(), anzahl: geraete.length, geraete }, 200, origin);
      } catch (e) {
        return json({ error: `Relution-Abruf fehlgeschlagen: ${e.message}` }, 502, origin);
      }
    }

    return json({ error: "Nicht gefunden" }, 404, origin);
  },
};

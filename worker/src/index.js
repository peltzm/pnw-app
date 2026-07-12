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
const TIMEBASE_MAP = { week: "Woche", month_current: "Monat", pool: "Pool" };

// ── Kilanka-Graph: exakt die benötigten Felder, nichts Sensibles ──
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
    department: { name: 1 },
    departmentResponsible: { recName: 1 },
    fileReference: 1, reportDueDate: 1, nextMeeting: 1,
    attendants: {
      validFrom: 1, validUntil: 1,
      user: { id: 1, recName: 1 },
      attendantKind: { name: 1 },
    },
    quotas: {
      name: 1, type: 1, limitPeriod: 1, timeBase: 1,
      // ACHTUNG: "quantity" hier NIE anfragen (killt quotas-Zweig, s. Doku §4)
      approvals: { validFrom: 1, validUntil: 1, hours: 1 },
    },
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
  if (payload.exp && payload.exp < now - 60) return { ok: false, error: "Token abgelaufen" };
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

async function fetchKilankaClients(env) {
  if (clientCache.data && Date.now() - clientCache.fetchedAt < CACHE_TTL_MIN * 60 * 1000) {
    return clientCache.data;
  }
  const body = JSON.stringify(CLIENT_GRAPH);
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await fetch(`${KILANKA_BASE}/clients`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.KILANKA_TOKEN}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body,
    });
    if (r.ok) {
      const json = await r.json();
      const data = json.data ?? json;
      clientCache = { data, fetchedAt: Date.now() };
      return data;
    }
    lastErr = `Kilanka ${r.status}`;
    if (r.status === 502 || r.status === 429) {
      await new Promise((res) => setTimeout(res, 800 * attempt));
      continue;
    }
    break;
  }
  throw new Error(lastErr || "Kilanka nicht erreichbar");
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

function buildClientProfile(client, action, role, now) {
  // Kontingent: mit timeBase gültige Bewilligung suchen; Mengen-Kontingente
  // (timeBase quantity) für Fachleistungsstunden ignorieren
  let stunden = null, stundenTyp = "", kontingentHinweis = "", bewVon = null, bewBis = null;
  for (const q of action.quotas || []) {
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

function clientsForUser(allClients, upn, now) {
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
      result.push(buildClientProfile(client, m.action, m.role, now));
    }
  }
  return result.sort(
    (a, b) =>
      ROLE_RANK[b.rolle] - ROLE_RANK[a.rolle] ||
      a.anzeigeName.localeCompare(b.anzeigeName, "de")
  );
}

// ═══════════════════════════════════════════════════════════════
// HTTP-Handling
// ═══════════════════════════════════════════════════════════════
function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
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

    if (url.pathname === "/api/debug-token-temp") {
      const t = env.KILANKA_TOKEN || "";
      const info = t
        ? { gesetzt: true, laenge: t.length, anfang: t.slice(0, 4), ende: t.slice(-4), hatLeerzeichen: /\s/.test(t) }
        : { gesetzt: false };
      return json(info, 200, origin);
    }
    if (url.pathname === "/api/health") {
      return json({ ok: true, version: "v3.3-clean", ts: new Date().toISOString() }, 200, origin);
    }

    if (url.pathname === "/api/meine-klienten" && request.method === "GET") {
      const auth = await validateEntraToken(request.headers.get("Authorization"));
      if (!auth.ok) return json({ error: auth.error }, 401, origin);
      if (!auth.upn.endsWith(`@${MAIL_DOMAIN}`)) {
        return json({ error: "Konto gehört nicht zur Organisation" }, 403, origin);
      }
      try {
        const all = await fetchKilankaClients(env);
        const now = new Date();
        const klienten = clientsForUser(all, auth.upn, now);
        return json(
          {
            nutzer: auth.upn,
            stand: new Date(clientCache.fetchedAt).toISOString(),
            anzahl: klienten.length,
            klienten,
          },
          200, origin
        );
      } catch (e) {
        return json({ error: `Kilanka-Abruf fehlgeschlagen: ${e.message}` }, 502, origin);
      }
    }

    return json({ error: "Nicht gefunden" }, 404, origin);
  },
};

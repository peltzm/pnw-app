// Auslastung auf Basis des internen RPC (getActionStatus).
//
// Kilanka liefert hier fertig berechnete Werte:
//   - quotas: approvedWeek / performedWeek (bereinigt um geloeschte Kontingente)
//   - attendants: weeklyHours je Mitarbeiter (Verteilung macht Kilanka)
// Unsere Eigenrechnung (timeBase-Umrechnung, Anteilsverteilung,
// Altlasten-Filter) entfaellt damit vollstaendig.

import { KIND_HAUPT, KIND_MIT, type RpcAction, type RpcClient } from './rpc';
import { kHours, isActive, kDate, type KDate, type KNumber } from './kilanka';

// ── Nordstern-Konfiguration (Betriebsparameter, nicht in Kilanka) ──
export const NORDSTERN_TEAM = [
    'Gain, Danielle',
    'Dietrich, Saskia',
    'Kerschenlohr, Nadine',
    'Edler, Franziska',
    'Freundl, Kilian',
    'Hermann, Jessica',
    'Graf, Martina',
];
export const SCHICHT_GESAMT = 3.1 * 39; // 120,9 h/Woche

export interface ApiUser {
    id: string;
    name?: string;
    firstName?: string;
    deletedAt?: KDate;
    weeklyHours?: KNumber;
    targetHours?:
        | {
              validFrom?: KDate;
              validUntil?: KDate;
              weeklyHours?: KNumber;
              monthlyHours?: KNumber;
          }[]
        | null;
}

export interface DetailZeile {
    betreuer: string;
    rolle: string;
    klient: string;
    bewilligtWo: number;
    geleistetWo: number;
    massnahme: string;
}

export interface SummenZeile {
    betreuer: string;
    klienten: number;
    alsHaupt: number;
    alsMit: number;
    bewilligtWo: number;
    geleistetWo: number;
    sollStd: number | null;
    nordsternStd: number;
    sollAmbulant: number | null;
    differenz: number | null;
    ueberschrProz: number | null;
    hinweis: string;
}

export interface Auswertung {
    detail: DetailZeile[];
    summen: SummenZeile[];
    klientenGesamt: number;
    ohneBetreuer: number;
    ohneKontingent: number;
}

const rund = (x: number, s = 1) => Math.round(x * 10 ** s) / 10 ** s;

const ROLLEN: Record<string, string> = {
    [KIND_HAUPT]: 'Hauptbetreuer',
    [KIND_MIT]: 'Mitbetreuer',
};

export function berechneAuslastungRpc(
    clients: RpcClient[],
    status: Map<string, RpcAction[]>,
    users: ApiUser[],
    heute: Date,
): Auswertung {
    // Sollstunden je Mitarbeiter
    const sollStd = new Map<string, number | null>();
    for (const u of users) {
        if (kDate(u.deletedAt)) continue;
        let std: number | null = null;
        const th = (u.targetHours ?? []).find((t) => t && isActive(t.validFrom, t.validUntil, heute));
        if (th) {
            const w = kHours(th.weeklyHours);
            if (w > 0) std = w;
            else {
                const m = kHours(th.monthlyHours);
                if (m > 0) std = (m * 12) / 52;
            }
        }
        if (std == null) {
            const w = kHours(u.weeklyHours);
            if (w > 0) std = w;
        }
        if (u.name && u.firstName) sollStd.set(`${u.name}, ${u.firstName}`, std);
    }

    const detail: DetailZeile[] = [];
    let ohneBetreuer = 0;
    let ohneKontingent = 0;

    for (const k of clients) {
        const actions = status.get(k.id) ?? [];
        let hatBetreuer = false;
        let hatKontingent = false;

        for (const m of actions) {
            // Kontingentwerte der Maßnahme: Kilanka hat bereits gerechnet
            // und geloeschte Kontingente entfernt.
            const bewilligt = (m.quotas ?? []).reduce((s, q) => s + (q.approvedWeek ?? 0), 0);
            const geleistet = (m.quotas ?? []).reduce((s, q) => s + (q.performedWeek ?? 0), 0);
            if (bewilligt > 0) hatKontingent = true;

            // Betreuer: nur main (Haupt) und aux (Mit); sub (Vertretung) faellt raus.
            const relevante = (m.attendants ?? []).filter(
                (a) => (a.kind === KIND_HAUPT || a.kind === KIND_MIT) && !a.user?.startsWith('[archiviert]'),
            );
            if (relevante.length === 0) continue;
            hatBetreuer = true;

            // Kilanka verteilt die Wochenstunden bereits auf die Zustaendigen
            // (weeklyHours je attendant). Summe der weeklyHours = Bewilligung.
            const summeWo = relevante.reduce((s, a) => s + (a.weeklyHours ?? 0), 0);

            for (const a of relevante) {
                const anteil = summeWo > 0 ? (a.weeklyHours ?? 0) / summeWo : 1 / relevante.length;
                detail.push({
                    betreuer: a.user,
                    rolle: ROLLEN[a.kind] ?? a.kind,
                    klient: k.recName,
                    massnahme: m.name,
                    bewilligtWo: rund(a.weeklyHours ?? 0, 2),
                    geleistetWo: rund(geleistet * anteil, 2),
                });
            }
        }

        if (!hatBetreuer) ohneBetreuer++;
        if (!hatKontingent) ohneKontingent++;
    }

    // Summen je Betreuer
    const schichtProKopf = SCHICHT_GESAMT / NORDSTERN_TEAM.length;
    const gruppen = new Map<string, DetailZeile[]>();
    for (const z of detail) {
        if (!gruppen.has(z.betreuer)) gruppen.set(z.betreuer, []);
        gruppen.get(z.betreuer)!.push(z);
    }

    const summen: SummenZeile[] = [...gruppen.entries()].map(([name, zeilen]) => {
        const bewilligt = rund(zeilen.reduce((s, z) => s + z.bewilligtWo, 0));
        const geleistet = rund(zeilen.reduce((s, z) => s + z.geleistetWo, 0));
        const vertrag = sollStd.get(name) ?? null;
        const nordstern = NORDSTERN_TEAM.includes(name) ? schichtProKopf : 0;
        const sollAmbulant = vertrag != null ? vertrag - nordstern : null;

        return {
            betreuer: name,
            klienten: new Set(zeilen.map((z) => z.klient)).size,
            alsHaupt: zeilen.filter((z) => z.rolle === 'Hauptbetreuer').length,
            alsMit: zeilen.filter((z) => z.rolle === 'Mitbetreuer').length,
            bewilligtWo: bewilligt,
            geleistetWo: geleistet,
            sollStd: vertrag != null ? rund(vertrag) : null,
            nordsternStd: rund(nordstern),
            sollAmbulant: sollAmbulant != null ? rund(sollAmbulant) : null,
            differenz: sollAmbulant != null ? rund(bewilligt - sollAmbulant) : null,
            ueberschrProz:
                sollAmbulant != null && sollAmbulant > 0
                    ? Math.round(((bewilligt - sollAmbulant) / sollAmbulant) * 100)
                    : null,
            hinweis:
                vertrag == null
                    ? 'keine Sollstunden gefunden'
                    : sollAmbulant != null && sollAmbulant <= 0
                      ? 'Sollzeit komplett im Nordstern'
                      : '',
        };
    });

    summen.sort((a, b) => (b.ueberschrProz ?? -Infinity) - (a.ueberschrProz ?? -Infinity));

    return {
        detail: detail.sort(
            (a, b) => a.betreuer.localeCompare(b.betreuer) || a.klient.localeCompare(b.klient),
        ),
        summen,
        klientenGesamt: clients.length,
        ohneBetreuer,
        ohneKontingent,
    };
}

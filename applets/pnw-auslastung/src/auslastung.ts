// Auslastungslogik Praxis NeueWege — Portierung der verifizierten
// PowerShell-Auswertung v9 (07/2026), angepasst 07/2026:
// Nordstern-Abzug = NUR Schichtdienst-Komponente (Ruf/Bezug/Leads
// bewusst nicht angerechnet; Konstanten bleiben fuer spaeter erhalten).
//
// Lesart: Kontingente sind BEWILLIGTE Budgets, keine geleisteten
// Stunden. Ueberschreitung der ambulanten Sollstunden ist wegen
// Ausfallterminen gewollt; auffaellig sind negative Werte und Extreme.

import { kDate, kHours, isActive, type KDate, type KNumber } from './kilanka';

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
export const RUF_GESAMT = 14.0;
export const BEZUGSKLIENTEN = ['Akras', 'El Ahmad', 'Ishaqi', 'Waziri', 'Nejati', 'Bordiuh', 'Diallo'];
export const BEZUGS_STD = 4.0;
export const BEZUGS_FALLBACK: Record<string, string> = { Diallo: 'Kerschenlohr, Nadine' };
export const LEADS: Record<string, number> = {
    'Freundl, Kilian': 4.0,
    'Hermann, Jessica': 4.0,
};

// ── API-Antworttypen (nur die abgefragten Felder) ──
interface Attendant {
    user?: { recName?: string } | null;
    amount?: KNumber;
    validFrom?: KDate;
    validUntil?: KDate;
    attendantKind?: { name?: string } | null;
}
interface Approval {
    hours?: KNumber;
    quantity?: KNumber;
    validFrom?: KDate;
    validUntil?: KDate;
}
interface Quota {
    name?: string;
    timeBase?: string | null;
    deletedAt?: KDate; // seit 13.07.2026 von der v2 geliefert (Support-Fix)
    approvals?: Approval[] | null;
}
interface Action {
    deletedAt?: KDate;
    validFrom?: KDate;
    validUntil?: KDate;
    attendants?: Attendant[] | null;
    quotas?: Quota[] | null;
}
export interface ApiClient {
    id: string;
    recName?: string;
    deletedAt?: KDate;
    actions?: Action[] | null;
}
export interface ApiUser {
    id: string;
    name?: string;
    firstName?: string;
    deletedAt?: KDate;
    weeklyHours?: KNumber;
    targetHours?: {
        validFrom?: KDate;
        validUntil?: KDate;
        weeklyHours?: KNumber;
        monthlyHours?: KNumber;
    }[] | null;
}

// ── Ergebnistypen ──
export interface DetailZeile {
    betreuer: string;
    rolle: string;
    klient: string;
    anteilProz: number;
    wochenStd: number | null;
    bezugsklient: boolean;
    hinweis: string;
}
export interface SummenZeile {
    betreuer: string;
    klienten: number;
    alsHaupt: number;
    alsMit: number;
    summeWochenStd: number;
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
    ohneKontingent: number;
    diagnose: { quotasGesamt: number; deletedAtGeliefert: number; geloeschtGefiltert: number };
    mehrereKontingente: number;
    bezugGefunden: string[];
    bezugFehlend: string[];
}

const rund = (x: number, stellen = 1) => Math.round(x * 10 ** stellen) / 10 ** stellen;

function istBezugsklient(recName: string): boolean {
    return BEZUGSKLIENTEN.some((n) => recName === n || recName.startsWith(`${n},`));
}

export function berechneAuslastung(clients: ApiClient[], users: ApiUser[], heute: Date): Auswertung {
    // Sollstunden-Lookup: "Nachname, Vorname" -> h/Woche
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

    let diagQuotasGesamt = 0, diagFeldGeliefert = 0, diagGefiltert = 0;
    const detail: DetailZeile[] = [];
    const bezugGefunden: string[] = [];

    for (const klient of clients) {
        const recName = klient.recName ?? '';
        // Archivierte Klienten: deletedAt UND [archiviert]-Praefix pruefen
        // (beide Kriterien sind in Kilanka deckungsgleich gepflegt; das
        // Praefix faengt Faelle ab, in denen deletedAt nicht geliefert wird)
        if (kDate(klient.deletedAt) || recName.startsWith('[archiviert]')) continue;

        const aktiveMassnahmen = (klient.actions ?? []).filter(
            (m) => m && !kDate(m.deletedAt) && isActive(m.validFrom, m.validUntil, heute),
        );

        // Haupt- + Mitbetreuer, keine Vertretung, keine Archivierten
        const zuordnungen = aktiveMassnahmen
            .flatMap((m) => m.attendants ?? [])
            .filter(
                (z): z is Attendant =>
                    !!z &&
                    !!z.user?.recName &&
                    (z.attendantKind?.name === 'Hauptbetreuer' || z.attendantKind?.name === 'Mitbetreuer') &&
                    !z.user.recName.startsWith('[archiviert]') &&
                    isActive(z.validFrom, z.validUntil, heute),
            );
        if (zuordnungen.length === 0) continue;

        // Je Betreuer: Rolle + Anteil buendeln
        const beteiligte = new Map<string, { rolle: string; anteil: number }>();
        for (const z of zuordnungen) {
            const n = z.user!.recName!;
            const anteil = kHours(z.amount);
            const vorhanden = beteiligte.get(n);
            if (!vorhanden) {
                beteiligte.set(n, { rolle: z.attendantKind!.name!, anteil });
            } else {
                if (z.attendantKind!.name === 'Hauptbetreuer') vorhanden.rolle = 'Hauptbetreuer';
                if (anteil > vorhanden.anteil) vorhanden.anteil = anteil;
            }
        }

        // Anteile normalisieren (amount-Summe, sonst Gleichverteilung)
        const anteilSumme = [...beteiligte.values()].reduce((s, b) => s + b.anteil, 0);
        const quoten = new Map<string, number>();
        for (const [n, b] of beteiligte) {
            quoten.set(n, anteilSumme > 0 ? b.anteil / anteilSumme : 1 / beteiligte.size);
        }

        // Bezugsklienten: 4h an den Hauptbetreuer
        const istBezug = istBezugsklient(recName);
        if (istBezug) bezugGefunden.push(recName);

        // Kontingent-Wochenstunden des Klienten
        let wochenStd = 0;
        let hatKontingent = false;
        const hinweise: string[] = [];
        let quotaZahl = 0;

        for (const m of aktiveMassnahmen) {
            // Gelöschte Kontingente ausfiltern (deletedAt seit Support-Fix 13.07.2026).
            // Verifiziert an Meier, Laura: 84,5 h/Wo (mit Gelöschten) vs. 31,6 korrekt.
            for (const q of m.quotas ?? []) {
                if (!q) continue;
                diagQuotasGesamt++;
                if (Object.prototype.hasOwnProperty.call(q, 'deletedAt')) diagFeldGeliefert++;
                if (kDate(q.deletedAt)) diagGefiltert++;
            }
            const quotas = (m.quotas ?? []).filter(
                (q): q is Quota => !!q && !kDate(q.deletedAt),
            );
            quotaZahl += quotas.length;
            for (const q of quotas) {
                for (const a of (q.approvals ?? []).filter(
                    (a): a is Approval => !!a && isActive(a.validFrom, a.validUntil, heute),
                )) {
                    const std = kHours(a.hours);
                    const von = kDate(a.validFrom);
                    const bis = kDate(a.validUntil);
                    switch (q.timeBase) {
                        case 'week':
                            wochenStd += std;
                            hatKontingent = true;
                            break;
                        case 'month_current':
                            wochenStd += (std * 12) / 52;
                            hatKontingent = true;
                            break;
                        case 'pool':
                            if (von && bis && bis > von) {
                                const wochen = (bis.getTime() - von.getTime()) / (7 * 24 * 3600 * 1000);
                                wochenStd += std / wochen;
                                hatKontingent = true;
                            } else {
                                hinweise.push('Pool ohne Zeitraum');
                            }
                            break;
                        case 'quantity':
                            hatKontingent = true; // Mengen zaehlen nicht in Stunden
                            break;
                        default:
                            hinweise.push('timeBase unbekannt');
                    }
                }
            }
        }

        if (quotaZahl > 1) hinweise.push('mehrere Kontingente (evtl. Altlasten!)');
        if (istBezug) hinweise.unshift('Nordstern-Bezugsklient (4h, zaehlt nicht in Summe)');

        for (const [n, b] of beteiligte) {
            const quote = quoten.get(n)!;
            detail.push({
                betreuer: n,
                rolle: b.rolle,
                klient: recName,
                anteilProz: Math.round(quote * 100),
                wochenStd: hatKontingent ? rund(wochenStd * quote) : null,
                bezugsklient: istBezug,
                hinweis: hatKontingent
                    ? hinweise.join('; ')
                    : ['kein aktuelles Kontingent', ...hinweise].join('; '),
            });
        }
    }

    // Fallback fuer Bezugsklienten ohne Kilanka-Treffer
    const bezugFehlend: string[] = [];
    for (const [nachname, betreuer] of Object.entries(BEZUGS_FALLBACK)) {
        const gefunden = bezugGefunden.some((g) => g === nachname || g.startsWith(`${nachname},`));
        if (!gefunden) {
            bezugGefunden.push(`${nachname} (Fallback -> ${betreuer})`);
        }
    }
    for (const n of BEZUGSKLIENTEN) {
        if (!bezugGefunden.some((g) => g.startsWith(n))) bezugFehlend.push(n);
    }

    // Summen je Betreuer
    const schichtProKopf = SCHICHT_GESAMT / NORDSTERN_TEAM.length;

    const gruppen = new Map<string, DetailZeile[]>();
    for (const z of detail) {
        if (!gruppen.has(z.betreuer)) gruppen.set(z.betreuer, []);
        gruppen.get(z.betreuer)!.push(z);
    }

    const summen: SummenZeile[] = [...gruppen.entries()].map(([name, zeilen]) => {
        const ambulant = zeilen.filter((z) => !z.bezugsklient);
        const summe = rund(ambulant.reduce((s, z) => s + (z.wochenStd ?? 0), 0));
        const vertrag = sollStd.get(name) ?? null;

        // NUR Schichtdienst-Komponente (Ruf/Bezug/Leads bewusst nicht angerechnet)
        const imTeam = NORDSTERN_TEAM.includes(name);
        const nordstern = imTeam ? schichtProKopf : 0;
        const sollAmbulant = vertrag != null ? vertrag - nordstern : null;

        return {
            betreuer: name,
            klienten: ambulant.length,
            alsHaupt: ambulant.filter((z) => z.rolle === 'Hauptbetreuer').length,
            alsMit: ambulant.filter((z) => z.rolle === 'Mitbetreuer').length,
            summeWochenStd: summe,
            sollStd: vertrag != null ? rund(vertrag) : null,
            nordsternStd: rund(nordstern),
            sollAmbulant: sollAmbulant != null ? rund(sollAmbulant) : null,
            differenz: sollAmbulant != null ? rund(summe - sollAmbulant) : null,
            ueberschrProz:
                sollAmbulant != null && sollAmbulant > 0
                    ? Math.round(((summe - sollAmbulant) / sollAmbulant) * 100)
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
        detail: detail.sort((a, b) => a.betreuer.localeCompare(b.betreuer) || a.klient.localeCompare(b.klient)),
        summen,
        ohneKontingent: detail.filter((z) => z.hinweis.startsWith('kein aktuelles Kontingent')).length,
        diagnose: {
            quotasGesamt: diagQuotasGesamt,
            deletedAtGeliefert: diagFeldGeliefert,
            geloeschtGefiltert: diagGefiltert,
        },
        mehrereKontingente: detail.filter((z) => z.hinweis.includes('mehrere Kontingente')).length,
        bezugGefunden,
        bezugFehlend,
    };
}

// Interner Kilanka-RPC (UNDOKUMENTIERT — siehe README).
//
// Warum: Die oeffentliche API v2 liefert geloeschte Kontingente ohne
// Kennzeichnung und keine geleisteten Stunden. Der RPC
// `client.Client.getActionStatus` liefert dagegen exakt die Werte der
// Kilanka-Klientenuebersicht: bereinigte Kontingente, von Kilanka
// berechnete Wochenstunden (approved/performed) und die Verteilung
// auf die zustaendigen Mitarbeiter.
//
// Auth: Session-Cookie des angemeldeten Nutzers (same-origin).
// Funktioniert daher NUR im veroeffentlichten Applet, nicht im
// Dev-Modus (dort greift der v2-Fallback).
//
// Risiko: Format kann sich ohne Ankuendigung aendern. Deshalb prueft
// `rpcVerfuegbar()` vor Gebrauch, und die App faellt bei Fehlern auf
// die v2-Berechnung zurueck.

const RPC_URL = '/be/api/v2/rpc';

// Rollen-Mapping (empirisch ermittelt 07/2026)
export const KIND_HAUPT = 'main';
export const KIND_MIT = 'aux';
export const KIND_VERTRETUNG = 'sub';

export interface RpcQuota {
    id: string;
    name: string;
    timeBase: string;
    validFrom: string | null;
    validUntil: string | null;
    approvedWeek: number;
    approvedMonth: number;
    approvedTotal: number;
    performedWeek: number;
    performedMonth: number;
    performedTotal: number;
}

export interface RpcAttendant {
    id: string;
    kind: string; // main | aux | sub
    user: string; // "Nachname, Vorname"
    validFrom: string | null;
    validUntil: string | null;
    weeklyHours: number;
}

export interface RpcAction {
    id: string;
    name: string;
    validFrom?: { $date: string } | null;
    validUntil?: { $date: string } | null;
    quotas: RpcQuota[];
    attendants: RpcAttendant[];
}

async function rpc<T>(method: string, args: object): Promise<T> {
    const res = await fetch(RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ method, args }),
    });
    if (!res.ok) {
        const detail = await res.text();
        throw new Error(`RPC ${method}: HTTP ${res.status} — ${detail.slice(0, 120)}`);
    }
    return (await res.json()) as T;
}

/** Prueft, ob der RPC in dieser Umgebung nutzbar ist (Session vorhanden). */
export async function rpcVerfuegbar(): Promise<boolean> {
    try {
        await rpc<unknown[]>('client.Client.find', { id: 1, $limit: 1 });
        return true;
    } catch {
        return false;
    }
}

export interface RpcClient {
    id: string;
    recName: string;
    deletedAt: unknown;
}

export async function rpcClients(): Promise<RpcClient[]> {
    const alle = await rpc<RpcClient[]>('client.Client.find', {
        id: 1,
        recName: 1,
        deletedAt: 1,
        $limit: 1000,
    });
    return alle.filter((k) => !k.deletedAt && !k.recName?.startsWith('[archiviert]'));
}

/** Kontingent- und Betreuer-Status eines Klienten (wie in der Kilanka-Uebersicht). */
export async function rpcActionStatus(clientId: string): Promise<RpcAction[]> {
    return rpc<RpcAction[]>('client.Client.getActionStatus', { clientId });
}

/**
 * Laedt den Status vieler Klienten mit begrenzter Parallelitaet.
 * onProgress meldet den Fortschritt fuer die Ladeanzeige.
 */
export async function rpcActionStatusAlle(
    clients: RpcClient[],
    onProgress?: (fertig: number, gesamt: number) => void,
    parallel = 4,
): Promise<Map<string, RpcAction[]>> {
    const ergebnis = new Map<string, RpcAction[]>();
    let index = 0;
    let fertig = 0;

    async function worker() {
        while (index < clients.length) {
            const i = index++;
            const k = clients[i];
            try {
                ergebnis.set(k.id, await rpcActionStatus(k.id));
            } catch {
                ergebnis.set(k.id, []); // einzelner Ausfall kippt nicht die ganze Auswertung
            }
            onProgress?.(++fertig, clients.length);
        }
    }

    await Promise.all(Array.from({ length: parallel }, worker));
    return ergebnis;
}

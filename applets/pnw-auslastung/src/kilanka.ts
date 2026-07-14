// Kilanka API v2: Datentypen entpacken.
//
// WICHTIG: Datenabruf laeuft ausschliesslich ueber das SDK (src/sdk.ts,
// via `pnpm sdk:get` erzeugt). Ein eigenes fetch() funktioniert im
// veroeffentlichten Applet NICHT: Applets laufen sandboxed auf eigener
// Origin, die CSP blockiert Verbindungen zur Kilanka-Instanz. Das SDK
// leitet Anfragen stattdessen per postMessage an die Host-Anwendung
// weiter (und faellt im Dev-Modus auf den Vite-Proxy zurueck).
// Erkenntnisse aus der API-Erkundung 07/2026 (docs/kilanka-api.md im pnw-app-Repo):
//  - Datum kommt als { "$date": "..." }, Dezimal als { "$decimal": "..." },
//    Stunden als ISO-8601-Intervall { "$interval": "PT117H" }
//  - Pagination via $limit (max. 1000) im Body
//  - Rate Limit 10 Anfragen / 5 s; gelegentliche 502 -> ein Retry

export type KDate = { $date: string } | string | null | undefined;
export type KNumber =
    | { $interval: string }
    | { $duration: string }
    | { $decimal: string }
    | number
    | string
    | null
    | undefined;

export function kDate(w: KDate): Date | null {
    if (!w) return null;
    if (typeof w === 'string') return w ? new Date(w) : null;
    if (typeof w === 'object' && '$date' in w && w.$date) return new Date(w.$date);
    // Löschzeitpunkte u. Ä. kommen als $datetime (Sondertyp lt. API-Doku)
    if (typeof w === 'object' && '$datetime' in w && (w as { $datetime?: string }).$datetime)
        return new Date((w as { $datetime: string }).$datetime);
    return null;
}

const ISO_INTERVAL =
    /^P(?:(\d+(?:\.\d+)?)Y)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/;

export function kHours(w: KNumber): number {
    if (w == null) return 0;
    if (typeof w === 'number') return w;
    if (typeof w === 'string') return parseFloat(w) || 0;
    if ('$decimal' in w) return parseFloat(w.$decimal) || 0;
    // Die API liefert Stunden als $interval, das SDK typisiert sie als
    // $duration — beide Schreibweisen unterstuetzen.
    const iso = '$interval' in w ? w.$interval : '$duration' in w ? w.$duration : null;
    if (iso) {
        const m = ISO_INTERVAL.exec(iso);
        if (!m) return 0;
        const [, , , d, h, min, s] = m.map((x) => (x ? parseFloat(x) : 0)) as number[];
        return (d || 0) * 24 + (h || 0) + (min || 0) / 60 + (s || 0) / 3600;
    }
    return 0;
}

export function isActive(von: KDate, bis: KDate, heute: Date): boolean {
    const v = kDate(von);
    const b = kDate(bis);
    return (!v || v <= heute) && (!b || b >= heute);
}

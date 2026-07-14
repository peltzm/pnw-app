import { useEffect, useState } from 'react';
import { sdk } from './sdk';
import {
    berechneAuslastung,
    NORDSTERN_TEAM,
    SCHICHT_GESAMT,
    type ApiClient,
    type ApiUser,
    type Auswertung,
} from './auslastung';
import styles from './App.module.css';

const CLIENT_GRAPH = {
    $limit: 1000,
    id: 1,
    recName: 1,
    deletedAt: 1,
    actions: {
        deletedAt: 1,
        validFrom: 1,
        validUntil: 1,
        attendants: {
            user: { recName: 1 },
            amount: 1,
            validFrom: 1,
            validUntil: 1,
            attendantKind: { name: 1 },
        },
        // quotas.deletedAt seit Support-Fix vom 13.07.2026 verfügbar —
        // gelöschte Kontingente werden in der Auswertung ausgefiltert.
        quotas: {
            name: 1,
            timeBase: 1,
            deletedAt: 1,
            approvals: { hours: 1, quantity: 1, validFrom: 1, validUntil: 1 },
        },
    },
} as const;

const USER_GRAPH = {
    $limit: 1000,
    id: 1,
    name: 1,
    firstName: 1,
    deletedAt: 1,
    weeklyHours: 1,
    targetHours: { validFrom: 1, validUntil: 1, weeklyHours: 1, monthlyHours: 1 },
} as const;

const fmt = (x: number | null) =>
    x == null ? '—' : x.toLocaleString('de-DE', { maximumFractionDigits: 1 });

export function App() {
    const [auswertung, setAuswertung] = useState<Auswertung | null>(null);
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [error, setError] = useState<string | null>(null);
    const [zeigeDetail, setZeigeDetail] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const clientsRes = await sdk.getClients(CLIENT_GRAPH);
                await new Promise((r) => setTimeout(r, 600)); // Rate Limit: 10 Anfragen / 5 s
                const usersRes = await sdk.getUsers(USER_GRAPH);
                if (cancelled) return;
                setAuswertung(
                    berechneAuslastung(
                        clientsRes.data as unknown as ApiClient[],
                        usersRes.data as unknown as ApiUser[],
                        new Date(),
                    ),
                );
                setStatus('ready');
            } catch (err) {
                if (cancelled) return;
                setError(err instanceof Error ? err.message : String(err));
                setStatus('error');
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <main className={styles.app}>
            <h1 className={styles.title}>Team-Auslastung</h1>
            <p className={styles.subtitle}>
                Bewilligte Kontingent-Wochenstunden je Betreuer (Haupt- und Mitbetreuer anteilig,
                Vertretungen ausgenommen) gegen die ambulanten Sollstunden. Kontingente sind Budgets,
                keine geleisteten Stunden — eine Überschreitung ist wegen Ausfallterminen gewollt.
            </p>

            {status === 'loading' && <p className={styles.muted}>Lade Daten aus Kilanka…</p>}
            {status === 'error' && <p className={styles.error}>Fehler: {error}</p>}

            {status === 'ready' && auswertung && (
                <>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Betreuer</th>
                                <th className={styles.num}>Klienten</th>
                                <th className={styles.num}>Haupt/Mit</th>
                                <th className={styles.num}>Kontingent h/Wo</th>
                                <th className={styles.num}>Nordstern</th>
                                <th className={styles.num}>Wochenstunden</th>
                                <th className={styles.num}>Soll ambulant</th>
                                <th className={styles.num}>Differenz</th>
                                <th className={styles.num}>Überschr. %</th>
                                <th>Hinweis</th>
                            </tr>
                        </thead>
                        <tbody>
                            {auswertung.summen.map((s) => (
                                <tr key={s.betreuer}>
                                    <td>{s.betreuer}</td>
                                    <td className={styles.num}>{s.klienten}</td>
                                    <td className={styles.num}>
                                        {s.alsHaupt}/{s.alsMit}
                                    </td>
                                    <td className={styles.num}>{fmt(s.summeWochenStd)}</td>
                                    <td className={styles.num}>
                                        {s.nordsternStd > 0 ? fmt(s.nordsternStd) : ''}
                                    </td>
                                    <td className={styles.num}>{fmt(s.sollStd)}</td>
                                    <td className={styles.num}>{fmt(s.sollAmbulant)}</td>
                                    <td className={styles.num}>{fmt(s.differenz)}</td>
                                    <td
                                        className={`${styles.num} ${
                                            s.ueberschrProz != null && s.ueberschrProz < 0
                                                ? styles.negativ
                                                : s.ueberschrProz != null && s.ueberschrProz > 100
                                                  ? styles.extrem
                                                  : ''
                                        }`}
                                    >
                                        {s.ueberschrProz != null
                                            ? `${s.ueberschrProz > 0 ? '+' : ''}${s.ueberschrProz} %`
                                            : '—'}
                                    </td>
                                    <td className={styles.hinweis}>{s.hinweis}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <p className={styles.pflegestand}>
                        v1.0.3 · deletedAt belegt: {auswertung.diagnose.deletedAtGeliefert}/
                        {auswertung.diagnose.quotasGesamt} · gelöschte Kontingente ausgefiltert:{' '}
                        {auswertung.diagnose.geloeschtGefiltert}
                        <br />
                        Zuordnungen: {auswertung.detail.length} · ohne gepflegtes Kontingent:{' '}
                        {auswertung.ohneKontingent} · mehrere Kontingente (Verdacht Altlasten):{' '}
                        {auswertung.mehrereKontingente}
                        <br />
                        Nordstern-Anrechnung: Schichtdienst {SCHICHT_GESAMT.toLocaleString('de-DE')} h auf{' '}
                        {NORDSTERN_TEAM.length} Köpfe ={' '}
                        {(SCHICHT_GESAMT / NORDSTERN_TEAM.length).toLocaleString('de-DE', {
                            maximumFractionDigits: 1,
                        })}{' '}
                        h/Kopf
                    </p>

                    <button className={styles.toggle} onClick={() => setZeigeDetail((z) => !z)}>
                        {zeigeDetail ? 'Detailliste ausblenden' : 'Detailliste je Klient anzeigen'}
                    </button>

                    {zeigeDetail && (
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Betreuer</th>
                                    <th>Rolle</th>
                                    <th>Klient</th>
                                    <th className={styles.num}>Anteil %</th>
                                    <th className={styles.num}>h/Wo</th>
                                    <th>Hinweis</th>
                                </tr>
                            </thead>
                            <tbody>
                                {auswertung.detail.map((z, i) => (
                                    <tr key={i}>
                                        <td>{z.betreuer}</td>
                                        <td>{z.rolle}</td>
                                        <td>{z.klient}</td>
                                        <td className={styles.num}>{z.anteilProz}</td>
                                        <td className={styles.num}>{fmt(z.wochenStd)}</td>
                                        <td className={styles.hinweis}>{z.hinweis}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </>
            )}
        </main>
    );
}

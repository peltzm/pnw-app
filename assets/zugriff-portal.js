/* ═══════════════════════════════════════════════════════════════
 * PNW Zugriffssteuerung — Portal-Teil (apps.html, beta-apps.html)
 *
 * Kacheln mit data-gruppe="PNW-App-<Name>" werden nur angezeigt, wenn der
 * Aufrufer (transitiv) Mitglied dieser Entra-Gruppe ist. Die Prüfung macht der
 * Worker (/api/zugriff) über das Graph-Token des Nutzers; das Portal blendet
 * nur ein/aus. Maßgeblich ist die serverseitige Prüfung im Worker — das
 * Ausblenden hier ist Komfort.
 *
 * Modus kommt vom Worker (ZUGRIFF_MODUS):
 *   "test"   → alle Kacheln bleiben sichtbar; betroffene Kacheln bekommen den
 *              Hinweis "würde ausgeblendet", GF sieht zusätzlich den Testbericht
 *   "scharf" → Kacheln ohne Zugriff werden ausgeblendet (GF nie)
 * Fällt die Prüfung aus (Worker/Graph nicht erreichbar), bleibt ALLES sichtbar.
 * ═══════════════════════════════════════════════════════════════ */
(function () {
  const WORKER = 'https://pnw-kilanka-proxy.markus-3c8.workers.dev';
  const kurz = (g) => String(g).replace(/^PNW-App-/, '');

  const css = document.createElement('style');
  css.textContent =
    'body.zg-pending .app-card[data-gruppe]{visibility:hidden}' +
    '.zg-pill{position:absolute;left:6px;top:6px;font-size:9px;font-weight:600;color:#9b1c1c;background:#fef2f2;' +
    'border:1px solid #fecaca;border-radius:4px;padding:1px 5px;line-height:1.3;pointer-events:none}' +
    '.app-card.zg-test{position:relative}' +
    '#zgBox{max-width:800px;margin:0 auto;padding:0 20px}' +
    '.zg-info{background:#fff8e6;border:1px solid #f0d58a;border-radius:12px;padding:10px 14px;font-size:12px;color:#7a5b00;line-height:1.5;margin-bottom:10px}' +
    '.zg-info button{font-family:inherit;font-size:11px;margin-left:6px;border:1px solid #f0d58a;background:#fff;color:#7a5b00;border-radius:4px;padding:2px 8px;cursor:pointer}' +
    '.zg-tab{width:100%;border-collapse:collapse;margin-top:8px;font-size:11px;background:#fff}' +
    '.zg-tab th,.zg-tab td{border:1px solid #e2dfd8;padding:4px 6px;text-align:left;vertical-align:top}' +
    '.zg-tab th{background:#f7f6f2}';
  document.head.appendChild(css);

  async function tokens(msalInstance, account, scopes) {
    const req = { scopes, account };
    const r = await msalInstance.acquireTokenSilent(req);
    return { id: r.idToken, graph: r.accessToken };
  }

  async function worker(msalInstance, account, scopes, pfad) {
    const t = await tokens(msalInstance, account, scopes);
    const res = await fetch(WORKER + pfad, { headers: { Authorization: 'Bearer ' + t.id, 'X-Graph-Token': t.graph } })
      .catch(() => { throw new Error('Worker nicht erreichbar oder CORS-Fehler'); });
    const d = await res.json().catch(() => null);
    if (!res.ok) throw new Error((d && d.error) || 'HTTP ' + res.status);
    return d;
  }

  function el(tag, text, attrs) {
    const e = document.createElement(tag);
    if (text != null) e.textContent = text;
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  async function zeigeBericht(ctx, ziel, knopf) {
    knopf.disabled = true;
    ziel.textContent = 'Lade Testbericht …';
    try {
      const d = await worker(ctx.msalInstance, ctx.account, ctx.scopes, '/api/zugriff/bericht');
      ziel.textContent = '';
      ziel.appendChild(el('div', d.anzahl + ' Konten haben das Portal seit Beginn des Testmodus geöffnet. ' +
        'Wer es noch nicht geöffnet hat, steht hier nicht — die vollständige Matrix liefert das Skript scripts/zugriffsmatrix-pnw-apps.ps1.'));
      const tab = el('table', null, { class: 'zg-tab' });
      const kopf = el('tr');
      ['Konto', 'Zugriff', 'Würde ausgeblendet', 'Stand'].forEach((h) => kopf.appendChild(el('th', h)));
      tab.appendChild(kopf);
      for (const e of d.eintraege) {
        const ja = Object.keys(e.apps || {}).filter((g) => e.apps[g]).length;
        const nein = Object.keys(e.apps || {}).filter((g) => !e.apps[g]).map(kurz);
        const tr = el('tr');
        tr.appendChild(el('td', (e.name || e.upn) + (e.gf ? ' (GF)' : '')));
        tr.appendChild(el('td', ja + ' von ' + Object.keys(e.apps || {}).length));
        tr.appendChild(el('td', nein.length ? nein.join(', ') : '—'));
        tr.appendChild(el('td', (e.am || '').slice(0, 16).replace('T', ' ')));
        tab.appendChild(tr);
      }
      ziel.appendChild(tab);
    } catch (e) {
      ziel.textContent = 'Testbericht nicht ladbar: ' + e.message;
    }
    knopf.disabled = false;
  }

  async function start(ctx) {
    const karten = [...document.querySelectorAll('.app-card[data-gruppe]')];
    if (!karten.length) return;
    const gruppen = [...new Set(karten.map((k) => k.dataset.gruppe))];
    document.body.classList.add('zg-pending');
    const sicherung = setTimeout(() => document.body.classList.remove('zg-pending'), 8000);
    try {
      const d = await worker(ctx.msalInstance, ctx.account, ctx.scopes, '/api/zugriff?apps=' + encodeURIComponent(gruppen.join(',')));
      if (d.fehler) throw new Error(d.fehler); // Prüfung nicht möglich → alles zeigen
      const ohne = karten.filter((k) => d.apps[k.dataset.gruppe] === false);
      if (d.modus === 'scharf') {
        ohne.forEach((k) => { k.style.display = 'none'; });
      } else {
        ohne.forEach((k) => { k.classList.add('zg-test'); k.appendChild(el('span', 'würde ausgeblendet', { class: 'zg-pill' })); });
        const box = document.getElementById('zgBox');
        if (box) {
          const info = el('div', null, { class: 'zg-info' });
          info.appendChild(el('span', '🧪 Testmodus Zugriffssteuerung: noch nichts gesperrt. ' +
            (d.gf ? 'Als Geschäftsführung wirst du nie ausgeblendet.' : ohne.length + ' von ' + karten.length + ' Kacheln würden dir ausgeblendet.')));
          if (d.gf) {
            const knopf = el('button', 'Testbericht anzeigen');
            const ziel = el('div');
            knopf.onclick = () => zeigeBericht(ctx, ziel, knopf);
            info.appendChild(knopf);
            info.appendChild(ziel);
          }
          box.appendChild(info);
        }
      }
    } catch (e) {
      console.warn('Zugriffsprüfung nicht möglich, alle Kacheln bleiben sichtbar:', e.message);
      // Sichtbarer Hinweis, damit ein stiller Ausfall nicht als "alles in Ordnung" durchgeht
      const box = document.getElementById('zgBox');
      if (box) {
        const info = el('div', null, { class: 'zg-info' });
        info.appendChild(el('span', '⚠️ Zugriffsprüfung nicht erreichbar (' + e.message + ') — alle Kacheln bleiben sichtbar, es wird nichts gesperrt.'));
        box.appendChild(info);
      }
    } finally {
      clearTimeout(sicherung);
      document.body.classList.remove('zg-pending');
    }
  }

  window.PNW_ZUGRIFF = { start };
})();

/* ═══════════════════════════════════════════════════════════════
 * Onboarding-App · Bereich „Neue Mitarbeiter" (nur Geschäftsführung)
 * Prozess: Anlegen → Vertragspaket (PDF) → Mailentwurf mit Anlagen → Vertrag zurück → Übernahme in die Einarbeitung
 * Abhängigkeiten (aus einarbeitung-beta.html): CFG, token(), graph(), graphAlle(), ladeListe(), schreibeItem(), legeListeAn(),
 *   esc(), fmtDatum(), zeigeToast(), render(), byId(), demoMode, mitarbeiterListe, currentAccount; pdfMake; NM_PDF
 * Vertragstext und Richtlinien liegen NICHT im Repo, sondern in SharePoint (Ordner „Einarbeitung-Vorlagen").
 * ═══════════════════════════════════════════════════════════════ */
const NM = (function () {
  const LIST = 'PNW-Einarbeitung-Personal';
  const ORDNER = 'Einarbeitung-Vorlagen';
  const VORLAGEN = [
    { key: 'vertrag', datei: 'arbeitsvertrag.json', titel: 'Arbeitsvertrag (Vorlage)', accept: '.json,application/json' },
    { key: 'fz', datei: 'fuehrungszeugnis.json', titel: 'Antrag erweitertes Führungszeugnis (Vorlage)', accept: '.json,application/json' },
    { key: 'pf', datei: 'Personalfragebogen_DATEV.docx', titel: 'Personalfragebogen (DATEV-Standarddokument)', accept: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    { key: 'vt', datei: 'verfassungstreue.json', titel: 'Verpflichtung Verfassungstreue (Vorlage, Seiten 1–2)', accept: '.json,application/json' },
    { key: 'vta', datei: 'Verfassungstreue_Verzeichnis_Belehrung.pdf', titel: 'Verfassungstreue: Verzeichnis und Belehrung (amtlich, 5 Seiten, wird angehängt)', accept: '.pdf,application/pdf', angehaengt: true },
    { key: 'ds', datei: 'PNW_Datenschutzerklaerung_Mitarbeiter.pdf', titel: 'Datenschutzerklärung Mitarbeiter', accept: '.pdf,application/pdf' },
    { key: 'sig', datei: 'Unterschrift_Sonja.png', titel: 'Unterschrift Geschäftsführung (Sonja Peltz, PNG mit transparentem Hintergrund)', accept: '.png,image/png' },
    { key: 'az', datei: 'PNW_Arbeitszeitrichtlinie.pdf', titel: 'Arbeitszeitrichtlinie', accept: '.pdf,application/pdf' },
    { key: 'fb', datei: 'PNW_Unternehmensrichtlinie_Fortbildung.pdf', titel: 'Unternehmensrichtlinie Fortbildung', accept: '.pdf,application/pdf' },
    { key: 'dr', datei: 'PNW_Unternehmensrichtlinie_Dienstreisen.pdf', titel: 'Unternehmensrichtlinie Dienstreisen', accept: '.pdf,application/pdf' },
  ];
  const SCHEMA = [
    { sp: 'Title', key: 'name', typ: 'text' },
    { sp: 'Vorname', key: 'vorname', typ: 'text' },
    { sp: 'Nachname', key: 'nachname', typ: 'text' },
    { sp: 'Strasse', key: 'strasse', typ: 'text' },
    { sp: 'PlzOrt', key: 'plzOrt', typ: 'text' },
    { sp: 'Geburtsdatum', key: 'geburtsdatum', typ: 'datum' },
    { sp: 'Privatmail', key: 'privatmail', typ: 'text' },
    { sp: 'Beruf', key: 'beruf', typ: 'text' },
    { sp: 'Eintritt', key: 'eintritt', typ: 'datum' },
    { sp: 'Stunden', key: 'stunden', typ: 'zahl' },
    { sp: 'Entgeltgruppe', key: 'eg', typ: 'text' },
    { sp: 'Stufe', key: 'stufe', typ: 'zahl' },
    { sp: 'StufeSeit', key: 'stufeSeit', typ: 'datum' },
    { sp: 'GehaltManuell', key: 'manuell', typ: 'bool' },
    { sp: 'Grundgehalt', key: 'grundgehalt', typ: 'zahl' },
    { sp: 'SuEZulage', key: 'sue', typ: 'zahl' },
    { sp: 'Vertragsort', key: 'vertragsort', typ: 'text' },
    { sp: 'Vertragsdatum', key: 'vertragsdatum', typ: 'datum' },
    { sp: 'Status', key: 'status', typ: 'text' },
    { sp: 'MitarbeiterId', key: 'mitarbeiterId', typ: 'text' },
    { sp: 'UPN', key: 'upn', typ: 'text' },
  ];
  const DOCX_TYP = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const STATUS = [
    ['entwurf', 'Entwurf'], ['mail_bereit', 'Mailentwurf liegt vor'], ['versendet', 'Vertrag versendet'],
    ['zurueck', 'Vertrag zurück'], ['konto', 'M365-Konto angelegt'], ['plan', 'In Einarbeitung'],
  ];
  const STATUS_LABEL = Object.fromEntries(STATUS);

  /* ── TVöD-SuE 2026, Monatswerte bei 39 Std. (gültig 01.05.2026–31.03.2027). Öffentliche Tarifdaten. ── */
  const TARIF_GUELTIG = '01.05.2026 – 31.03.2027';
  const VOLLZEIT = 39;
  const TABELLE = {
    'S 2': [2908.36, 3030.97, 3121.67, 3220.16, 3330.92, 3441.69], 'S 3': [3119.87, 3320.05, 3506.28, 3677.28, 3755.52, 3848.98],
    'S 4': [3291.46, 3504.21, 3698.06, 3829.61, 3956.37, 4156.33], 'S 7': [3426.93, 3649.60, 3871.14, 4098.95, 4270.11, 4528.02],
    'S 8a': [3509.44, 3738.13, 3976.82, 4207.08, 4432.16, 4668.84], 'S 8b': [3578.87, 3812.64, 4091.94, 4503.48, 4892.59, 5190.90],
    'S 9': [3648.68, 3887.42, 4166.69, 4580.02, 4970.99, 5272.60], 'S 11a': [3846.25, 4106.12, 4291.48, 4766.33, 5138.69, 5362.12],
    'S 11b': [3915.12, 4181.19, 4368.13, 4844.78, 5217.14, 5440.57], 'S 12': [3967.57, 4237.49, 4590.75, 4903.53, 5290.81, 5454.65],
    'S 13': [3978.03, 4248.70, 4617.39, 4915.26, 5287.64, 5473.83], 'S 14': [4073.39, 4351.17, 4682.24, 5019.00, 5391.41, 5652.06],
    'S 15': [4112.68, 4393.93, 4691.87, 5034.44, 5585.57, 5823.86], 'S 16': [4263.29, 4557.82, 4885.49, 5287.64, 5734.48, 6002.61],
    'S 17': [4352.39, 4654.62, 5138.69, 5436.63, 6032.40, 6382.42], 'S 18': [4720.52, 4840.79, 5436.63, 5883.46, 6553.73, 6963.31],
  };
  const SUE_BIS_S9 = 130, SUE_AB_S11A = 180;
  const EG_BIS_S9 = ['S 2', 'S 3', 'S 4', 'S 7', 'S 8a', 'S 8b', 'S 9'];

  // Rechnung in ganzen Cent: Tabellenentgelt / 39 × Wochenstunden, kaufmännisch auf den Cent gerundet
  function gehaltBerechnen(eg, stufe, stunden) {
    const tab = TABELLE[eg] && TABELLE[eg][stufe - 1];
    if (tab == null || !(stunden > 0)) return null;
    const h100 = Math.round(stunden * 100);
    const grundC = Math.round(Math.round(tab * 100) * h100 / (VOLLZEIT * 100));
    const sueC = Math.round((EG_BIS_S9.includes(eg) ? SUE_BIS_S9 : SUE_AB_S11A) * 100 * h100 / (VOLLZEIT * 100));
    return { grund: grundC / 100, sue: sueC / 100 };
  }
  function eur(x) { return Number(x).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\u00a0/g, ' ') + ' €'; }
  function zahlDe(x) { return String(x).replace('.', ','); }
  // Eingaben formatbewusst lesen: Komma → deutsch, sonst Punkt-Dezimal (kein blindes Entfernen von Punkten)
  function parseZahl(s) {
    s = String(s == null ? '' : s).trim().replace(/\s|€/g, '');
    if (!s) return NaN;
    if (s.indexOf(',') >= 0) return parseFloat(s.replace(/\./g, '').replace(',', '.'));
    return parseFloat(s);
  }
  function langDatum(iso) { const d = new Date(iso + 'T00:00:00'); return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }); }
  function kurzDatum(iso) { const d = new Date(iso + 'T00:00:00'); return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }); }

  /* ── Zustand ── */
  let liste = [], vorhanden = null, geladen = false, vorlagenStatus = {}, status = '', arbeitet = '';
  let assetsCache = null, paket = null;

  const heute = () => new Date().toISOString().slice(0, 10);
  const byId2 = id => document.getElementById(id);
  const eintrag = id => liste.find(x => x.id === id) || null;

  async function laden() {
    if (demoMode) { vorhanden = false; geladen = true; return; }
    try {
      const l = await ladeListe(LIST, SCHEMA);
      vorhanden = l !== null; liste = l || [];
      await ladeVorlagenStatus();
    } catch (e) { status = 'Laden fehlgeschlagen: ' + e.message; }
    geladen = true;
    if (typeof gfTab !== 'undefined' && (gfTab === 'neue' || gfTab === 'vorlagen')) render();
  }
  async function ladeVorlagenStatus() {
    vorlagenStatus = {};
    const kinder = await graphAlle('/sites/' + CFG.spHost + '/drive/root:/' + encodeURIComponent(ORDNER) + ':/children?$select=name,id,size,lastModifiedDateTime');
    VORLAGEN.forEach(v => { const k = kinder.find(x => x.name === v.datei); vorlagenStatus[v.key] = k ? { id: k.id, size: k.size, geaendert: k.lastModifiedDateTime } : null; });
  }
  async function vorlageHolen(datei, alsText) {
    const t = await token();
    const r = await fetch('https://graph.microsoft.com/v1.0/sites/' + CFG.spHost + '/drive/root:/' + encodeURIComponent(ORDNER) + '/' + encodeURIComponent(datei) + ':/content', { headers: { Authorization: 'Bearer ' + t } });
    if (!r.ok) throw new Error('Vorlage „' + datei + '“ nicht lesbar (' + r.status + ')');
    return alsText ? r.text() : r.arrayBuffer();
  }
  function bufZuB64(buf) {
    let bin = ''; const b = new Uint8Array(buf); const c = 0x8000;
    for (let i = 0; i < b.length; i += c) bin += String.fromCharCode.apply(null, b.subarray(i, i + c));
    return btoa(bin);
  }

  /* ── Ansicht ── */
  function badge(s) {
    const farbe = s === 'zurueck' || s === 'konto' || s === 'plan' ? 'var(--success, #2D6A4F)' : 'var(--accent)';
    return '<span style="display:inline-block;padding:2px 9px;border-radius:12px;font-size:11px;border:1px solid ' + farbe + ';color:' + farbe + '">' + esc(STATUS_LABEL[s] || s || '–') + '</span>';
  }
  function aktionen(x) {
    const b = (act, text, solid) => '<button class="btn btn-sm ' + (solid ? 'btn-solid' : 'btn-outline') + '" data-nm="' + act + ':' + x.id + '">' + text + '</button>';
    const out = [];
    if (x.status === 'plan') {
      return '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><span class="ea-item-desc">in der Einarbeitung</span>' + (x.mitarbeiterId && hatEigenenPlan(x.mitarbeiterId) ? b('planoeffnen', 'Plan und Freigabe', true) : b('plan', 'Einarbeitungsplan erzeugen', true)) + b('edit', 'Bearbeiten') + b('reset', 'Zurücksetzen') +
        '<button class="btn btn-sm btn-outline" style="color:var(--error);border-color:var(--error)" data-nm="del:' + x.id + '">Löschen</button></div>';
    }
    out.push(b('paket', x.status === 'entwurf' || !x.status ? 'Vertragspaket erzeugen' : 'Vertragspaket neu', x.status === 'entwurf' || !x.status));
    if (x.status === 'mail_bereit') out.push(b('stat-versendet', 'Als versendet markieren', true));
    if (x.status === 'versendet') out.push(b('stat-zurueck', 'Vertrag zurück erhalten', true));
    if (x.status === 'zurueck') out.push(b('konto', 'M365-Konto anlegen', true));
    if (x.status === 'konto') { out.push(b('plan', 'Einarbeitungsplan erzeugen', true)); out.push(b('konto', 'Konto prüfen')); }
    out.push(b('edit', 'Bearbeiten'));
    if (x.status && x.status !== 'entwurf') out.push(b('reset', 'Zurücksetzen'));
    out.push('<button class="btn btn-sm btn-outline" style="color:var(--error);border-color:var(--error)" data-nm="del:' + x.id + '">Löschen</button>');
    return '<div style="display:flex;gap:6px;flex-wrap:wrap">' + out.join('') + '</div>';
  }
  function view() {
    if (demoMode) return '<div class="ea-card"><h3>Neue Mitarbeiter</h3><p class="ea-item-desc" style="margin-top:8px">Dieser Bereich steht nur nach der Anmeldung zur Verfügung.</p></div>';
    if (!geladen) return '<div class="loading-state"><div class="spinner"></div>Daten werden geladen …</div>';
    let h = '';
    if (status) h += '<div class="ea-card" style="border-color:var(--error);color:var(--error);font-size:12.5px">' + esc(status) + '</div>';
    if (vorhanden === false) {
      h += '<div class="ea-card"><h3>Ersteinrichtung</h3><p class="ea-item-desc" style="margin:8px 0">Die SharePoint-Liste <code>' + LIST + '</code> fehlt noch. Sie enthält Personaldaten (Anschrift, Geburtsdatum, Gehalt).</p>' +
        '<button class="btn btn-solid btn-sm" data-nm="setup">Liste jetzt anlegen</button> <span class="ea-item-desc" id="nmSetupStatus"></span>' +
        '<p class="ea-item-desc" style="margin-top:8px"><b>Wichtig:</b> Danach in SharePoint die Berechtigungen dieser Liste auf Markus und Sonja beschränken (Vererbung aufheben). Die App kann das nicht selbst.</p></div>';
      return h;
    }
    h += '<div class="ea-card"><div class="ea-card-head"><div><h3>Neue Mitarbeiter</h3><p class="ea-item-desc" style="margin-top:4px">Vom Vertrag bis zur Übernahme in die Einarbeitung.</p></div>' +
      '<button class="btn btn-solid btn-sm" data-nm="neu">+ Neue Mitarbeiterin / neuer Mitarbeiter</button></div>';
    if (!liste.length) h += '<p class="ea-item-desc" style="margin-top:10px">Noch niemand angelegt.</p>';
    else {
      h += '<table class="ea-tbl" style="margin-top:12px"><thead><tr><th>Name</th><th>Eintritt</th><th>Std.</th><th>Vergütung</th><th>Status</th><th></th></tr></thead><tbody>';
      liste.slice().sort((a, b) => String(b.eintritt || '').localeCompare(String(a.eintritt || ''))).forEach(x => {
        const verg = x.manuell ? 'manuell' : (x.eg ? x.eg.replace(' ', '') + ' / ' + x.stufe : '–');
        h += '<tr><td><b>' + esc(x.name) + '</b><div class="ea-item-desc">' + esc(x.beruf || '') + '</div>' + (x.upn ? '<div class="ea-item-desc">' + esc(x.upn) + '</div>' : '') + '</td><td>' + fmtDatum(x.eintritt) + '</td><td>' + esc(zahlDe(x.stunden || '')) + '</td><td>' + esc(verg) +
          (x.grundgehalt ? '<div class="ea-item-desc">' + eur(x.grundgehalt) + ' + ' + eur(x.sue || 0) + '</div>' : '') + '</td><td>' + badge(x.status || 'entwurf') + planStatusText(x) + '</td><td>' + aktionen(x) + '</td></tr>';
      });
      h += '</tbody></table>';
    }
    h += '<p class="ea-item-desc" style="margin-top:10px">Mailentwurf mit dem Vertragspaket: wird in deinem Postfach unter „Entwürfe“ gespeichert, nichts wird automatisch versendet. Die Dokumentvorlagen findest du im Menü „Vorlagen“.</p></div>';
    return h;
  }
  function vorlagenView() {
    if (demoMode) return '<div class="ea-card"><h3>Vorlagen</h3><p class="ea-item-desc" style="margin-top:8px">Dieser Bereich steht nur nach der Anmeldung zur Verfügung.</p></div>';
    if (!geladen) return '<div class="loading-state"><div class="spinner"></div>Daten werden geladen …</div>';
    return (status ? '<div class="ea-card" style="border-color:var(--error);color:var(--error);font-size:12.5px">' + esc(status) + '</div>' : '') + vorlagenKarte();
  }
  function vorlagenKarte() {
    let h = '<div class="ea-card"><h3>Vorlagen</h3><p class="ea-item-desc" style="margin:6px 0 10px">Liegen in SharePoint im Ordner „' + ORDNER + '“ und nicht im öffentlichen App-Repository. Eine neue Version einfach hier hochladen (ersetzt die alte).</p>';
    h += '<table class="ea-tbl"><thead><tr><th>Vorlage</th><th>Stand</th><th></th></tr></thead><tbody>';
    VORLAGEN.forEach(v => {
      const s = vorlagenStatus[v.key];
      h += '<tr><td>' + esc(v.titel) + '<div class="ea-item-desc">' + esc(v.datei) + '</div></td><td>' + (s ? '✓ ' + kurzDatum(String(s.geaendert).slice(0, 10)) : '<span style="color:var(--error)">fehlt</span>') +
        '</td><td><label class="btn btn-sm btn-outline" style="cursor:pointer">Hochladen<input type="file" accept="' + v.accept + '" data-nm-upload="' + v.key + '" style="display:none"></label></td></tr>';
    });
    return h + '</tbody></table><p class="ea-item-desc" id="nmUploadStatus" style="margin-top:8px"></p></div>';
  }

  /* ── Ereignisse ── */
  function bind() {
    Array.from(document.querySelectorAll('[data-nm]')).forEach(el => {
      el.onclick = () => {
        const [act, id] = el.getAttribute('data-nm').split(':');
        if (act === 'neu') oeffneDialog(null);
        else if (act === 'edit') oeffneDialog(id);
        else if (act === 'paket') vertragspaket(id);
        else if (act === 'setup') einrichten();
        else if (act === 'stat-versendet') statusSetzen(id, 'versendet');
        else if (act === 'stat-zurueck') statusSetzen(id, 'zurueck');
        else if (act === 'uebernehmen') uebernehmen(id);
        else if (act === 'reset') zuruecksetzen(id);
        else if (act === 'konto') kontoDialog(id);
        else if (act === 'plan') planDialog(id);
        else if (act === 'planoeffnen') { const x = eintrag(id); if (x && x.mitarbeiterId) planOeffnen(x.mitarbeiterId); }
        else if (act === 'del') loeschen(id);
      };
    });
    Array.from(document.querySelectorAll('[data-nm-upload]')).forEach(inp => {
      inp.onchange = () => { if (inp.files && inp.files[0]) vorlageHochladen(inp.getAttribute('data-nm-upload'), inp.files[0]); inp.value = ''; };
    });
  }

  async function einrichten() {
    const st = byId2('nmSetupStatus');
    try { if (st) st.textContent = 'Lege Liste an …'; await legeListeAn(LIST, SCHEMA); status = ''; await laden(); render(); zeigeToast('Liste angelegt – bitte jetzt die Berechtigungen in SharePoint beschränken.'); }
    catch (e) { if (st) st.textContent = 'Fehler: ' + e.message; }
  }
  async function vorlageHochladen(key, file) {
    const v = VORLAGEN.find(x => x.key === key); const st = byId2('nmUploadStatus');
    try {
      if (v.datei.endsWith('.json')) { const j = JSON.parse(await file.text()); if (!Array.isArray(j.blocks)) throw new Error('Keine gültige Vorlage (blocks fehlt).'); }
      else if (file.size > 4 * 1024 * 1024) throw new Error('Datei größer als 4 MB.');
      if (v.datei.endsWith('.png')) { const k = new Uint8Array(await file.slice(0, 4).arrayBuffer()); if (!(k[0] === 0x89 && k[1] === 0x50 && k[2] === 0x4E && k[3] === 0x47)) throw new Error('Das ist keine PNG-Datei.'); if (file.size > 1024 * 1024) throw new Error('Das Bild ist größer als 1 MB – bitte verkleinern (700 px Breite genügen).'); }
      if (v.datei.endsWith('.docx')) { const k = new Uint8Array(await file.slice(0, 2).arrayBuffer()); if (k[0] !== 0x50 || k[1] !== 0x4B) throw new Error('Das ist keine Word-Datei (.docx).'); }
      if (st) st.textContent = 'Lade „' + v.datei + '“ hoch …';
      const t = await token();
      const url = 'https://graph.microsoft.com/v1.0/sites/' + CFG.spHost + '/drive/root:/' + encodeURIComponent(ORDNER) + '/' + encodeURIComponent(v.datei) + ':/content?@microsoft.graph.conflictBehavior=replace';
      const r = await fetch(url, { method: 'PUT', headers: { Authorization: 'Bearer ' + t, 'Content-Type': v.datei.endsWith('.json') ? 'application/json' : (v.datei.endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : (v.datei.endsWith('.png') ? 'image/png' : 'application/pdf')) }, body: file });
      if (!r.ok) throw new Error('Upload fehlgeschlagen (' + r.status + '): ' + await r.text());
      await ladeVorlagenStatus(); zeigeToast('Vorlage gespeichert'); render();
    } catch (e) { if (st) st.textContent = 'Fehler: ' + e.message; else zeigeToast(e.message, true); }
  }

  /* ── Dialog Anlegen/Bearbeiten ── */
  function ensureOverlay() {
    if (byId2('nmOverlay')) return;
    const o = document.createElement('div'); o.className = 'overlay'; o.id = 'nmOverlay';
    o.innerHTML = '<div class="dialog" role="dialog" aria-modal="true" style="max-width:720px"><h2 id="nmTitel"></h2><div id="nmInhalt"></div></div>';
    document.body.appendChild(o);
    o.addEventListener('click', e => { if (e.target === o) schliesse(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && o.classList.contains('open')) schliesse(); });
  }
  function schliesse() { const o = byId2('nmOverlay'); if (o) o.classList.remove('open'); paket = null; }
  function opt(wert, text, sel) { return '<option value="' + esc(wert) + '"' + (sel ? ' selected' : '') + '>' + esc(text) + '</option>'; }

  function oeffneDialog(id) {
    ensureOverlay();
    const x = id ? eintrag(id) : { stunden: 39, stufe: 1, vertragsort: 'Nandlstadt', vertragsdatum: heute(), eg: 'S 12' };
    byId2('nmTitel').textContent = id ? 'Bearbeiten: ' + x.name : 'Neue Mitarbeiterin / neuer Mitarbeiter';
    const f = (idn, label, wert, typ, extra) => '<div class="feld"><label for="' + idn + '">' + label + '</label><input id="' + idn + '" type="' + (typ || 'text') + '" value="' + esc(wert == null ? '' : wert) + '" ' + (extra || '') + '></div>';
    let h = '<div class="felder">' +
      f('nmVorname', 'Vorname', x.vorname) + f('nmNachname', 'Nachname', x.nachname) +
      f('nmStrasse', 'Straße, Hausnummer', x.strasse) + f('nmPlz', 'PLZ, Ort', x.plzOrt) +
      f('nmGeb', 'Geburtsdatum', x.geburtsdatum, 'date') + f('nmMail', 'Private E-Mail (Empfang des Vertrags)', x.privatmail, 'email') +
      '<div class="feld"><label for="nmBeruf">Berufsbezeichnung (im Vertrag § 2)</label><input id="nmBeruf" list="nmBerufListe" value="' + esc(x.beruf || '') + '"><datalist id="nmBerufListe">' +
      ['Sozialpädagogin', 'Sozialpädagoge', 'Psychologin', 'Psychologe', 'psychologische Fachkraft', 'Erzieherin', 'Erzieher', 'Heilerziehungspflegerin', 'Heilerziehungspfleger', 'Fachkraft'].map(v => '<option value="' + v + '">').join('') + '</datalist></div>' +
      f('nmEintritt', 'Eintrittsdatum', x.eintritt, 'date') + f('nmStunden', 'Wochenstunden', x.stunden == null ? '' : zahlDe(x.stunden), 'text', 'inputmode="decimal"') +
      '<div class="feld"><label for="nmEg">Entgeltgruppe (TVöD-SuE)</label><select id="nmEg">' + Object.keys(TABELLE).map(k => opt(k, k, k === x.eg)).join('') + '</select></div>' +
      '<div class="feld"><label for="nmStufe">Stufe</label><select id="nmStufe">' + [1, 2, 3, 4, 5, 6].map(s => opt(String(s), 'Stufe ' + s, Number(x.stufe) === s)).join('') + '</select></div>' +
      f('nmStufeSeit', 'In dieser Stufe seit (optional)', x.stufeSeit, 'date') +
      '<div class="feld feld-voll"><label class="chk"><input type="checkbox" id="nmManuell"' + (x.manuell ? ' checked' : '') + '> Betrag selbst eingeben (statt Tabelle)</label></div>' +
      '<div class="feld" id="nmGrundWrap">' + '<label for="nmGrund">Grundgehalt brutto / Monat</label><input id="nmGrund" inputmode="decimal" value="' + (x.manuell && x.grundgehalt != null ? zahlDe(Number(x.grundgehalt).toFixed(2)) : '') + '"></div>' +
      '<div class="feld" id="nmSueWrap"><label for="nmSue">SuE-Zulage brutto / Monat</label><input id="nmSue" inputmode="decimal" value="' + (x.manuell && x.sue != null ? zahlDe(Number(x.sue).toFixed(2)) : '') + '"></div>' +
      '<div class="feld feld-voll"><div id="nmRechnung" style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:9px 12px;font-size:12.5px"></div>' +
      '<div class="hint">Rechnung: Tabellenentgelt ÷ ' + VOLLZEIT + ' × Wochenstunden (Tabelle gültig ' + TARIF_GUELTIG + '). Sonderzahlung ist nicht Teil der Berechnung.</div></div>' +
      f('nmOrt', 'Vertragsort', x.vertragsort) + f('nmVDatum', 'Vertragsdatum', x.vertragsdatum, 'date') + '</div>' +
      '<div class="dlg-err" id="nmFehler"></div><div class="dialog-actions"><button class="btn btn-solid" id="nmSpeichern">Speichern</button><button class="btn btn-outline" id="nmAbbrechen">Abbrechen</button></div>';
    byId2('nmInhalt').innerHTML = h;
    ['nmEg', 'nmStufe', 'nmStunden', 'nmGrund', 'nmSue'].forEach(i => { byId2(i).oninput = rechneAnzeige; byId2(i).onchange = rechneAnzeige; });
    byId2('nmManuell').onchange = rechneAnzeige;
    byId2('nmAbbrechen').onclick = schliesse;
    byId2('nmSpeichern').onclick = () => speichern(id);
    rechneAnzeige();
    byId2('nmOverlay').classList.add('open');
  }
  function aktuelleWerte() {
    const manuell = byId2('nmManuell').checked, stunden = parseZahl(byId2('nmStunden').value);
    if (manuell) return { manuell, stunden, grund: parseZahl(byId2('nmGrund').value), sue: parseZahl(byId2('nmSue').value) };
    const g = gehaltBerechnen(byId2('nmEg').value, Number(byId2('nmStufe').value), stunden);
    return { manuell, stunden, grund: g ? g.grund : NaN, sue: g ? g.sue : NaN };
  }
  function rechneAnzeige() {
    const w = aktuelleWerte(), m = byId2('nmManuell').checked;
    ['nmEg', 'nmStufe'].forEach(i => byId2(i).disabled = m);
    byId2('nmGrundWrap').style.display = m ? '' : 'none'; byId2('nmSueWrap').style.display = m ? '' : 'none';
    const el = byId2('nmRechnung');
    if (isNaN(w.grund) || isNaN(w.sue)) { el.textContent = 'Bitte Wochenstunden und Vergütung angeben.'; return; }
    const tab = !m ? TABELLE[byId2('nmEg').value][Number(byId2('nmStufe').value) - 1] : null;
    el.innerHTML = (tab != null ? 'Tabellenwert ' + eur(tab) + ' (39 Std.) → ' : '') + '<b>Grundgehalt ' + eur(w.grund) + '</b> + SuE-Zulage <b>' + eur(w.sue) + '</b> = <b>' + eur(w.grund + w.sue) + '</b> brutto / Monat';
  }
  async function speichern(id) {
    const err = byId2('nmFehler'); err.textContent = '';
    const v = k => byId2(k).value.trim(); const w = aktuelleWerte();
    const pflicht = [['nmVorname', 'Vorname'], ['nmNachname', 'Nachname'], ['nmStrasse', 'Straße'], ['nmPlz', 'PLZ, Ort'], ['nmMail', 'private E-Mail'], ['nmBeruf', 'Berufsbezeichnung'], ['nmEintritt', 'Eintrittsdatum'], ['nmVDatum', 'Vertragsdatum']];
    for (const [k, l] of pflicht) if (!v(k)) { err.textContent = 'Bitte „' + l + '“ ausfüllen.'; return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v('nmMail'))) { err.textContent = 'Die private E-Mail-Adresse ist ungültig.'; return; }
    if (!(w.stunden > 0 && w.stunden <= 60)) { err.textContent = 'Wochenstunden bitte zwischen 0 und 60 angeben.'; return; }
    if (isNaN(w.grund) || isNaN(w.sue) || w.grund <= 0 || w.sue < 0) { err.textContent = 'Grundgehalt und SuE-Zulage bitte prüfen.'; return; }
    const alt = id ? eintrag(id) : null;
    const f = {
      id: id || undefined, name: v('nmVorname') + ' ' + v('nmNachname'), vorname: v('nmVorname'), nachname: v('nmNachname'), strasse: v('nmStrasse'), plzOrt: v('nmPlz'),
      geburtsdatum: v('nmGeb'), privatmail: v('nmMail'), beruf: v('nmBeruf'), eintritt: v('nmEintritt'), stunden: w.stunden, eg: w.manuell ? '' : byId2('nmEg').value,
      stufe: w.manuell ? null : Number(byId2('nmStufe').value), stufeSeit: v('nmStufeSeit'), manuell: w.manuell, grundgehalt: w.grund, sue: w.sue,
      vertragsort: v('nmOrt') || 'Nandlstadt', vertragsdatum: v('nmVDatum'), status: alt ? (alt.status || 'entwurf') : 'entwurf', mitarbeiterId: alt ? alt.mitarbeiterId : '',
    };
    try {
      byId2('nmSpeichern').disabled = true;
      const neuId = await schreibeItem(LIST, SCHEMA, f);
      f.id = neuId; if (alt) Object.assign(alt, f); else liste.push(f);
      schliesse(); render(); zeigeToast('Gespeichert');
    } catch (e) { err.textContent = 'Speichern fehlgeschlagen: ' + e.message; byId2('nmSpeichern').disabled = false; }
  }
  async function statusSetzen(id, s) {
    const x = eintrag(id); if (!x) return;
    try { x.status = s; await schreibeItem(LIST, SCHEMA, { id: x.id, status: s }); render(); }
    catch (e) { zeigeToast('Status nicht gespeichert: ' + e.message, true); }
  }
  /* Entfernt eine Person vollständig aus der Einarbeitung: Eintrag unter „Mitarbeitende“, individueller Plan, Haken/Fortschritt, private Reflexionen */
  function einarbeitungUmfang(mid) {
    return {
      plan: fahrplanListe.filter(z => z.mitarbeiterId === mid),
      fortschritt: Object.values(fortschrittMap).filter(e => e.mitarbeiterId === mid),
      reflexionen: Object.values(reflexionMap).filter(e => e.mitarbeiterId === mid),
    };
  }
  async function zeilenLoeschen(listName, ids) {
    if (!ids.length) return;
    let offen = ids.map(String); const basis = '/sites/' + CFG.spHost + '/lists/' + listName + '/items/';
    for (let runde = 0; runde < 5 && offen.length; runde++) {
      const wieder = [];
      for (let i = 0; i < offen.length; i += 20) {
        const teil = offen.slice(i, i + 20); const t = await token();
        const r = await fetch('https://graph.microsoft.com/v1.0/$batch', { method: 'POST', headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' },
          body: JSON.stringify({ requests: teil.map((id, k) => ({ id: String(k), method: 'DELETE', url: basis + id })) }) });
        if (!r.ok) throw new Error('Löschen fehlgeschlagen (' + r.status + '): ' + (await r.text()).slice(0, 200));
        const antw = (await r.json()).responses || [];
        teil.forEach((id, k) => { const a = antw.find(q => String(q.id) === String(k)); if (!a || a.status === 429 || a.status >= 500) wieder.push(id); else if (a.status >= 300 && a.status !== 404) throw new Error('Eintrag ' + id + ' nicht gelöscht (' + a.status + ')'); });
      }
      offen = wieder; if (offen.length) await pause(3000);
    }
    if (offen.length) throw new Error(offen.length + ' Einträge konnten wegen Drosselung nicht gelöscht werden – bitte erneut versuchen.');
  }
  async function ausEinarbeitungEntfernen(mid) {
    const u = einarbeitungUmfang(mid);
    await zeilenLoeschen(CFG.listFahrplan, u.plan.map(z => z.id));
    await zeilenLoeschen(CFG.listFortschritt, u.fortschritt.map(z => z.id));
    await zeilenLoeschen(CFG.listReflexion, u.reflexionen.map(z => z.id));
    if (mitarbeiterListe.some(m => m.id === mid)) await graph('/sites/' + CFG.spHost + '/lists/' + CFG.listMitarbeiter + '/items/' + mid, { method: 'DELETE' });
    // lokalen Stand bereinigen
    fahrplanListe = fahrplanListe.filter(z => z.mitarbeiterId !== mid);
    Object.keys(fortschrittMap).forEach(k => { if (fortschrittMap[k].mitarbeiterId === mid) delete fortschrittMap[k]; });
    Object.keys(reflexionMap).forEach(k => { if (reflexionMap[k].mitarbeiterId === mid) delete reflexionMap[k]; });
    mitarbeiterListe = mitarbeiterListe.filter(m => m.id !== mid);
    sichtbareIds = sichtbareIds.filter(i => i !== mid);
    if (aktiverMitarbeiterId === mid) aktiverMitarbeiterId = sichtbareIds[0] || null;
    if (planKontext === mid) { planKontext = null; planAnsicht = false; }
  }
  function entfernenHinweis(x) {
    const u = einarbeitungUmfang(x.mitarbeiterId);
    return '\n\nDie Person wird dabei auch aus der Einarbeitung entfernt:\n– Eintrag unter „Mitarbeitende“\n– individueller Einarbeitungsplan (' + u.plan.length + ' Punkte)\n– Haken und Fortschritt (' + u.fortschritt.length + ') sowie private Reflexionen (' + u.reflexionen.length + ')\n\nDas Microsoft-365-Konto bleibt bestehen.';
  }
  async function zuruecksetzen(id) {
    const x = eintrag(id); if (!x) return;
    const inEinarbeitung = !!x.mitarbeiterId;
    let hinweis = 'Status von „' + x.name + '“ auf „Entwurf“ zurücksetzen?\nDie erfassten Daten bleiben erhalten, das Vertragspaket kann neu erzeugt werden.';
    if (inEinarbeitung) hinweis += entfernenHinweis(x);
    if (!confirm(hinweis)) return;
    try {
      if (inEinarbeitung) await ausEinarbeitungEntfernen(x.mitarbeiterId);
      // Null statt leerem Text, damit die Spalte in SharePoint wirklich geleert wird
      await graph('/sites/' + CFG.spHost + '/lists/' + LIST + '/items/' + x.id + '/fields', { method: 'PATCH', body: JSON.stringify(inEinarbeitung ? { Status: 'entwurf', MitarbeiterId: null } : { Status: 'entwurf' }) });
      x.status = 'entwurf'; if (inEinarbeitung) x.mitarbeiterId = '';
      render(); zeigeToast(inEinarbeitung ? 'Zurückgesetzt und aus der Einarbeitung entfernt' : 'Zurückgesetzt');
    } catch (e) { render(); zeigeToast('Zurücksetzen fehlgeschlagen: ' + e.message, true); }
  }
  async function loeschen(id) {
    const x = eintrag(id); if (!x) return;
    const inEinarbeitung = !!x.mitarbeiterId;
    let hinweis = '„' + x.name + '“ endgültig löschen?\nAdresse, Geburtsdatum und Gehaltsangaben werden aus der Liste entfernt. Ein bereits angelegter Mailentwurf in Outlook bleibt bestehen und muss dort gelöscht werden.';
    if (inEinarbeitung) hinweis += entfernenHinweis(x);
    if (!confirm(hinweis)) return;
    try {
      if (inEinarbeitung) await ausEinarbeitungEntfernen(x.mitarbeiterId);
      await graph('/sites/' + CFG.spHost + '/lists/' + LIST + '/items/' + x.id, { method: 'DELETE' });
      liste = liste.filter(e => e.id !== id); render(); zeigeToast(inEinarbeitung ? 'Gelöscht und aus der Einarbeitung entfernt' : 'Gelöscht');
    } catch (e) { render(); zeigeToast('Löschen fehlgeschlagen: ' + e.message, true); }
  }
  async function uebernehmen(id) {
    const x = eintrag(id); if (!x) return;
    // Nach „Zurücksetzen“ nicht doppelt anlegen: existiert die Person schon in der Einarbeitung, nur den Status setzen
    const vorhandenM = x.mitarbeiterId && mitarbeiterListe.find(m => m.id === x.mitarbeiterId);
    if (vorhandenM) { try { await schreibeItem(LIST, SCHEMA, { id: x.id, status: 'plan' }); x.status = 'plan'; render(); zeigeToast('Die Person ist bereits in der Einarbeitung angelegt.'); } catch (e) { zeigeToast(e.message, true); } return; }
    if (!confirm(x.name + ' mit Start ' + fmtDatum(x.eintritt) + ' in die Einarbeitung übernehmen?\nMentor:in und Teamleitung trägst du danach unter „Mitarbeitende“ ein.')) return;
    try {
      const m = { name: x.name, bereich: 'ambulant', startDatum: x.eintritt, upn: x.upn || '' };
      const mid = await schreibeItem(CFG.listMitarbeiter, SCHEMA_MITARBEITER, m);
      mitarbeiterListe.push({ ...m, id: mid });
      await schreibeItem(LIST, SCHEMA, { id: x.id, status: 'plan', mitarbeiterId: mid });
      x.status = 'plan'; x.mitarbeiterId = mid; render(); zeigeToast('Übernommen – bitte Mentor:in, Teamleitung und UPN ergänzen.');
    } catch (e) { zeigeToast('Übernahme fehlgeschlagen: ' + e.message, true); }
  }

  /* ── Vertragspaket ── */
  async function pdfAssets() {
    if (assetsCache) return assetsCache;
    const basis = window.location.pathname.replace(/[^/]*$/, '');
    const lade = async p => { const r = await fetch(basis + p); if (!r.ok) throw new Error(p + ' nicht gefunden (' + r.status + ')'); return bufZuB64(await r.arrayBuffer()); };
    const geladen2 = await Promise.all(NM_PDF.FONT_DATEIEN.map(n => lade('assets/fonts/' + n)));
    const vfs = {}; NM_PDF.FONT_DATEIEN.forEach((n, i) => vfs[n] = geladen2[i]);
    let logo = null; try { logo = 'data:image/png;base64,' + await lade('assets/logo-praxisneuewege.png'); } catch (e) { console.warn('Logo fehlt', e.message); }
    assetsCache = { vfs, fonts: NM_PDF.FONTS, logo };
    return assetsCache;
  }
  function werteFuerVertrag(x) {
    const eg = x.manuell ? '' : String(x.eg || '').replace(' ', '');
    return {
      name: x.name, strasse: x.strasse, plz_ort: x.plzOrt, beruf: x.beruf, beginn: langDatum(x.eintritt), stunden: zahlDe(x.stunden),
      grundgehalt: eur(x.grundgehalt), sue: eur(x.sue), eg_hinweis: x.manuell ? 'Vereinbarung' : 'Entgeltgruppe ' + eg + ' Stufe ' + x.stufe,
      vertragsort: x.vertragsort || 'Nandlstadt', vertragsdatum: kurzDatum(x.vertragsdatum),
    };
  }
  async function vertragspaket(id) {
    const x = eintrag(id); if (!x) return;
    ensureOverlay(); byId2('nmTitel').textContent = 'Vertragspaket: ' + x.name;
    const inh = byId2('nmInhalt'); inh.innerHTML = '<div class="loading-state"><div class="spinner"></div>Vorlagen werden geladen und der Vertrag erstellt …</div>';
    byId2('nmOverlay').classList.add('open');
    try {
      if (typeof pdfMake === 'undefined') throw new Error('PDF-Bibliothek nicht geladen (CDN blockiert?).');
      await ladeVorlagenStatus();
      const fehlt = VORLAGEN.filter(v => !vorlagenStatus[v.key]).map(v => v.datei);
      if (fehlt.length) throw new Error('Diese Vorlagen fehlen in SharePoint: ' + fehlt.join(', ') + '. Bitte im Menü „Vorlagen“ hochladen.');
      const tpl = JSON.parse(await vorlageHolen('arbeitsvertrag.json', true));
      const vals = werteFuerVertrag(x);
      const offen = NM_PDF.fehlende(tpl, vals); if (offen.length) throw new Error('Platzhalter ohne Wert: ' + offen.join(', '));
      const a = await pdfAssets(); pdfMake.vfs = a.vfs; pdfMake.fonts = a.fonts;
      const sigBuf = await vorlageHolen('Unterschrift_Sonja.png', false); const sigV = new DataView(sigBuf);
      const sig = { bild: 'data:image/png;base64,' + bufZuB64(sigBuf), w: 150, h: Math.round(150 * sigV.getUint32(20) / sigV.getUint32(16)) };
      const dd = NM_PDF.docDefinition(tpl, vals, { titel: 'Arbeitsvertrag', kopfRechts: 'Arbeitsvertrag ' + x.name, logo: a.logo, unterschrift: sig });
      const vertragB64 = await new Promise((res, rej) => { try { pdfMake.createPdf(dd).getBase64(res); } catch (e) { rej(e); } });
      const fzTpl = JSON.parse(await vorlageHolen('fuehrungszeugnis.json', true));
      const fzVals = { vorname: x.vorname, nachname: x.nachname, geburtsdatum: x.geburtsdatum ? kurzDatum(x.geburtsdatum) : '', strasse: x.strasse, plz_ort: x.plzOrt, ort: x.vertragsort || 'Nandlstadt', datum: kurzDatum(x.vertragsdatum) };
      if (!fzVals.geburtsdatum) throw new Error('Für den Führungszeugnis-Antrag fehlt das Geburtsdatum (Bearbeiten).');
      const fzOffen = NM_PDF.fehlende(fzTpl, fzVals); if (fzOffen.length) throw new Error('Platzhalter ohne Wert: ' + fzOffen.join(', '));
      const fzB64 = await new Promise((res, rej) => { try { pdfMake.createPdf(NM_PDF.docDefinition(fzTpl, fzVals, { titel: fzTpl.name, titelGroesse: 12.5, kopfRechts: x.name, logo: a.logo, unterschrift: sig })).getBase64(res); } catch (e) { rej(e); } });
      const fzName = ('Antrag_Fuehrungszeugnis_' + x.nachname + '_' + x.vorname + '.pdf').replace(/[^\wÄÖÜäöüß.\-]/g, '_');
      const vollzeit = Number(x.stunden) >= 39;
      const pfVals = { name: x.name, vorname: x.vorname, nachname: x.nachname, geburtsdatum: fzVals.geburtsdatum, strasse: x.strasse, plz_ort: x.plzOrt, eintritt: kurzDatum(x.eintritt),
        beruf: x.beruf, stunden: zahlDe(x.stunden), vollzeit, grundgehalt: eur(x.grundgehalt), sue: eur(x.sue), vertragsdatum: kurzDatum(x.vertragsdatum) };
      const pfB64 = await NM_DOCX.personalfragebogen(await vorlageHolen('Personalfragebogen_DATEV.docx', false), pfVals, { JSZip: window.JSZip, DOMParser: window.DOMParser, XMLSerializer: window.XMLSerializer });
      const pfName = ('Personalfragebogen_' + x.nachname + '_' + x.vorname + '.docx').replace(/[^\wÄÖÜäöüß.\-]/g, '_');
      // Verpflichtung Verfassungstreue: Seiten 1–2 personalisiert (pdfmake) + amtliche Seiten 3–7 unverändert (pdf-lib)
      if (typeof PDFLib === 'undefined') throw new Error('PDF-Bibliothek (pdf-lib) nicht geladen (CDN blockiert?).');
      const vtTpl = JSON.parse(await vorlageHolen('verfassungstreue.json', true));
      const vtVals = { name: x.name, vorname: x.vorname, nachname: x.nachname, geburtsdatum: fzVals.geburtsdatum };
      const vtOffen = NM_PDF.fehlende(vtTpl, vtVals); if (vtOffen.length) throw new Error('Platzhalter ohne Wert: ' + vtOffen.join(', '));
      const vtEigen = await new Promise((res, rej) => { try { pdfMake.createPdf(NM_PDF.docDefinition(vtTpl, vtVals, { titel: vtTpl.name, titelGroesse: 16, kopfLabel: 'Verfassungstreue', kopfRechts: x.name, logo: a.logo })).getBuffer(res); } catch (e) { rej(e); } });
      const vtDoc = await PDFLib.PDFDocument.create();
      const vtA = await PDFLib.PDFDocument.load(vtEigen), vtB = await PDFLib.PDFDocument.load(await vorlageHolen('Verfassungstreue_Verzeichnis_Belehrung.pdf', false));
      (await vtDoc.copyPages(vtA, vtA.getPageIndices())).forEach(pg => vtDoc.addPage(pg));
      (await vtDoc.copyPages(vtB, vtB.getPageIndices())).forEach(pg => vtDoc.addPage(pg));
      vtDoc.setTitle('Verpflichtung Verfassungstreue – ' + x.name); vtDoc.setAuthor('Praxis NeueWege GmbH');
      const vtB64 = await vtDoc.saveAsBase64();
      const vtName = ('Verpflichtung_Verfassungstreue_' + x.nachname + '_' + x.vorname + '.pdf').replace(/[^\wÄÖÜäöüß.\-]/g, '_');
      const richtlinien = [];
      for (const v of VORLAGEN.filter(v => v.datei.endsWith('.pdf') && !v.angehaengt)) richtlinien.push({ name: v.datei, b64: bufZuB64(await vorlageHolen(v.datei, false)) });
      const dateiname = ('Arbeitsvertrag_' + x.nachname + '_' + x.vorname + '.pdf').replace(/[^\wÄÖÜäöüß.\-]/g, '_');
      paket = { id, vertrag: { name: dateiname, b64: vertragB64 }, fz: { name: fzName, b64: fzB64 }, pf: { name: pfName, b64: pfB64, typ: DOCX_TYP }, vt: { name: vtName, b64: vtB64 }, richtlinien };
      const kb = n => Math.round(n * 0.75 / 1024) + ' KB';
      inh.innerHTML = '<p style="font-size:13px;margin-bottom:10px">Das Paket ist fertig. Prüfe den Vertrag, bevor du den Mailentwurf anlegst.</p>' +
        '<table class="ea-tbl"><thead><tr><th>Anlage</th><th>Größe</th><th></th></tr></thead><tbody>' +
        '<tr><td>' + esc(dateiname) + '</td><td>' + kb(vertragB64.length) + '</td><td><button class="btn btn-sm btn-outline" id="nmVorschau">Vertrag ansehen</button></td></tr>' +
        '<tr><td>' + esc(fzName) + '</td><td>' + kb(fzB64.length) + '</td><td><button class="btn btn-sm btn-outline" id="nmVorschauFz">Antrag ansehen</button></td></tr>' +
        '<tr><td>' + esc(vtName) + '</td><td>' + kb(vtB64.length) + '</td><td><button class="btn btn-sm btn-outline" id="nmVorschauVt">Erklärung ansehen</button></td></tr>' +
        '<tr><td>' + esc(pfName) + '</td><td>' + kb(pfB64.length) + '</td><td><button class="btn btn-sm btn-outline" id="nmVorschauPf">Fragebogen laden</button></td></tr>' +
        richtlinien.map(r => '<tr><td>' + esc(r.name) + '</td><td>' + kb(r.b64.length) + '</td><td></td></tr>').join('') + '</tbody></table>' +
        '<p class="ea-item-desc" style="margin:10px 0">Empfänger: ' + esc(x.privatmail) + ' · Gehalt im Vertrag: ' + eur(x.grundgehalt) + ' + ' + eur(x.sue) + ' SuE-Zulage (' + esc(zahlDe(x.stunden)) + ' Std.)</p>' +
        '<div class="dlg-err" id="nmFehler"></div><div class="dialog-actions"><button class="btn btn-solid" id="nmMailBtn">Mailentwurf in meinem Postfach speichern</button>' +
        '<button class="btn btn-outline" id="nmDownload">Vertrag herunterladen</button><button class="btn btn-outline" id="nmZu">Schließen</button></div>';
      byId2('nmVorschau').onclick = () => window.open(URL.createObjectURL(b64Blob(vertragB64)));
      byId2('nmVorschauFz').onclick = () => window.open(URL.createObjectURL(b64Blob(fzB64)));
      byId2('nmVorschauVt').onclick = () => window.open(URL.createObjectURL(b64Blob(vtB64)));
      byId2('nmVorschauPf').onclick = () => { const a3 = document.createElement('a'); a3.href = URL.createObjectURL(b64Blob(pfB64, DOCX_TYP)); a3.download = pfName; a3.click(); };
      byId2('nmDownload').onclick = () => { const a2 = document.createElement('a'); a2.href = URL.createObjectURL(b64Blob(vertragB64)); a2.download = dateiname; a2.click(); };
      byId2('nmZu').onclick = schliesse;
      byId2('nmMailBtn').onclick = () => mailentwurf(id);
    } catch (e) {
      inh.innerHTML = '<div class="dlg-err">' + esc(e.message) + '</div><div class="dialog-actions"><button class="btn btn-outline" id="nmZu">Schließen</button></div>';
      byId2('nmZu').onclick = schliesse;
    }
  }
  function b64Blob(b64, typ) { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type: typ || 'application/pdf' }); }

  async function mailentwurf(id) {
    const x = eintrag(id); const err = byId2('nmFehler'); const btn = byId2('nmMailBtn');
    if (!paket || paket.id !== id) { err.textContent = 'Paket nicht mehr aktuell – bitte neu erzeugen.'; return; }
    try {
      btn.disabled = true; err.textContent = '';
      const t = await token(['Mail.ReadWrite']);
      const anlagen = [paket.vertrag, paket.fz, paket.pf, paket.vt].concat(paket.richtlinien).map(a => ({ '@odata.type': '#microsoft.graph.fileAttachment', name: a.name, contentType: a.typ || 'application/pdf', contentBytes: a.b64 }));
      const gruss = 'Guten Tag ' + esc(x.vorname) + ' ' + esc(x.nachname) + ',';
      const body = '<div style="font-family:Calibri,Arial,sans-serif;font-size:11pt">' +
        '<p>' + gruss + '</p>' +
        '<p>herzlich willkommen bei Praxis NeueWege! Wir freuen uns, dass du ab dem ' + esc(langDatum(x.eintritt)) + ' bei uns startest.</p>' +
        '<p>Anbei erhältst du deinen Arbeitsvertrag, die Verpflichtung zur Verfassungstreue, die Datenschutzerklärung sowie unsere Richtlinien zu Arbeitszeit, Fortbildung und Dienstreisen. Bitte lies alles in Ruhe durch, unterschreibe den Vertrag, die Verpflichtung zur Verfassungstreue (mit dem Fragebogen) und die Datenschutzerklärung und sende uns diese unterschrieben zurück.</p>' +
        '<p>Bitte fülle außerdem den beigefügten Personalfragebogen (Word) aus, am besten am Computer (Bankverbindung, Steuer-ID, Sozialversicherungsnummer, Krankenkasse usw.), und sende ihn mit dem Vertrag zurück. Die grau hinterlegten Felder füllen wir aus.</p>' +
        '<p>Für die Tätigkeit in der Kinder- und Jugendhilfe benötigen wir außerdem ein erweitertes Führungszeugnis. Mit dem beigefügten Schreiben kannst du es bei deiner Meldebehörde beantragen. Es wird dir direkt zugesandt, bitte lege es uns dann im Original vor.</p>' +
        '<p>Bei Fragen melde dich jederzeit gern.</p>' +
        '<p>Herzliche Grüße<br>Markus Peltz<br>Praxis NeueWege GmbH</p></div>';
      const r = await fetch('https://graph.microsoft.com/v1.0/me/messages', {
        method: 'POST', headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: 'Dein Arbeitsvertrag bei Praxis NeueWege', body: { contentType: 'HTML', content: body }, toRecipients: [{ emailAddress: { address: x.privatmail, name: x.name } }], attachments: anlagen }),
      });
      if (!r.ok) throw new Error('Mailentwurf nicht gespeichert (' + r.status + '): ' + (await r.text()).slice(0, 300));
      const m = await r.json();
      await schreibeItem(LIST, SCHEMA, { id: x.id, status: 'mail_bereit' }); x.status = 'mail_bereit';
      byId2('nmInhalt').innerHTML = '<p style="font-size:13px">✓ Der Mailentwurf liegt in deinem Postfach unter <b>Entwürfe</b> (Betreff „Dein Arbeitsvertrag bei Praxis NeueWege“, ' + (anlagen.length) + ' Anlagen).</p>' +
        '<p class="ea-item-desc" style="margin:8px 0">Prüfe die Anrede (du/Sie) und den Text, bevor du ihn sendest. Danach hier „Als versendet markieren“ klicken.</p>' +
        '<div class="dialog-actions">' + (m.webLink ? '<a class="btn btn-solid" href="' + esc(m.webLink) + '" target="_blank" rel="noopener">Entwurf in Outlook öffnen</a>' : '') + '<button class="btn btn-outline" id="nmZu">Schließen</button></div>';
      byId2('nmZu').onclick = () => { schliesse(); render(); };
      paket = null;
    } catch (e) { err.textContent = e.message; btn.disabled = false; }
  }


  /* ═══ M365-Konto anlegen — mit den Rechten der angemeldeten Person (delegiert); die App selbst hat keine eigenen Verwaltungsrechte ═══ */
  const M365_SCOPES = ['User.ReadWrite.All', 'Group.ReadWrite.All', 'Directory.Read.All', 'LicenseAssignment.ReadWrite.All'];
  const STANDARD_GRUPPEN = 'All Company, Ambulante Familienhilfe, PNW-App-Onboarding, Team';
  const LIZENZ_SKU = 'O365_BUSINESS_PREMIUM';
  const MAIL_DOMAIN = 'praxisneuewege.de';
  let kontoPlan = null;

  async function ga(methode, pfad, body) {
    const t = await token(M365_SCOPES);
    const r = await fetch('https://graph.microsoft.com/v1.0' + pfad, { method: methode, headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const txt = await r.text(); let j = null; try { j = txt ? JSON.parse(txt) : null; } catch (e) { /* kein JSON */ }
    return { ok: r.ok, status: r.status, json: j, text: txt, fehler: (j && j.error && j.error.message) || txt || ('HTTP ' + r.status) };
  }
  async function gaAlle(pfad) {
    const alle = []; let p = pfad;
    for (let i = 0; p && i < 20; i++) {
      const r = await ga('GET', p); if (!r.ok) throw new Error(r.fehler);
      alle.push.apply(alle, r.json.value || []); p = r.json['@odata.nextLink'] ? r.json['@odata.nextLink'].replace('https://graph.microsoft.com/v1.0', '') : null;
    }
    return alle;
  }
  function upnVorschlag(vorname, nachname) {
    const n = t => String(t).toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return n(vorname) + '.' + n(nachname) + '@' + MAIL_DOMAIN;
  }
  function zufallsKennwort() {
    const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '%&*+-=?!#']; const alle = sets.join('');
    const zufall = n => { const b = new Uint32Array(n); crypto.getRandomValues(b); return Array.from(b); };
    const z = sets.map((st, i) => st[zufall(1)[0] % st.length]).concat(zufall(16).map(v => alle[v % alle.length]));
    for (let i = z.length - 1; i > 0; i--) { const j = zufall(1)[0] % (i + 1); const t = z[i]; z[i] = z[j]; z[j] = t; }
    return z.join('');
  }
  const gaFehlerKurz = r => String(r.fehler).replace(/\s+/g, ' ').slice(0, 160);
  const pause = ms => new Promise(res => setTimeout(res, ms));

  function kontoDialog(id) {
    const x = eintrag(id); if (!x) return;
    if (demoMode) return;
    ensureOverlay(); kontoPlan = null;
    byId2('nmTitel').textContent = 'M365-Konto: ' + x.name;
    const f = (idn, label, wert, hint, ph) => '<div class="feld feld-voll"><label for="' + idn + '">' + label + '</label><input id="' + idn + '" value="' + esc(wert || '') + '" placeholder="' + esc(ph || '') + '">' + (hint ? '<div class="hint">' + hint + '</div>' : '') + '</div>';
    byId2('nmInhalt').innerHTML = '<div class="felder">' +
      f('nmKUpn', 'Anmeldename / E-Mail', x.upn || upnVorschlag(x.vorname, x.nachname), 'Existiert das Konto schon, wird es nicht verändert; es werden nur fehlende Gruppen, Lizenz und Vorgesetzte ergänzt.') +
      f('nmKGruppen', 'Gruppen (kommagetrennt, Namen in Entra)', STANDARD_GRUPPEN, 'Exchange-Verteilerlisten (z. B. „Team“) lassen sich nicht per Graph befüllen und werden als „manuell“ gekennzeichnet.') +
      f('nmKVorbild', 'Zusätzlich Gruppen übernehmen von (optional)', '', 'Anmeldename einer Person mit gleichen Gruppen. Du siehst im nächsten Schritt jede Gruppe und kannst sie abwählen.', 'vorname.nachname@' + MAIL_DOMAIN) +
      f('nmKMgr', 'Vorgesetzte(r) (optional)', '', 'Anmeldename der Teamleitung. Kann auch später gesetzt werden.', 'nadine.grund@' + MAIL_DOMAIN) +
      f('nmKMobil', 'Mobil geschäftlich (optional)', '', '') + '</div>' +
      '<p class="ea-item-desc" style="margin:10px 0">Die App arbeitet mit deinen Administratorrechten, sie selbst hat keine eigenen. Beim ersten Mal fragt Microsoft die Zustimmung für dein Konto ab.</p>' +
      '<div class="dlg-err" id="nmFehler"></div><div class="dialog-actions"><button class="btn btn-solid" id="nmKPruefen">Prüfen</button><button class="btn btn-outline" id="nmKAbbr">Abbrechen</button></div>';
    byId2('nmKAbbr').onclick = schliesse; byId2('nmKPruefen').onclick = () => kontoPruefen(id);
    byId2('nmOverlay').classList.add('open');
  }

  async function kontoPruefen(id) {
    const x = eintrag(id); const err = byId2('nmFehler'); const btn = byId2('nmKPruefen'); err.textContent = '';
    const ein = { upn: byId2('nmKUpn').value.trim().toLowerCase(), gruppen: byId2('nmKGruppen').value, vorbild: byId2('nmKVorbild').value.trim().toLowerCase(), mgr: byId2('nmKMgr').value.trim().toLowerCase(), mobil: byId2('nmKMobil').value.trim() };
    if (!/^[a-z0-9._-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(ein.upn)) { err.textContent = 'Der Anmeldename ist ungültig.'; return; }
    try {
      btn.disabled = true; btn.textContent = 'Prüfe …';
      const plan = { x, ein, gruppen: [], lizenz: null, mgr: null };
      const u = await ga('GET', '/users/' + encodeURIComponent(ein.upn) + '?$select=id,displayName,accountEnabled,assignedLicenses,usageLocation');
      if (u.ok) plan.vorhanden = u.json; else if (u.status !== 404) throw new Error('Konto nicht prüfbar: ' + gaFehlerKurz(u));
      // Gruppen: Namen + optional Vorbild
      const namen = Array.from(new Set(ein.gruppen.split(/[,;\n]/).map(t => t.trim()).filter(Boolean)));
      const gewaehlt = [];
      for (const n of namen) {
        const r = await ga('GET', '/groups?$filter=' + encodeURIComponent("displayName eq '" + n.replace(/'/g, "''") + "'") + '&$select=id,displayName,groupTypes,mailEnabled,securityEnabled');
        if (!r.ok) throw new Error('Gruppe „' + n + '“ nicht abrufbar: ' + gaFehlerKurz(r));
        const g = (r.json.value || [])[0]; gewaehlt.push(g ? Object.assign({ quelle: 'Liste' }, g) : { displayName: n, fehlt: true, quelle: 'Liste' });
      }
      if (ein.vorbild) {
        const vg = await gaAlle('/users/' + encodeURIComponent(ein.vorbild) + '/memberOf/microsoft.graph.group?$select=id,displayName,groupTypes,mailEnabled,securityEnabled&$top=100');
        vg.forEach(g => { if (!gewaehlt.some(e => e.id === g.id)) gewaehlt.push(Object.assign({ quelle: 'Vorbild' }, g)); });
      }
      gewaehlt.forEach(g => {
        const dyn = (g.groupTypes || []).includes('DynamicMembership');
        const verteiler = g.mailEnabled && !g.securityEnabled && !(g.groupTypes || []).includes('Unified');
        g.status = g.fehlt ? 'nicht in Entra gefunden' : dyn ? 'dynamische Gruppe – nicht möglich' : verteiler ? 'Exchange-Verteilerliste – manuell' : 'wird eingetragen';
        g.auswahl = !g.fehlt && !dyn && !verteiler; g.sperre = !g.auswahl;
      });
      plan.gruppen = gewaehlt;
      // Lizenz
      const sku = (await gaAlle('/subscribedSkus')).find(k => k.skuPartNumber === LIZENZ_SKU);
      const bereitsLizenziert = plan.vorhanden && (plan.vorhanden.assignedLicenses || []).length > 0;
      plan.lizenz = bereitsLizenziert ? { text: 'bereits lizenziert', ok: false } : !sku ? { text: LIZENZ_SKU + ' nicht im Tenant gefunden', ok: false }
        : (sku.prepaidUnits.enabled - sku.consumedUnits) > 0 ? { text: LIZENZ_SKU + ': ' + (sku.prepaidUnits.enabled - sku.consumedUnits) + ' frei – wird zugewiesen', ok: true, skuId: sku.skuId } : { text: 'keine freie Lizenz (' + LIZENZ_SKU + ') – bitte im Admin Center nachkaufen und zuweisen', ok: false };
      // Vorgesetzte
      if (ein.mgr) { const m = await ga('GET', '/users/' + encodeURIComponent(ein.mgr) + '?$select=id,displayName'); plan.mgr = m.ok ? { id: m.json.id, name: m.json.displayName } : { fehlt: true }; }
      kontoPlan = plan; kontoPlanAnzeigen(id);
    } catch (e) { err.textContent = e.message; btn.disabled = false; btn.textContent = 'Prüfen'; }
  }

  function kontoPlanAnzeigen(id) {
    const pl = kontoPlan, x = pl.x; const zeile = (a, b) => '<tr><td style="white-space:nowrap;vertical-align:top"><b>' + a + '</b></td><td>' + b + '</td></tr>';
    let h = '<table class="ea-tbl"><tbody>';
    h += zeile('Konto', pl.vorhanden ? 'existiert bereits: ' + esc(pl.vorhanden.displayName) + ' (' + esc(pl.ein.upn) + ') – <b>wird nicht verändert</b>' : 'wird angelegt: <b>' + esc(x.name) + '</b>, ' + esc(pl.ein.upn) + ', ' + esc(x.beruf || '') + '<div class="ea-item-desc">Alternative E-Mail: ' + esc(x.privatmail) + ' · Anschrift und Firma werden übernommen · Kennwortwechsel beim ersten Login</div>');
    h += zeile('Gruppen', pl.gruppen.length ? pl.gruppen.map((g, i) => '<label class="chk" style="margin:2px 0"><input type="checkbox" data-nm-gr="' + i + '"' + (g.auswahl ? ' checked' : '') + (g.sperre ? ' disabled' : '') + '> ' + esc(g.displayName) + ' <span class="ea-item-desc">(' + esc(g.quelle) + ' · ' + esc(g.status) + ')</span></label>').join('') : '<span class="ea-item-desc">keine</span>');
    h += zeile('Lizenz', (pl.lizenz.ok ? '' : '<span style="color:var(--error)">') + esc(pl.lizenz.text) + (pl.lizenz.ok ? '' : '</span>'));
    h += zeile('Vorgesetzte(r)', pl.ein.mgr ? (pl.mgr && !pl.mgr.fehlt ? esc(pl.mgr.name) : '<span style="color:var(--error)">nicht gefunden: ' + esc(pl.ein.mgr) + '</span>') : '<span class="ea-item-desc">nicht angegeben</span>');
    h += '</tbody></table><div class="dlg-err" id="nmFehler"></div><div class="dialog-actions"><button class="btn btn-solid" id="nmKGo">' + (pl.vorhanden ? 'Fehlendes ergänzen' : 'Konto jetzt anlegen') + '</button><button class="btn btn-outline" id="nmKZurueck">Zurück</button><button class="btn btn-outline" id="nmKAbbr">Abbrechen</button></div>';
    byId2('nmInhalt').innerHTML = h;
    Array.from(document.querySelectorAll('[data-nm-gr]')).forEach(c => c.onchange = () => { pl.gruppen[Number(c.getAttribute('data-nm-gr'))].auswahl = c.checked; });
    byId2('nmKGo').onclick = () => kontoAusfuehren(id); byId2('nmKZurueck').onclick = () => kontoDialog(id); byId2('nmKAbbr').onclick = schliesse;
  }

  async function kontoAusfuehren(id) {
    const pl = kontoPlan, x = pl.x, ein = pl.ein, schritte = []; const ok = (a, b, st) => schritte.push({ a, b, st: st || 'ok' });
    const btn = byId2('nmKGo'); const err = byId2('nmFehler'); btn.disabled = true; btn.textContent = 'Arbeite …'; err.textContent = '';
    let userId = pl.vorhanden ? pl.vorhanden.id : null, kennwort = null;
    try {
      if (!userId) {
        kennwort = zufallsKennwort();
        const plz = String(x.plzOrt || '').match(/^(\d{5})\s+(.*)$/);
        const body = { accountEnabled: true, displayName: x.name, givenName: x.vorname, surname: x.nachname, mailNickname: ein.upn.split('@')[0], userPrincipalName: ein.upn,
          jobTitle: x.beruf, companyName: 'Praxis NeueWege GmbH', streetAddress: x.strasse, postalCode: plz ? plz[1] : undefined, city: plz ? plz[2] : x.plzOrt, state: 'Bayern', country: 'Deutschland',
          usageLocation: 'DE', preferredLanguage: 'de-DE', otherMails: [x.privatmail], passwordProfile: { forceChangePasswordNextSignIn: true, password: kennwort } };
        if (ein.mobil) body.mobilePhone = ein.mobil;
        const r = await ga('POST', '/users', body);
        if (!r.ok) throw new Error('Konto nicht angelegt: ' + gaFehlerKurz(r));
        userId = r.json.id; ok('Konto', 'angelegt: ' + ein.upn);
      } else ok('Konto', 'existierte bereits, unverändert');
      // Gruppen (bei neuem Konto kurz warten: Replikation)
      for (const g of pl.gruppen) {
        if (!g.auswahl) { ok('Gruppe ' + g.displayName, g.status, g.sperre ? 'manuell' : 'uebersprungen'); continue; }
        let r = null;
        for (let v = 0; v < 4; v++) { r = await ga('POST', '/groups/' + g.id + '/members/$ref', { '@odata.id': 'https://graph.microsoft.com/v1.0/directoryObjects/' + userId }); if (r.status !== 404 || !kennwort) break; await pause(2500); }
        if (r.ok) ok('Gruppe ' + g.displayName, 'eingetragen');
        else if (r.status === 400 && /already exist/i.test(r.fehler)) ok('Gruppe ' + g.displayName, 'war schon Mitglied');
        else ok('Gruppe ' + g.displayName, gaFehlerKurz(r), 'fehler');
      }
      // Lizenz
      if (pl.lizenz.ok) {
        const r = await ga('POST', '/users/' + userId + '/assignLicense', { addLicenses: [{ skuId: pl.lizenz.skuId, disabledPlans: [] }], removeLicenses: [] });
        ok('Lizenz', r.ok ? LIZENZ_SKU + ' zugewiesen' : gaFehlerKurz(r), r.ok ? 'ok' : 'fehler');
      } else ok('Lizenz', pl.lizenz.text, pl.lizenz.text.startsWith('bereits') ? 'ok' : 'manuell');
      // Vorgesetzte
      if (ein.mgr) {
        if (pl.mgr && !pl.mgr.fehlt) { const r = await ga('PUT', '/users/' + userId + '/manager/$ref', { '@odata.id': 'https://graph.microsoft.com/v1.0/users/' + pl.mgr.id }); ok('Vorgesetzte(r)', r.ok ? pl.mgr.name : gaFehlerKurz(r), r.ok ? 'ok' : 'fehler'); }
        else ok('Vorgesetzte(r)', 'nicht gefunden – bitte später setzen', 'manuell');
      }
      // Ergebnis merken (UPN + Status)
      try { await speichereKonto(x, ein.upn); ok('Gespeichert', 'Status „M365-Konto angelegt“'); } catch (e) { ok('Gespeichert', 'Status nicht gespeichert: ' + e.message, 'fehler'); }
    } catch (e) {
      err.textContent = e.message; btn.disabled = false; btn.textContent = pl.vorhanden ? 'Fehlendes ergänzen' : 'Konto jetzt anlegen';
      if (!userId) return;
      ok('Abbruch', e.message, 'fehler');
    }
    ergebnisAnzeigen(schritte, kennwort);
  }
  async function speichereKonto(x, upn) {
    try { await schreibeItem(LIST, SCHEMA, { id: x.id, upn, status: 'konto' }); }
    catch (e) {
      // Spalte „UPN“ fehlt in der bestehenden Liste: einmalig anlegen und wiederholen
      const t = await token(['Sites.Manage.All']);
      const r = await fetch('https://graph.microsoft.com/v1.0/sites/' + CFG.spHost + '/lists/' + LIST + '/columns', { method: 'POST', headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'UPN', text: {} }) });
      if (!r.ok && r.status !== 409) throw new Error('Spalte UPN konnte nicht angelegt werden (' + r.status + ')');
      await schreibeItem(LIST, SCHEMA, { id: x.id, upn, status: 'konto' });
    }
    x.upn = upn; x.status = 'konto';
  }
  function ergebnisAnzeigen(schritte, kennwort) {
    const farbe = { ok: 'var(--success, #2D6A4F)', manuell: '#B7791F', fehler: 'var(--error)', uebersprungen: 'var(--text-hint)' };
    const sym = { ok: '✓', manuell: '!', fehler: '✗', uebersprungen: '–' };
    let h = '<table class="ea-tbl"><thead><tr><th>Schritt</th><th>Ergebnis</th></tr></thead><tbody>' + schritte.map(s => '<tr><td>' + esc(s.a) + '</td><td style="color:' + farbe[s.st] + '">' + sym[s.st] + ' ' + esc(s.b) + '</td></tr>').join('') + '</tbody></table>';
    if (kennwort) h += '<div class="ea-card" style="margin:12px 0 0;background:var(--bg)"><b>Initialkennwort (wird nur hier angezeigt und nirgends gespeichert)</b><div class="ea-link-copy" style="margin-top:6px"><code id="nmKennwort">' + esc(kennwort) + '</code><button class="btn btn-sm btn-outline" id="nmKKopie">Kopieren</button></div>' +
      '<p class="ea-item-desc" style="margin-top:6px">Beim ersten Anmelden muss ein neues Kennwort vergeben werden. Später soll die neue Mitarbeiterin ihr Kennwort über den Zugangslink selbst setzen.</p></div>';
    if (schritte.some(s => s.st === 'manuell')) h += '<p class="ea-item-desc" style="margin-top:10px">Mit „!“ gekennzeichnete Schritte musst du im Microsoft Admin Center bzw. Exchange Admin Center von Hand erledigen.</p>';
    h += '<div class="dialog-actions"><button class="btn btn-solid" id="nmZu">Schließen</button></div>';
    byId2('nmInhalt').innerHTML = h; byId2('nmZu').onclick = () => { schliesse(); render(); };
    const k = byId2('nmKKopie'); if (k) k.onclick = () => { try { navigator.clipboard.writeText(kennwort); zeigeToast('Kennwort kopiert'); } catch (e) { zeigeToast('Kopieren nicht möglich', true); } };
  }


  /* ═══ Einarbeitungsplan erzeugen: Mentor + Teamleitung festlegen, eigene Plan-Kopie je Person, Vorgesetzte in M365, Benachrichtigung ═══ */
  function planStatusText(x) {
    const m = x.mitarbeiterId && mitarbeiterListe.find(e => e.id === x.mitarbeiterId); if (!m || !m.planStatus) return '';
    return '<div class="ea-item-desc" style="margin-top:3px">' + (m.planStatus === 'freigegeben' ? 'Plan freigegeben ✓' : 'Plan in Abstimmung') + '</div>';
  }
  async function vorschlaege() {
    const out = new Map();
    mitarbeiterListe.forEach(m => { if (m.upn) out.set(m.upn.toLowerCase(), m.name); });
    for (const gname of ['TL-Ambulant', 'Team']) {
      try {
        const g = await ga('GET', '/groups?$filter=' + encodeURIComponent("displayName eq '" + gname + "'") + '&$select=id');
        const id = g.ok && g.json.value && g.json.value[0] && g.json.value[0].id; if (!id) continue;
        (await gaAlle('/groups/' + id + '/members/microsoft.graph.user?$select=displayName,userPrincipalName&$top=200')).forEach(u => out.set(String(u.userPrincipalName).toLowerCase(), u.displayName));
      } catch (e) { /* Verteilerlisten sind nicht lesbar: dann nur die übrigen Vorschläge */ }
    }
    return Array.from(out.entries()).map(([upn, name]) => ({ upn, name })).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  }
  function planDialog(id) {
    const x = eintrag(id); if (!x || demoMode) return;
    ensureOverlay(); byId2('nmTitel').textContent = 'Einarbeitungsplan: ' + x.name;
    const m = x.mitarbeiterId && mitarbeiterListe.find(e => e.id === x.mitarbeiterId);
    const f = (idn, label, wert, hint, ph, liste) => '<div class="feld feld-voll"><label for="' + idn + '">' + label + '</label><input id="' + idn + '" value="' + esc(wert || '') + '" placeholder="' + esc(ph || '') + '"' + (liste ? ' list="' + liste + '"' : '') + '>' + (hint ? '<div class="hint">' + hint + '</div>' : '') + '</div>';
    byId2('nmInhalt').innerHTML = '<div class="felder">' +
      f('nmPMentor', 'Mentor:in (Anmeldename)', m && m.mentorUpn, 'Wähle aus der Liste oder tippe die Adresse.', 'vorname.nachname@' + MAIL_DOMAIN, 'nmPListe') +
      f('nmPTl', 'Teamleitung (Anmeldename)', m && m.tlUpn, '', 'vorname.nachname@' + MAIL_DOMAIN, 'nmPListe') + '<datalist id="nmPListe"></datalist>' +
      '<div class="feld feld-voll"><label class="chk"><input type="checkbox" id="nmPMgr" checked> Teamleitung in Microsoft 365 als Vorgesetzte setzen' + (x.upn ? ' (' + esc(x.upn) + ')' : ' (erst möglich, wenn ein M365-Konto angelegt ist)') + '</label></div></div>' +
      '<p class="ea-item-desc" style="margin:10px 0">Aus der Vorlage entsteht ein <b>eigener Plan für ' + esc(x.vorname) + '</b>, den Mentor:in, Teamleitung und Geschäftsführung anpassen und freigeben. Bis dahin sieht ' + esc(x.vorname) + ' den Plan nicht.' + (m && hatEigenenPlan(m.id) ? ' <b>Für diese Person besteht schon ein Plan, er wird nicht neu erzeugt.</b>' : '') + '</p>' +
      '<div class="dlg-err" id="nmFehler"></div><div class="dialog-actions"><button class="btn btn-solid" id="nmPGo">Plan erzeugen</button><button class="btn btn-outline" id="nmKAbbr">Abbrechen</button></div>';
    byId2('nmKAbbr').onclick = schliesse; byId2('nmPGo').onclick = () => planErzeugen(id);
    byId2('nmOverlay').classList.add('open');
    vorschlaege().then(l => { const dl = byId2('nmPListe'); if (dl) dl.innerHTML = l.map(e => '<option value="' + esc(e.upn) + '">' + esc(e.name) + '</option>').join(''); }).catch(() => {});
  }
  async function kopiereVorlage(mid) {
    const vorlage = vorlageZeilen(); if (!vorlage.length) throw new Error('Die Vorlage („Fahrplan verwalten“) ist leer.');
    const basis = '/sites/' + CFG.spHost + '/lists/' + CFG.listFahrplan + '/items';
    let offen = vorlage.map((z, i) => { const kopie = Object.assign({}, z); delete kopie.id; kopie.mitarbeiterId = mid; return { id: String(i), kopie }; });
    const neu = [];
    for (let runde = 0; runde < 5 && offen.length; runde++) {
      const naechste = [];
      for (let i = 0; i < offen.length; i += 20) {
        const teil = offen.slice(i, i + 20); const t = await token();
        const r = await fetch('https://graph.microsoft.com/v1.0/$batch', { method: 'POST', headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' },
          body: JSON.stringify({ requests: teil.map(o => ({ id: o.id, method: 'POST', url: basis, headers: { 'Content-Type': 'application/json' }, body: { fields: zuFeldern(o.kopie, SCHEMA_FAHRPLAN) } })) }) });
        if (!r.ok) throw new Error('Plan konnte nicht kopiert werden (' + r.status + '): ' + (await r.text()).slice(0, 200));
        const j = await r.json();
        (j.responses || []).forEach(a => { const o = teil.find(q => q.id === String(a.id)); if (!o) return;
          if (a.status === 201 || a.status === 200) neu.push(Object.assign({}, o.kopie, { id: a.body.id })); else if (a.status === 429 || a.status >= 500) naechste.push(o);
          else throw new Error('Punkt „' + o.kopie.titel + '“ nicht kopiert (' + a.status + '): ' + JSON.stringify(a.body).slice(0, 160)); });
        teil.forEach(o => { if (!(j.responses || []).some(a => String(a.id) === o.id)) naechste.push(o); });
      }
      offen = naechste; if (offen.length) await pause(3000);
    }
    if (offen.length) throw new Error(offen.length + ' Punkte konnten wegen Drosselung nicht kopiert werden – bitte „Plan erzeugen“ erneut starten.');
    neu.forEach(z => fahrplanListe.push(z));
    return neu.length;
  }
  async function planErzeugen(id) {
    const x = eintrag(id); const err = byId2('nmFehler'); const btn = byId2('nmPGo'); err.textContent = '';
    const mUpn = byId2('nmPMentor').value.trim().toLowerCase(), tUpn = byId2('nmPTl').value.trim().toLowerCase(), setzeMgr = byId2('nmPMgr').checked;
    const gueltig = u => /^[a-z0-9._-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(u);
    if (!gueltig(mUpn) || !gueltig(tUpn)) { err.textContent = 'Bitte Mentor:in und Teamleitung als gültigen Anmeldenamen angeben.'; return; }
    const schritte = []; const ok = (a, b, st) => schritte.push({ a, b, st: st || 'ok' });
    try {
      btn.disabled = true; btn.textContent = 'Arbeite …';
      const holen = async upn => { const r = await ga('GET', '/users/' + encodeURIComponent(upn) + '?$select=id,displayName'); if (!r.ok) throw new Error('„' + upn + '“ wurde in Microsoft 365 nicht gefunden.'); return r.json; };
      const mentor = await holen(mUpn), tl = mUpn === tUpn ? mentor : await holen(tUpn);
      btn.textContent = 'Spalten prüfen …';
      const neuSp = (await ergaenzeSpalten(CFG.listMitarbeiter, SCHEMA_MITARBEITER)) + (await ergaenzeSpalten(CFG.listFahrplan, SCHEMA_FAHRPLAN));
      if (neuSp) ok('SharePoint', neuSp + ' neue Spalte(n) angelegt');
      let m = x.mitarbeiterId && mitarbeiterListe.find(e => e.id === x.mitarbeiterId);
      const felder = { name: x.name, bereich: 'ambulant', startDatum: x.eintritt, upn: x.upn || '', mentorName: mentor.displayName, mentorUpn: mUpn, tlName: tl.displayName, tlUpn: tUpn };
      if (!m || !hatEigenenPlan(m.id)) felder.planStatus = 'abstimmung', felder.planFreigaben = '{}';
      if (m) { await schreibeItem(CFG.listMitarbeiter, SCHEMA_MITARBEITER, Object.assign({ id: m.id }, felder)); Object.assign(m, felder); }
      else { const mid = await schreibeItem(CFG.listMitarbeiter, SCHEMA_MITARBEITER, felder); m = Object.assign({ id: mid }, felder); mitarbeiterListe.push(m); }
      ok('Mitarbeitende', 'Mentor:in ' + mentor.displayName + ', Teamleitung ' + tl.displayName);
      if (hatEigenenPlan(m.id)) ok('Plan', 'bestand schon, nicht neu erzeugt');
      else { btn.textContent = 'Kopiere Plan …'; const n = await kopiereVorlage(m.id); ok('Plan', n + ' Punkte aus der Vorlage kopiert, Status „in Abstimmung“'); }
      if (setzeMgr) {
        if (!x.upn) ok('Vorgesetzte(r)', 'kein M365-Konto hinterlegt – bitte später setzen', 'manuell');
        else { const u = await ga('GET', '/users/' + encodeURIComponent(x.upn) + '?$select=id'); if (!u.ok) ok('Vorgesetzte(r)', 'Konto ' + x.upn + ' nicht gefunden', 'manuell');
          else { const r = await ga('PUT', '/users/' + u.json.id + '/manager/$ref', { '@odata.id': 'https://graph.microsoft.com/v1.0/users/' + tl.id }); ok('Vorgesetzte(r)', r.ok ? tl.displayName + ' in M365 gesetzt' : gaFehlerKurz(r), r.ok ? 'ok' : 'fehler'); } }
      }
      await schreibeItem(LIST, SCHEMA, { id: x.id, status: 'plan', mitarbeiterId: m.id }); x.status = 'plan'; x.mitarbeiterId = m.id;
      ok('Gespeichert', 'Status „In Einarbeitung“');
      planErgebnis(x, m, schritte, mentor, tl);
    } catch (e) { err.textContent = e.message; btn.disabled = false; btn.textContent = 'Plan erzeugen'; }
  }
  function planErgebnis(x, m, schritte, mentor, tl) {
    const farbe = { ok: 'var(--success, #2D6A4F)', manuell: '#B7791F', fehler: 'var(--error)' }, sym = { ok: '✓', manuell: '!', fehler: '✗' };
    byId2('nmInhalt').innerHTML = '<table class="ea-tbl"><thead><tr><th>Schritt</th><th>Ergebnis</th></tr></thead><tbody>' + schritte.map(s => '<tr><td>' + esc(s.a) + '</td><td style="color:' + farbe[s.st] + '">' + sym[s.st] + ' ' + esc(s.b) + '</td></tr>').join('') + '</tbody></table>' +
      '<p class="ea-item-desc" style="margin:10px 0">Nächster Schritt: Mentor:in und Teamleitung benachrichtigen. Sie prüfen den Plan, passen ihn an und geben ihn frei. Du gibst als Geschäftsführung ebenfalls frei.</p><div class="dlg-err" id="nmFehler"></div>' +
      '<div class="dialog-actions"><button class="btn btn-solid" id="nmPMail">Mentor:in und Teamleitung benachrichtigen</button><button class="btn btn-outline" id="nmPOeffnen">Plan öffnen</button><button class="btn btn-outline" id="nmZu">Schließen</button></div>';
    byId2('nmZu').onclick = () => { schliesse(); render(); };
    byId2('nmPOeffnen').onclick = () => { schliesse(); planOeffnen(m.id); };
    byId2('nmPMail').onclick = () => planMail(x, m);
  }
  /* Benachrichtigung an Mentor:in und Teamleitung. Empfänger sind nur die, die noch nicht freigegeben haben; ist eine Person beides, geht eine Nachricht an sie. */
  function planEmpfaenger(m) {
    const f = freigaben(m), ziele = [];
    const add = (upn, name, rolle, key) => {
      if (!upn || f[key]) return; const u = String(upn).toLowerCase(); const e = ziele.find(z => z.upn === u);
      if (e) e.rollen.push(rolle); else ziele.push({ upn: u, name, rollen: [rolle] });
    };
    add(m.mentorUpn, m.mentorName, 'Mentor:in', 'mentor'); add(m.tlUpn, m.tlName, 'Teamleitung', 'tl');
    return ziele;
  }
  async function sendePlanMails(m, ziele) {
    const t = await token(['Mail.Send']); const vorname = String(m.name).split(' ')[0]; const start = m.startDatum ? langDatum(m.startDatum) : '';
    for (const z of ziele) {
      const body = '<div style="font-family:Calibri,Arial,sans-serif;font-size:11pt"><p>Hallo ' + esc(String(z.name).split(' ')[0]) + ',</p><p>für ' + esc(m.name) + (start ? ' (Start am ' + esc(start) + ')' : '') + ' liegt der Einarbeitungsplan zur Abstimmung bereit. Du bist als ' + esc(z.rollen.join(' und ')) + ' eingetragen.</p>' +
        '<p>Bitte prüfe den Plan, passe ihn bei Bedarf an und gib ihn frei: <a href="https://apps.praxisneuewege.de/einarbeitung-beta.html">Onboarding-App öffnen</a>. Der Plan wird erst für ' + esc(vorname) + ' sichtbar, wenn Mentor:in, Teamleitung und Geschäftsführung freigegeben haben.</p><p>Danke und viele Grüße<br>Markus</p></div>';
      const r = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', { method: 'POST', headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: { subject: 'Einarbeitungsplan für ' + m.name + ' bitte prüfen und freigeben', body: { contentType: 'HTML', content: body }, toRecipients: [{ emailAddress: { address: z.upn, name: z.name } }] }, saveToSentItems: true }) });
      if (!r.ok) throw new Error('Nachricht an ' + z.name + ' nicht gesendet (' + r.status + ')');
    }
  }
  const empfaengerText = ziele => ziele.map(z => z.name + ' (' + z.rollen.join(' und ') + ')').join(' und ');
  // Knopf auf der Plan-Karte: jederzeit (erneut) benachrichtigen
  async function benachrichtigen(mid) {
    const m = mitarbeiterListe.find(e => e.id === mid); if (!m) return;
    const ziele = planEmpfaenger(m);
    if (!ziele.length) { zeigeToast('Mentor:in und Teamleitung haben schon freigegeben.'); return; }
    if (!confirm('Nachricht zur Freigabe des Plans von ' + m.name + ' senden an: ' + empfaengerText(ziele) + '?')) return;
    try { await sendePlanMails(m, ziele); zeigeToast('Benachrichtigung gesendet an ' + ziele.map(z => z.name).join(' und ')); }
    catch (e) { zeigeToast(e.message, true); }
  }
  // Knopf im Ergebnisfenster nach „Plan erzeugen“
  async function planMail(x, m) {
    const err = byId2('nmFehler'), btn = byId2('nmPMail'); err.textContent = '';
    const ziele = planEmpfaenger(m);
    if (!confirm('Nachricht senden an: ' + empfaengerText(ziele) + '?')) return;
    try { btn.disabled = true; await sendePlanMails(m, ziele); btn.textContent = '✓ Benachrichtigt: ' + ziele.map(z => z.name).join(' und '); zeigeToast('Benachrichtigung gesendet'); }
    catch (e) { err.textContent = e.message; btn.disabled = false; }
  }
  return { laden, view, vorlagenView, bind, upnVorschlag, benachrichtigen, planEmpfaenger, gehaltBerechnen, eur, parseZahl, TABELLE };
})();

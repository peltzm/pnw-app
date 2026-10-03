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
  ];
  const DOCX_TYP = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const STATUS = [
    ['entwurf', 'Entwurf'], ['mail_bereit', 'Mailentwurf liegt vor'], ['versendet', 'Vertrag versendet'],
    ['zurueck', 'Vertrag zurück'], ['plan', 'In Einarbeitung'],
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
    const farbe = s === 'zurueck' || s === 'plan' ? 'var(--success, #2D6A4F)' : 'var(--accent)';
    return '<span style="display:inline-block;padding:2px 9px;border-radius:12px;font-size:11px;border:1px solid ' + farbe + ';color:' + farbe + '">' + esc(STATUS_LABEL[s] || s || '–') + '</span>';
  }
  function aktionen(x) {
    const b = (act, text, solid) => '<button class="btn btn-sm ' + (solid ? 'btn-solid' : 'btn-outline') + '" data-nm="' + act + ':' + x.id + '">' + text + '</button>';
    const out = [];
    if (x.status === 'plan') {
      return '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><span class="ea-item-desc">in der Einarbeitung</span>' + b('edit', 'Bearbeiten') + b('reset', 'Zurücksetzen') +
        '<button class="btn btn-sm btn-outline" style="color:var(--error);border-color:var(--error)" data-nm="del:' + x.id + '">Löschen</button></div>';
    }
    out.push(b('paket', x.status === 'entwurf' || !x.status ? 'Vertragspaket erzeugen' : 'Vertragspaket neu', x.status === 'entwurf' || !x.status));
    if (x.status === 'mail_bereit') out.push(b('stat-versendet', 'Als versendet markieren', true));
    if (x.status === 'versendet') out.push(b('stat-zurueck', 'Vertrag zurück erhalten', true));
    if (x.status === 'zurueck') out.push(b('uebernehmen', 'In Einarbeitung übernehmen', true));
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
        h += '<tr><td><b>' + esc(x.name) + '</b><div class="ea-item-desc">' + esc(x.beruf || '') + '</div></td><td>' + fmtDatum(x.eintritt) + '</td><td>' + esc(zahlDe(x.stunden || '')) + '</td><td>' + esc(verg) +
          (x.grundgehalt ? '<div class="ea-item-desc">' + eur(x.grundgehalt) + ' + ' + eur(x.sue || 0) + '</div>' : '') + '</td><td>' + badge(x.status || 'entwurf') + '</td><td>' + aktionen(x) + '</td></tr>';
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
  async function zuruecksetzen(id) {
    const x = eintrag(id); if (!x) return;
    let hinweis = 'Status von „' + x.name + '“ auf „Entwurf“ zurücksetzen?\nDie erfassten Daten bleiben erhalten, das Vertragspaket kann neu erzeugt werden.';
    if (x.status === 'plan') hinweis += '\n\nDie Person bleibt unter „Mitarbeitende“ in der Einarbeitung bestehen.';
    if (!confirm(hinweis)) return;
    try { await schreibeItem(LIST, SCHEMA, { id: x.id, status: 'entwurf' }); x.status = 'entwurf'; render(); zeigeToast('Zurückgesetzt'); }
    catch (e) { zeigeToast('Zurücksetzen fehlgeschlagen: ' + e.message, true); }
  }
  async function loeschen(id) {
    const x = eintrag(id); if (!x) return;
    let hinweis = '„' + x.name + '“ endgültig löschen?\nAdresse, Geburtsdatum und Gehaltsangaben werden aus der Liste entfernt. Ein bereits angelegter Mailentwurf in Outlook bleibt bestehen und muss dort gelöscht werden.';
    if (x.status === 'plan') hinweis += '\n\nDie Person bleibt unter „Mitarbeitende“ in der Einarbeitung bestehen und muss dort separat entfernt werden.';
    if (!confirm(hinweis)) return;
    try {
      await graph('/sites/' + CFG.spHost + '/lists/' + LIST + '/items/' + x.id, { method: 'DELETE' });
      liste = liste.filter(e => e.id !== id); render(); zeigeToast('Gelöscht');
    } catch (e) { zeigeToast('Löschen fehlgeschlagen: ' + e.message, true); }
  }
  async function uebernehmen(id) {
    const x = eintrag(id); if (!x) return;
    // Nach „Zurücksetzen“ nicht doppelt anlegen: existiert die Person schon in der Einarbeitung, nur den Status setzen
    const vorhandenM = x.mitarbeiterId && mitarbeiterListe.find(m => m.id === x.mitarbeiterId);
    if (vorhandenM) { try { await schreibeItem(LIST, SCHEMA, { id: x.id, status: 'plan' }); x.status = 'plan'; render(); zeigeToast('Die Person ist bereits in der Einarbeitung angelegt.'); } catch (e) { zeigeToast(e.message, true); } return; }
    if (!confirm(x.name + ' mit Start ' + fmtDatum(x.eintritt) + ' in die Einarbeitung übernehmen?\nMentor:in und Teamleitung trägst du danach unter „Mitarbeitende“ ein.')) return;
    try {
      const m = { name: x.name, bereich: 'ambulant', startDatum: x.eintritt };
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

  return { laden, view, vorlagenView, bind, gehaltBerechnen, eur, parseZahl, TABELLE };
})();

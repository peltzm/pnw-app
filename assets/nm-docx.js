/* ═══════════════════════════════════════════════════════════════
 * DATEV-Personalfragebogen befüllen (nur Werte eintragen, Layout und Text des Standarddokuments bleiben unverändert)
 * Eingabe: die DATEV-Vorlage (docx, liegt in SharePoint) als ArrayBuffer/Uint8Array; Ausgabe: befülltes docx als Base64.
 * Läuft im Browser (JSZip + DOMParser) und in Node-Tests (mit injizierten Abhängigkeiten).
 * Es werden ausschließlich Felder überschrieben, die dieses Modul kennt; alles andere bleibt, wie es in der Vorlage steht.
 * ═══════════════════════════════════════════════════════════════ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NM_DOCX = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const W14 = 'http://schemas.microsoft.com/office/word/2010/wordml';
  const XMLNS = 'http://www.w3.org/XML/1998/namespace';

  const kids = (el, name) => Array.from(el.childNodes).filter(n => n.nodeType === 1 && n.namespaceURI === W && n.localName === name);
  const alle = (el, name) => Array.from(el.getElementsByTagNameNS(W, name));
  const norm = s => String(s).replace(/\s+/g, ' ').trim();
  const zellText = tc => norm(alle(tc, 't').map(t => t.textContent).join(''));

  function el(doc, name, attrs) {
    const e = doc.createElementNS(W, 'w:' + name);
    Object.keys(attrs || {}).forEach(k => e.setAttributeNS(k === 'space' ? XMLNS : W, k === 'space' ? 'xml:space' : 'w:' + k, attrs[k]));
    return e;
  }
  // Lauf mit Text; Schrift/Größe wird vom Beschriftungslauf der Zelle übernommen
  function lauf(doc, text, vorlageLauf, mitUmbruch) {
    const r = el(doc, 'r');
    const rpr = vorlageLauf && kids(vorlageLauf, 'rPr')[0];
    if (rpr) r.appendChild(rpr.cloneNode(true));
    if (mitUmbruch) r.appendChild(el(doc, 'br'));
    const t = el(doc, 't', { space: 'preserve' }); t.appendChild(doc.createTextNode(String(text))); r.appendChild(t);
    return r;
  }
  function tabellen(doc) { return alle(doc.documentElement, 'tbl'); }
  function findeZelle(doc, tblNr, beginntMit) {
    const tbl = tabellen(doc)[tblNr - 1]; if (!tbl) return null;
    for (const tr of kids(tbl, 'tr')) for (const tc of kids(tr, 'tc')) if (zellText(tc).replace(/^[☐☒]\s*/, '').startsWith(beginntMit)) return tc;
    return null;
  }
  function pflichtZelle(doc, tblNr, label) {
    const tc = findeZelle(doc, tblNr, label);
    if (!tc) throw new Error('Feld „' + label + '“ (Tabelle ' + tblNr + ') im DATEV-Dokument nicht gefunden – wurde die Vorlage verändert?');
    return tc;
  }
  function ersterLauf(p) { return kids(p, 'r')[0] || null; }

  // Wert in eine eigene Zeile unter der Beschriftung (Beschriftungsabsatz bleibt unangetastet)
  function wertUnterLabel(doc, tc, wert) {
    const ps = kids(tc, 'p'); const p1 = ps[0]; const vorlage = ersterLauf(p1);
    let ziel = ps[1];
    if (!ziel) { ziel = el(doc, 'p'); const ppr = kids(p1, 'pPr')[0]; if (ppr) ziel.appendChild(ppr.cloneNode(true)); p1.parentNode.insertBefore(ziel, p1.nextSibling); }
    kids(ziel, 'r').forEach(r => ziel.removeChild(r));
    ziel.appendChild(lauf(doc, wert, vorlage));
  }
  // Wert hinter die Beschriftung in dieselbe Zeile (Muster der Vorlage: „Ersteintrittsdatum 15.10.2026“); alte Werte werden entfernt
  function wertHinterLabel(doc, tc, label, text) {
    const p = kids(tc, 'p')[0]; const runs = kids(p, 'r'); let acc = '', keep = -1;
    for (let i = 0; i < runs.length; i++) { acc += alle(runs[i], 't').map(t => t.textContent).join(''); if (norm(acc).length >= norm(label).length) { keep = i; break; } }
    if (keep < 0) throw new Error('Beschriftung „' + label + '“ nicht eindeutig gefunden.');
    const vorlage = runs[0];
    for (let i = runs.length - 1; i > keep; i--) p.removeChild(runs[i]);
    p.appendChild(lauf(doc, text, vorlage));
  }
  // gesamten ersten Absatz durch einen Wert ersetzen (Betragszellen, Datum)
  function absatzErsetzen(doc, tc, text) {
    const p = kids(tc, 'p')[0]; const runs = kids(p, 'r'); const vorlage = runs[0] || null;
    runs.forEach(r => p.removeChild(r)); p.appendChild(lauf(doc, text, vorlage));
  }
  // Kontrollkästchen (Word-Inhaltssteuerelement) neben dem Text „label“ setzen
  function haken(doc, tc, label, an) {
    let getroffen = 0;
    kids(tc, 'p').forEach(p => {
      const kinder = Array.from(p.childNodes);
      kinder.forEach((k, i) => {
        if (!(k.nodeType === 1 && k.namespaceURI === W && k.localName === 'sdt')) return;
        const cb = Array.from(k.getElementsByTagNameNS(W14, 'checkbox'))[0]; if (!cb) return;
        let nach = ''; for (let j = i + 1; j < kinder.length; j++) { const n = kinder[j]; if (n.nodeType === 1 && n.localName === 'sdt') break; nach += alle(n, 't').map(t => t.textContent).join(''); if (n.localName === 'r' && n.getElementsByTagNameNS(W, 'tab').length) break; }
        if (!norm(nach).startsWith(label)) return;
        Array.from(cb.getElementsByTagNameNS(W14, 'checked')).forEach(c => c.setAttributeNS(W14, 'w14:val', an ? '1' : '0'));
        const t = alle(k.getElementsByTagNameNS(W, 'sdtContent')[0], 't')[0]; if (t) t.textContent = an ? '☒' : '☐';
        getroffen++;
      });
    });
    if (!getroffen) throw new Error('Kontrollkästchen „' + label + '“ nicht gefunden – wurde die Vorlage verändert?');
  }

  /**
   * w: { name, vorname, nachname, geburtsdatum (TT.MM.JJJJ), strasse, plz_ort, eintritt (TT.MM.JJJJ), beruf, stunden (Text, z. B. '30'),
   *      vollzeit (boolean), grundgehalt ('3.051,98 €'), sue ('138,46 €'), vertragsdatum (TT.MM.JJJJ) }
   */
  function befuellen(docXml, headerXml, w, DOMParserK, SerializerK) {
    const P = new DOMParserK(), S = new SerializerK();
    const doc = P.parseFromString(docXml, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error('Das DATEV-Dokument ist nicht lesbar.');
    // 1 Persönliche Angaben (weiße Felder: Mitarbeiter:in prüft/ergänzt)
    wertUnterLabel(doc, pflichtZelle(doc, 1, 'Familienname'), w.nachname);
    wertUnterLabel(doc, pflichtZelle(doc, 1, 'Vorname'), w.vorname);
    wertUnterLabel(doc, pflichtZelle(doc, 1, 'Geburtsdatum'), w.geburtsdatum);
    wertUnterLabel(doc, pflichtZelle(doc, 1, 'Straße, Hausnummer'), w.strasse);
    wertUnterLabel(doc, pflichtZelle(doc, 1, 'PLZ, Ort'), w.plz_ort);
    // 3 Beschäftigung
    wertUnterLabel(doc, pflichtZelle(doc, 3, 'Eintrittsdatum'), w.eintritt);
    wertHinterLabel(doc, pflichtZelle(doc, 3, 'Ersteintrittsdatum'), 'Ersteintrittsdatum', ' ' + w.eintritt);
    wertUnterLabel(doc, pflichtZelle(doc, 3, 'Berufsbezeichnung'), w.beruf);
    // 5 Arbeitszeit
    const az = pflichtZelle(doc, 5, 'Wöchentliche Arbeitszeit');
    wertHinterLabel(doc, az, 'Wöchentliche Arbeitszeit', ' ' + w.stunden + ' Stunden');
    haken(doc, az, 'Vollzeit', !!w.vollzeit); haken(doc, az, 'Teilzeit', !w.vollzeit);
    // 6 Vertragsform: nur das zutreffende Feld (unbefristet)
    haken(doc, pflichtZelle(doc, 6, 'Unbefristet, Vollzeit'), 'Unbefristet, Vollzeit', !!w.vollzeit);
    haken(doc, pflichtZelle(doc, 6, 'Unbefristet, Teilzeit'), 'Unbefristet, Teilzeit', !w.vollzeit);
    // 9 Entlohnung (Betragsspalte der Zeilen Grundgehalt / SuE Zulage)
    const tb9 = tabellen(doc)[8];
    kids(tb9, 'tr').forEach(tr => {
      const zs = kids(tr, 'tc'); const bez = zellText(zs[0]);
      if (bez.startsWith('Grundgehalt')) absatzErsetzen(doc, zs[1], w.grundgehalt);
      else if (bez.startsWith('SuE')) absatzErsetzen(doc, zs[1], w.sue);
    });
    // 13 Unterschrift Arbeitgeber: Datum
    const tb15 = tabellen(doc)[14]; const zeile15 = kids(tb15, 'tr')[1];
    absatzErsetzen(doc, kids(zeile15, 'tc')[0], w.vertragsdatum);
    // Das in der Vorlage enthaltene Unterschriftsbild der Geschäftsführung bleibt unverändert stehen

    const kopf = headerXml ? (function () {
      const h = P.parseFromString(headerXml, 'application/xml');
      const ts = alle(h.documentElement, 't'); const i = ts.findIndex(t => norm(t.textContent) === 'Personalnummer');
      const nach = ts.slice(i + 1).find(t => norm(t.textContent) !== '');
      if (i < 0 || !nach) throw new Error('Namensfeld in der Kopfzeile des DATEV-Dokuments nicht gefunden.');
      nach.textContent = w.name; return S.serializeToString(h);
    })() : null;
    const dekl = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n';
    const strip = s => s.replace(/^<\?xml[^>]*\?>\s*/, '');
    return { document: dekl + strip(S.serializeToString(doc)), header: kopf ? dekl + strip(kopf) : null };
  }

  /** JSZip-Instanz erwartet; liefert Base64 des befüllten docx. */
  async function personalfragebogen(zipBytes, w, deps) {
    const zip = await deps.JSZip.loadAsync(zipBytes);
    const dateiDoc = zip.file('word/document.xml'), dateiHead = zip.file('word/header1.xml');
    if (!dateiDoc) throw new Error('Das ist kein Word-Dokument (word/document.xml fehlt).');
    const out = befuellen(await dateiDoc.async('string'), dateiHead ? await dateiHead.async('string') : null, w, deps.DOMParser, deps.XMLSerializer);
    zip.file('word/document.xml', out.document, { createFolders: false });
    if (out.header) zip.file('word/header1.xml', out.header, { createFolders: false });
    return zip.generateAsync({ type: 'base64', compression: 'DEFLATE', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }

  return { personalfragebogen, befuellen };
});

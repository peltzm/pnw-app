/* ═══════════════════════════════════════════════════════════════
 * PNW Vorlagen-Renderer (Onboarding-App, Bereich „Neue Mitarbeiter")
 * Erzeugt aus einer Block-Vorlage (JSON, liegt in SharePoint) und den Eingabewerten
 * eine pdfmake-docDefinition im Layout des Berichtsgenerators (DIN A4).
 * Enthält bewusst KEINEN Vertragstext — die Vorlage kommt zur Laufzeit aus SharePoint.
 * Läuft im Browser (pdfMake) und in Node (Tests).
 * ═══════════════════════════════════════════════════════════════ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NM_PDF = factory();
})(typeof self !== 'undefined' ? self : this, function () {

  const C = { braun: '#5A2D15', terra: '#A15F38', ink: '#211F1B', muted: '#4A4640', meta: '#8A857B', rahmen: '#D8D2C6' };
  const PAGE_W = 595.28, MX = 54.5, TEXT_W = PAGE_W - 2 * MX;
  const FUSS = [
    'Praxis NeueWege GmbH, Sitz: Hopfenstr. 22 • 85283 Wolnzach',
    'Registergericht: Amtsgericht Ingolstadt HRB 13133 • Geschäftsführer: Sonja Peltz, Markus Peltz',
    'Raiffeisenbank Hallertau eG IBAN DE94 7016 9693 0000 0574 52',
  ];

  // {{platzhalter}} ersetzen; fehlende bleiben sichtbar stehen (damit nichts still verschwindet)
  function fuellen(text, vals) {
    return String(text).replace(/\{\{(\w+)\}\}/g, (m, k) => (vals[k] !== undefined && vals[k] !== null && vals[k] !== '') ? String(vals[k]) : m);
  }
  function fuellenDeep(tpl, vals) {
    const esc = {}; Object.keys(vals).forEach(k => { esc[k] = JSON.stringify(String(vals[k])).slice(1, -1); });
    return JSON.parse(fuellen(JSON.stringify(tpl), esc));
  }
  function fehlende(tpl, vals) {
    const s = new Set();
    JSON.stringify(tpl.blocks).replace(/\{\{(\w+)\}\}/g, (m, k) => { if (vals[k] === undefined || vals[k] === null || vals[k] === '') s.add(k); return m; });
    return Array.from(s);
  }
  // **fett** -> Textläufe
  function laeufe(text) {
    return String(text).split('**').map((s, i) => i % 2 ? { text: s, font: 'KodchasanSemi' } : { text: s });
  }
  function h2(text) {
    return {
      unbreakable: true, headlineLevel: 1,
      stack: [
        { text, font: 'Baskerville', bold: true, fontSize: 10.8, color: C.braun },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: TEXT_W, y2: 0, lineWidth: 0.8, lineColor: C.braun }], margin: [0, 3, 0, 0] },
      ],
      margin: [0, 11, 0, 5],
    };
  }
  function p(text, extra) {
    return Object.assign({ text: laeufe(text), fontSize: 9.6, lineHeight: 1.42, color: C.ink, alignment: 'justify', margin: [0, 0, 0, 4.5] }, extra || {});
  }
  function sub(label, text) {
    return {
      columns: [{ width: 26, text: label, margin: [12, 0, 0, 0], fontSize: 9.6, color: C.ink },
                { width: '*', text: laeufe(text), fontSize: 9.6, lineHeight: 1.42, color: C.ink, alignment: 'justify' }],
      margin: [0, 0, 0, 2.5],
    };
  }
  function linieSpalte(beschriftung) {
    return { width: 210, stack: [
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.6, lineColor: C.ink }] },
      { text: beschriftung, fontSize: 8, color: C.meta, margin: [0, 2, 0, 0] } ] };
  }
  function unterschrift(text) {
    return { unbreakable: true, stack: [
      p(text, { margin: [0, 8, 0, 0] }),
      { columns: [linieSpalte('Ort, Datum'), { width: 30, text: '' }, linieSpalte('Ort, Datum')], margin: [0, 30, 0, 0] },
      { columns: [linieSpalte('Unterschrift Arbeitgeber'), { width: 30, text: '' }, linieSpalte('Unterschrift Arbeitnehmer')], margin: [0, 30, 0, 0] },
    ] };
  }

  // Feldkästen: rows = [[{l:'Name', v:'Steiger', w:0.4}, ...]]  (alle Zeilen eines Blocks gleich viele Zellen; w = Anteil der Textbreite)
  function felder(rows) {
    const body = rows.map(r => r.map(c => ({
      stack: [{ text: c.l || '', fontSize: 6.8, color: C.meta, margin: [0, 0, 0, 1.5] },
              { text: (c.v == null || c.v === '') ? ' ' : String(c.v), font: 'KodchasanSemi', fontSize: 10.2, color: C.ink }],
      margin: [6, 4, 6, 5] })));
    const widths = rows[0].map(c => c.w ? c.w * (TEXT_W - 1.6) : '*');
    return { table: { widths, body }, margin: [0, 0, 0, 8],
             layout: { hLineWidth: () => 0.8, vLineWidth: () => 0.8, hLineColor: () => C.ink, vLineColor: () => C.ink } };
  }
  const AG_GRAU = '#E4E4E4';
  function box(on) {
    const cv = [{ type: 'rect', x: 0.5, y: 1.2, w: 9, h: 9, lineWidth: 0.8, lineColor: C.ink }];
    if (on) cv.push({ type: 'line', x1: 2, y1: 2.8, x2: 8, y2: 8.8, lineWidth: 1, lineColor: C.ink }, { type: 'line', x1: 8, y1: 2.8, x2: 2, y2: 8.8, lineWidth: 1, lineColor: C.ink });
    return { width: 13, canvas: cv };
  }
  const istAn = v => v === true || v === 'true';
  function optZeile(items) {
    const cols = []; items.forEach(o => { cols.push(box(istAn(o.on))); cols.push({ width: 'auto', text: o.t, fontSize: 8.8, color: C.ink, margin: [0, 0, 11, 0] }); });
    return { columns: cols, columnGap: 2, margin: [0, 1, 0, 2] };
  }
  // Formularzellen: {l:Beschriftung, v:Wert, ag:true (Arbeitgeber, grau), opts:[{t,on}], proZeile:n, kopf:true, h:Extrahöhe}
  function zelle(c) {
    const stack = [];
    if (c.kopf) stack.push({ text: c.l || '', font: 'KodchasanSemi', fontSize: 8.6, color: C.braun });
    else if (c.l) stack.push({ text: c.l, fontSize: 7.4, color: C.meta, margin: [0, 0, 0, 1.5] });
    const hat = (c.v != null && String(c.v).trim() !== '');
    if (hat) stack.push({ text: String(c.v), font: 'KodchasanSemi', fontSize: 9.6, color: C.ink });
    if (c.opts && c.opts.length) { const n = c.proZeile || c.opts.length; for (let i = 0; i < c.opts.length; i += n) stack.push(optZeile(c.opts.slice(i, i + n))); }
    const leer = !hat && !(c.opts && c.opts.length) && !c.kopf;
    const z = { stack, margin: [6, 4, 6, leer ? 15 + (c.h || 0) : 4] };
    if (c.ag) z.fillColor = AG_GRAU;
    return z;
  }
  function zeilen(b) {
    const n = b.rows[0].length; const w = b.widths || b.rows[0].map(() => 1 / n);
    return { unbreakable: true, margin: [0, 0, 0, 10], table: { widths: w.map(f => f * (TEXT_W - 1.6)), body: b.rows.map(r => r.map(zelle)) },
             layout: { hLineWidth: () => 0.7, vLineWidth: () => 0.7, hLineColor: () => C.ink, vLineColor: () => C.ink } };
  }
  function sek(text) {
    return { text, _sek: true, font: 'Baskerville', fontSize: 10.6, color: C.braun, margin: [0, 6, 0, 4] };
  }

  // Ankreuzfeld wird gezeichnet (Kodchasan enthält keine ☐/☒-Zeichen)
  function check(on, text) {
    const cv = [{ type: 'rect', x: 0.5, y: 1.5, w: 10, h: 10, lineWidth: 0.9, lineColor: C.ink }];
    if (on === 'true') on = true;
    if (on) { cv.push({ type: 'line', x1: 2, y1: 3, x2: 9, y2: 10, lineWidth: 1.1, lineColor: C.ink }, { type: 'line', x1: 9, y1: 3, x2: 2, y2: 10, lineWidth: 1.1, lineColor: C.ink }); }
    return { columns: [{ width: 24, canvas: cv }, { width: '*', text: laeufe(text), fontSize: 9.8, lineHeight: 1.35, color: C.ink }], margin: [8, 0, 0, 7] };
  }
  function unterschrift1(text, links, rechts) {
    return { unbreakable: true, stack: [
      p(text, { margin: [0, 14, 0, 0] }),
      { columns: [linieSpalte(links), { width: 30, text: '' }, linieSpalte(rechts)], margin: [0, 34, 0, 0] } ] };
  }

  /**
   * tpl: { blocks:[{t:'center'|'h2'|'p'|'sub'|'sign', ...}] }   vals: Platzhalterwerte
   * opts: { titel, kopfRechts, logo (data-URL), autor }
   */
  function docDefinition(tpl, vals, opts) {
    opts = opts || {};
    tpl = fuellenDeep(tpl, vals || {});
    const content = [{ text: opts.titel || tpl.name, font: 'Baskerville', bold: true, fontSize: opts.titelGroesse || 15, alignment: opts.titelAlign || 'center', color: C.ink, margin: [0, opts.titelOben != null ? opts.titelOben : 68, 0, 10] }];
    tpl.blocks.forEach(b => {
      const t = b.text || '';
      if (b.t === 'center') {
        const el = p(t, { alignment: 'center', margin: [0, 0, 0, b.after != null ? b.after : 3] });
        if (b.bold) el.text = [{ text: t, font: 'KodchasanSemi' }];
        content.push(el);
      }
      else if (b.t === 'h2') content.push(h2(t));
      else if (b.t === 'p') content.push(p(t));
      else if (b.t === 'sub') content.push(sub(b.label, t));
      else if (b.t === 'sign') content.push(unterschrift(t));
      else if (b.t === 'pl') content.push(p(t, { alignment: 'left' }));
      else if (b.t === 'felder') content.push(felder(b.rows));
      else if (b.t === 'check') content.push(check(istAn(b.on), t));
      else if (b.t === 'sign1') content.push(unterschrift1(t, b.links || 'Ort, Datum', b.rechts || 'Unterschrift'));
      else if (b.t === 'abstand') content.push({ text: ' ', fontSize: b.h || 8 });
      else if (b.t === 'zeilen') {
        const z = zeilen(b), vor = content[content.length - 1];
        if (vor && vor._sek) { content.pop(); content.push({ unbreakable: true, stack: [vor, z] }); } else content.push(z);
      }
      else if (b.t === 'sek') content.push(sek(t));
      else if (b.t === 'klein') content.push({ text: t, fontSize: 8, color: C.muted, margin: [0, 0, 0, b.after != null ? b.after : 6], lineHeight: 1.3 });
    });
    return {
      pageSize: 'A4',
      pageMargins: [MX, 50, MX, 74],
      defaultStyle: { font: 'Kodchasan', fontSize: 9.6, color: C.ink },
      info: { title: opts.titel || tpl.name, author: opts.autor || 'Praxis NeueWege GmbH' },
      background: (page) => (page === 1 && opts.logo) ? { image: opts.logo, width: 190, absolutePosition: { x: PAGE_W - MX - 190, y: 28 } } : null,
      header: (page) => page === 1 ? null : {
        margin: [MX, 24, MX, 0],
        stack: [
          { columns: [
            { text: 'PRAXIS NEUEWEGE · ' + String(opts.kopfLabel || opts.titel || tpl.name).toUpperCase(), font: 'KodchasanSemi', fontSize: 6.4, characterSpacing: 1, color: C.meta },
            { text: opts.kopfRechts || '', alignment: 'right', font: 'KodchasanMedium', fontSize: 8, color: C.muted } ] },
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: TEXT_W, y2: 0, lineWidth: 0.75, lineColor: C.rahmen }], margin: [0, 4, 0, 0] },
        ],
      },
      footer: (page, pages) => ({
        margin: [MX, 14, MX, 0],
        stack: [
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: TEXT_W, y2: 0, lineWidth: 1.1, lineColor: C.terra }] },
          { columns: [
            { width: '*', stack: (opts.fuss || FUSS).map(z => ({ text: z, fontSize: 7, color: C.meta, lineHeight: 1.15 })) },
            { width: 90, alignment: 'right', text: 'Seite ' + page + ' von ' + pages, fontSize: 8, color: C.meta },
          ], margin: [0, 5, 0, 0] },
        ],
      }),
      // Überschriften nie als letztes Element einer Seite (wie im Berichtsgenerator)
      pageBreakBefore: (node) => {
        if (!node.headlineLevel || !node.startPosition) return false;
        return (node.startPosition.pageInnerHeight - node.startPosition.top) < 66;
      },
      content,
    };
  }

  // Schriftkonfiguration (Dateien liegen in assets/fonts)
  const FONT_DATEIEN = ['Kodchasan-Regular.ttf', 'Kodchasan-Medium.ttf', 'Kodchasan-SemiBold.ttf', 'Kodchasan-Bold.ttf', 'Kodchasan-Italic.ttf',
                        'LibreBaskerville-Regular.ttf', 'LibreBaskerville-Bold.ttf', 'LibreBaskerville-Italic.ttf'];
  const FONTS = {
    Kodchasan:       { normal: 'Kodchasan-Regular.ttf', bold: 'Kodchasan-Bold.ttf', italics: 'Kodchasan-Italic.ttf', bolditalics: 'Kodchasan-Bold.ttf' },
    KodchasanMedium: { normal: 'Kodchasan-Medium.ttf', bold: 'Kodchasan-SemiBold.ttf', italics: 'Kodchasan-Italic.ttf', bolditalics: 'Kodchasan-SemiBold.ttf' },
    KodchasanSemi:   { normal: 'Kodchasan-SemiBold.ttf', bold: 'Kodchasan-Bold.ttf', italics: 'Kodchasan-Italic.ttf', bolditalics: 'Kodchasan-Bold.ttf' },
    Baskerville:     { normal: 'LibreBaskerville-Regular.ttf', bold: 'LibreBaskerville-Bold.ttf', italics: 'LibreBaskerville-Italic.ttf', bolditalics: 'LibreBaskerville-Bold.ttf' },
  };

  return { docDefinition, fuellen, fuellenDeep, fehlende, FONTS, FONT_DATEIEN };
});

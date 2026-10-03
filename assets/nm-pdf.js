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

  /**
   * tpl: { blocks:[{t:'center'|'h2'|'p'|'sub'|'sign', ...}] }   vals: Platzhalterwerte
   * opts: { titel, kopfRechts, logo (data-URL), autor }
   */
  function docDefinition(tpl, vals, opts) {
    opts = opts || {};
    const content = [{ text: opts.titel || tpl.name, font: 'Baskerville', bold: true, fontSize: 15, alignment: 'center', color: C.ink, margin: [0, 68, 0, 10] }];
    tpl.blocks.forEach(b => {
      const t = fuellen(b.text || '', vals);
      if (b.t === 'center') {
        const el = p(t, { alignment: 'center', margin: [0, 0, 0, b.after != null ? b.after : 3] });
        if (b.bold) el.text = [{ text: t, font: 'KodchasanSemi' }];
        content.push(el);
      }
      else if (b.t === 'h2') content.push(h2(t));
      else if (b.t === 'p') content.push(p(t));
      else if (b.t === 'sub') content.push(sub(b.label, t));
      else if (b.t === 'sign') content.push(unterschrift(t));
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
            { text: 'PRAXIS NEUEWEGE · ' + String(opts.titel || tpl.name).toUpperCase(), font: 'KodchasanSemi', fontSize: 6.4, characterSpacing: 1, color: C.meta },
            { text: opts.kopfRechts || '', alignment: 'right', font: 'KodchasanMedium', fontSize: 8, color: C.muted } ] },
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: TEXT_W, y2: 0, lineWidth: 0.75, lineColor: C.rahmen }], margin: [0, 4, 0, 0] },
        ],
      },
      footer: (page, pages) => ({
        margin: [MX, 14, MX, 0],
        stack: [
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: TEXT_W, y2: 0, lineWidth: 1.1, lineColor: C.terra }] },
          { columns: [
            { width: '*', stack: FUSS.map(z => ({ text: z, fontSize: 7, color: C.meta, lineHeight: 1.15 })) },
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

  return { docDefinition, fuellen, fehlende, FONTS, FONT_DATEIEN };
});

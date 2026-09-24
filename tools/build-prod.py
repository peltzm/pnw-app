#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Erzeugt index.html (Produktion) aus berichtsgenerator-rc.html.

Der RC läuft gegen die Beta-Liste und trägt Test-Kennzeichnungen; hier werden
ausschließlich diese Konfigurationsstellen umgestellt — kein anderer Code wird
verändert. Jede Ersetzung muss genau einmal treffen, sonst bricht das Skript ab.

Aufruf:  python3 tools/build-prod.py <sha7>
"""
import re, sys, pathlib

if len(sys.argv) != 2 or not re.fullmatch(r'[0-9a-f]{7}', sys.argv[1]):
    sys.exit('Aufruf: build-prod.py <git-sha7>')
sha = sys.argv[1]

root = pathlib.Path(__file__).resolve().parent.parent
src = (root / 'berichtsgenerator-rc.html').read_text(encoding='utf-8')

def ersetze(alt, neu, anzahl=1, name=''):
    global src
    n = src.count(alt)
    if n != anzahl:
        sys.exit(f'ABBRUCH — "{name or alt[:50]}": {n}x gefunden, {anzahl}x erwartet')
    src = src.replace(alt, neu)

# 1) Backend: Produktionsliste und -ordner
ersetze("  outputFolder: '/Verlaufsberichte_Beta',", "  outputFolder: '/Verlaufsberichte',", name='outputFolder')
ersetze("  listName: 'Verlaufsberichte_Entwuerfe_Beta'", "  listName: 'Verlaufsberichte_Entwuerfe'", name='listName')

# 2) Kennzeichnungen
ersetze("<title>Berichtsgenerator RC — Praxis NeueWege</title>", "<title>Berichtsgenerator — Praxis NeueWege</title>", name='title')
ersetze("[RC]", "", anzahl=src.count("[RC]"), name='[RC]-Betreffe')
src = re.sub(r"const APP_VERSION = 'RC-[0-9a-f]+';[^\n]*", f"const APP_VERSION = 'v{sha}'; // auto-updated on deploy", src, count=1)

# 3) Beta-Einrichtung (?setup=1) hat in der Produktion nichts zu suchen
a = src.index("/* ═══════════════════════════════════════════════════════════════════════\n * EIGENES BETA-BACKEND")
b = src.index("// ─── BACKUP: alle Listeneinträge als JSON herunterladen")
src = src[:a] + src[b:]
a = src.index("// Einrichtung ueber ?setup=1 anstossen\nfunction pruefeSetupAufruf() {")
b = src.index("\n}\n", a) + len("\n}\n")
src = src[:a] + src[b:]
ersetze("if (pruefeSetupAufruf() || pruefeExportAufruf() || pruefePositionenAufruf()) return;", "if (pruefeExportAufruf() || pruefePositionenAufruf()) return;", name='setup-aufruf')

# 4) Fehlermeldung ohne Beta-Hinweis
ersetze(' Das Beta-Backend ist noch nicht eingerichtet — die Seite einmalig mit ?setup=1 aufrufen.', '', name='beta-hinweis')

# Kontrolle
for muster in ['_Beta', 'BETA_BACKEND', 'betaBackendEinrichten', 'pruefeSetupAufruf', '[RC]', 'RC-']:
    if muster in src:
        sys.exit(f'ABBRUCH — Rest von "{muster}" im Prod-Build')

(root / 'index.html').write_text(src, encoding='utf-8')
print(f'index.html geschrieben — Version v{sha}, {len(src)} Zeichen')

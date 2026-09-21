# Kurzanleitungen (DIN A4, PNW-CI nach Berichtsgenerator-Layout) als PDF
from playwright.sync_api import sync_playwright
CSS="""
@page{size:A4;margin:13mm 14mm 12mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Kodchasan',sans-serif;font-size:9.6pt;line-height:1.45;color:#211F1B;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.kopf{display:flex;justify-content:space-between;align-items:center;border-bottom:.75pt solid #D8D2C6;padding-bottom:8pt;margin-bottom:9pt}
h1{font-family:'Libre Baskerville',serif;font-size:19pt;color:#5A2D15;line-height:1.15}
.unter{font-family:'Libre Baskerville',serif;font-style:italic;font-size:10pt;color:#A15F38;margin:2pt 0 3pt}
.eyebrow{font-size:6.6pt;font-weight:600;letter-spacing:1pt;color:#8A857B;text-transform:uppercase}
.kopf img{height:40pt}
.kern{background:#F5F0EA;border-left:3pt solid #A15F38;padding:6pt 10pt;border-radius:0 5pt 5pt 0;margin-bottom:10pt;font-size:9.4pt}
.kern b{color:#7B3F1E}
.schritte{display:grid;grid-template-columns:1fr 1fr;gap:9pt 14pt}
.s{display:flex;gap:9pt;break-inside:avoid;border:.75pt solid #E4DED2;border-radius:7pt;padding:8pt 9pt;background:#fff}
.s .t{flex:1}
.nr{font-family:'Libre Baskerville',serif;font-weight:700;color:#A15F38;font-size:15pt;line-height:1}
h2{font-family:'Libre Baskerville',serif;font-size:10.6pt;color:#5A2D15;margin:2pt 0 3pt}
.s p{margin-bottom:3pt}.s ul{padding-left:11pt}.s li{margin-bottom:1.5pt}
.shot{flex:0 0 auto;border:.75pt solid #D8D2C6;border-radius:6pt;overflow:hidden;align-self:flex-start;box-shadow:0 1pt 3pt rgba(0,0,0,.08)}
.shot img{display:block;width:100%}
.handy{width:92pt}.mail{width:150pt}
.breit{grid-column:1/-1}
.fuss{display:grid;grid-template-columns:1fr 1fr;gap:9pt 14pt;margin-top:10pt}
.box{border-top:1.1pt solid #A15F38;padding-top:5pt;font-size:8.8pt}
.box h3{font-size:7pt;letter-spacing:.8pt;text-transform:uppercase;color:#8A857B;margin-bottom:2pt}
.ende{margin-top:9pt;font-size:7pt;color:#8A857B;text-align:center}
"""
def seite(titel,unter,kern,schritte,boxen):
    return f"""<html><head><meta charset="utf-8"><style>{CSS}</style></head><body>
<div class="kopf"><div><h1>{titel}</h1><div class="unter">{unter}</div><div class="eyebrow">Praxis NeueWege · Orientierungsgespräche · Kurzanleitung</div></div><img src="logo-praxisneuewege.png"></div>
<div class="kern">{kern}</div><div class="schritte">{''.join(schritte)}</div>
<div class="fuss">{''.join(f'<div class="box"><h3>{h}</h3>{t}</div>' for h,t in boxen)}</div>
<div class="ende">Praxis NeueWege GmbH · Hopfenstr. 22 · 85283 Wolnzach · Stand 09/2026 · Screenshots mit Musterdaten</div></body></html>"""
def s(nr,titel,text,bild=None,art='handy',breit=False):
    return f'<div class="s{" breit" if breit else ""}"><div class="nr">{nr}</div><div class="t"><h2>{titel}</h2>{text}</div>{f"""<div class="shot {art}"><img src="{bild}"></div>""" if bild else ""}</div>'

ma=seite('Dein Vorbereitungsbogen','In 10 Minuten startklar fürs Orientierungsgespräch',
 '<b>Worum geht’s?</b> Vor dem Gespräch füllst du online einen kurzen Bogen aus – am Handy oder am PC. Es gibt kein Richtig oder Falsch, Stichpunkte genügen. <b>Abgabe: spätestens zwei Tage vor deinem Termin.</b>',
 [s(1,'Einladung öffnen','<p>Du bekommst eine E-Mail von Sonja oder Markus. Auf <b>„Zum Vorbereitungsbogen“</b> tippen und mit deinem <b>Praxis-NeueWege-Konto</b> anmelden.</p><p>Der Link ist persönlich – bitte nicht weitergeben.</p>','ma_0_mail.png','mail',True),
  s(2,'Ausfüllen','<ul><li><b>Teil 1:</b> je Aussage 1–5 antippen (1 = trifft gar nicht zu, 5 = trifft voll zu) oder <b>k. A.</b>; Kommentar ist freiwillig.</li><li><b>Teil 2:</b> höchstens 3 Themen, über die du sprechen willst.</li><li><b>Teil 3:</b> drei kurze Fragen.</li><li><b>Teil 5:</b> deine Ziel-Vorschläge (optional).</li></ul>','ma_2_skala.png'),
  s(3,'Zahlen & Fakten ansehen','<p><b>Teil 4</b> kommt automatisch aus Kilanka: Fälle, Stunden, Urlaub, Abwesenheiten, Stundenkonto, ggf. Fahrzeug.</p><p>Du musst dort nichts eintragen. Stimmt etwas nicht? Einfach im Gespräch ansprechen.</p>','ma_4_leiste.png'),
  s(4,'Speichern & abgeben','<p>Die App <b>speichert automatisch</b>. Du kannst jederzeit aufhören und über denselben Link weitermachen.</p><p>Fertig? Unten auf <b>„Final abgeben“</b>. Danach ist der Bogen nicht mehr änderbar.</p><p>Unter <b>„Mehr“</b> findest du Drucken, Löschen und die Papier-Version.</p>',None,'handy',True)],
 [('Lieber auf Papier?','„Mehr“ → <b>„Auf Papier ausfüllen“</b> druckt ein leeres Formular mit deinen Daten und Zahlen. Bitte <b>spätestens zwei Tage vor dem Termin</b> bei Sonja oder Markus abgeben.'),
  ('Wer liest mit?','Sonja und Markus. Deine Teamleitung schätzt Teil 1 unabhängig selbst ein und bekommt deinen Bogen <b>erst danach</b>. Sonst niemand.'),
  ('Wenn etwas hakt','Meldung „App wurde aktualisiert“: einfach bestätigen – deine Eingaben bleiben erhalten. Sonst Seite neu laden oder Markus Bescheid geben.'),
  ('Gut zu wissen','Ehrliche Antworten helfen am meisten – auch kritische. Die Werte sind Gesprächsanlass, keine Beurteilung.')])

tl=seite('Dein Team einschätzen','Kurzanleitung für Teamleitungen',
 '<b>Das Prinzip: erst einschätzen, dann ansehen.</b> Du schätzt jedes Teammitglied in Teil 1 aus deiner Sicht ein – unabhängig von der Selbsteinschätzung. Die bekommst du erst zu sehen, wenn du deine eigene abgegeben hast. <b>Abgabe: spätestens zwei Tage vor dem jeweiligen Gespräch.</b>',
 [s(1,'Start','<p>Sobald jemand aus deinem Team abgegeben hat, bekommst du eine <b>kurze Info-Mail – ohne Inhalte</b>. Auf <b>„Mein Team einschätzen“</b> tippen und anmelden.</p><p>Du kannst auch vorher starten: Button „Mein Team einschätzen“ oben in deinem eigenen Bogen.</p>','tl_0_mail.png','mail',True),
  s(2,'Teammitglied wählen','<p>Du siehst dein Team mit Status:</p><ul><li><b>Offen</b> – noch nichts eingetragen</li><li><b>Entwurf</b> – angefangen, automatisch gespeichert</li><li><b>Abgegeben</b> – fertig</li></ul><p>Auf <b>„Einschätzen“</b> tippen.</p>','tl_1_team.png'),
  s(3,'Einschätzen','<p>Es sind dieselben Aussagen wie im Bogen der Person. Frage dich: <b>Wie würde ich das für sie oder ihn beantworten?</b></p><ul><li>1–5 antippen, <b>k. A.</b>, wenn du es nicht beurteilen kannst (z. B. Vergütung).</li><li>Kommentar mit konkretem Beispiel hilft im Gespräch.</li></ul>','tl_2_einschaetzen.png'),
  s(4,'Abgeben – danach kommt der Vergleich','<p><b>„Einschätzung abgeben“</b> – danach ist sie <b>nicht mehr änderbar</b>.</p><p>Haben du und die Person abgegeben, schickt dir die Geschäftsführung die Selbsteinschätzung per Mail: <b>beide Werte nebeneinander</b>, Abweichungen ab 2 Punkten sind gelb markiert.</p>','tl_3_mail.png','mail',True)],
 [('Wer sieht deine Einschätzung?','Nur du sowie Sonja und Markus. Die eingeschätzte Person sieht sie <b>nicht</b> – sie weiß aber, dass du einschätzt. Im Gespräch liegen beide Sichten nebeneinander.'),
  ('Vertraulichkeit','Die Mail mit der Selbsteinschätzung ist eine Personalunterlage: nicht weiterleiten, nach dem Gespräch löschen.'),
  ('Dein eigener Bogen','Du füllst zusätzlich deinen eigenen Vorbereitungsbogen aus – wie alle anderen. Dich schätzt Sonja ein.'),
  ('Wenn etwas hakt','Team unvollständig oder jemand fehlt? Dann stimmt die Team-Gruppe in Microsoft 365 nicht – bitte Markus Bescheid geben.')])

with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page()
    for name,html in (('Anleitung_Orientierungsgespraech_Mitarbeitende',ma),('Anleitung_Orientierungsgespraech_Teamleitung',tl)):
        open(name+'.html','w',encoding='utf-8').write(html)
        pg.goto('file:///home/claude/anl/'+name+'.html'); pg.wait_for_timeout(300)
        pg.pdf(path='/mnt/user-data/outputs/'+name+'.pdf',prefer_css_page_size=True,print_background=True)
    b.close()

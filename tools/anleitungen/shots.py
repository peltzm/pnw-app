# Screenshots direkt aus der App (Musterdaten) für die Kurzanleitungen
import json
from playwright.sync_api import sync_playwright
K={'stand':'2026-09-21T08:00:00Z','wochenstunden':30,'teamleitung':{'name':'Tanja Teamleitung','mail':'tanja@praxisneuewege.de','quelle':'gruppe'},'faelle':8,'faelleHb':6,'faelleMb':1,'faelleV':1,'flsIst':74.5,'flsMonat':'2026-08','flsSoll64':80.6,
 'urlaubGenommen':17,'urlaubGeplant':5,'urlaubRest':8,'krankTage':9,'kindKrankTage':0,'fortbildungTage':3,'jahr':2026,
 'erweitert':{'zeitkonto':{'vorhanden':True,'konten':[{'typ':'Stundenkonto','stunden':12.5}]},
  'anteil':{'vorhanden':True,'von':'2026-06-01','bis':'2026-08-31','gesamtStd':338.5,'dienstplanEinbezogen':True,'klientPct':61,'stationaerPct':0,'fahrtPct':19,'dokuPct':6,'medialPct':3,'internPct':11},
  'fahrzeug':{'vorhanden':False,'grund':'kein Dienstwagen'}}}
BASIS="""document.getElementById('loginScreen').style.display='none';document.getElementById('appScreen').style.display='block';versionOk=async()=>true;"""
with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context(viewport={'width':360,'height':700},device_scale_factor=2.5,is_mobile=True)
    pg=ctx.new_page(); pg.route('**/*', lambda r: r.continue_() if r.request.url.startswith('file:') else r.abort())
    URL='file:///home/claude/pnw/orientierungsgespraech-beta.html?r=2026-09&v=B'
    # ── Mitarbeiter ──
    pg.goto(URL); pg.evaluate("(k)=>{"+BASIS+"""upn='maria@praxisneuewege.de';
      akt=entpacke({spId:'0',f:{MitarbeiterName:'Muster, Maria',MitarbeiterUpn:upn,Runde:'2026-09',Version:'B',OGStatus:'Entwurf',Termin:'2026-10-05T14:00',
        AntwortenJSON:JSON.stringify({skala:{sicher:4,asd:3},themen:['Arbeitsbelastung','Wertschätzung'],text:{},kommentar:{asd:'ASD oft schwer erreichbar'}}),KennzahlenJSON:JSON.stringify(k),LeitungJSON:''}});
      gfSicht=false;leseModus=false;renderBogen();}""",K); pg.wait_for_timeout(250)
    pg.screenshot(path='ma_1_start.png')
    pg.evaluate("document.querySelector('table.skala').scrollIntoView();window.scrollBy(0,-64)"); pg.screenshot(path='ma_2_skala.png')
    pg.evaluate("document.querySelector('.themen').scrollIntoView();window.scrollBy(0,-150)"); pg.screenshot(path='ma_3_themen.png')
    pg.evaluate("document.querySelectorAll('table.daten')[0].scrollIntoView();window.scrollBy(0,-110);document.getElementById('leiste').classList.add('offen');document.getElementById('saveStand').textContent='Gespeichert um 10:42 Uhr'"); pg.screenshot(path='ma_4_leiste.png')
    # Einladungs-Mail
    html=pg.evaluate("einladungHtml({name:'Muster, Maria'},'https://apps.praxisneuewege.de/orientierungsgespraech-beta.html?r=2026-09&v=B','05.10.2026, 14:00')")
    # ── Teamleitung ──
    pg.goto(URL.replace('&v=B','&tl=1')); pg.evaluate("()=>{"+BASIS+"""upn='tanja@praxisneuewege.de'; istGF=false;
      tlTeam=[{upn:'maria@praxisneuewege.de',name:'Maria Muster'},{upn:'ben@praxisneuewege.de',name:'Ben Beispiel'},{upn:'cara@praxisneuewege.de',name:'Cara Probe'}];
      items=[{spId:'5',f:{MitarbeiterUpn:tlKey(upn,'ben@praxisneuewege.de'),Runde:'2026-09',OGStatus:'Abgegeben'}},{spId:'6',f:{MitarbeiterUpn:tlKey(upn,'cara@praxisneuewege.de'),Runde:'2026-09',OGStatus:'Entwurf'}}];
      zeigeTeamleitung();}"""); pg.wait_for_timeout(250); pg.evaluate("document.querySelector('table.admin').scrollIntoView();window.scrollBy(0,-170)"); pg.screenshot(path='tl_1_team.png')
    pg.evaluate("""()=>{ const i={spId:'7',f:{MitarbeiterUpn:tlKey(upn,'maria@praxisneuewege.de'),MitarbeiterName:'Maria Muster',Runde:'2026-09',Version:'B',OGStatus:'Entwurf',AntwortenJSON:JSON.stringify({skala:{sicher:3,asd:'ka'},kommentar:{sicher:'in Krisen noch unsicher, sonst souverän'}})}}; items.push(i);
      akt=entpacke(i); tlModus=true; leseModus=false; renderTL(); document.querySelector('table.skala').scrollIntoView(); window.scrollBy(0,-64);}"""); pg.wait_for_timeout(200); pg.screenshot(path='tl_2_einschaetzen.png')
    mail1=pg.evaluate("""()=>mailRahmen('<p>Hallo Tanja,</p><p>Maria Muster hat den Vorbereitungsbogen für das Orientierungsgespräch am <b>05.10.2026, 14:00</b> abgegeben.</p><p>Bitte gib jetzt – falls noch nicht geschehen – <b>deine eigene Einschätzung zu Teil 1</b> ab. Die Selbsteinschätzung von Maria Muster erhältst du erst danach, damit deine Sicht unabhängig bleibt.</p>'+mailKnopf('#','Mein Team einschätzen'))""")
    mail2=pg.evaluate("""(k)=>{ const e=entpacke({spId:'1',f:{MitarbeiterName:'Muster, Maria',Runde:'2026-09',Version:'B',OGStatus:'Abgegeben',Termin:'2026-10-05T14:00',AntwortenJSON:JSON.stringify({skala:{sicher:5,asd:3,tl:4,team:4,fallzahl:3},themen:[],text:{},kommentar:{asd:'ASD oft schwer erreichbar'}}),KennzahlenJSON:JSON.stringify(k),LeitungJSON:''}});
      return bogenAlsHtml(e,'<p>Hallo Tanja,</p><p>du hast deine Einschätzung zu <b>Maria Muster</b> abgegeben – hier ist nun die Selbsteinschätzung. Daneben steht deine eigene Einschätzung zum direkten Vergleich.</p>',{skala:{sicher:3,asd:'ka',tl:4,team:4,fallzahl:3},kommentar:{sicher:'in Krisen noch unsicher'},kurz:'Du'}); }""",K)
    ctx.close()
    # Mails als schmale Ausschnitte rendern
    ctx=b.new_context(viewport={'width':560,'height':420},device_scale_factor=2); pg=ctx.new_page()
    for name,h,hoehe in (('ma_0_mail',html,400),('tl_0_mail',mail1,330),('tl_3_mail',mail2,430)):
        pg.set_viewport_size({'width':560,'height':hoehe}); pg.set_content('<body style="margin:14px 18px;background:#fff">'+h+'</body>'); pg.wait_for_timeout(150); pg.screenshot(path=name+'.png')
    b.close()
print('ok')

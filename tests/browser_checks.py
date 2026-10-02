import os, json, time, shutil
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
ROOT=Path.cwd()
OUT=ROOT/'tests'/'results'
OUT.mkdir(parents=True,exist_ok=True)
group=os.environ.get('QA_GROUP','layout')
results=[]
def check(name,ok,details=None):
    results.append({'name':name,'passed':bool(ok),'details':details})
    print(('PASS ' if ok else 'FAIL ')+name)
    if not ok: raise AssertionError(name+': '+str(details))
def view(w,h,touch=False):
    cdp('Emulation.setDeviceMetricsOverride',width=w,height=h,deviceScaleFactor=1,mobile=touch)
    cdp('Emulation.setTouchEmulationEnabled',enabled=touch,maxTouchPoints=1)
def shot(name):
    for attempt in range(2):
        try:
            shutil.copyfile(capture_screenshot(),OUT/(name+'.png'));return
        except TimeoutError:
            if attempt: raise
            time.sleep(.1)
def start():
    new_tab('http://127.0.0.1:8765/index.html?qa=1')
    target=current_tab()
    activate_tab(target)
    cdp('Emulation.setFocusEmulationEnabled',enabled=True)
    for item in list_tabs():
        if item['targetId']!=target['targetId'] and (item['url'].startswith('http://127.0.0.1:8765/') or item['url']=='about:blank'):
            close_tab(item)
    wait_for_load()
    js("localStorage.setItem('tsukikage-riichi-prefs-v3',JSON.stringify({speed:1500,riichiAuto:false,motion:'short',sound:false}));location.reload()")
    wait_for_load()
    js("Tsukikage.start({mode:'single',seed:12345})")
    js((ROOT/'tests'/'fixtures.js').read_text(encoding='utf-8'))
def fixture(hands):
    js('Fixtures.install(Tsukikage.game,Fixtures.rig('+json.dumps(hands)+'));')
def rect(selector):
    return js("(()=>{let b=document.querySelector("+json.dumps(selector)+").getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2}})()")
def click(selector):
    b=rect(selector);click_at_xy(b['x'],b['y'])
def touch(selector):
    b=rect(selector)
    cdp('Input.dispatchTouchEvent',type='touchStart',touchPoints=[{'x':b['x'],'y':b['y'],'id':1,'radiusX':2,'radiusY':2}])
    cdp('Input.dispatchTouchEvent',type='touchEnd',touchPoints=[])
def drag(selector,target=None,cancel=False):
    a=rect(selector);b=target or rect('#discardZone')
    cdp('Input.dispatchMouseEvent',type='mousePressed',x=a['x'],y=a['y'],button='left',clickCount=1)
    with ThreadPoolExecutor(max_workers=1) as pool:
        movement=pool.submit(cdp,'Input.dispatchMouseEvent',type='mouseMoved',x=b['x'],y=b['y'],button='none',buttons=1)
        for _ in range(10):
            if js("!!document.querySelector('.drag-ghost')"): break
            time.sleep(.02)
        if cancel: js("document.getElementById('handRow').dispatchEvent(new PointerEvent('pointercancel',{pointerId:1,bubbles:true}))")
        cdp('Input.dispatchMouseEvent',type='mouseReleased',x=b['x'],y=b['y'],button='left',clickCount=1)
        movement.result(timeout=8)
start()
if group=='layout':
    for w,h in [(1920,1080),(1366,768),(844,390),(740,360)]:
        view(w,h);js('Tsukikage.start({mode:"single",seed:12345})')
        values=js("({w:innerWidth,h:innerHeight,bw:document.body.scrollWidth,bh:document.body.scrollHeight,tiles:[...document.querySelectorAll('#handRow button[data-tile]')].map(e=>e.getBoundingClientRect().toJSON()),hud:document.getElementById('wallHud').getBoundingClientRect().toJSON(),seat:document.getElementById('seat3').getBoundingClientRect().toJSON(),hand:document.getElementById('handRow').getBoundingClientRect().toJSON()})")
        check(str(w)+'x'+str(h)+' page fits',values['bw']<=w and values['bh']<=h,values)
        check(str(w)+'x'+str(h)+' hand fully visible',all(t['left']>=0 and t['right']<=w and t['bottom']<=h for t in values['tiles']))
        a,b=values['hud'],values['seat'];overlap=a['left']<b['right'] and a['right']>b['left'] and a['top']<b['bottom'] and a['bottom']>b['top']
        check(str(w)+'x'+str(h)+' wall and character separate',not overlap)
        shot('play-'+str(w)+'x'+str(h))
    view(740,360)
    js("Tsukikage.start({seed:12345});const g=Tsukikage.game;for(const [i,n] of [[0,20],[1,16],[2,16],[3,16]])for(let k=0;k<n;k++)g.players[i].river.push({id:g.wall.pop(),riichi:k===6,tsumogiri:false,called:false});g.assertIntegrity();Tsukikage.render()")
    check('late-hand public rivers remain visible',js("(()=>{if(document.getElementById('stage').dataset.renderer==='three'){const d=Tsukikage.table3D.diagnostics();return d.publicTiles.length===68&&document.querySelectorAll('#table3DControls button[data-public-tile]').length===68}return [...document.querySelectorAll('.river .tile')].every(e=>{let a=e.getBoundingClientRect(),b=document.getElementById('stage').getBoundingClientRect();return a.left>=b.left&&a.right<=b.right&&a.top>=b.top&&a.bottom<=b.bottom})})()"))
    check('riichi declarations stay represented on the active table',js("(()=>{if(document.getElementById('stage').dataset.renderer==='three')return Tsukikage.table3D.diagnostics().publicTiles.filter(t=>t.riichi).length===4;return [...document.querySelectorAll('.river .riichi-tile')].every(e=>getComputedStyle(e).transform.startsWith('matrix(0, 1, -1, 0'))})()"))
    shot('late-hand-740x360')
elif group=='input':
    view(1366,768);fixture(['555m123p456s789m11z'])
    shot('input-before');click('[data-tile="16"]')
    check('first click selects without discarding',js('''Tsukikage.game.players[0].river.length===0&&document.querySelector('[data-tile="16"]').classList.contains('selected')'''))
    time.sleep(.9);click('[data-tile="17"]')
    check('another identical-type tile only changes selection',js('''Tsukikage.game.players[0].river.length===0&&document.querySelector('[data-tile="17"]').classList.contains('selected')'''))
    time.sleep(.9);click('[data-tile="17"]')
    check('same physical tile re-click without timing limit discards once',js("Tsukikage.game.players[0].river.length===1&&Tsukikage.game.players[0].river[0].id===17&&Tsukikage.game.players[0].hand.includes(16)"))
    js("Tsukikage.start({seed:12345})");fixture(['555m123p456s789m11z']);drag('[data-tile="16"]')
    check('valid drag discards once and removes ghost',js("Tsukikage.game.players[0].river.length===1&&!document.querySelector('.drag-ghost')"))
    js("Tsukikage.start({seed:12345})");fixture(['555m123p456s789m11z']);drag('[data-tile="16"]',{'x':30,'y':30})
    check('outside drop cancels',js("Tsukikage.game.players[0].river.length===0&&!document.querySelector('.drag-ghost')"))
    js("Tsukikage.start({seed:12345})");fixture(['555m123p456s789m11z']);drag('[data-tile="16"]',cancel=True)
    check('pointer cancellation prevents discard',js("Tsukikage.game.players[0].river.length===0&&!document.querySelector('.drag-ghost')"))
    view(844,390,True);js("Tsukikage.start({seed:12345})");fixture(['555m123p456s789m11z']);time.sleep(.5);touch('[data-tile="16"]');time.sleep(.7);touch('[data-tile="16"]')
    check('two real touch events discard once',js("Tsukikage.game.players[0].river.length===1&&Tsukikage.game.players[0].river[0].id===16"))
    js("Tsukikage.start({seed:12345})");fixture(['123456m55789p234s']);js("Tsukikage.game.players[0].riichi=true;Tsukikage.render()")
    cdp('Input.dispatchKeyEvent',type='keyDown',key='Enter',code='Enter',windowsVirtualKeyCode=13);cdp('Input.dispatchKeyEvent',type='keyUp',key='Enter',code='Enter',windowsVirtualKeyCode=13)
    check('riichi Enter without selection does not discard',js("Tsukikage.game.players[0].river.length===0"))
elif group=='effects':
    view(1366,768);js("Tsukikage.start({seed:12345})");fixture(['123456m55789p123s'])
    js("let g=Tsukikage.game;g.players[0].drawn=g.players[0].hand.find(x=>Riichi.type(x)===18);g.tsumo(0)")
    points=js('Tsukikage.game.points.slice()')
    for k in range(3): js('Tsukikage.visuals.skip()')
    check('skip repeats preserve settlement and unlock',js("!Tsukikage.visuals.active&&!document.querySelector('.app').inert&&Tsukikage.game.phase==='result'"))
    check('skip never pays twice',js('Tsukikage.game.points')==points)
    shot('real-win-result')
    js("Tsukikage.start({seed:12345})")
    before=js('JSON.stringify(Tsukikage.snapshot())')
    js("Tsukikage.visuals.play(Tsukikage.visuals.sample(),()=>{},{demo:true})");time.sleep(.2);shot('character-win-preview');js('Tsukikage.visuals.skip()')
    check('preview leaves state and RNG unchanged',before==js('JSON.stringify(Tsukikage.snapshot())'))
    for indicators,label in [(3,'mangan'),(4,'haneman'),(6,'baiman'),(9,'sanbaiman'),(11,'yakuman')]:
        check('tier '+label+' comes from evaluator',js("(()=>{const h=Fixtures.ids('123456m55789p123s'),id=h.find(x=>Riichi.type(x)===18),s=Riichi.evaluate(h,[],{method:'ron',winTile:id,seat:1,round:0,riichi:true,aka:false,indicators:Array("+str(indicators)+").fill(12)});return Tsukikage.visuals.tier(s)==="+json.dumps(label)+"})()"))
    js("Tsukikage.showSettings()")
    check('independent guide / appearance / sound controls exist',js("['helperLabels','actualDora','recommend','publicHighlight','dialogue','guideLevel','sfxVolume','voiceVolume'].every(k=>document.getElementById('v3-'+k))"))
    shot('settings')
elif group=='privacy':
    view(844,390);js("Tsukikage.start({seed:12345})")
    check('CPU concealed banks contain no face identities',js("[1,2,3].every(i=>!document.getElementById('bank'+i).querySelector('[data-face-type]'))"))
    check('wall exposes only active indicator faces',js("document.querySelectorAll('#wallHud [data-indicator=true]').length===Tsukikage.game.indicators().length+new Set(Tsukikage.game.indicators().map(x=>Riichi.doraNext(Riichi.type(x)))).size"))
    check('all production character images load',js("Promise.all([...document.images].map(i=>i.decode().then(()=>i.naturalWidth>0,()=>false))).then(loaded=>loaded.every(Boolean))"))
    check('riichi auto starts disabled',js('Tsukikage.prefs.riichiAuto===false'))
    public=js("(()=>{history.replaceState({},'',location.pathname);return Tsukikage.snapshot()})()")
    check('normal snapshot contains no hidden wall or CPU hands','wall' not in public and 'dead' not in public and 'players' not in public)
    assets=json.loads((ROOT/'assets'/'manifest.json').read_text(encoding='utf-8'));assets.update(js('Characters.manifest'));(ROOT/'assets'/'manifest.json').write_text(json.dumps(assets,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    svgs=js("Array.from({length:34},(_,t)=>({name:String(t).padStart(2,'0'),svg:Tsukikage.tileSvg(t*4+1)})).concat([16,52,88].map(id=>({name:'red-'+id,svg:Tsukikage.tileSvg(id)})))")
    dest=ROOT/'assets'/'tiles';dest.mkdir(exist_ok=True)
    for entry in svgs:
        svg=entry['svg'].replace('<svg class="tile-art"','<svg xmlns="http://www.w3.org/2000/svg" style="--tile-ink:#133a37;--tile-red:#c32837;--tile-green:#0a6b4f;--tile-blue:#164977;--tile-muted:#44665b"')
        (dest/(entry['name']+'.svg')).write_text(svg,encoding='utf-8')
(OUT/('browser-'+group+'.json')).write_text(json.dumps({'runAt':time.strftime('%Y-%m-%dT%H:%M:%S%z'),'browser':'isolated Chromium CDP; touch is emulated','checks':results},ensure_ascii=False,indent=2),encoding='utf-8')
print(str(len(results))+' browser checks complete for '+group)

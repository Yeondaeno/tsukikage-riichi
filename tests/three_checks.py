import hashlib, json, time
from pathlib import Path
from PIL import Image, ImageChops

exec((Path.cwd() / 'tests' / 'browser_checks.py').read_text(encoding='utf-8').split('\nstart()', 1)[0], globals())

OUT = ROOT / 'tests' / 'results' / 'three'
OUT.mkdir(parents=True, exist_ok=True)
results = []

def save():
    (OUT / 'three-checks.json').write_text(json.dumps({
        'runAt': time.strftime('%Y-%m-%dT%H:%M:%S%z'),
        'invocation': 'browser-harness < tests/three_checks.py',
        'checks': results,
    }, ensure_ascii=False, indent=2), encoding='utf-8')

def check(name, ok, details=None):
    results.append({'name': name, 'passed': bool(ok), 'details': details})
    print(('PASS ' if ok else 'FAIL ') + name)
    if not ok:
        save()
        raise AssertionError(name + ': ' + str(details))

def until(expression, seconds=4):
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        if js(expression):
            return True
        time.sleep(.04)
    return False

def late_state(seed=12345):
    js("(()=>{Tsukikage.start({mode:'single',seed:"+str(seed)+"});const g=Tsukikage.game;for(const [seat,count] of [[0,20],[1,16],[2,16],[3,16]])for(let index=0;index<count;index++)g.players[seat].river.push({id:g.wall.pop(),riichi:index===6,tsumogiri:false,called:false});g.assertIntegrity();Tsukikage.render();Tsukikage.table3D.sync()})()")

def wait_three():
    return until("(()=>{const table=Tsukikage.table3D;if(!table)return false;table.sync();const d=table.diagnostics();return table.active&&d.active&&!d.loading&&d.faceTextureCount>0})()")

def canvas_png(name):
    capture = js("(()=>{const stage=document.getElementById('stage'),canvas=document.querySelector('#table3D canvas'),style=document.createElement('style');style.id='three-canvas-capture';style.textContent='#stage::before{display:none!important}';document.head.append(style);const hidden=[...stage.children].filter(node=>node.id!=='table3D').map(node=>node.style.visibility);[...stage.children].filter(node=>node.id!=='table3D').forEach(node=>node.style.visibility='hidden');const prior={background:stage.style.background,backgroundImage:stage.style.backgroundImage};stage.style.background='#000';stage.style.backgroundImage='none';return{hidden,prior,rect:canvas.getBoundingClientRect().toJSON(),viewport:{width:innerWidth,height:innerHeight}}})()")
    destination = OUT / (name + '.png')
    try:
        with Image.open(capture_screenshot()) as screenshot:
            rect = capture['rect']
            scale_x, scale_y = screenshot.width / capture['viewport']['width'], screenshot.height / capture['viewport']['height']
            bounds = tuple(round(value) for value in (rect['left'] * scale_x, rect['top'] * scale_y, rect['right'] * scale_x, rect['bottom'] * scale_y))
            image = screenshot.crop(bounds).convert('RGB')
            image.save(destination)
    finally:
        js("(()=>{const state=" + json.dumps(capture) + ",stage=document.getElementById('stage');[...stage.children].filter(node=>node.id!=='table3D').forEach((node,index)=>node.style.visibility=state.hidden[index]);stage.style.background=state.prior.background;stage.style.backgroundImage=state.prior.backgroundImage;document.getElementById('three-canvas-capture')?.remove()})()")
    colors = image.getcolors(maxcolors=1_000_000)
    unique = len(colors) if colors is not None else 1_000_001
    nonblack = sum(count for count, color in colors if color != (0, 0, 0)) if colors is not None else image.width * image.height
    return {'path': str(destination), 'bytes': destination.stat().st_size, 'sha256': hashlib.sha256(destination.read_bytes()).hexdigest(), 'size': image.size, 'uniqueColors': unique, 'nonblackPixels': nonblack}

def canvas_difference(first, second):
    with Image.open(first['path']) as before, Image.open(second['path']) as after:
        return {'sameSize': before.size == after.size, 'changedBounds': ImageChops.difference(before.convert('RGB'), after.convert('RGB')).getbbox() if before.size == after.size else None}

def three_state():
    return js("(async()=>{const table=Tsukikage.table3D;if(!table)return{missing:true};await Promise.resolve(table.ready);table.sync();await new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)));const canvas=document.querySelector('#table3D canvas'),gl=canvas&&canvas.getContext('webgl2'),box=canvas&&canvas.getBoundingClientRect();return{active:table.active,stage:{renderer:document.getElementById('stage').dataset.renderer,active3D:document.getElementById('stage').dataset.active3D},diagnostics:table.diagnostics(),canvas:canvas&&{count:document.querySelectorAll('#table3D canvas').length,width:canvas.width,height:canvas.height,cssWidth:box.width,cssHeight:box.height},webgl2:!!gl}})()")

def geometry():
    return js("(()=>{const table=Tsukikage.table3D,diagnostics=table.diagnostics(),canvas=document.querySelector('#table3D canvas'),box=canvas.getBoundingClientRect(),publicIds=Tsukikage.game.players.flatMap(p=>p.river.concat(...p.melds.map(m=>m.tiles)).map(tile=>tile.id)),controls=[...document.querySelectorAll('#table3DControls button[data-public-tile]')],riverDisplays=[0,1,2,3].map(seat=>getComputedStyle(document.getElementById('river'+seat)).display);const point=tile=>({x:box.left+tile.x+tile.width/2,y:box.top+tile.y+tile.height/2});const blockers=['#wallHud','#seat1','#seat2','#seat3','#centerBoard','#discardZone'].map(selector=>[selector,document.querySelector(selector)?.getBoundingClientRect()]);const tiles=diagnostics.publicTiles.map(tile=>{const center=point(tile),button=controls.find(node=>node.dataset.publicTile===String(tile.id)),hits=blockers.filter(([,rect])=>rect&&center.x>=rect.left&&center.x<=rect.right&&center.y>=rect.top&&center.y<=rect.bottom).map(([selector])=>selector),buttonBox=button&&button.getBoundingClientRect().toJSON(),top=document.elementFromPoint(center.x,center.y);return{...tile,center,insideCanvas:tile.x>=0&&tile.y>=0&&tile.x+tile.width<=canvas.clientWidth&&tile.y+tile.height<=canvas.clientHeight,button:buttonBox,buttonAbove:!!button&&top?.closest('#table3DControls button[data-public-tile]')===button&&buttonBox.left<=center.x&&buttonBox.right>=center.x&&buttonBox.top<=center.y&&buttonBox.bottom>=center.y,blockedBy:hits}});return{diagnostics,publicIds,controlIds:controls.map(node=>Number(node.dataset.publicTile)),riverDisplays,tiles};})()")

start()
late_state()
check('Three becomes active after its public face textures load', wait_three())
state = three_state()
check('Three activation waits for loaded textures and exposes WebGL2 diagnostics', not state.get('missing') and state['active'] and state['stage']['renderer'] == 'three' and state['stage']['active3D'] == 'three' and state['diagnostics']['active'] and state['diagnostics']['renderer'] == 'WebGL2' and state['diagnostics']['faceTextureCount'] > 0, state)
first_canvas = canvas_png('three-canvas-seed-12345')
late_state(54321)
check('Three redraws after a distinct seeded public state', wait_three())
second_canvas = canvas_png('three-canvas-seed-54321')
canvas_delta = canvas_difference(first_canvas, second_canvas)
check('canvas-only PNGs contain a rendered palette and change with public state', first_canvas['uniqueColors'] > 20 and second_canvas['uniqueColors'] > 20 and first_canvas['nonblackPixels'] > 20 and second_canvas['nonblackPixels'] > 20 and canvas_delta['sameSize'] and canvas_delta['changedBounds'] is not None, {'first':first_canvas,'second':second_canvas,'difference':canvas_delta})
shot('three-active-late-hand')

for width, height in [(1920,1080),(1366,768),(844,390),(740,360)]:
    view(width, height, width <= 844)
    late_state()
    check(f'{width}x{height} Three remains active after resize', wait_three())
    data = geometry()
    check(f'{width}x{height} late 136-tile state keeps engine integrity', js('(()=>{Tsukikage.game.assertIntegrity();return true})()'))
    check(f'{width}x{height} 3D public faces match rivers and exposed melds only', sorted(tile['id'] for tile in data['tiles']) == sorted(data['publicIds']) and sorted(data['controlIds']) == sorted(data['publicIds']) and all(tile['kind'] in ['river','meld'] for tile in data['tiles']) and all(display == 'none' for display in data['riverDisplays']) and data['diagnostics']['hiddenCount'] > 0, data)
    check(f'{width}x{height} raw 3D face bounds stay at least 12px, inside canvas, and clear table UI', all(min(tile['width'],tile['height']) >= 12 and tile['insideCanvas'] and not tile['blockedBy'] for tile in data['tiles']), data)
    check(f'{width}x{height} transparent public controls sit above actual face centers', all(tile['buttonAbove'] for tile in data['tiles']), data)
    check(f'{width}x{height} 3D diagnostics retain only public face IDs', all(tile['id'] in data['publicIds'] and tile['seat'] in [0,1,2,3] and tile['kind'] and isinstance(tile['riichi'], bool) and isinstance(tile['called'], bool) for tile in data['tiles']), data)
    check(f'{width}x{height} center counter content stays within its board', js("(()=>{const b=document.getElementById('centerBoard').getBoundingClientRect();return [...document.querySelectorAll('#centerBoard *')].filter(e=>e.getBoundingClientRect().width).every(e=>{const r=e.getBoundingClientRect();return r.left>=b.left&&r.right<=b.right&&r.top>=b.top&&r.bottom<=b.bottom})})()"))
    shot(f'three-late-{width}x{height}')

view(1366,768)
for kind in ['chi', 'pon', 'kan']:
    call_kind = 'minkan' if kind == 'kan' else kind
    hands = ['13m789p222s456s11z', None, None, '2m123p789m55566z44s'] if kind == 'chi' else ['123m789p222s456s1z', '2s123p789m55566z44s']
    js("Tsukikage.start({seed:12345})")
    fixture(hands)
    outcome = js("(()=>{const g=Tsukikage.game,from="+str(3 if kind == 'chi' else 1)+",type="+str(1 if kind == 'chi' else 19)+";g.current=from;const id=g.players[from].hand.find(id=>Riichi.type(id)===type);g.players[from].drawn=id;g.discard(from,id);const choice=g.pending.choices[0].find(choice=>choice.kind==="+json.dumps(call_kind)+");g.pending.cpu={};if(!choice)return false;g.resolve(choice);g.assertIntegrity();return g.players[0].melds[0].open&&g.players[0].melds[0].kind==="+json.dumps(kind)+"})()")
    check('actual engine open '+kind+' renders all public meld faces', outcome and wait_three() and js("(()=>{const g=Tsukikage.game,d=Tsukikage.table3D.diagnostics(),expected=g.players[0].melds[0].tiles;return d.publicTiles.filter(t=>t.kind==='meld'&&t.seat===0).map(t=>t.id).sort((a,b)=>a-b).join(',')===expected.slice().sort((a,b)=>a-b).join(',')})()"))
    shot('three-open-'+kind)
js("Tsukikage.start({seed:12345})")
fixture(['1111m234567p234s5z'])
js("(()=>{const g=Tsukikage.game;g.players[0].drawn=0;g.declareKan(0,g.kanOptions(0).find(k=>k.kind==='ankan'));g.pending.cpu={};g.resolve(null);g.assertIntegrity();Tsukikage.render()})()")
check('actual closed kan exposes only its two inner tile faces', wait_three() and js("(()=>{const g=Tsukikage.game,m=g.players[0].melds[0],d=Tsukikage.table3D.diagnostics();return m.open===false&&d.publicTiles.filter(t=>t.kind==='meld').map(t=>t.id).sort((a,b)=>a-b).join(',')===m.tiles.slice(1,-1).sort((a,b)=>a-b).join(',')&&d.hiddenCount===g.players.slice(1).reduce((n,p)=>n+p.hand.length,0)+2})()"))
shot('three-closed-kan')
js("Tsukikage.start({seed:12345})")
fixture(['555m123p456s789m11z'])
js("(()=>{const g=Tsukikage.game;g.options.aka=true;g.discard(0,16);Tsukikage.render()})()")
check('red five with aka enabled finishes its public texture', wait_three())
red_canvas = canvas_png('three-red-five')
js("Tsukikage.game.options.aka=false;Tsukikage.render()")
check('aka toggle rebuilds the same physical five with a different face', wait_three() and canvas_difference(red_canvas, canvas_png('three-ordinary-five'))['changedBounds'] is not None and js('Tsukikage.table3D.diagnostics().publicTiles.some(t=>t.id===16)'))
theme_canvas = canvas_png('three-theme-before')
js('Tsukikage.pause(true)')
theme_state = js('JSON.stringify(Tsukikage.snapshot())')
for theme in ['midnight', 'ivory', 'jade']:
    js("Tsukikage.showSettings();document.querySelector('[name=tileTheme][value="+theme+"]').checked=true;document.querySelector('[data-act=save-settings]').scrollIntoView({block:'center'})")
    click('[data-act="save-settings"]')
    check('changing '+theme+' skin updates actual 3D pixels without changing the game', wait_three() and js('Tsukikage.table3D.diagnostics().theme') == theme and theme_state == js('JSON.stringify(Tsukikage.snapshot())') and canvas_difference(theme_canvas, canvas_png('three-theme-'+theme))['changedBounds'] is not None)
    theme_canvas = canvas_png('three-theme-'+theme)
js("Tsukikage.start({seed:12345})")
fixture(['555m123p456s789m11z'])
click('[data-tile="16"]')
time.sleep(.9)
click('[data-tile="16"]')
check('native hand re-click remains untimed and discards once after 900ms', js("Tsukikage.game.players[0].river.length===1&&Tsukikage.game.players[0].river[0].id===16"))
for name, target, cancelled in [('valid drag', None, False), ('outside drag', {'x':30,'y':30}, False), ('cancelled drag', None, True)]:
    js("Tsukikage.start({seed:12345})")
    fixture(['555m123p456s789m11z'])
    drag('[data-tile="16"]', target, cancelled)
    wanted = 1 if name == 'valid drag' else 0
    check(f'{name} preserves native discard semantics without duplicates', js(f"Tsukikage.game.players[0].river.length==={wanted}&&!document.querySelector('.drag-ghost')"))

late_state()
inspect = js("(()=>{const button=document.querySelector('#table3DControls button[data-public-tile]');button.focus();button.dispatchEvent(new PointerEvent('pointerover',{bubbles:true}));return{inspect:!document.getElementById('tileInspect').hidden,river:Tsukikage.game.players[0].river.length}})()")
check('3D public control keyboard focus and hover inspect a tile without a discard', inspect['inspect'] and inspect['river'] == 20, inspect)
view(844,390,True)
button = rect('#table3DControls button[data-public-tile]')
cdp('Input.dispatchTouchEvent',type='touchStart',touchPoints=[{'x':button['x'],'y':button['y'],'id':1}])
time.sleep(.6)
check('3D public control long touch inspects without changing the river', js("!document.getElementById('tileInspect').hidden&&Tsukikage.game.players[0].river.length===20"))
cdp('Input.dispatchTouchEvent',type='touchEnd',touchPoints=[])

view(1366,768)
late_state()
original = js('JSON.stringify(Tsukikage.snapshot())')
js('Tsukikage.table3D.loseContext()')
check('WebGL context loss switches to playable CSS fallback', until("document.getElementById('stage').dataset.renderer==='css'"), three_state())
click('[data-tile="'+str(js("document.querySelector('#handRow button:not(:disabled)').dataset.tile"))+'"]')
check('CSS fallback leaves the normal hand usable', js("!!document.querySelector('#handRow button.selected')"))
js('Tsukikage.table3D.restoreContext()')
check('WebGL context restoration returns to Three and preserves exact game state', until("document.getElementById('stage').dataset.renderer==='three'"), three_state())
check('context recovery restores the original game snapshot exactly', original == js('JSON.stringify(Tsukikage.snapshot())'))

def forced_fallback(name, source):
    injection = cdp('Page.addScriptToEvaluateOnNewDocument', source=source)
    js('location.reload()')
    wait_for_load()
    js("Tsukikage.start({seed:12345})")
    check(name, js("document.getElementById('stage').dataset.renderer==='css'&&!!document.querySelector('#handRow button:not(:disabled)')"))
    cdp('Page.removeScriptToEvaluateOnNewDocument', identifier=injection['identifier'])
    js('location.reload()')
    wait_for_load()
    js("Tsukikage.start({seed:12345})")

forced_fallback('missing WebGL2 falls back to a playable CSS table', "(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return /^webgl/.test(kind)?null:get.call(this,kind,...args)}})()")
forced_fallback('missing THREE falls back to a playable CSS table', "Object.defineProperty(window,'THREE',{configurable:false,get:()=>undefined,set:()=>{}})")

view(1366,768)
late_state()
js("Tsukikage.pause(true);Tsukikage.table3D.sync()")
paused = three_state()
before = js('JSON.stringify(Tsukikage.snapshot())')
view(844,390,True)
js("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))")
time.sleep(.25)
check('paused diagnostics show renderer does not advance game state on resize or hidden tab', paused['diagnostics']['reason'] == 'paused' and before == js('JSON.stringify(Tsukikage.snapshot())'), paused)
js("Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));Tsukikage.pause(false)")

view(1366,768)
late_state()
baseline = three_state()
js('for(let index=0;index<100;index++)Tsukikage.table3D.sync()')
after = three_state()
check('100 renderer syncs keep one canvas and stable draw resources', baseline['canvas']['count'] == after['canvas']['count'] == 1 and baseline['diagnostics']['textures'] == after['diagnostics']['textures'] and baseline['diagnostics']['drawCalls'] == after['diagnostics']['drawCalls'] and baseline['diagnostics']['triangles'] == after['diagnostics']['triangles'], {'before':baseline,'after':after})
resize_before = three_state()
js('for(let index=0;index<100;index++)Tsukikage.table3D.resize()')
resize_after = three_state()
check('100 unchanged resizes preserve renderer dimensions and frame count', resize_before['diagnostics']['width'] == resize_after['diagnostics']['width'] and resize_before['diagnostics']['height'] == resize_after['diagnostics']['height'] and resize_before['diagnostics']['frames'] == resize_after['diagnostics']['frames'], {'before':resize_before,'after':resize_after})
cdp('Emulation.setDeviceMetricsOverride',width=1366,height=768,deviceScaleFactor=3,mobile=False)
late_state()
dpr_three = three_state()
check('device pixel-ratio changes cap at 1.5 and resize the canvas backing store', dpr_three['diagnostics']['pixelRatio'] > baseline['diagnostics']['pixelRatio'] and dpr_three['diagnostics']['pixelRatio'] <= 1.5 and abs(dpr_three['canvas']['width'] - round(dpr_three['canvas']['cssWidth'] * dpr_three['diagnostics']['pixelRatio'])) <= 1 and abs(dpr_three['canvas']['height'] - round(dpr_three['canvas']['cssHeight'] * dpr_three['diagnostics']['pixelRatio'])) <= 1, {'before':baseline,'after':dpr_three})
cdp('Network.enable')
cdp('Network.setBlockedURLs',urls=['http://*','https://*'])
new_tab((ROOT/'dist'/'index.html').resolve().as_uri())
activate_tab(current_tab())
wait_for_load()
js("Tsukikage.start({seed:12345})")
late_state()
check('file URL build activates Three with HTTP(S) blocked', wait_three() and js("location.protocol==='file:'&&document.getElementById('stage').dataset.renderer==='three'&&performance.getEntriesByType('resource').every(entry=>!/^https?:/i.test(entry.name))"), three_state())
shot('three-file-url')
cdp('Network.setBlockedURLs',urls=[])
shot('three-final')
save()
print(f'{len(results)} Three browser checks complete')

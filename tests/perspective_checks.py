from pathlib import Path

exec((Path.cwd() / "tests" / "browser_checks.py").read_text(encoding="utf-8").split("\nstart()", 1)[0], globals())

OUT = ROOT / "tests" / "results" / "perspective"
OUT.mkdir(parents=True, exist_ok=True)
start()

sizes = [(1920, 1080), (1366, 768), (844, 390), (740, 360)]
for width, height in sizes:
    view(width, height, width <= 844)
    js("Tsukikage.start({mode:'single',seed:12345})")
    layout = js(
        "(()=>{const flat=['#handRow','#discardZone','#wallHud','#seat1','#seat2','#seat3'],is3d=element=>{for(let node=element;node;node=node.parentElement)if(getComputedStyle(node).transform.startsWith('matrix3d('))return true;return false};"
        "const tiles=[...document.querySelectorAll('#handRow button[data-tile]')].map(tile=>tile.getBoundingClientRect().toJSON());"
        "return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,"
        "table:getComputedStyle(document.getElementById('tablePlane')).transform,"
        "flat:flat.map(selector=>[selector,is3d(document.querySelector(selector))]),tiles};})()"
    )
    check(f"{width}x{height} screen fits", layout["scrollWidth"] <= width and layout["scrollHeight"] <= height, layout)
    check(f"{width}x{height} table plane has a nonidentity 3D transform", layout["table"].startswith("matrix3d(") and layout["table"] != "matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)", layout["table"])
    check(f"{width}x{height} hand, drop, wall, and seats avoid 3D ancestors", not any(is_3d for _, is_3d in layout["flat"]), layout["flat"])
    check(
        f"{width}x{height} hand stays visible",
        all(tile["left"] >= 0 and tile["right"] <= width and tile["top"] >= 0 and tile["bottom"] <= height for tile in layout["tiles"]),
        layout["tiles"],
    )
    shot(f"perspective-{width}x{height}")

for width, height in sizes:
    view(width, height, width <= 844)
    js(
        "(()=>{Tsukikage.start({seed:12345});const game=Tsukikage.game;"
        "for(const [player,count] of [[0,20],[1,16],[2,16],[3,16]]){"
        "for(let index=0;index<count;index++) game.players[player].river.push({id:game.wall.pop(),riichi:index===6,tsumogiri:false,called:false});}"
        "game.assertIntegrity();Tsukikage.render();})()"
    )
    late = js(
        "(()=>{const stage=document.getElementById('stage').getBoundingClientRect(),selector='#seat1,#seat2,#seat3,#wallHud,#centerBoard,#discardZone,#bank1,#bank2,#bank3,.compass,.river .tile';"
        "const tiles=[0,1,2,3].flatMap(river=>[...document.querySelectorAll('#river'+river+' .tile')].map((element,tile)=>({river,tile,element,rect:element.getBoundingClientRect().toJSON()})));"
        "const riichi=[...document.querySelectorAll('.river .riichi-tile')].map(tile=>tile.getBoundingClientRect().toJSON());"
        "const occlusions=tiles.flatMap(({river,tile,element,rect})=>{const stack=document.elementsFromPoint(rect.x+rect.width/2,rect.y+rect.height/2),own=stack.findIndex(hit=>hit===element||element.contains(hit));const blockers=stack.slice(0,own<0?stack.length:own).map(hit=>hit.closest(selector)).filter((blocker,index,all)=>blocker&&blocker!==element&&!element.contains(blocker)&&all.indexOf(blocker)===index);return blockers.map(blocker=>({river,tile,rect,blocker:blocker.id||blocker.className}))});"
        "return {counts:Tsukikage.game.players.map(player=>player.river.length),tileCount:tiles.length,riichiCount:riichi.length,minimumShortSide:Math.min(...tiles.map(tile=>Math.min(tile.rect.width,tile.rect.height))),"
        "allFit:[...tiles.map(tile=>tile.rect),...riichi].every(tile=>tile.left>=stage.left&&tile.right<=stage.right&&tile.top>=stage.top&&tile.bottom<=stage.bottom),"
        "occlusions,"
        "integrity:(()=>{Tsukikage.game.assertIntegrity();return true})()};})()"
    )
    shot(f"perspective-late-rivers-{width}x{height}")
    (OUT / f"perspective-late-rivers-{width}x{height}-geometry.json").write_text(json.dumps(late, ensure_ascii=False, indent=2), encoding="utf-8")
    check(f"{width}x{height} late 20/16/16/16 rivers render all public tiles", late["counts"] == [20, 16, 16, 16] and late["tileCount"] == 68, late)
    check(f"{width}x{height} late riichi declarations stay inside the table", late["riichiCount"] == 4 and late["allFit"], late)
    check(f"{width}x{height} late river tiles keep a 12px rendered short side", late["minimumShortSide"] >= 12, late)
    check(f"{width}x{height} late 136-tile state keeps engine integrity", late["integrity"] is True)
    check(f"{width}x{height} every public river tile center avoids table UI occlusion", not late["occlusions"], late)
check("CPU concealed banks expose no face identities", js("[1,2,3].every(player=>!document.getElementById('bank'+player).querySelector('[data-face-type]'))"))

view(1366, 768)
js("Tsukikage.start({seed:12345})")
fixture(["555m123p456s789m11z"])
click('[data-tile="16"]')
check("one physical click only selects a tile", js("Tsukikage.game.players[0].river.length===0&&document.querySelector('[data-tile=\"16\"]').classList.contains('selected')"))
time.sleep(.6)
click('[data-tile="16"]')
check("delayed re-click of the same physical tile discards once", js("Tsukikage.game.players[0].river.length===1&&Tsukikage.game.players[0].river[0].id===16"))
repeat_point = rect("#discardZone")
cdp("Input.dispatchMouseEvent", type="mouseReleased", x=repeat_point["x"], y=repeat_point["y"], button="left", clickCount=1)
check("repeat release path adds no extra discard", js("Tsukikage.game.players[0].river.length===1"))

js("Tsukikage.start({seed:12345})")
fixture(["555m123p456s789m11z"])
drag('[data-tile="16"]')
check("valid flat drop discards exactly once", js("Tsukikage.game.players[0].river.length===1&&!document.querySelector('.drag-ghost')"))

js("Tsukikage.start({seed:12345})")
fixture(["555m123p456s789m11z"])
drag('[data-tile="16"]', {"x": 30, "y": 30})
check("outside drop adds no discard", js("Tsukikage.game.players[0].river.length===0&&!document.querySelector('.drag-ghost')"))

js("Tsukikage.start({seed:12345})")
fixture(["555m123p456s789m11z"])
drag('[data-tile="16"]', cancel=True)
check("cancelled drop adds no discard", js("Tsukikage.game.players[0].river.length===0&&!document.querySelector('.drag-ghost')"))

view(844, 390, True)
js("Tsukikage.start({seed:12345})")
fixture(["555m123p456s789m11z"])
time.sleep(.5)
touch('[data-tile="16"]')
check("first real touch only selects a tile", js("Tsukikage.game.players[0].river.length===0&&document.querySelector('[data-tile=\"16\"]').classList.contains('selected')"))
time.sleep(.6)
touch('[data-tile="16"]')
check("two real touch events discard the physical tile once", js("Tsukikage.game.players[0].river.length===1&&Tsukikage.game.players[0].river[0].id===16"))
shot("perspective-input-844x390")

(OUT / "perspective-checks.json").write_text(
    json.dumps({"runAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"), "browser": "browser-harness CDP; touch is emulated", "checks": results}, ensure_ascii=False, indent=2),
    encoding="utf-8",
)
print(f"{len(results)} perspective browser checks complete")

'use strict';
const assert=require('node:assert/strict');
const R=require('../src/engine.js');
let passed=0;const test=(name,fn)=>{try{fn();passed++;console.log('PASS',name);}catch(e){console.error('FAIL',name);throw e;}};
function types(text){let a=[];for(const m of text.matchAll(/([0-9]+)([mpsz])/g)){const base={m:0,p:9,s:18,z:27}[m[2]];for(const d of m[1])a.push(base+Number(d)-1);}return a;}
function ids(text,used=new Set()){
 return types(text).map(t=>{for(const copy of [1,2,3,0]){const id=t*4+copy;if(!used.has(id)){used.add(id);return id;}}throw new Error('Fifth tile '+t);});
}
function score(text,win,params={},melds=[]){
 const hand=ids(text),t=types(win)[0],winTile=hand.filter(id=>R.type(id)===t).at(-1);
 return R.evaluate(hand,melds,{method:'ron',winTile,seat:1,round:0,riichi:false,heaven:0,aka:false,doubleYakuman:true,indicators:[],ura:[],...params});
}
function has(s,name,han){assert(s,'Winning hand');const y=s.yaku.find(y=>y.name===name);assert(y,`Missing ${name}; got ${JSON.stringify(s.yaku)}`);if(han!=null)assert.equal(y.han,han);}
function rig(hands,opts={}){
 const g=new R.Engine({mode:'single',...opts});g.start();const used=new Set();
 for(let i=0;i<4;i++){
  const h=hands[i]?ids(hands[i],used):[];
  Object.assign(g.players[i],{hand:h,melds:[],river:[],drawn:null,drawCount:2,riichi:false,doubleRiichi:false,ippatsu:false,tempFuriten:false,riichiFuriten:false,rinshan:false,forbid:[]});
 }
 const rest=Array.from({length:136},(_,i)=>i).filter(i=>!used.has(i));
 for(let i=0;i<4;i++)if(!hands[i])while(g.players[i].hand.length<13)g.players[i].hand.push(rest.shift());
 g.dead=rest.splice(-14);g.wall=rest;g.callCount=0;g.current=0;g.phase='turn';g.pending=null;g.points=[25000,25000,25000,25000];g.sticks=0;g.kanCount=0;g.kanOwners=[];
 return g;
}
function exchangeDraw(g,i,t){
 const idx=g.wall.findIndex(id=>R.type(id)===t);assert(idx>=0);[g.wall[idx],g.wall[g.wall.length-1]]=[g.wall.at(-1),g.wall[idx]];g.draw(i);
}
function removeToRiver(g,i,t){const p=g.players[i],idx=p.hand.findIndex(id=>R.type(id)===t);assert(idx>=0);const[id]=p.hand.splice(idx,1);p.river.push({id,called:false,riichi:false});return id;}

test('136 identities / 34 types / exactly three red tiles',()=>{assert.equal(new Set(Array.from({length:136},(_,i)=>R.type(i))).size,34);assert.equal(Array.from({length:136},(_,i)=>i).filter(R.red).length,3);});
test('Dora cycles for all suits, winds and dragons',()=>{for(const [a,b]of[[8,0],[17,9],[26,18],[30,27],[33,31],[27,28],[31,32]])assert.equal(R.doraNext(a),b);});
test('Standard shanten and multiple-sided waits',()=>{const c=R.counts(ids('123456m55789p23s'));assert.equal(R.shanten(c),0);assert.deepEqual(R.waits(c),[18,21]);c[18]++;assert.equal(R.shanten(c),-1);});
test('Seven pairs and thirteen orphans shanten',()=>{assert.equal(R.shanten(R.counts(ids('1122334455667z'))),0);assert.equal(R.shanten(R.counts(ids('19m19p19s1234567z'))),0);});
test('A quad cannot substitute for two pairs in chiitoitsu',()=>{assert.equal(R.partitions(R.counts(ids('11112233445566z'))).length,0);});
test('Pinfu ron: 1 han 30 fu, nondealer 1000',()=>{const s=score('123456m55789p123s','1s');has(s,'핑후',1);assert.equal(s.han,1);assert.equal(s.fu,30);assert.equal(s.ron,1000);});
test('Pinfu tsumo: 2 han 20 fu, 400 / 700',()=>{const s=score('123456m55789p123s','1s',{method:'tsumo'});has(s,'멘젠 쯔모',1);assert.equal(s.han,2);assert.equal(s.fu,20);assert.equal(s.tsumoOther,400);assert.equal(s.tsumoDealer,700);});
test('Riichi ippatsu add two han; double riichi replaces ordinary riichi',()=>{const s=score('123456m55789p123s','1s',{riichi:true,ippatsu:true,doubleRiichi:true});has(s,'더블 리치',2);has(s,'일발',1);assert.equal(s.han,4);assert.equal(s.ron,7700);});
test('No yaku: structurally complete closed ron is rejected',()=>{assert.equal(score('123456m55789p123s','2s'),null);});
test('Dora without a yaku cannot qualify a hand',()=>{assert.equal(score('123456m55789p123s','2s',{indicators:[0,4,8],ura:[12]}),null);});
test('Dora and ura only add after a real yaku',()=>{const s=score('123456m55789p123s','1s',{riichi:true,indicators:[12],ura:[12]});has(s,'도라',1);has(s,'우라도라',1);assert.equal(s.han,4);const u=score('123456m55789p123s','1s',{ura:[12]});assert(!u.yaku.some(y=>y.name==='우라도라'));});
test('Open tanyao allowed, open pinfu not awarded',()=>{const m={kind:'chi',tiles:ids('234m'),open:true};const s=score('678m345p456s66p','6s',{},[m]);has(s,'탕야오',1);assert(!s.yaku.some(y=>y.name==='핑후'));assert.equal(s.fu,30);});
test('Double-wind pair contributes four fu',()=>{const s=score('123456m789p123s11z','2s',{seat:0,riichi:true});assert.equal(s.fu,40);});
test('Double-wind triplet awards two yakuhai',()=>{const s=score('123456m789p11122z','2z',{seat:0});has(s,'자풍 · 동',1);has(s,'장풍 · 동',1);});
test('Chiitoitsu exact 25 fu with honroutou',()=>{const s=score('11m99p11s11223344z','4z');has(s,'치또이츠',2);has(s,'혼노두',2);assert.equal(s.fu,25);});
test('Kokushi regular and double thirteen-sided wait',()=>{const d=score('119m19p19s1234567z','1m');assert.equal(d.yakuman,2);const s=score('119m19p19s1234567z','9m');assert.equal(s.yakuman,1);});
test('Suuankou tsumo / ron tanki; ron shanpon is only sanankou',()=>{let s=score('111m222p333s55566z','5z',{method:'tsumo'});assert.equal(s.yakuman,1);s=score('111m222p333s55566z','6z');assert.equal(s.yakuman,2);s=score('111m222p333s55566z','5z');assert.equal(s.yakuman,0);has(s,'산안커',2);});
test('Three dragons and all honors stack yakuman',()=>{const s=score('11122555666777z','1z');has({...s,yaku:s.yaku.map(y=>({...y,han:y.yakuman}))},'대삼원',1);assert.equal(s.yakuman,2);});
test('Pure nine gates is double yakuman',()=>{const s=score('11123455678999m','5m');assert.equal(s.yakuman,2);});
test('Seven-pairs all-green is rejected when nonexistent',()=>{assert.equal(score('2233446688s6666z','6z'),null);});
test('Sanshoku / ittsuu / closed straight shape',()=>{has(score('123m123p123789s55p','9s'),'삼색동순',2);has(score('123456789m123p55s','3p'),'일기통관',2);});
test('Junchan and ryanpeikou do not double-count chanta / iipeikou',()=>{const s=score('123123789789m99p','9p');has(s,'준찬',3);has(s,'량페코',3);assert(!s.yaku.some(y=>y.name==='찬타'||y.name==='이페코'));});
test('Limit scoring at mangan / haneman / baiman / sanbaiman / kazoe',()=>{for(const [d,limit]of[[3,'만관'],[4,'하네만'],[6,'배만'],[9,'삼배만'],[11,'헤아림 역만']]){const s=score('123456m55789p123s','1s',{riichi:true,indicators:Array(d).fill(12)});assert.equal(s.limit,limit);}});
test('Chi only from the left player; pon from any other seat',()=>{const g=rig(['12m234567p11122z']);const id=2*4;assert(g.callOptions(0,3,id).some(o=>o.kind==='chi'));assert(!g.callOptions(0,1,id).some(o=>o.kind==='chi'));const id2=28*4;assert(g.callOptions(0,1,id2).some(o=>o.kind==='pon'));});
test('Discard furiten covers every winning tile, not just the discarded wait',()=>{const g=rig(['123456m55789p23s']);const id=g.wall.find(id=>R.type(id)===18);g.wall.splice(g.wall.indexOf(id),1);g.players[0].river.push({id,called:true});assert(g.furiten(0));const ron=g.wall.find(id=>R.type(id)===21);assert(!g.canRon(0,ron));});
test('Riichi requires closed tenpai, 1000 points and four live tiles',()=>{const g=rig(['123456m55789p234s']);g.players[0].drawn=g.players[0].hand.at(-1);assert(g.riichiOptions(0).length>0);g.points[0]=999;assert.equal(g.riichiOptions(0).length,0);g.points[0]=25000;g.wall=g.wall.slice(0,3);assert.equal(g.riichiOptions(0).length,0);});
test('Riichi declaration is not charged until discard survives ron',()=>{const g=rig(['123456m55789p234s']);g.players[0].drawn=g.players[0].hand.at(-1);const id=g.riichiOptions(0)[0];assert(g.discard(0,id,true));assert.equal(g.points[0],25000);g.pending.cpu={};g.resolve(null);assert.equal(g.points[0],24000);assert.equal(g.sticks,1);g.assertIntegrity();});
test('Ankan consumes one live tile, flips dora, preserves 136 identities',()=>{const g=rig(['1111m234567p234s5z']);g.players[0].drawn=g.players[0].hand.find(id=>R.type(id)===0);const k=g.kanOptions(0).find(k=>k.kind==='ankan');assert(k);const before=g.wall.length;assert(g.declareKan(0,k));g.pending.cpu={};g.resolve(null);assert.equal(g.wall.length,before-1);assert.equal(g.indicators().length,2);assert.equal(g.players[0].melds[0].kind,'kan');assert(g.players[0].rinshan);g.assertIntegrity();});
test('Tile identity zero is a valid drawn tile for ankan',()=>{const g=rig(['1111m234567p234s5z']);g.players[0].drawn=0;assert(g.kanOptions(0).some(k=>k.kind==='ankan'));});
test('Riichi closed kan can preserve both waits and decompositions',()=>{const g=rig(['1111m234m678p23s55s']);g.players[0].drawn=g.players[0].hand.find(id=>R.type(id)===0);g.players[0].riichi=true;assert(g.kanOptions(0).some(o=>o.kind==='ankan'));});
test('Points and tile integrity after a seeded hand',()=>{const g=new R.Engine({mode:'single'});g.start();let n=0;while(g.phase!=='result'&&n++<400){g.assertIntegrity();if(g.phase==='turn')g.cpuTurn();else{const q=g.pending;g.resolve(q.from===0?null:g.cpuCall(0,q.choices[0],q.from,q.id));}}assert(n<400);g.assertIntegrity();g.nextHand();assert.equal(g.phase,'finished');g.assertIntegrity();});

test('Double ron pays both winners and conserves points',()=>{
 const g=rig(['123456m55789p23s','777888m666s555z4s9m','123456m55789p23s']);
 g.current=1;const id=g.players[1].hand.find(id=>R.type(id)===21);g.players[1].drawn=id;
 assert(g.discard(1,id));assert(g.pending.choices[0].some(o=>o.kind==='ron'));assert.equal(g.pending.cpu[2].kind,'ron');
 assert(g.resolve({kind:'ron'}));assert.equal(g.result.winners.length,2);assert(g.result.delta[0]>0&&g.result.delta[2]>0&&g.result.delta[1]<0);g.assertIntegrity();
});
test('Ron on a riichi declaration cancels its 1000-point deposit',()=>{
 const g=rig(['123456m55789p23s','123p789m666s55z23m4s']);g.current=1;const id=g.players[1].hand.find(id=>R.type(id)===21);g.players[1].drawn=id;
 assert(g.riichiOptions(1).includes(id));assert(g.discard(1,id,true));g.pending.cpu={};assert(g.resolve({kind:'ron'}));
 assert.equal(g.sticks,0);assert.equal(g.points[1],25000-g.result.winners[0].score.ron);assert(!g.players[1].riichi);g.assertIntegrity();
});
test('Passing a ron creates temporary furiten until the next draw',()=>{
 const g=rig(['123456m55789p23s','123p789m666s55z23m4s']);g.current=1;const id=g.players[1].hand.find(id=>R.type(id)===21);g.players[1].drawn=id;
 g.discard(1,id);g.pending.cpu={};g.resolve(null);assert(g.players[0].tempFuriten);
 const p=g.players[g.current];p.hand=p.hand.filter(id=>id!==p.drawn);g.wall.push(p.drawn);p.drawn=null;
 g.draw(0);assert(!g.players[0].tempFuriten);g.assertIntegrity();
});
test('Passing a ron after riichi remains furiten after drawing',()=>{
 const g=rig(['123456m55789p23s','123p789m666s55z23m4s']);g.players[0].riichi=true;g.players[0].riichiFuriten=false;g.current=1;
 const id=g.players[1].hand.find(id=>R.type(id)===21);g.players[1].drawn=id;g.discard(1,id);g.pending.cpu={};g.resolve(null);assert(g.players[0].riichiFuriten);
 const p=g.players[g.current];p.hand=p.hand.filter(id=>id!==p.drawn);g.wall.push(p.drawn);p.drawn=null;g.draw(0);assert(g.players[0].riichiFuriten);assert(!g.players[0].tempFuriten);
});
test('Robbing an added kan leaves the old pon and does not flip dora',()=>{
 const g=rig(['123456m55789p23s','123789m777p5z4s']);
 const remaining=g.wall.filter(id=>R.type(id)===21);assert.equal(remaining.length,3);g.wall=g.wall.filter(id=>!remaining.includes(id));g.players[1].melds=[{kind:'pon',tiles:remaining,open:true,from:2,called:remaining[0]}];
 g.current=1;g.callCount=1;g.players[1].drawn=g.players[1].hand.find(id=>R.type(id)===21);g.assertIntegrity();
 const kan=g.kanOptions(1).find(o=>o.kind==='kakan');assert(kan);g.declareKan(1,kan);g.pending.cpu={};assert(g.pending.choices[0].some(o=>o.kind==='ron'));g.resolve({kind:'ron'});
 assert.equal(g.players[1].melds[0].kind,'pon');assert.equal(g.kanCount,0);has(g.result.winners[0].score,'창깡',1);g.assertIntegrity();
});
test('Ankan does not give a regular hand a ron option or temporary furiten',()=>{
 const g=rig(['123456m55789p23s','4444s123789m777p5z']);g.current=1;g.players[1].drawn=g.players[1].hand.find(id=>R.type(id)===21);
 const kan=g.kanOptions(1).find(o=>o.kind==='ankan');assert(kan);g.declareKan(1,kan);assert.equal(g.pending.choices[0].length,0);g.pending.cpu={};g.resolve(null);assert(!g.players[0].tempFuriten);g.assertIntegrity();
});
test('Exhaustive draw transfers exactly 3000 among tenpai and noten players',()=>{
 const g=rig(['123456m55789p23s'],{mode:'east'});const n=g.players.map((p,i)=>g.shapeWaits(i).length>0).filter(Boolean).length;
 g.exhaustive();assert.equal(g.result.delta.reduce((a,b)=>a+b,0),0);assert(g.result.repeat);if(n>0&&n<4)assert.equal(g.result.delta.filter(x=>x>0).reduce((a,b)=>a+b,0),3000);
 g.nextHand();assert.equal(g.roundIndex,0);assert.equal(g.honba,1);g.assertIntegrity();
});
test('CPU choice is unchanged when only hidden opponent tiles are swapped',()=>{
 const g=new R.Engine({difficulty:'normal'});g.start();const first=g.cpuDiscard(0),a=g.players[1].hand[0],b=g.wall[0];g.players[1].hand[0]=b;g.wall[0]=a;assert.equal(g.cpuDiscard(0),first);g.assertIntegrity();
});

console.log(`\n${passed} focused rule tests passed.`);

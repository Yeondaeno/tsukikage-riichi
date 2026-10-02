/* Tsukikage Riichi — standalone rules and four-seat game engine.
 * Original implementation, 2026. No runtime dependencies.
 * Tile identity: type*4+copy; types 0..8 man, 9..17 pin, 18..26 sou,
 * 27..30 winds, 31..33 white/green/red dragons. Copy zero of each 5 is red.
 */
(function(root){
'use strict';
const SUITS=['만','통','삭'];
const HONORS=['동','남','서','북','백','발','중'];
const TERMINALS=[0,8,9,17,18,26,27,28,29,30,31,32,33];
const GREEN=new Set([19,20,21,23,25,32]);
const type=id=>Math.floor(id/4);
const norm=t=>t<27?(t%9)+1:HONORS[t-27];
const terminal=t=>t>=27||t%9===0||t%9===8;
const red=id=>[16,52,88].includes(id);
const name=t=>t<27?`${t%9+1}${SUITS[Math.floor(t/9)]}`:HONORS[t-27];
const tileName=(id,aka=true)=>(aka&&red(id)?'적 ': '')+name(type(id));
const counts=tiles=>{const c=Array(34).fill(0);for(const id of tiles)c[type(id)]++;return c;};
const sorted=tiles=>tiles.slice().sort((a,b)=>type(a)-type(b)||(red(a)?-1:0)-(red(b)?-1:0)||a-b);
const round100=n=>Math.ceil(n/100)*100;
const doraNext=t=>t<27?Math.floor(t/9)*9+(t+1)%9:t<31?27+(t-26)%4:31+(t-30)%3;
const shantenCache=new Map();
function shanten(c,open=0){
 const key=open+':'+c.join('');if(shantenCache.has(key))return shantenCache.get(key);
 let best=8, minSpecial=8;
 if(open===0){let pairs=0,kinds=0,orphans=0,orphanPair=0;
  for(let i=0;i<34;i++){if(c[i])kinds++;if(c[i]>=2)pairs++;}
  for(const i of TERMINALS){if(c[i])orphans++;if(c[i]>1)orphanPair=1;}
  minSpecial=Math.min(6-pairs+Math.max(0,7-kinds),13-orphans-orphanPair);
 }
 // Enumerate complete groups, incomplete groups and a head without conflating
 // a four-of-a-kind with two distinct pairs in seven-pairs hands.
 const a=c.slice();
 function walk(pos,m,t,h){
  while(pos<34&&!a[pos])pos++;
  if(pos===34){best=Math.min(best,8-2*m-Math.min(t,4-m)-h);return;}
  if(m>4||t>4)return;
  if(a[pos]>=3&&m<4){a[pos]-=3;walk(pos,m+1,t,h);a[pos]+=3;}
  if(pos<27&&pos%9<7&&a[pos+1]&&a[pos+2]&&m<4){a[pos]--;a[pos+1]--;a[pos+2]--;walk(pos,m+1,t,h);a[pos]++;a[pos+1]++;a[pos+2]++;}
  if(a[pos]>=2){a[pos]-=2;if(!h)walk(pos,m,t,1);if(t<4)walk(pos,m,t+1,h);a[pos]+=2;}
  if(pos<27&&t<4){
   if(pos%9<8&&a[pos+1]){a[pos]--;a[pos+1]--;walk(pos,m,t+1,h);a[pos]++;a[pos+1]++;}
   if(pos%9<7&&a[pos+2]){a[pos]--;a[pos+2]--;walk(pos,m,t+1,h);a[pos]++;a[pos+2]++;}
  }
  const n=a[pos];a[pos]=0;walk(pos+1,m,t,h);a[pos]=n;
 }
 walk(0,open,0,0);best=Math.min(best,minSpecial);
 if(shantenCache.size>60000)shantenCache.clear();shantenCache.set(key,best);return best;
}
function partitions(c,open=0){
 if(c.reduce((a,b)=>a+b,0)!==14-3*open)return [];
 const out=[];const a=c.slice();
 if(!open){
  if(a.filter(x=>x===2).length===7)out.push({kind:'seven',pair:-1,groups:[]});
  if(TERMINALS.every(t=>a[t]>=1)&&TERMINALS.some(t=>a[t]===2))out.push({kind:'orphans',pair:-1,groups:[]});
 }
 function walk(pair,groups){
  const t=a.findIndex(n=>n>0);
  if(t<0){if(groups.length===4-open)out.push({kind:'standard',pair,groups:groups.slice()});return;}
  if(groups.length>=4-open)return;
  if(a[t]>=3){a[t]-=3;groups.push({kind:'triplet',t,open:false});walk(pair,groups);groups.pop();a[t]+=3;}
  if(t<27&&t%9<7&&a[t+1]&&a[t+2]){a[t]--;a[t+1]--;a[t+2]--;groups.push({kind:'sequence',t,open:false});walk(pair,groups);groups.pop();a[t]++;a[t+1]++;a[t+2]++;}
 }
 for(let p=0;p<34;p++)if(a[p]>=2){a[p]-=2;walk(p,[]);a[p]+=2;}
 return out;
}
function waits(c,open=0,owned=null){
 if(c.reduce((a,b)=>a+b,0)!==13-3*open)return [];
 const out=[];for(let t=0;t<34;t++){if((owned||c)[t]>=4)continue;c[t]++;if(partitions(c,open).length)out.push(t);c[t]--;}
 return out;
}
function evaluate(tiles,melds,ctx){
 const c=counts(tiles),forms=partitions(c,melds.length);if(!forms.length)return null;
 const openGroups=melds.map(m=>({kind:m.kind==='chi'?'sequence':m.kind==='kan'?'quad':'triplet',t:Math.min(...m.tiles.map(type)),open:m.open}));
 const all=tiles.concat(melds.flatMap(m=>m.tiles));const allTypes=all.map(type);
 const closed=!melds.some(m=>m.open),tsumo=ctx.method==='tsumo';
 const w=type(ctx.winTile),wind=27+ctx.seat,round=27+ctx.round;
 const valuePair=t=>(t>=31?2:0)+(t===wind?2:0)+(t===round?2:0);
 let best=null;
 for(const form of forms){
  let spots=[-2];
  if(form.kind==='standard'){
   spots=[];if(form.pair===w)spots.push(-1);
   form.groups.forEach((g,i)=>{if(g.kind==='triplet'?g.t===w:w>=g.t&&w<=g.t+2)spots.push(i);});
  }
  for(const spot of spots){
   const yaku=[],ym=[];const add=(n,h)=>yaku.push({name:n,han:h});const yak=(n,m=1)=>ym.push({name:n,yakuman:m});
   const groups=form.groups.concat(openGroups).map(g=>({...g}));
   let waitType='';
   if(form.kind==='standard'){
    if(spot===-1)waitType='tanki';
    else {const g=groups[spot];if(g.kind!=='sequence'){waitType='shanpon';if(!tsumo)g.ronOpened=true;}
     else if(w===g.t+1)waitType='kanchan';else if((g.t%9===0&&w===g.t+2)||(g.t%9===6&&w===g.t))waitType='penchan';else waitType='ryanmen';}
   }
   const trips=groups.filter(g=>g.kind!=='sequence');const seqs=groups.filter(g=>g.kind==='sequence');
   const hidden=trips.filter(g=>!g.open&&!g.ronOpened).length;
   const dragonCount=trips.filter(g=>g.t>=31).length,windCount=trips.filter(g=>g.t>=27&&g.t<31).length;
   if(ctx.heaven===1)yak('천화');if(ctx.heaven===2)yak('지화');
   if(form.kind==='orphans'){
    const before=c.slice();before[w]--;const pure=TERMINALS.every(t=>before[t]===1);
    yak(pure?'국사무쌍 13면대기':'국사무쌍',pure&&ctx.doubleYakuman?2:1);
   }
   if(form.kind==='standard'&&hidden===4)yak(waitType==='tanki'?'스안커 단기':'스안커',waitType==='tanki'&&ctx.doubleYakuman?2:1);
   if(dragonCount===3)yak('대삼원');
   if(windCount===4)yak('대사희',ctx.doubleYakuman?2:1);else if(windCount===3&&form.pair>=27&&form.pair<31)yak('소사희');
   if(allTypes.every(t=>t>=27))yak('자일색');
   if(allTypes.every(t=>t<27&&terminal(t)))yak('청노두');
   if(allTypes.every(t=>GREEN.has(t)))yak('녹일색');
   if(groups.filter(g=>g.kind==='quad').length===4)yak('스깡쯔');
   if(!melds.length&&allTypes.every(t=>t<27&&Math.floor(t/9)===Math.floor(w/9))){
    const b=Math.floor(w/9)*9,base=[3,1,1,1,1,1,1,1,3];
    if(base.every((n,i)=>c[b+i]>=n)){
     const before=c.slice();before[w]--;const pure=base.every((n,i)=>before[b+i]===n);
     yak(pure?'순정구련보등':'구련보등',pure&&ctx.doubleYakuman?2:1);
    }
   }
   if(!ym.length){
    if(ctx.riichi)add(ctx.doubleRiichi?'더블 리치':'리치',ctx.doubleRiichi?2:1);
    if(ctx.riichi&&ctx.ippatsu)add('일발',1);
    if(closed&&tsumo)add('멘젠 쯔모',1);
    if(ctx.rinshan&&tsumo)add('영상개화',1);
    if(ctx.chankan&&!tsumo)add('창깡',1);
    if(ctx.last&&!ctx.rinshan)add(tsumo?'해저모월':'하저로어',1);
    if(allTypes.every(t=>!terminal(t)))add('탕야오',1);
    if(form.kind==='seven')add('치또이츠',2);
    for(const g of trips){if(g.t>=31)add('역패 · '+HONORS[g.t-27],1);if(g.t===wind)add('자풍 · '+HONORS[g.t-27],1);if(g.t===round)add('장풍 · '+HONORS[g.t-27],1);}
    const pinfu=closed&&seqs.length===4&&valuePair(form.pair)===0&&waitType==='ryanmen';if(pinfu)add('핑후',1);
    if(closed){const freq={};seqs.forEach(g=>freq[g.t]=(freq[g.t]||0)+1);const pairs=Object.values(freq).reduce((s,n)=>s+Math.floor(n/2),0);if(pairs===2)add('량페코',3);else if(pairs===1)add('이페코',1);}
    for(let n=0;n<7;n++)if([0,9,18].every(s=>seqs.some(g=>g.t===s+n))){add('삼색동순',closed?2:1);break;}
    for(let s=0;s<27;s+=9)if([0,3,6].every(n=>seqs.some(g=>g.t===s+n))){add('일기통관',closed?2:1);break;}
    if(trips.length===4)add('또이또이',2);
    if(hidden===3)add('산안커',2);
    if(groups.filter(g=>g.kind==='quad').length===3)add('산깡쯔',2);
    for(let n=0;n<9;n++)if([0,9,18].every(s=>trips.some(g=>g.t===s+n))){add('삼색동각',2);break;}
    if(dragonCount===2&&form.pair>=31)add('소삼원',2);
    if(allTypes.every(terminal))add('혼노두',2);
    if(seqs.length&&terminal(form.pair)&&groups.every(g=>g.kind==='sequence'?(g.t%9===0||g.t%9===6):terminal(g.t))){
     if(allTypes.some(t=>t>=27))add('찬타',closed?2:1);else add('준찬',closed?3:2);
    }
    const suits=new Set(allTypes.filter(t=>t<27).map(t=>Math.floor(t/9)));
    if(suits.size===1){if(allTypes.some(t=>t>=27))add('혼일색',closed?3:2);else add('청일색',closed?6:5);}
    if(!yaku.length)continue; // Dora is a bonus, never a qualifying yaku.
    let dora=0,ura=0,aka=0;
    for(const d of ctx.indicators||[])dora+=allTypes.filter(t=>t===doraNext(type(d))).length;
    if(ctx.riichi)for(const d of ctx.ura||[])ura+=allTypes.filter(t=>t===doraNext(type(d))).length;
    if(ctx.aka!==false)aka=all.filter(red).length;
    if(dora)add('도라',dora);if(aka)add('적도라',aka);if(ura)add('우라도라',ura);
   }
   const yakuman=ym.reduce((s,y)=>s+y.yakuman,0);const han=yakuman?0:yaku.reduce((s,y)=>s+y.han,0);
   let fu=20;
   if(form.kind==='seven')fu=25;
   else if(form.kind==='standard'){
    const pinfu=yaku.some(y=>y.name==='핑후');
    if(closed&&!tsumo)fu+=10;
    if(tsumo&&!pinfu)fu+=2;
    fu+=valuePair(form.pair);
    if(['tanki','kanchan','penchan'].includes(waitType))fu+=2;
    for(const g of trips)fu+=(g.open||g.ronOpened?2:4)*(terminal(g.t)?2:1)*(g.kind==='quad'?4:1);
    if(fu===20&&!tsumo)fu=30;
    fu=Math.ceil(fu/10)*10;
   }
   let basic=fu*2**(han+2),limit='';
   if(yakuman){basic=8000*yakuman;limit=yakuman===1?'역만':yakuman+'배 역만';}
   else if(han>=13){basic=8000;limit='헤아림 역만';}
   else if(han>=11){basic=6000;limit='삼배만';}
   else if(han>=8){basic=4000;limit='배만';}
   else if(han>=6){basic=3000;limit='하네만';}
   else if(han>=5||basic>=2000){basic=2000;limit='만관';}
   const dealer=ctx.seat===0,ron=round100(basic*(dealer?6:4));
   const tsumoDealer=round100(basic*2),tsumoOther=round100(basic*(dealer?2:1));
   const total=tsumo?(dealer?3*tsumoOther:tsumoDealer+2*tsumoOther):ron;
   const result={yaku:yakuman?ym:yaku,han,fu:yakuman?0:fu,yakuman,basic,limit,ron,tsumoDealer,tsumoOther,total,waitType};
   if(!best||total>best.total||(total===best.total&&han>best.han))best=result;
  }
 }
 return best;
}
class Engine{
 constructor(options={},onChange=()=>{}){
  this.options={mode:'east',aka:true,doubleYakuman:true,difficulty:'normal',...options};
  this.rngState=(Number.isFinite(options.seed)?options.seed:Date.now())>>>0;this.options.seed=this.rngState;
  this.onChange=onChange;this.rng=options.rng||(()=>{this.rngState=(this.rngState+0x6D2B79F5)>>>0;let t=this.rngState;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;});
  this.names=['히나 · YOU','아카네','시즈쿠','코하루'];this.decisions=[];
  this.points=[25000,25000,25000,25000];this.roundIndex=0;this.dealer=0;this.honba=0;this.sticks=0;
  this.phase='idle';this.history=[];this.handNumber=0;this.version=0;this.result=null;this.pending=null;
 }
 emit(event='change',data={}){this.version++;this.onChange(event,data,this);}
 log(text,kind='info'){this.history.push({text,kind,hand:this.handNumber});if(this.history.length>180)this.history.shift();}
 seat(i){return(i-this.dealer+4)%4;}
 roundWind(){return Math.floor(this.roundIndex/4);}
 indicators(){return Array.from({length:this.kanCount+1},(_,i)=>this.dead[4+2*i]);}
 ura(){return Array.from({length:this.kanCount+1},(_,i)=>this.dead[5+2*i]);}
 start(){this.startHand();}
 startHand(){
  this.robbedTile=null;this.handNumber++;this.players=Array.from({length:4},()=>({hand:[],melds:[],river:[],drawn:null,drawCount:0,riichi:false,doubleRiichi:false,ippatsu:false,tempFuriten:false,riichiFuriten:false,rinshan:false,forbid:[]}));
  const tiles=Array.from({length:136},(_,i)=>i);
  for(let i=135;i>0;i--){const j=Math.floor(this.rng()*(i+1));[tiles[i],tiles[j]]=[tiles[j],tiles[i]];}
  this.dead=tiles.splice(-14);this.wall=tiles;this.kanCount=0;this.callCount=0;this.kanOwners=[];this.pending=null;this.result=null;
  for(let j=0;j<13;j++)for(let i=0;i<4;i++)this.players[i].hand.push(this.wall.pop());
  this.players.forEach(p=>p.hand=sorted(p.hand));this.current=this.dealer;
  this.log(`${this.roundWind()===0?'동':'남'} ${this.roundIndex%4+1}국 · ${this.honba}본장`,'round');
  this.draw(this.dealer);
 }
 shapeWaits(i,hand=null,melds=null){
  const p=this.players[i];const h=hand||p.hand,m=melds||p.melds;
  const owned=counts(h.concat(m.flatMap(x=>x.tiles)));return waits(counts(h),m.length,owned);
 }
 furiten(i){
  const p=this.players[i];if(p.tempFuriten||p.riichiFuriten)return true;
  const ws=this.shapeWaits(i);return p.river.some(r=>ws.includes(type(r.id)));
 }
 context(i,method,winTile,extra={},includeUra=false){
  const p=this.players[i];return{method,winTile,seat:this.seat(i),round:this.roundWind(),riichi:p.riichi,doubleRiichi:p.doubleRiichi,ippatsu:p.ippatsu,
   rinshan:method==='tsumo'&&p.rinshan,last:this.wall.length===0,
   heaven:method==='tsumo'&&p.drawCount===1&&p.river.length===0&&this.callCount===0?(i===this.dealer?1:2):0,
   indicators:this.indicators(),ura:includeUra?this.ura():[],aka:this.options.aka,doubleYakuman:this.options.doubleYakuman,...extra};
 }
 score(i,method,winTile,extra={},includeUra=false){const p=this.players[i];return evaluate(method==='ron'?p.hand.concat(winTile):p.hand,p.melds,this.context(i,method,winTile,extra,includeUra));}
 canRon(i,id,extra={}){return!this.furiten(i)&&!!this.score(i,'ron',id,extra);}
 draw(i,rinshan=false){
  if(!rinshan&&!this.wall.length)return this.exhaustive();
  const p=this.players[i];let id;
  if(rinshan){const k=this.kanCount-1;id=this.dead[k];this.dead[k]=this.wall.shift();}
  else id=this.wall.pop();
  if(id==null)throw new Error('패산이 비어 있습니다.');
  p.hand.push(id);p.drawn=id;p.drawCount++;p.tempFuriten=false;p.rinshan=rinshan;p.forbid=[];
  this.current=i;this.phase='turn';this.pending=null;this.emit(rinshan?'rinshan':'draw',{i,id});
 }
 legalDiscards(i){
  const p=this.players[i];if(this.phase!=='turn'||this.current!==i)return[];
  return p.hand.filter(id=>(!p.riichi||id===p.drawn)&&!p.forbid.includes(type(id)));
 }
 riichiOptions(i){
  const p=this.players[i];if(p.riichi||p.melds.some(m=>m.open)||this.points[i]<1000||this.wall.length<4)return[];
  return this.legalDiscards(i).filter(id=>this.shapeWaits(i,p.hand.filter(x=>x!==id)).length>0);
 }
 nineTerminals(i){const p=this.players[i];return p.drawCount===1&&!p.river.length&&this.callCount===0&&new Set(p.hand.map(type).filter(terminal)).size>=9;}
 kanOptions(i){
  const p=this.players[i];if(this.phase!=='turn'||this.current!==i||p.drawn==null||!this.wall.length||this.kanCount>=4)return[];
  const c=counts(p.hand),out=[];
  for(let t=0;t<34;t++)if(c[t]===4){
   const ids=p.hand.filter(id=>type(id)===t),meld={kind:'kan',tiles:ids,open:false,from:i,called:null};
   if(p.riichi){
    if(type(p.drawn)!==t)continue;
    const before=p.hand.filter(id=>id!==p.drawn),ws=this.shapeWaits(i,before);
    const after=p.hand.filter(id=>type(id)!==t),newM=p.melds.concat(meld),next=this.shapeWaits(i,after,newM);
    if(ws.join(',')!==next.join(','))continue;
    // Riichi ankan must preserve all possible decompositions, not merely waits.
    if(ws.some(w=>partitions(counts(before.concat(w*4)),p.melds.length).some(f=>f.kind!=='standard'||!f.groups.some(g=>g.kind==='triplet'&&g.t===t))))continue;
   }
   out.push({kind:'ankan',ids,t,meld});
  }
  if(!p.riichi)p.melds.forEach((m,index)=>{if(m.kind==='pon'){const id=p.hand.find(id=>type(id)===type(m.tiles[0]));if(id!=null)out.push({kind:'kakan',id,index,t:type(id)});}});
  return out;
 }
 discard(i,id,declareRiichi=false){
  if(!this.legalDiscards(i).includes(id))return false;
  if(declareRiichi&&!this.riichiOptions(i).includes(id))return false;
  const p=this.players[i],tsumogiri=id===p.drawn;
  if(p.ippatsu)p.ippatsu=false;
  p.hand=p.hand.filter(x=>x!==id);p.river.push({id,riichi:declareRiichi,tsumogiri,called:false});p.drawn=null;p.forbid=[];
  if(declareRiichi){p.riichi=true;p.doubleRiichi=p.river.length===1&&this.callCount===0;p.ippatsu=true;}
  this.log(`${this.names[i]} · ${declareRiichi?'리치 선언 / ':''}${tileName(id,this.options.aka)} 버림`,declareRiichi?'riichi':'discard');
  const choices={};for(let j=0;j<4;j++)if(j!==i)choices[j]=this.callOptions(j,i,id);
  this.pending={kind:'discard',from:i,id,choices,cpu:{},declareRiichi};
  for(let j=1;j<4;j++)if(j!==i)this.pending.cpu[j]=this.cpuCall(j,choices[j],i,id);
  this.phase='response';this.emit('discard',{i,id,riichi:declareRiichi});return true;
 }
 callOptions(i,from,id,onlyRon=false){
  const p=this.players[i],t=type(id),out=[];
  if(this.canRon(i,id,onlyRon?{chankan:true}:{}))out.push({kind:'ron'});
  if(onlyRon||p.riichi||!this.wall.length)return out;
  const same=p.hand.filter(x=>type(x)===t).sort((a,b)=>(red(a)?1:0)-(red(b)?1:0));
  // Include red/non-red combinations where a choice changes the exposed red tile.
  if(same.length>=2){for(let a=0;a<same.length;a++)for(let b=a+1;b<same.length;b++)out.push({kind:'pon',ids:[same[a],same[b]],t});}
  if(same.length>=3&&this.kanCount<4)out.push({kind:'minkan',ids:same.slice(0,3),t});
  if(i===(from+1)%4&&t<27){
   const start=Math.floor(t/9)*9;
   for(let x=Math.max(start,t-2);x<=Math.min(t,start+6);x++){
    const need=[x,x+1,x+2];need.splice(need.indexOf(t),1);
    const as=p.hand.filter(v=>type(v)===need[0]),bs=p.hand.filter(v=>type(v)===need[1]);
    for(const a of as)for(const b of bs)out.push({kind:'chi',ids:[a,b],t,start:x});
   }
  }
  const unique=[];const seen=new Set();
  for(const o of out){if(o.kind==='ron'){unique.push(o);continue;}
   const key=o.kind+':'+(o.start??o.t)+':'+o.ids.map(x=>red(x)?'r':'n').join('');if(seen.has(key))continue;seen.add(key);
   if(o.kind!=='minkan'){
    const banned=this.kuikae(o,id);if(!p.hand.some(x=>!o.ids.includes(x)&&!banned.includes(type(x))))continue;
   }
   unique.push(o);
  }return unique;
 }
 kuikae(o,id){const t=type(id),ban=[t];if(o.kind==='chi'){if(t===o.start&&o.start%9<=5)ban.push(o.start+3);if(t===o.start+2&&o.start%9>=1)ban.push(o.start-1);}return ban;}
 acceptRiichi(){
  if(!this.pending?.declareRiichi)return;
  this.points[this.pending.from]-=1000;this.sticks++;this.pending.declareRiichi=false;
  this.emit('riichiAccepted',{i:this.pending.from,id:this.pending.id,sticks:this.sticks});
 }
 resolve(action=null){
  if(!['response','kanResponse'].includes(this.phase)||!this.pending)return false;
  const q=this.pending,actions={...q.cpu};
  if(q.from!==0&&action){const found=(q.choices[0]||[]).find(o=>this.sameAction(o,action));if(!found)return false;actions[0]=found;}
  const winners=[];for(let k=1;k<=3;k++){const i=(q.from+k)%4;if(actions[i]?.kind==='ron')winners.push(i);}
  if(winners.length){
   if(q.declareRiichi){this.players[q.from].riichi=false;this.players[q.from].ippatsu=false;}
   if(winners.length===3){if(q.kind==='kan')this.cancelRobbedKan(q);this.abort('삼가화 · 세 명의 동시 론');return true;}
   if(q.kind==='kan')this.cancelRobbedKan(q);
   this.finishWin(winners,'ron',q.from,q.id,q.kind==='kan'?{chankan:q.kan.kind==='kakan'}:{});return true;
  }
  // Passing a shape-completing tile also causes temporary furiten without a yaku.
  for(let i=0;i<4;i++)if(i!==q.from&&this.shapeWaits(i).includes(type(q.id))&&(q.kind!=='kan'||q.kan.kind==='kakan'||partitions(counts(this.players[i].hand.concat(q.id)),this.players[i].melds.length).some(f=>f.kind==='orphans'))){const p=this.players[i];p.tempFuriten=true;if(p.riichi)p.riichiFuriten=true;}
  if(q.kind==='kan'){this.completeKan(q.from,q.kan);return true;}
  this.acceptRiichi();
  if(this.kanCount===4&&new Set(this.kanOwners).size>1){this.abort('사개깡 · 여러 명이 네 번 깡');return true;}
  let claimant=null;for(let k=1;k<=3;k++){const i=(q.from+k)%4;if(['pon','minkan'].includes(actions[i]?.kind)){claimant=i;break;}}
  if(claimant===null){const i=(q.from+1)%4;if(actions[i]?.kind==='chi')claimant=i;}
  if(claimant!==null){this.makeCall(claimant,q.from,q.id,actions[claimant]);return true;}
  if(this.players.every(p=>p.riichi)){this.abort('사가리치 · 네 명 모두 리치');return true;}
  if(this.kanCount===4&&new Set(this.kanOwners).size>1){this.abort('사개깡 · 여러 명이 네 번 깡');return true;}
  if(this.callCount===0&&this.players.every(p=>p.river.length===1)){
   const ts=this.players.map(p=>type(p.river[0].id));if(ts[0]>=27&&ts[0]<=30&&ts.every(t=>t===ts[0])){this.abort('사풍연타 · 같은 바람패 네 장');return true;}
  }
  this.draw((q.from+1)%4);return true;
 }
 sameAction(a,b){return a.kind===b.kind&&(a.ids||[]).join(',')===(b.ids||[]).join(',')&&(a.id??-1)===(b.id??-1)&&(a.t??-1)===(b.t??-1);}
 makeCall(i,from,id,o){
  const p=this.players[i];p.hand=p.hand.filter(x=>!o.ids.includes(x));
  const meld={kind:o.kind==='minkan'?'kan':o.kind,tiles:sorted(o.ids.concat(id)),open:true,from,called:id};p.melds.push(meld);
  this.players[from].river[this.players[from].river.length-1].called=true;
  this.callCount++;this.players.forEach(p=>p.ippatsu=false);this.current=i;this.pending=null;p.rinshan=false;p.drawn=null;
  this.log(`${this.names[i]} · ${o.kind==='chi'?'치':o.kind==='pon'?'퐁':'대명깡'}`,'call');
  if(o.kind==='minkan'){this.kanCount++;this.kanOwners.push(i);this.draw(i,true);this.emit('call',{i,kind:'깡'});}
  else {p.forbid=this.kuikae(o,id);this.phase='turn';this.emit('call',{i,kind:o.kind==='chi'?'치':'퐁'});}
 }
 declareKan(i,kan){
  const valid=this.kanOptions(i).find(o=>this.sameAction(o,kan));if(!valid)return false;
  const id=valid.kind==='kakan'?valid.id:(this.players[i].drawn!=null&&type(this.players[i].drawn)===valid.t?this.players[i].drawn:valid.ids[0]);
  const choices={};for(let j=0;j<4;j++)if(j!==i){
   choices[j]=[];
   if(valid.kind==='kakan'){if(this.canRon(j,id,{chankan:true}))choices[j]=[{kind:'ron'}];}
   else if(this.canRon(j,id)&&partitions(counts(this.players[j].hand.concat(id)),this.players[j].melds.length).some(f=>f.kind==='orphans'))choices[j]=[{kind:'ron'}];
  }
  this.pending={kind:'kan',from:i,id,kan:valid,choices,cpu:{}};
  for(let j=1;j<4;j++)if(j!==i&&choices[j].length)this.pending.cpu[j]={kind:'ron'};
  this.phase='kanResponse';this.emit('kanOffer',{i,kind:valid.kind});return true;
 }
 cancelRobbedKan(q){
  // The robbed tile leaves the declarer's hand; the original pon remains intact.
  this.players[q.from].hand=this.players[q.from].hand.filter(id=>id!==q.id);
  this.players[q.from].drawn=null;this.robbedTile=q.id;
 }
 completeKan(i,kan){
  const p=this.players[i];
  if(kan.kind==='ankan'){p.hand=p.hand.filter(id=>!kan.ids.includes(id));p.melds.push(kan.meld);}
  else {p.hand=p.hand.filter(id=>id!==kan.id);const m=p.melds[kan.index];m.kind='kan';m.tiles.push(kan.id);m.added=kan.id;}
  p.drawn=null;this.kanCount++;this.kanOwners.push(i);this.callCount++;this.players.forEach(p=>p.ippatsu=false);
  this.log(`${this.names[i]} · ${kan.kind==='ankan'?'안깡':'가깡'}`,'call');
  this.draw(i,true);this.emit('call',{i,kind:'깡'});
 }
 tsumo(i){if(this.phase!=='turn'||this.current!==i)return false;const p=this.players[i];if(p.drawn==null||!this.score(i,'tsumo',p.drawn))return false;this.finishWin([i],'tsumo',null,p.drawn);return true;}
 finishWin(winners,method,from,id,extra={}){
  if(['result','finished'].includes(this.phase))return false;
  const delta=[0,0,0,0],details=[];
  for(let n=0;n<winners.length;n++){
   const i=winners[n],s=this.score(i,method,id,extra,true);if(!s)throw new Error('역이 없는 화료입니다.');
   if(method==='ron'){const payment=s.ron+this.honba*300;delta[i]+=payment;delta[from]-=payment;}
   else for(let j=0;j<4;j++)if(j!==i){const pay=(j===this.dealer?s.tsumoDealer:s.tsumoOther)+this.honba*100;delta[j]-=pay;delta[i]+=pay;}
   if(n===0)delta[i]+=this.sticks*1000;
   details.push({i,score:s,hand:sorted(method==='ron'?this.players[i].hand.concat(id):this.players[i].hand),melds:this.players[i].melds.map(m=>({...m,tiles:m.tiles.slice()})),winTile:id,method,from,ura:this.players[i].riichi?this.ura():[]});
   this.log(`${this.names[i]} · ${method==='ron'?'론':'쯔모'} / ${s.limit||`${s.han}판 ${s.fu}부`} / ${s.total.toLocaleString()}점`,'win');
  }
  const sticks=this.sticks;this.sticks=0;this.points=this.points.map((p,i)=>p+delta[i]);
  this.result={id:this.handNumber+':'+(this.version+1),kind:'win',winners:details,delta,points:this.points.slice(),repeat:winners.includes(this.dealer),sticks,honba:this.honba,dealership:this.dealer,indicators:this.indicators().slice()};
  this.phase='result';this.pending=null;this.emit('win',this.result);
 }
 exhaustive(){
  if(['result','finished'].includes(this.phase))return false;
  const tenpai=this.players.map((p,i)=>this.shapeWaits(i).length>0);const n=tenpai.filter(Boolean).length;const delta=[0,0,0,0];
  // Nagashi mangan is a house-rule exclusion; see the in-game rules panel.
  if(n>0&&n<4)for(let i=0;i<4;i++)delta[i]=tenpai[i]?3000/n:-3000/(4-n);
  this.points=this.points.map((v,i)=>v+delta[i]);
  this.result={kind:'draw',name:'황패유국',tenpai,delta,points:this.points.slice(),repeat:tenpai[this.dealer],honba:this.honba,dealership:this.dealer};
  this.phase='result';this.pending=null;this.log('유국 · 텐파이 '+n+'명','draw');this.emit('drawEnd',this.result);
 }
 abort(reason){
  if(['result','finished'].includes(this.phase))return false;
  this.result={kind:'abort',name:reason,delta:[0,0,0,0],points:this.points.slice(),repeat:true,honba:this.honba,dealership:this.dealer};
  this.phase='result';this.pending=null;this.log(reason,'draw');this.emit('drawEnd',this.result);
 }
 abortNine(i){if(this.phase==='turn'&&this.current===i&&this.nineTerminals(i)){this.abort('구종구패');return true;}return false;}
 nextHand(){
  if(this.phase!=='result')return;
  const last=this.options.mode==='half'?7:3;const r=this.result;
  const top=this.ranking()[0];
  const agariYame=this.roundIndex===last&&r.repeat&&r.kind!=='abort'&&top===this.dealer&&this.points[this.dealer]>=30000;
  if(this.options.mode==='single'||this.points.some(v=>v<0)||agariYame)return this.finishMatch();
  if(r.repeat)this.honba++;else {this.roundIndex++;this.dealer=(this.dealer+1)%4;this.honba=r.kind==='win'?0:this.honba+1;}
  if(this.roundIndex>last)return this.finishMatch();this.startHand();
 }
 ranking(){return[0,1,2,3].sort((a,b)=>this.points[b]-this.points[a]||a-b);}
 finishMatch(){if(this.sticks){this.points[this.ranking()[0]]+=this.sticks*1000;this.sticks=0;}this.phase='finished';this.emit('finished',{ranking:this.ranking(),points:this.points.slice()});}
 visible(i){
  const c=counts(this.players[i].hand);
  for(const p of this.players){for(const r of p.river)if(!r.called)c[type(r.id)]++;for(const m of p.melds)for(const id of m.tiles)c[type(id)]++;}
  for(const id of this.indicators())c[type(id)]++;
  return c;
 }
 risk(i,t){
  let risk=0;const seen=this.visible(i);
  for(let j=0;j<4;j++)if(j!==i&&this.players[j].riichi){
   const river=this.players[j].river.map(r=>type(r.id));if(river.includes(t))continue;
   let r=t>=27?(seen[t]>=3?0.18:seen[t]===2?0.6:1):terminal(t)?1.05:1.65;
   if(t<27){const n=t%9;if(n>=3&&river.includes(t-3))r*=0.55;if(n<=5&&river.includes(t+3))r*=0.55;
    if(seen[t]>=3)r*=0.8;}
   risk+=r;
  }return risk;
 }
 efficiency(i,hand=null,melds=null,forbidden=[]){
  const p=this.players[i],h=hand||p.hand,m=melds||p.melds,visible=this.visible(i),c=counts(h),options=[];
  for(const id of h){
   const t=type(id);if(forbidden.includes(t)||options.some(o=>o.t===t&&red(o.id)===red(id)))continue;
   c[t]--;const s=shanten(c,m.length);c[t]++;options.push({id,t,shanten:s,ukeire:0,waits:[],risk:this.risk(i,t)});
  }
  if(!options.length)return[];
  const min=Math.min(...options.map(o=>o.shanten));
  for(const o of options){
   if(o.shanten>min)continue;
   c[o.t]--;
   if(o.shanten===0){const owned=counts(h.filter(id=>id!==o.id).concat(m.flatMap(x=>x.tiles)));o.waits=waits(c,m.length,owned);o.ukeire=o.waits.reduce((n,t)=>n+Math.max(0,4-visible[t]),0);}
   else for(let t=0;t<34;t++){
    const left=4-visible[t];if(left<=0||c[t]>=4)continue;
    if(t>=27&&!c[t])continue;
    if(t<27&&!c[t]&&![t-2,t-1,t+1,t+2].some(x=>x>=0&&x<27&&Math.floor(x/9)===Math.floor(t/9)&&c[x]))continue;
    c[t]++;if(shanten(c,m.length)<o.shanten)o.ukeire+=left;c[t]--;
   }
   c[o.t]++;
  }
  const bonus=id=>((this.options.aka&&red(id))?1.2:0)+this.indicators().filter(d=>doraNext(type(d))===type(id)).length*1.2;
  const connectivity=t=>{if(t>=27)return c[t]>=2?1:0;let v=c[t]*0.3;for(const k of [-2,-1,1,2])if(Math.floor((t+k)/9)===Math.floor(t/9)&&c[t+k])v+=Math.abs(k)===1?0.35:0.16;return v;};
  for(const o of options){o.bonus=bonus(o.id);o.value=-100*o.shanten+o.ukeire-o.bonus-connectivity(o.t);}
  return options.sort((a,b)=>b.value-a.value||a.id-b.id);
 }
 cpuDiscard(i){
  const p=this.players[i];if(p.riichi)return p.drawn;
  const candidates=this.efficiency(i,null,null,p.forbid),threat=this.players.some((p,j)=>j!==i&&p.riichi);
  if(!candidates.length)throw new Error('버릴 수 있는 패가 없습니다.');
  const policy=root.RiichiPolicy||(typeof require==='function'?require('./policy.js'):null),chosen=policy.choose(candidates,policy.profiles[i],threat,this.options.difficulty,this.rng);
  this.decisions.push({seq:this.version,i,kind:'discard',id:chosen.id,threat,shanten:chosen.shanten,risk:chosen.risk,policyValue:chosen.policyValue});
  if(this.decisions.length>200)this.decisions.shift();return chosen.id;
 }
 cpuCall(i,choices,from,id){
  if(!choices?.length)return null;
  if(choices.some(o=>o.kind==='ron'))return{kind:'ron'};
  const p=this.players[i],policy=root.RiichiPolicy||(typeof require==='function'?require('./policy.js'):null),profile=policy.profiles[i],threat=this.players.some((p,j)=>j!==i&&p.riichi);
  if(threat&&profile.risk>=1)return null;
  const before=shanten(counts(p.hand),p.melds.length);if(before<0)return null;
  let best=null,bestVal=-Infinity;
  for(const o of choices){
   if(o.kind==='ron')continue;
   // The simpler CPU preserves a guaranteed open-yaku route rather than calling blindly.
   const h=p.hand.filter(x=>!o.ids.includes(x));const meld={kind:o.kind==='minkan'?'kan':o.kind,tiles:o.ids.concat(id),open:true,from,called:id};
   const m=p.melds.concat(meld),yakuhai=m.some(g=>g.kind!=='chi'&&(type(g.tiles[0])>=31||type(g.tiles[0])===27+this.seat(i)||type(g.tiles[0])===27+this.roundWind()));
   const tiles=h.concat(m.flatMap(x=>x.tiles));const simple=tiles.filter(x=>terminal(type(x))).length<=1&&meld.tiles.every(x=>!terminal(type(x)));
   if(!yakuhai&&!simple)continue;
   if(o.kind==='minkan'){
    if(yakuhai&&p.melds.length&&before<=2)return o;continue;
   }
   const opts=this.efficiency(i,h,m,this.kuikae(o,id));if(!opts.length)continue;const s=opts[0].shanten;
   if(s>=before)continue;
   // When relying on tanyao, the selected discard must remove every terminal/honor.
   if(!yakuhai&&h.filter(x=>x!==opts[0].id).concat(m.flatMap(x=>x.tiles)).some(x=>terminal(type(x))))continue;
   const val=-s*100+opts[0].ukeire;if(val>bestVal){bestVal=val;best=o;}
  }return best&&this.rng()<profile.call?best:null;
 }
 cpuTurn(i=this.current){
  if(this.phase!=='turn'||this.current!==i)return;
  const p=this.players[i];if(p.drawn!=null&&this.tsumo(i))return;
  if(this.nineTerminals(i)&&shanten(counts(p.hand),0)>=4){this.abortNine(i);return;}
  const kans=this.kanOptions(i);
  if(kans.length&&!this.players.some((p,j)=>j!==i&&p.riichi)){this.declareKan(i,kans[0]);return;}
  const policy=root.RiichiPolicy||(typeof require==='function'?require('./policy.js'):null);
  const id=this.cpuDiscard(i);const riichi=this.riichiOptions(i).includes(id)&&this.rng()<policy.profiles[i].riichi;
  this.discard(i,id,riichi);
 }
 assertIntegrity(){
  if(!this.players)return true;
  const ids=this.wall.concat(this.dead);
  for(const p of this.players){ids.push(...p.hand);for(const m of p.melds)ids.push(...m.tiles);for(const r of p.river)if(!r.called)ids.push(r.id);}
  if(this.robbedTile!=null&&this.phase==='result')ids.push(this.robbedTile);
  if(ids.some(x=>!Number.isInteger(x)||x<0||x>135))throw new Error('Invalid tile identity');
  if(new Set(ids).size!==ids.length)throw new Error('Duplicate physical tile');
  if(ids.length!==136)throw new Error('Tile conservation failed: '+ids.length);
  if(this.points.reduce((a,b)=>a+b,0)+this.sticks*1000!==100000)throw new Error('Score conservation failed');
  return true;
 }
}
const API={Engine,type,red,name,tileName,norm,counts,sorted,terminal,doraNext,shanten,partitions,waits,evaluate,HONORS,TERMINALS};
if(typeof module!=='undefined'&&module.exports)module.exports=API;root.Riichi=API;
})(typeof window!=='undefined'?window:globalThis);

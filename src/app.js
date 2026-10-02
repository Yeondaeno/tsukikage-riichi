(function(){'use strict';
const R=window.Riichi,$=id=>document.getElementById(id);
const SAVE_KEY='tsukikage-riichi-state-v3',PREF_KEY='tsukikage-riichi-prefs-v3';
const defaults={speed:650,sound:false,sfxVolume:50,voiceVolume:70,hints:true,guideLevel:'auto',recommend:true,helperLabels:true,actualDora:true,publicHighlight:true,dialogue:true,dialogueFrequency:'normal',riichiAuto:false,alerts:true,tileTheme:'jade',motion:'full',doraGlow:true};
let fx=null,input=null,tutorialSeen=new Set(),backgroundPaused=false;
let prefs={...defaults},save=null,storageAvailable=true;
try{
 const current=JSON.parse(localStorage.getItem(PREF_KEY)||'null'),legacy=JSON.parse(localStorage.getItem('tsukikage-riichi-prefs-v1')||'{}'),values=current||legacy;
 for(const k of Object.keys(defaults))if(typeof values?.[k]===typeof defaults[k])prefs[k]=values[k];
 if(!current)prefs.riichiAuto=false;
 prefs.speed=Math.min(1500,Math.max(60,prefs.speed));for(const k of ['sfxVolume','voiceVolume'])prefs[k]=Math.min(100,Math.max(0,prefs[k]));
 if(!['off','request','auto','tutorial'].includes(prefs.guideLevel))prefs.guideLevel='auto';
 if(!['off','short','full'].includes(prefs.motion))prefs.motion='full';
 save=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');
 if(!save){const prior=JSON.parse(localStorage.getItem('tsukikage-riichi-state-v1')||'null');if(prior?.schema===1&&prior.state)save={schema:3,state:{...prior.state,rngState:(Date.now()>>>0),decisions:[]},migrated:true};}
}catch(e){storageAvailable=false;}
let game,started=false,paused=false,timer=null,toastTimer=null,noticeTimer=null,selected=null,riichiMode=false,choiceList=null,cache=null,lastDiscard=null,lastClick={id:null,time:0},modalType='',epoch=0,record=[];
const windChars=['東','南','西','北'],styles=['균형형','공격형','수비형','균형형'];
const modeNames={single:'1국 연습',east:'동풍전',half:'반장전'};
const ICONS={
 sound:'<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
 muted:'<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="m16 9 5 6m0-6-5 6"/>',
 expand:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
 settings:'<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/><path d="m9 3 1-1h4l1 3 3 1 3 2v4l-3 2-1 3-2 4h-4l-2-3-3-1-4-2v-4l3-2 1-3Z" transform="translate(2 2) scale(.83)"/>'
};
const svgIcon=n=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;
function esc(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function tileSvg(id,aka=true){
 const t=R.type(id),n=t%9+1,s=Math.floor(t/9),isRed=aka&&R.red(id),ink=isRed?'var(--tile-red)':'var(--tile-ink)',green=isRed?'var(--tile-red)':'var(--tile-green)',blue=isRed?'var(--tile-red)':'var(--tile-blue)';
 let body='';
 const text=(x,y,txt,size,color=ink,extra='')=>`<text x="${x}" y="${y}" text-anchor="middle" fill="${color}" font-family="Georgia, 'Yu Mincho', 'Malgun Gothic', serif" font-size="${size}" ${extra}>${txt}</text>`;
 if(t<9){body=text(22,29,['一','二','三','四','五','六','七','八','九'][n-1],27,ink,'font-weight="600"')+text(22,53,'萬',23,'var(--tile-red)');}
 else if(t<18){
  let pos=[];
  if(n===1){body=`<circle cx="22" cy="32" r="14" fill="none" stroke="${blue}" stroke-width="3"/><circle cx="22" cy="32" r="10" fill="none" stroke="var(--tile-red)" stroke-width="2"/><circle cx="22" cy="32" r="4.5" fill="${blue}"/>`;
   for(let i=0;i<8;i++){const a=i*Math.PI/4;body+=`<circle cx="${22+7*Math.cos(a)}" cy="${32+7*Math.sin(a)}" r="1.5" fill="var(--tile-red)"/>`;}}
  if(n===2)pos=[[22,19],[22,45]];
  if(n===3)pos=[[12,16],[22,32],[32,48]];
  if(n===4)pos=[[12,19],[32,19],[12,46],[32,46]];
  if(n===5)pos=[[12,17],[32,17],[22,32],[12,48],[32,48]];
  if(n===6)pos=[[12,16],[32,16],[12,32],[32,32],[12,48],[32,48]];
  if(n===7)pos=[[11,12],[22,21],[33,12],[12,37],[32,37],[12,50],[32,50]];
  if(n===8)pos=[[12,13],[32,13],[12,26],[32,26],[12,39],[32,39],[12,52],[32,52]];
  if(n===9)pos=[11,22,33].flatMap(x=>[16,33,50].map(y=>[x,y]));
  for(const [x,y]of pos){const r=n<=3?6:4.5,col=isRed?'var(--tile-red)':n===5&&x===22?'var(--tile-red)':blue;body+=`<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${col}" stroke-width="2"/><circle cx="${x}" cy="${y}" r="${r*0.36}" fill="${col}"/>`;}
 }
 else if(t<27){
  if(n===1){body='<path d="M14 49c7-8 4-19 7-28 3-7 8-9 12-6l-5 4c-4 3-1 10 2 14 4 9-6 15-16 16Z" fill="var(--tile-green)"/><path d="m24 29-12 6 4-12 8 6Z" fill="var(--tile-green)"/><path d="m18 42-8 12 13-9m-3-22-6-9 10 6" fill="var(--tile-red)"/><path d="m31 15 8 2-9 2" fill="#a77d35"/><circle cx="29" cy="16" r="1.2" fill="#f8f3df"/><path d="m21 47-1 9m5-11 2 9" stroke="#9b6d33" stroke-width="1.5"/>';}
  else {
   let pos=[];
   if(n===2)pos=[[22,20],[22,45]];
   if(n===3)pos=[[22,17],[13,43],[31,43]];
   if(n===4)pos=[[12,20],[32,20],[12,45],[32,45]];
   if(n===5)pos=[[12,17],[32,17],[22,32],[12,48],[32,48]];
   if(n===6)pos=[[12,15],[32,15],[12,32],[32,32],[12,49],[32,49]];
   if(n===7)pos=[[22,12],[12,28],[32,28],[12,42],[32,42],[12,54],[32,54]];
   if(n===8)pos=[[12,13],[32,13],[12,27],[32,27],[12,41],[32,41],[12,54],[32,54]];
   if(n===9)pos=[11,22,33].flatMap(x=>[16,33,50].map(y=>[x,y]));
   for(const[x,y]of pos){const len=n<5?13:10,col=n===7&&y===12?'var(--tile-red)':green;body+=`<path d="M${x} ${y-len/2}v${len}" stroke="${col}" stroke-width="3.4" stroke-linecap="round"/><path d="m${x-2.7} ${y-len/2+1}h5.4m-5.4 ${len/2-1}h5.4m-5.4 ${len/2-1}h5.4" stroke="${col}" stroke-width="1.4" stroke-linecap="round"/>`;}
  }
 }
 else if(t===31){body='<rect x="10" y="14" width="24" height="36" rx="1" fill="none" stroke="var(--tile-blue)" stroke-width="3"/><rect x="13.5" y="17.5" width="17" height="29" rx=".5" fill="none" stroke="var(--tile-blue)" stroke-width=".8"/>';}
 else body=text(22,44,['東','南','西','北','白','發','中'][t-27],34,t===32?'var(--tile-green)':t===33?'var(--tile-red)':ink,'font-weight="600"');
 const label=t<27?n+['m','p','s'][s]:R.HONORS[t-27];
 return `<svg class="tile-art" viewBox="0 0 44 62" aria-hidden="true"><text x="3" y="8" font-size="7" fill="${isRed?'var(--tile-red)':'var(--tile-muted)'}" font-family="Arial, 'Malgun Gothic', sans-serif" font-weight="600">${label}</text>${body}${isRed?'<circle cx="38" cy="6" r="1.8" fill="var(--tile-red)"/>':''}</svg>`;
}
function tile(id,size='',classes='',attrs='',button=false,options={}){
 const tag=button?'button':'span',aka=game?.options.aka!==false;
 if(options.indicator&&!attrs.includes('data-public-tile'))attrs+=' tabindex="0" data-public-tile="'+id+'"';
 const bonus=window.RiichiFX.doraInfo(R,id,game,options);
 const highlight=!options.indicator&&options.highlight!==false&&started&&bonus.total>0;
 const parts=[];if(highlight){if(bonus.normal)parts.push('도라 ×'+bonus.normal);if(bonus.red)parts.push('적도라');if(bonus.ura)parts.push('우라도라 ×'+bonus.ura);}
 const title=R.tileName(id,aka)+(parts.length?' · '+parts.join(' · '):'');
 if(parts.length&&attrs.includes('aria-label='))attrs=attrs.replace(/aria-label="([^"]*)"/,(_,label)=>`aria-label="${label} · ${esc(parts.join(' · '))}"`);
 const art=tileSvg(id,aka);
 const shine=highlight?`<span class="dora-ring" aria-hidden="true"></span><span class="dora-sheen" aria-hidden="true"></span><span class="dora-spark" aria-hidden="true">✦</span><span class="dora-badge" aria-hidden="true">✦${bonus.total>1?' '+bonus.total:''}</span>`:'';
 return `<${tag} class="tile ${size} ${classes} ${aka&&R.red(id)?'red-five':''} ${highlight?'is-dora':''}" data-face-type="${R.type(id)}" ${highlight?`data-dora="${bonus.total}" style="--shine-delay:-${(id*173%4400)/1000}s"`:''} ${options.indicator?'data-indicator="true"':''} ${attrs.includes('title=')?'':`title="${esc(title)}"`} ${attrs.includes('aria-label=')?'':`aria-label="${esc(title)}"`} ${button?'type="button"':'role="img"'} ${attrs}>${art}${shine}</${tag}>`;
}
const back=(size='small')=>`<span class="tile back ${size}" aria-label="숨겨진 패"></span>`;
function meldHTML(m,size='small',options={}){
 return`<span class="meld ${!m.open?'ankan':''}" title="${m.kind==='chi'?'치':m.kind==='pon'?'퐁':m.open?'명깡':'안깡'}">${R.sorted(m.tiles).map((id,k)=>!m.open&&(k===0||k===3)?back(size):tile(id,size,id===m.called?'called-source':'',`tabindex="0" data-public-tile="${id}"`,false,options)).join('')}</span>`;
}
function initGame(opts={}){
 input?.cancel();tutorialSeen=new Set();
 fx?.reset();clearTimeout(timer);epoch++;cache=null;selected=null;riichiMode=false;choiceList=null;lastDiscard=null;record=[];
 game=new R.Engine(opts,onGameChange);window.Tsukikage.game=game;game.start();
}
function onGameChange(event,data,g){
 input?.cancel();if(event==='win')fx?.prepareSettlement();
 selected=null;riichiMode=false;choiceList=null;cache=null;
 if(event==='discard')lastDiscard={i:data.i,id:data.id};
 if(event==='draw'&&g.players.every(p=>p.river.length===0))lastDiscard=null;
 if(started){record.push({event,data,round:g.roundIndex,wall:g.wall.length});if(record.length>2400)record.shift();persist();}
 render();
 if(event==='discard')sound('tile');
 if(event==='riichiAccepted'){callToast(g.names[data.i]+' · 리치 성립');sound('riichi');Characters.say(data.i,'riichi',prefs,{force:true});fx?.stick(data.i);}
 if(event==='call'){callToast(data.kind);sound('call');Characters.say(data.i,'call',prefs);}
 if(event==='win'||event==='drawEnd'){
  clearTimeout(timer);
  if(started){
   sound(event==='win'?'win':'draw');
   const result=g.result,token=epoch;
   if(event==='win')fx.play(result,()=>{if(token===epoch&&game.result===result&&game.phase==='result')showResult();});
   else {Characters.say(0,'draw',prefs,{force:true});showResult();}
  }return;
 }
 if(event==='finished'){Characters.say(game.ranking()[0],'end',prefs,{force:true});showEnding();return;}
 if(event==='draw'&&data.i===0&&prefs.alerts&&started&&game.players[0].drawn!=null&&game.score(0,'tsumo',game.players[0].drawn))notice('쯔모 화료가 가능합니다. W 키 또는 쯔모 버튼을 누르세요.');
 if(started&&prefs.guideLevel==='tutorial'){
  let lesson=null;
  if(event==='discard'&&g.pending?.from!==0&&g.pending?.choices[0]?.some(x=>x.kind!=='ron'))lesson='call';
  if(event==='riichiAccepted')lesson='riichi';
  if(event==='draw'&&data.i===0&&g.furiten(0))lesson='furiten';
  if(lesson&&!tutorialSeen.has(lesson)){tutorialSeen.add(lesson);showTutorial(lesson);return;}
 }
 if(event==='draw'&&data.i===0&&started&&prefs.guideLevel==='tutorial'&&!tutorialSeen.has('discard')){tutorialSeen.add('discard');showTutorial();return;}
 queue();
}
function stateData(){const obj={};for(const[k,v]of Object.entries(game))if(!['onChange','rng'].includes(k))obj[k]=v;return obj;}
function persist(){
 if(!started||!storageAvailable)return;
 try{localStorage.setItem(SAVE_KEY,JSON.stringify({schema:3,state:stateData(),tutorialSeen:[...tutorialSeen],date:new Date().toISOString()}));$('saveStatus').textContent='자동 저장됨 · 새로고침 후 이어하기 가능';}catch(e){storageAvailable=false;$('saveStatus').textContent='자동 저장 불가 · 현재 창에서 계속 플레이할 수 있습니다.';}
}
function savePrefs(){try{localStorage.setItem(PREF_KEY,JSON.stringify(prefs));}catch(e){}fx?.applyPrefs();renderIcons();}
function restoreSaved(){
 if(!save||save.schema!==3||!save.state)return false;
 try{
  const s=save.state;if(!['turn','response','kanResponse','result','finished'].includes(s.phase)||!Array.isArray(s.players)||s.players.length!==4||!Array.isArray(s.points)||s.points.length!==4||s.points.some(v=>!Number.isInteger(v))||!Number.isInteger(s.current)||s.current<0||s.current>3||!Number.isInteger(s.rngState))throw new Error('저장 형식이 올바르지 않습니다.');
  fx?.reset();clearTimeout(timer);epoch++;game=new R.Engine(s.options,onGameChange);for(const k of ['points','roundIndex','dealer','honba','sticks','phase','history','handNumber','version','result','pending','players','wall','dead','kanCount','callCount','kanOwners','current','robbedTile','rngState','decisions'])if(Object.hasOwn(s,k))game[k]=s[k];game.onChange=onGameChange;
  tutorialSeen=new Set(save.tutorialSeen||[]);
  if(!Number.isInteger(game.dealer)||game.dealer<0||game.dealer>3||!Number.isInteger(game.honba)||game.honba<0||!Number.isInteger(game.sticks)||game.sticks<0||!Number.isInteger(game.version)||game.version<0||!Number.isInteger(game.roundIndex)||game.roundIndex<0||game.roundIndex>8)throw new Error('저장된 진행 정보가 올바르지 않습니다.');
  for(const p of game.players){if(!Array.isArray(p.hand)||!Array.isArray(p.river)||!Array.isArray(p.melds)||!Array.isArray(p.forbid)||p.melds.some(m=>!['chi','pon','kan'].includes(m.kind)||m.tiles.length!==(m.kind==='kan'?4:3)))throw new Error('저장된 패 정보가 올바르지 않습니다.');}
  if(['response','kanResponse'].includes(game.phase)&&(!game.pending||!Number.isInteger(game.pending.from)||game.pending.from<0||game.pending.from>3||!Number.isInteger(game.pending.id)))throw new Error('저장된 응답 차례가 올바르지 않습니다.');
  window.Tsukikage.game=game;game.assertIntegrity();record=save.record||[];started=true;paused=false;selected=null;riichiMode=false;cache=null;
  closeModal(false);render();if(game.phase==='result')showResult();else if(game.phase==='finished')showEnding();else queue();notice('저장된 대국을 이어갑니다.');return true;
 }catch(e){notice('저장된 대국을 불러올 수 없어 새 대국을 준비했습니다.');return false;}
}
function queue(){
 clearTimeout(timer);timer=null;
 if(!started||paused||modalType||fx?.active)return;
 const token=epoch;const delay=Math.max(40,Number(prefs.speed)||650);
 const later=fn=>{timer=setTimeout(()=>{timer=null;if(token!==epoch||paused||modalType||fx?.active)return;safe(fn);},delay);};
 if(game.phase==='turn'){
  if(game.current!==0)later(()=>game.cpuTurn());
  else {const p=game.players[0];if(p.riichi&&prefs.riichiAuto&&p.drawn!=null&&!game.score(0,'tsumo',p.drawn)&&!game.kanOptions(0).length)later(()=>game.discard(0,p.drawn));}
 }else if(['response','kanResponse'].includes(game.phase)){
  const q=game.pending,human=q.from===0?[]:q.choices[0]||[];
  const cpuRon=Object.values(q.cpu).some(a=>a?.kind==='ron');
  if(!human.length||(cpuRon&&!human.some(a=>a.kind==='ron')))later(()=>game.resolve(null));
 }
}
function safe(fn){try{return fn();}catch(e){console.error(e);paused=true;clearTimeout(timer);render();openModal('error',`<p class="modal-kicker">GAME SAFETY</p><h2 id="modalTitle">대국을 잠시 멈췄습니다.</h2><p class="modal-desc">예상하지 못한 상태가 발견되어 진행을 중지했습니다. 대국 기록을 저장하거나 새 대국을 시작할 수 있습니다.</p><p class="rule-list">${esc(e.message)}</p><div class="modal-bottom"><button class="secondary-btn" data-act="export">기록 저장</button><button class="primary-btn" data-act="new">새 대국</button></div>`);}}
function analysis(){
 const p=game.players[0],key=game.version;
 if(cache?.key===key)return cache;
 const isTurn=game.phase==='turn'&&game.current===0;
 const c=R.counts(p.hand),s=R.shanten(c,p.melds.length);
 const eff=isTurn&&!p.riichi?game.efficiency(0,null,null,p.forbid):[];
 cache={key,s,eff,waits:game.shapeWaits(0),visible:game.visible(0),isTurn};return cache;
}
function shantenText(s){return s<0?'화료 형태':s===0?'텐파이':`${s}샨텐`;}
function renderIcons(){
 $('soundBtn').innerHTML=svgIcon(prefs.sound?'sound':'muted');$('soundBtn').title=prefs.sound?'효과음 끄기':'효과음 켜기';$('soundBtn').setAttribute('aria-label',$('soundBtn').title);
 $('fullscreenBtn').innerHTML=svgIcon('expand');$('settingsBtn').innerHTML=svgIcon('settings');
 $('hintToggle').checked=!!prefs.hints;$('autoWin').checked=!!prefs.alerts;
}
function render(){
 const displayPoints=game.phase==='result'&&game.result?.kind==='win'&&!fx?.settlementReady?game.result.points.map((v,i)=>v-game.result.delta[i]):game.points;
 if(!game?.players)return;
 fx?.applyPrefs();const a=analysis();
 $('modeLabel').textContent=modeNames[game.options.mode];$('roundLabel').textContent=`${game.roundWind()===0?'동':'남'} ${game.roundIndex%4+1}국 · ${game.honba}본장`;
 $('akaLabel').textContent=game.options.aka?'ON':'OFF';
 for(let i=1;i<4;i++){
  const p=game.players[i],active=game.phase==='turn'&&game.current===i;
  $('seat'+i).classList.toggle('active',active);
  $('seat'+i).innerHTML=`<span class="seat-rank-tag">${window.RiichiFX.order(displayPoints).indexOf(i)+1}위</span>${Characters.portrait(i,game.phase==='result'&&game.result?.kind==='win'?(game.result.winners.some(d=>d.i===i)?'win':game.result.delta[i]<0?'loss':'surprise'):p.riichi?'riichi':active?'thinking':'neutral')}<div class="details"><div class="seat-title">${game.names[i]}<span class="cpu-label">${styles[i]} · CPU</span></div><div class="seat-score">${displayPoints[i].toLocaleString()}</div></div><span class="seat-wind">${windChars[game.seat(i)]}</span>${p.riichi?'<span class="riichi-badge">리치</span>':''}`;
  $('bank'+i).innerHTML=`<span class="concealed-row">${p.hand.map(()=>back()).join('')}</span>${p.melds.map(m=>meldHTML(m)).join('')}`;
 }
 for(let i=0;i<4;i++){
  const river=game.players[i].river;
  $('river'+i).innerHTML=Array.from({length:Math.ceil(river.length/6)},(_,n)=>'<div class="river-row">'+river.slice(n*6,n*6+6).map(r=>`<span class="river-slot ${r.riichi?'sideways-slot':''}">${tile(r.id,'small',`${r.riichi?'riichi-tile ':''}${r.called?'called ':''}${r.tsumogiri?'tsumogiri ':''}${lastDiscard?.i===i&&lastDiscard.id===r.id?'latest':''}`,`tabindex="0" data-public-tile="${r.id}" aria-label="${esc(R.tileName(r.id))}${r.riichi?' 리치 선언패':''}${r.called?' 가져간 패':''}"`)}</span>`).join('')+'</div>').join('');
  $('compass'+i).textContent=windChars[game.seat(i)];$('compass'+i).classList.toggle('active',game.phase==='turn'&&game.current===i);
 }
 fx?.renderWall();if(game.phase!=='result'||game.result?.kind!=='win')fx?.renderRanks();
 $('centerBoard').innerHTML=`<div class="center-top"><span class="round-kanji">${game.roundWind()===0?'東':'南'} ${['一','二','三','四'][game.roundIndex%4]}</span><span class="round-en">${game.roundWind()===0?'EAST':'SOUTH'}<br>ROUND</span></div><div class="center-counters"><span title="본장">本 ${game.honba}</span><span title="리치 공탁금"><i class="counter-stick"></i>${game.sticks}</span></div><div class="center-live"><span>남은 패</span><strong class="remaining-count">${game.wall.length}</strong><small>장</small></div><div class="center-turn">${game.phase==='result'?'국 종료':game.phase==='finished'?'대국 종료':game.current===0?'당신의 차례':esc(game.names[game.current])+'의 차례'}</div>`;
 const myDora=game.players[0].hand.concat(game.players[0].melds.flatMap(m=>m.tiles)).reduce((sum,id)=>sum+window.RiichiFX.doraInfo(R,id,game).total,0);
 $('selfInfo').innerHTML=`${Characters.portrait(0,game.players[0].riichi?'riichi':'neutral','self-portrait')}<span class="self-wind">${windChars[game.seat(0)]}</span><strong>히나</strong><span class="you-label">YOU</span><span class="current-rank-chip">${RiichiFX.order(displayPoints).indexOf(0)+1}위</span><span class="self-score">${displayPoints[0].toLocaleString()}</span><span class="self-dora-count" title="손패·부로의 도라 합계, 우라도라 제외">✦ <span>도라</span> ${myDora}</span>${game.players[0].riichi?'<span class="status-chip tenpai">리치</span>':''}`;
 $('handStatus').textContent=prefs.hints?shantenText(a.s):game.players[0].melds.some(m=>m.open)?'부로 상태':'멘젠';$('handStatus').classList.toggle('tenpai',a.s<=0&&prefs.hints);
 renderHand(a);renderActions();renderGuide(a);renderLog();renderIcons();
 $('pauseCover').hidden=!paused;$('pauseBtn').textContent=paused?'계속하기':'일시정지';
 $('pauseBtn').disabled=!started||['result','finished'].includes(game.phase);
 $('callChoice').hidden=!choiceList;if(choiceList)renderChoices();
 resizeStage();
}
function renderHand(a){
 const p=game.players[0],legal=game.legalDiscards(0),rich=riichiMode?game.riichiOptions(0):[];
 const active=a.isTurn&&!paused&&!modalType&&!fx?.active;
 const suggested=prefs.recommend&&a.eff.length?a.eff[0].id:null;
 const ids=R.sorted(p.hand.filter(id=>id!==p.drawn));if(p.drawn!=null)ids.push(p.drawn);
 $('handRow').innerHTML=ids.map(id=>{
  const drawn=id===p.drawn,illeg=a.isTurn&&(!legal.includes(id)||(riichiMode&&!rich.includes(id)));
  const classes=`${selected===id?'selected ':''}${drawn?'drawn ':''}${illeg?'illegal ':''}${riichiMode&&rich.includes(id)?'riichi-valid ':''}${suggested===id&&!riichiMode?'recommended':''}`;
  const html=tile(id,'big',classes,`data-tile="${id}" ${!active||illeg?'disabled':''}`,true);
  return drawn?`<span class="drawn-wrapper">${html}</span>`:html;
 }).join('')+(p.melds.length?`<div class="self-melds">${p.melds.map(m=>meldHTML(m,'')).join('')}</div>`:'');
}
function btn(action,label,style='secondary',extra=''){return`<button class="${style}-btn" data-act="${action}" ${extra}>${label}</button>`;}
function renderActions(){
 const p=game.players[0];let message='',small='',actions='';
 if(!started){message='대국을 시작할 준비가 되었습니다.';small='1명의 플레이어와 3명의 CPU가 함께합니다.';actions=btn('new','대국 시작','primary');}
 else if(paused){message='대국이 일시정지되었습니다.';small='다시 시작하면 같은 차례에서 이어집니다.';actions=btn('pause','계속하기','primary');}
 else if(game.phase==='turn'&&game.current===0){
  const canWin=p.drawn!=null&&game.score(0,'tsumo',p.drawn);
  if(riichiMode){message='리치 선언패를 선택하세요.';small='금색 테두리 패만 선택할 수 있습니다.';actions=btn('riichi-cancel','취소','ghost');}
  else if(p.riichi){message=canWin?'쯔모 화료가 가능합니다.':'리치 중입니다.';small=canWin?'쯔모 버튼으로 점수를 확정하세요.':prefs.riichiAuto?'화료·깡이 없으면 쯔모패를 자동으로 버립니다.':'쯔모패만 버릴 수 있습니다.';}
  else if(canWin){message='쯔모 화료가 가능합니다.';small='W 키 또는 쯔모 버튼을 누르세요.';}
  else if(selected!=null){message=`${R.tileName(selected).replace(/^적 /,game.options.aka?'적 ':'')} 선택`;small='같은 패를 다시 누르거나 버림 영역으로 끌어 놓으세요. 시간 제한은 없습니다.';}
  else {message='버릴 패를 선택하세요.';small=p.forbid.length?'울기 직후에는 같은 패·스지 바꿔치기가 금지됩니다.':'금색 점은 도우미의 추천 버림패입니다.';if(!prefs.hints)small='패를 클릭한 다음 버리기 버튼을 누르세요.';}
  if(canWin)actions+=btn('tsumo','쯔모 <span class="btn-shortcut">W</span>','gold');
  if(!riichiMode&&game.riichiOptions(0).length)actions+=btn('riichi','리치 <span class="btn-shortcut">R</span>','gold');
  if(!riichiMode&&game.kanOptions(0).length)actions+=btn('kan','깡');
  if(!riichiMode&&game.nineTerminals(0))actions+=btn('nine','구종구패','ghost');
  const disabled=selected==null;
  actions+=btn('discard',riichiMode?'리치 선언':p.riichi?'쯔모패 버리기':'버리기 <span class="btn-shortcut">↵</span>','primary',disabled?'disabled':'');
 }else if(['response','kanResponse'].includes(game.phase)){
  const q=game.pending,choices=q.from===0?[]:q.choices[0]||[];
  const cpuRon=Object.values(q.cpu).some(v=>v?.kind==='ron');
  if(choices.length&&(!cpuRon||choices.some(o=>o.kind==='ron'))){
   message=`${game.names[q.from]}의 ${R.tileName(q.id).replace(/^적 /,game.options.aka?'적 ':'')}`;small=q.kind==='kan'?'깡 선언패로 론할 수 있습니다.':'울기 또는 패스를 선택하세요. 제한 시간은 없습니다.';
   if(choices.some(o=>o.kind==='ron'))actions+=btn('ron','론 <span class="btn-shortcut">W</span>','gold');
   for(const[k,label]of[['pon','퐁'],['chi','치'],['minkan','깡']])if(choices.some(o=>o.kind===k))actions+=btn('call-'+k,label);
   actions+=btn('pass','넘기기 <span class="btn-shortcut">Esc</span>','ghost');
  }else {message='다음 차례로 진행 중입니다.';small='CPU의 울기·화료 여부를 확인하고 있습니다.';}
 }else if(game.phase==='turn'){
  message=`${game.names[game.current]}가 패를 고르고 있습니다.`;small=styles[game.current]+' CPU · 공개된 정보와 자신의 손패로 판단합니다.';
 }else if(game.phase==='result'){message=game.result.kind==='win'?'이번 국이 끝났습니다.':'유국되었습니다.';small='화료 내역과 점수 변동을 확인하세요.';actions=btn('show-result','결과 보기','primary');}
 else if(game.phase==='finished'){message='대국이 종료되었습니다.';small='수고하셨습니다. 다음 한 판도 함께하세요.';actions=btn('show-ending','최종 순위','primary');}
 if(innerWidth<=999&&innerWidth>innerHeight&&game.phase==='turn'&&game.current===0)small=selected!=null?'같은 패 다시 누르기 · 영역에 끌어 놓기':'한 번 선택 · 다시 누르면 버림';
 $('turnMessage').innerHTML=`<span class="message-dot ${game.phase==='turn'&&game.current!==0?'thinking-dot':''}"></span>${esc(message)}<small>${esc(small)}</small>`;
 $('actionButtons').innerHTML=actions;
}
function renderGuide(a){
 if(prefs.guideLevel==='off'){ $('guideContent').innerHTML='<div class="guide-off">도우미 끔 · 규칙 안내는 상단에서 열 수 있습니다.</div>';return;}
 if(prefs.guideLevel==='request'&&selected==null){$('guideContent').innerHTML=btn('request-guide','지금 내 패 설명');return;}
 const p=game.players[0];let s=a.s,ws=a.waits,chosen=null;
 if(selected!=null&&a.isTurn){chosen=a.eff.find(o=>o.id===selected);if(!chosen){const h=p.hand.filter(id=>id!==selected);chosen={id:selected,shanten:R.shanten(R.counts(h),p.melds.length),waits:game.shapeWaits(0,h),ukeire:0};}s=chosen.shanten;ws=chosen.waits;}
 else if(a.isTurn&&p.riichi&&p.drawn!=null){const h=p.hand.filter(id=>id!==p.drawn);ws=game.shapeWaits(0,h);}
 const circles=s<0?'和':s===0?'聴':String(s),desc=s<0?'역이 있으면 화료할 수 있어요.':s===0?'한 장만 더 맞으면 완성되는 형태예요.':`텐파이까지 ${s}단계 남아 있어요.`;
 let html=`<div class="progress-label">${selected!=null?'선택한 패를 버리면':'지금 내 패는'}</div><div class="shanten-summary"><div class="shanten-circle">${circles}</div><div class="shanten-copy"><strong>${shantenText(s)}</strong><p>${desc}</p></div></div><div class="progress-track">${Array.from({length:6},(_,i)=>`<i class="${i<6-Math.min(6,Math.max(0,s))?'on':''}"></i>`).join('')}</div>`;
 const rec=a.eff[0];
 if(a.isTurn&&rec&&!p.riichi&&prefs.recommend){
  html+=`<div class="recommend-card">${tile(rec.id)}<div class="recommend-info"><span class="overline">추천 버림패</span><strong>${R.tileName(rec.id).replace(/^적 /,game.options.aka?'적 ':'')}</strong><p>${shantenText(rec.shanten)} 유지${rec.ukeire>0?` · 유효패 ${rec.ukeire}장`:''}</p></div></div><div class="guide-explainer">샨텐 수와 <b>공개 정보 기반 유효패 수</b>를 비교합니다. 상대의 손패·패산은 보지 않아요.</div>`;
 }else if(p.riichi)html+='<div class="recommend-card"><div class="recommend-info"><span class="overline">RIICHI</span><strong>대기패에 집중하세요.</strong><p>손패는 고정됩니다.<br>안전하게 다음 한 장을 기다리세요.</p></div></div><div class="guide-explainer">론을 넘기면 이 국에서는 이후에도 론할 수 없어요. 쯔모는 가능합니다.</div>';
 else html+='<div class="recommend-card"><div class="recommend-info"><span class="overline">TABLE TIP</span><strong>한 수씩, 천천히.</strong><p>내 차례가 오면<br>추천 버림패를 표시해요.</p></div></div><div class="guide-explainer">숫자 1·9와 자패를 빼고 모으면 <b>탕야오</b>를 노릴 수 있어요.</div>';
 html+=`<div class="wait-section"><div class="small-title">${selected!=null?'선택 후 대기패':'대기패'}<span>${ws.length?'미공개 패 기준':'TENPAI WAITS'}</span></div>`;
 if(ws.length){html+=`<div class="wait-tiles">${ws.map(t=>`<span class="wait-tile">${tile(t*4+1,'small')}<small>${Math.max(0,4-a.visible[t])}장</small></span>`).join('')}</div><div class="guide-explainer">장수에는 상대 손패·왕패가 포함됩니다.<br>패산에 남은 장수를 뜻하지 않아요.</div>`;}
 else if(a.isTurn&&a.s===0&&selected==null&&!p.riichi)html+='<div class="no-wait">버릴 패를 선택하면<br>그 뒤의 대기패를 확인할 수 있어요.</div>';
 else if(a.s<0)html+='<div class="no-wait">모양이 완성되었습니다.<br>화료 버튼이 없다면 역이 없는 상태예요.</div>';
 else html+='<div class="no-wait">아직 대기패가 없어요.<br>몸통 4개와 머리 1개를 만들어 보세요.</div>';
 html+='</div>';
 const furiten=selected!=null?ws.some(t=>p.river.some(r=>R.type(r.id)===t))||p.tempFuriten||p.riichiFuriten:game.furiten(0);
 if(furiten&&ws.length)html+='<p class="furiten-note">후리텐: 론할 수 없습니다. 자신의 버림패에 대기패가 있거나 화료패를 넘겼어요. 쯔모는 가능합니다.</p>';
 const riichiReasons=[];if(p.riichi)riichiReasons.push('이미 리치 중입니다.');if(p.melds.some(m=>m.open))riichiReasons.push('멘젠이 아니어서 리치할 수 없습니다.');if(game.points[0]<1000)riichiReasons.push('리치 공탁금 1,000점이 부족합니다.');if(game.wall.length<4)riichiReasons.push('남은 패산이 4장보다 적습니다.');if(a.isTurn&&!p.riichi&&!game.riichiOptions(0).length&&!riichiReasons.length)riichiReasons.push('버림 후 텐파이가 되는 패가 없습니다.');
 if(riichiReasons.length)html+='<p class="guide-reason">'+riichiReasons.join('<br>')+'</p>';
 if(a.isTurn&&p.drawn!=null&&R.partitions(R.counts(p.hand),p.melds.length).length&&!game.score(0,'tsumo',p.drawn))html+='<p class="guide-reason">역이 없어 화료할 수 없습니다. 도라는 역이 아닙니다. 멘젠 리치·역패·탕야오 같은 역이 필요합니다.</p>';
 $('guideContent').innerHTML=html;
}
function renderLog(){
 $('logList').innerHTML=game.history.slice(-24).reverse().map(e=>`<div class="log-entry ${e.kind}"><i></i><span>${esc(e.text)}</span></div>`).join('')||'<div class="no-wait">첫 번째 대국이 곧 시작됩니다.</div>';
}
function resizeStage(){
 fx?.layoutRanks();
}
new ResizeObserver(resizeStage).observe($('stageShell'));window.addEventListener('resize',resizeStage);
function renderChoices(){
 $('callChoice').innerHTML=`<div class="call-choice-title">${choiceList.title}<button data-act="close-choices" aria-label="선택 취소">×</button></div><div class="call-choice-list">${choiceList.items.map((o,n)=>{
  const ids=o.kind==='ankan'?o.ids:o.kind==='kakan'?game.players[0].melds[o.index].tiles.concat(o.id):o.ids.concat(game.pending.id);
  return`<button class="call-option" data-choice="${n}">${R.sorted(ids).map(id=>tile(id,'small')).join('')}<small>${o.kind==='ankan'?'안깡':o.kind==='kakan'?'가깡':'선택'}</small></button>`;
 }).join('')}</div>`;
}
function chooseGroup(kind){
 let opts=kind==='kan'?game.kanOptions(0):(game.pending?.choices[0]||[]).filter(o=>o.kind===kind);
 if(!opts.length)return;
 if(opts.length===1){if(kind==='kan')game.declareKan(0,opts[0]);else game.resolve(opts[0]);return;}
 choiceList={title:kind==='chi'?'어떤 조합으로 치할까요?':kind==='pon'?'퐁에 사용할 패를 고르세요.':'깡할 조합을 고르세요.',items:opts,kan:kind==='kan'};render();
}
function discardSelected(){
 if(paused||modalType||fx?.active||game.phase!=='turn'||game.current!==0)return;
 const id=selected;
 if(id==null){notice('먼저 버릴 패를 선택하세요.');return;}
 safe(()=>game.discard(0,id,riichiMode));
}
function tileClick(id){
 if(paused||modalType||fx?.active||!game.legalDiscards(0).includes(id))return;
 if(riichiMode&&!game.riichiOptions(0).includes(id))return;
 if(selected===id){discardSelected();return;}
 selected=id;render();sound('select');
}
function toggleRiichi(){
 if(fx?.active)return;
 if(game.phase!=='turn'||game.current!==0||!game.riichiOptions(0).length)return;
 riichiMode=!riichiMode;selected=null;choiceList=null;render();
}
function callToast(text){clearTimeout(toastTimer);$('callToast').textContent=text;$('callToast').classList.add('visible');toastTimer=setTimeout(()=>$('callToast').classList.remove('visible'),1100);}
function notice(text){clearTimeout(noticeTimer);$('notice').textContent=text;$('notice').classList.add('visible');noticeTimer=setTimeout(()=>$('notice').classList.remove('visible'),3100);}
let audioCtx=null;
function sound(kind){Characters.sound(kind,prefs);}
function showTutorial(topic='discard'){
 const lessons={discard:['패 선택과 버리기','손패를 한 번 누르면 선택만 됩니다. 같은 실물 패를 다시 누르면 버립니다. 시간 제한은 없습니다. 유효한 버림 영역으로 끌어 놓거나, 선택한 뒤 Enter / 버리기 버튼을 사용할 수도 있습니다. 밖에 놓으면 취소됩니다.'],call:['치 · 퐁 · 깡','울기는 내 차례를 앞당기지만 멘젠이 깨져 역이 달라집니다. 역패나 탕야오를 준비하세요. 패스로 넘길 수도 있습니다.'],furiten:['후리텐','내 버림패에 대기패가 있거나 화료를 넘겼다면 론할 수 없습니다. 쯔모는 가능합니다.'],riichi:['리치 성립','론 여부를 확인한 뒤 리치가 성립하면 1,000점을 내고 중앙에 공탁봉이 쌓입니다. 가로로 눕힌 선언패와 리치 표시는 국이 끝날 때까지 남습니다.']};
 const [title,text]=lessons[topic];openModal('tutorial','<p class="modal-kicker">히나의 첫 대국 안내</p><h2 id="modalTitle">'+title+'</h2><p class="modal-desc">'+text+'</p><p class="result-note">현재 대국을 그대로 멈춰 두었습니다. 닫으면 같은 차례에서 이어갑니다.</p><button class="primary-btn" data-act="close-modal">알겠어요 · 대국 계속</button>');
}
function preferenceFields(){
 const toggles=[['helperLabels','패 보조 숫자·한글'],['actualDora','실제 도라 안내'],['recommend','추천 버림패'],['publicHighlight','같은 공개 패 강조'],['dialogue','캐릭터 대사']];
 return '<div class="settings-section-label">보기 · 안내 · 소리</div>'+toggles.map(([k,label])=>'<div class="settings-row"><strong>'+label+'</strong><label class="switch"><input type="checkbox" id="v3-'+k+'" aria-label="'+label+'" '+(prefs[k]?'checked':'')+'><span></span></label></div>').join('')+
 '<div class="settings-row"><strong>초보자 가이드</strong><select id="v3-guideLevel" class="settings-select" aria-label="초보자 가이드">'+[['off','끄기'],['request','요청할 때'],['auto','자동 설명'],['tutorial','멈춰서 배우기']].map(([v,l])=>'<option value="'+v+'" '+(prefs.guideLevel===v?'selected':'')+'>'+l+'</option>').join('')+'</select></div>'+
 '<div class="settings-row"><strong>대사 빈도</strong><select id="v3-dialogueFrequency" class="settings-select" aria-label="대사 빈도"><option value="normal">보통</option><option value="low" '+(prefs.dialogueFrequency==='low'?'selected':'')+'>적게</option></select></div>'+
 '<div class="settings-row"><strong>효과음 음량</strong><input id="v3-sfxVolume" aria-label="효과음 음량" type="range" min="0" max="100" value="'+prefs.sfxVolume+'"></div>'+
 '<div class="settings-row"><div><strong>음성 음량</strong><small>이번 빌드에는 녹음 음성이 없습니다.</small></div><input id="v3-voiceVolume" aria-label="음성 음량" type="range" min="0" max="100" value="'+prefs.voiceVolume+'"></div>';
}
let modalFocus=null;
function openModal(type,html,wide=false){
 input?.cancel();
 if(fx?.active)return;
 html=html.replaceAll('같은 패를 빠르게 두 번 클릭해도 됩니다.','같은 실물 패를 다시 누르거나 버림 영역으로 끌어 놓으세요. 재클릭 시간 제한은 없습니다.').replaceAll('왼쪽 상대(유키)','왼쪽 상대(코하루)').replaceAll('리치 선언패는 금색 바탕과 붉은 밑줄','리치 선언패는 90도로 눕히고 금색 바탕과 붉은 밑줄');
 if(type==='welcome'){
  const roster='<div class="welcome-roster">'+Characters.ids.map((id,i)=>'<div class="welcome-character"><img src="'+Characters.path(i,'base')+'" width="160" height="190" alt="'+Characters.names[i]+' 기본 일러스트"><strong>'+Characters.names[i].split(' ').at(-1)+'</strong><small>'+styles[i]+(i?' CPU':' · YOU')+'</small></div>').join('')+'</div>';
  html=html.replace('<div class="welcome-top">',roster+'<div class="welcome-top">');
  html=html.replace('<button class="primary-btn welcome-start"','<label class="welcome-guide">첫 대국 안내 <select id="startGuide" aria-label="첫 대국 안내">'+[['auto','자동 설명'],['tutorial','멈춰서 배우기'],['request','요청할 때'],['off','끄기']].map(([v,l])=>'<option value="'+v+'" '+(prefs.guideLevel===v?'selected':'')+'>'+l+'</option>').join('')+'</select></label><button class="primary-btn welcome-start"');
 }
 if(type==='settings')html=html.replace('<div class="settings-section-label">PLAY PREFERENCES</div>',preferenceFields()+'<div class="settings-section-label">PLAY PREFERENCES</div>');
 if(type==='settings')html=html.replace('<div class="settings-preview">','<div class="preview-choices"><label>연출 등급 <select id="previewTier">'+[['mangan','만관'],['haneman','하네만'],['baiman','배만'],['sanbaiman','삼배만'],['yakuman','역만']].map(([v,l])=>'<option value="'+v+'">'+l+'</option>').join('')+'</select></label><label>캐릭터 <select id="previewCharacter">'+Characters.names.map((n,i)=>'<option value="'+i+'">'+n+'</option>').join('')+'</select></label></div><div class="settings-preview">');
 html=html.replace(/<button[^>]*data-act="export"[^>]*>[\s\S]*?<\/button>/g,'');
 clearTimeout(timer);modalType=type;modalFocus=document.activeElement;$('modalCard').innerHTML=html;$('modalCard').classList.toggle('wide',wide);$('modalCard').dataset.modalType=type;$('modal').hidden=false;$('modalCard').scrollTop=0;$('modalCard').focus({preventScroll:true});
}
function closeModal(resume=true){
 $('modal').hidden=true;modalType='';choiceList=null;render();if(modalFocus&&modalFocus.isConnected)modalFocus.focus({preventScroll:true});if(resume)queue();
}
function closeButton(){return'<button class="modal-close" data-act="close-modal" aria-label="닫기">×</button>';}
function showWelcome(){
 let current=game?.options.mode||'east';
 const canResume=save?.schema===3&&save.state?.players&&save.state.phase!=='idle';
 openModal('welcome',`${started?closeButton():''}<div class="welcome-top"><div><p class="modal-kicker">TSUKIKAGE · RIICHI CLUB</p><h2 id="modalTitle">한 수의 차이,<br>한 판의 몰입.</h2></div><div class="welcome-moon" aria-hidden="true"></div></div><p class="modal-desc">당신과 세 명의 CPU가 마주하는 조용한 마작탁.<br>원하는 대국을 골라, 첫 패를 펼쳐 보세요.</p><div class="welcome-tiles" aria-hidden="true">${[0,4,8,52,88].map(id=>tile(id)).join('')}</div><div class="small-title">대국 방식<span>1 PLAYER + 3 CPU</span></div><div class="mode-choices">${[['single','1국 연습','한 번의 국으로 가볍게'],['east','동풍전','동 1국부터 동 4국까지'],['half','반장전','동장과 남장을 모두']].map(([v,t,d])=>`<button class="mode-choice ${current===v?'active':''}" data-mode="${v}"><strong>${t}</strong><small>${d}</small></button>`).join('')}</div><div class="welcome-options"><label><input type="checkbox" id="startAka" ${game?.options.aka!==false?'checked':''}> 적도라 3장</label><label>CPU<select id="startDifficulty"><option value="normal">기본</option><option value="easy">쉬움</option></select></label></div>${started?'<p class="result-note">새 대국을 시작하면 진행 중인 대국의 자동 저장이 교체됩니다.</p>':''}<button class="primary-btn welcome-start" data-act="start">새 대국 시작<span>→</span></button>${!started&&canResume?`<button class="secondary-btn welcome-resume" data-act="restore">저장된 대국 이어하기 · ${save.state.roundIndex<4?'동':'남'} ${save.state.roundIndex%4+1}국</button>`:''}<p class="welcome-fine">로그인·다운로드할 추가 리소스 없이 플레이합니다.<br>첫 플레이는 기본 설정 + 대국 도우미를 추천해요.</p>`);
}
function startFromWelcome(){
 const mode=$('modalCard').querySelector('.mode-choice.active')?.dataset.mode||'east';const aka=$('startAka')?.checked!==false;const difficulty=$('startDifficulty')?.value||'normal';
 prefs.guideLevel=$('startGuide')?.value||prefs.guideLevel;savePrefs();started=true;paused=false;closeModal(false);initGame({mode,aka,difficulty});Characters.say(0,'start',prefs,{force:true});notice('동 1국. 히나와 함께 시작합니다.');
}
function showHelp(){
 openModal('help',`${closeButton()}<p class="modal-kicker">A QUIET GUIDE TO RIICHI</p><h2 id="modalTitle">처음이라도, 한 수씩.</h2><p class="modal-desc">패를 한 장 가져오고 한 장 버리면서 완성형을 만드세요.<br>완성형에 <b>역</b>이 있어야 론 또는 쯔모로 화료할 수 있습니다.</p><div class="rule-grid"><div class="rule-block"><h3><em>01</em>몸통 4개 + 머리 1개</h3><p>몸통은 <b>같은 종류의 연속 숫자 3장</b> 또는 <b>같은 패 3장</b>입니다. 머리는 같은 패 2장입니다. 치또이츠와 국사무쌍은 예외 형태예요.</p><div class="rule-mini-tiles">${[0,4,8,124,125,126,108,109].map(id=>tile(id)).join('')}</div></div><div class="rule-block"><h3><em>02</em>패 선택과 버리기</h3><p>내 손패를 클릭해 고른 다음 <b>버리기</b> 또는 <b>Enter</b>를 누르세요. 같은 패를 빠르게 두 번 클릭해도 됩니다. 오른쪽으로 떨어진 패가 방금 가져온 쯔모패입니다.</p></div><div class="rule-block"><h3><em>03</em>리치 · 론 · 쯔모</h3><p><b>리치</b>: 멘젠 텐파이에서 1,000점을 걸고 선언합니다.<br><b>론</b>: 상대가 버린 패로 완성합니다.<br><b>쯔모</b>: 직접 가져온 패로 완성합니다.<br>리치 후에는 원칙적으로 쯔모패만 버립니다.</p></div><div class="rule-block"><h3><em>04</em>치 · 퐁 · 깡</h3><p><b>치</b>는 왼쪽 상대(유키)의 패로 순자를 만듭니다. <b>퐁</b>은 누구의 패든 같은 패 3장을 만듭니다. <b>깡</b>은 같은 패 4장입니다. 안깡·대명깡·가깡을 지원합니다.</p></div><div class="rule-block"><h3><em>05</em>도라와 후리텐</h3><p>좌측 상단 왕패에는 <b>도라 표시패</b>, 그 아래에는 실제 도라가 보입니다. 수패는 다음 숫자가 도라입니다. 실제 도라에는 <b>금빛 테두리와 ✦</b>가 표시됩니다. 적도라와 중복되면 ✦ 옆에 합산 개수가 보입니다. <b>도라만으로는 화료할 수 없습니다.</b><br>자신의 버림패 중 대기패가 있으면 후리텐으로 론이 금지됩니다.</p></div><div class="rule-block"><h3><em>06</em>울면 역이 달라져요</h3><p>치·퐁·명깡을 하면 멘젠이 깨집니다. 리치·멘젠 쯔모·핑후 등은 사용할 수 없어요. <b>역패</b> 또는 <b>탕야오</b>처럼 울어도 되는 역을 준비하세요. 안깡은 멘젠을 유지합니다.</p></div></div><div class="rule-list"><strong>이 테이블의 하우스 룰</strong>25,000점 시작 · 적도라 선택 · 쿠이탕 허용 · 쿠이카에 금지 · 도라/우라도라/깡도라 · 부수 자동 계산 · 더블 역만/복합 역만 · 헤아림 역만 · 더블 론 · 트리플 론 유국.<p>리치 선언패로 론당하면 공탁금은 내지 않습니다. 리치 후 안깡은 대기패와 해석이 모두 유지되는 경우에만 가능합니다. 가깡 창깡과 국사무쌍의 안깡 창깡을 처리합니다. 네 번의 깡 뒤에는 추가 깡이 불가능합니다.</p><p>유국 시 텐파이/노텐 벌점 합계 3,000점 · 친 화료/친 텐파이 연장 · 구종구패, 사풍연타, 사가리치, 사개깡 처리 · 깡도라는 성립 즉시 공개합니다.</p><p><b>차이점:</b> 나가시 만관, 책임지불(파오), 우마·오카, 서입/연장전은 적용하지 않습니다. 마지막 국의 친이 30,000점 이상 1위로 화료하거나 텐파이하면 종료합니다. 1국 연습은 첫 국 결과 후 종료합니다.</p><p>리치 선언패는 금색 바탕과 붉은 밑줄, 가져간 버림패는 흐리게 표시합니다. 안깡의 양 끝은 뒷면, 가져온 부로패는 테두리로 구분합니다.</p></div><div class="rule-list"><strong>도우미와 CPU</strong>도우미는 샨텐 수와 유효패 수 중심의 참고용입니다. 승리를 보장하거나 최선의 수비를 계산하는 전문 마작 AI가 아닙니다. 미공개 패 장수에는 상대 손패와 왕패가 포함됩니다. CPU도 자신의 손패와 공개 정보만 사용합니다.<p>화료·점수 엔진은 이 게임용으로 구현했습니다. 공식 대회 인증 프로그램은 아닙니다. 규칙 비교 자료: <a href="https://www.worldriichi.org/wrc-rules" target="_blank" rel="noopener noreferrer">World Riichi Championship 규칙</a>.</p></div><div class="modal-bottom"><button class="primary-btn" data-act="close-modal">알겠습니다</button></div>`,true);
}
function showSettings(){
 openModal('settings',`${closeButton()}<p class="modal-kicker">TABLE DESIGN & MOTION</p><h2 id="modalTitle">패의 질감부터, 화료의 순간까지.</h2><p class="modal-desc">패 디자인과 연출을 고르세요. 설정 중에는 CPU가 기다립니다.</p>
 <fieldset class="skin-picker"><legend>마작패 디자인</legend><div class="skin-options">${[['ivory','클래식 아이보리'],['jade','청옥 · 포슬린'],['midnight','미드나이트']].map(([v,n])=>`<label class="skin-option"><input type="radio" name="tileTheme" value="${v}" ${prefs.tileTheme===v?'checked':''}><span class="skin-sample" data-tile-theme="${v}">${tile(18*4+1,'','','',false,{highlight:false})}<strong>${n}</strong></span></label>`).join('')}</div></fieldset>
 <div class="settings-row"><div><strong>화료 · 순위 변동 연출</strong><small>점수는 즉시 정산되고 화면 연출만 달라집니다.</small></div><select class="settings-select" id="motionSelect" aria-label="화료 연출 강도">${[['full','풍부하게'],['short','짧게'],['off','끄기']].map(([v,n])=>`<option value="${v}" ${prefs.motion===v?'selected':''}>${n}</option>`).join('')}</select></div>
 <div class="settings-row"><div><strong>도라 반짝임</strong><small>끄더라도 금빛 테두리와 ✦ 표시는 유지됩니다.</small></div><label class="switch"><input id="prefDoraGlow" type="checkbox" aria-label="도라 반짝임" ${prefs.doraGlow!==false?'checked':''}><span></span></label></div>
 <div class="settings-preview"><span>대국 점수를 바꾸지 않고 연출만 확인합니다.</span><button class="secondary-btn" data-act="preview-fx">설정 적용 후 연출 미리보기 ↗</button></div>
 <p class="effects-note">Enter · Esc로 화료 연출을 건너뛸 수 있습니다.${matchMedia('(prefers-reduced-motion: reduce)').matches?'<br>현재 기기의 동작 줄이기 설정이 켜져 있어 애니메이션을 생략합니다.':'<br>기기의 동작 줄이기 설정도 자동으로 반영합니다.'}</p>
 <div class="settings-section-label">PLAY PREFERENCES</div>
 <div class="settings-row"><div><strong>CPU 진행 속도</strong><small>자신의 차례에는 제한 시간이 없습니다.</small></div><select class="settings-select" id="speedSelect" aria-label="CPU 진행 속도">${[[1100,'천천히'],[650,'보통'],[280,'빠르게'],[60,'아주 빠르게']].map(([v,n])=>`<option value="${v}" ${Number(prefs.speed)===v?'selected':''}>${n}</option>`).join('')}</select></div>
 <div class="settings-row"><div><strong>대국 도우미</strong><small>추천 버림패 · 샨텐 수 · 대기패</small></div><label class="switch"><input id="prefHints" type="checkbox" aria-label="대국 도우미" ${prefs.hints?'checked':''}><span></span></label></div>
 <div class="settings-row"><div><strong>리치 후 자동 버리기</strong><small>쯔모·깡이 가능하면 자동 진행을 멈춥니다.</small></div><label class="switch"><input id="prefAuto" type="checkbox" aria-label="리치 후 자동 버리기" ${prefs.riichiAuto?'checked':''}><span></span></label></div>
 <div class="settings-row"><div><strong>효과음</strong><small>패 소리와 리치·화료 알림음</small></div><label class="switch"><input id="prefSound" type="checkbox" aria-label="효과음" ${prefs.sound?'checked':''}><span></span></label></div>
 <p class="result-note">현재 룰: ${modeNames[game.options.mode]} · 적도라 ${game.options.aka?'사용':'미사용'} · CPU ${game.options.difficulty==='easy'?'쉬움':'기본'}<br>대국 방식과 적도라 설정은 새 대국에서 바꿀 수 있습니다.</p><div class="modal-bottom"><button class="secondary-btn" data-act="export">기록 저장</button><button class="primary-btn" data-act="save-settings">설정 적용</button></div>`);
}
function readSettings(){
 prefs.speed=Number($('speedSelect').value);prefs.hints=$('prefHints').checked;prefs.riichiAuto=$('prefAuto').checked;prefs.sound=$('prefSound').checked;
 prefs.tileTheme=$('modalCard').querySelector('[name="tileTheme"]:checked')?.value||'jade';prefs.motion=$('motionSelect').value;prefs.doraGlow=$('prefDoraGlow').checked;savePrefs();
 for(const key of ['helperLabels','actualDora','recommend','publicHighlight','dialogue'])prefs[key]=$('v3-'+key).checked;
 prefs.guideLevel=$('v3-guideLevel').value;prefs.dialogueFrequency=$('v3-dialogueFrequency').value;prefs.sfxVolume=Number($('v3-sfxVolume').value);prefs.voiceVolume=Number($('v3-voiceVolume').value);savePrefs();
}
function previewEffects(){
 const preview={tier:$('previewTier')?.value||'mangan',character:Number($('previewCharacter')?.value||0)};
 if(modalType==='settings')readSettings();
 if(fx.motion()==='off'){notice('현재 연출이 꺼져 있습니다. 풍부하게 또는 짧게를 선택하세요. 기기의 동작 줄이기도 확인해 주세요.');return;}
 closeModal(false);sound('win');fx.play(fx.sample(preview),()=>showSettings(),{demo:true});
}
function scoreRows(points,delta=null){
 const rank=window.RiichiFX.order(points),before=delta?points.map((p,i)=>p-delta[i]):[25000,25000,25000,25000],old=window.RiichiFX.order(before);
 return `<div class="scoreboard"><div class="scoreboard-header"><span>순위</span><span>플레이어</span><span>순위 변화</span><span>${delta?'점수 변동':'시작 대비'}</span><span>현재 점수</span></div>${rank.map((i,n)=>{
  const d=delta?delta[i]:points[i]-25000,shift=old.indexOf(i)-n;
  return `<div class="score-row ${i===0?'me':''} ${n===0?'leader':''}" data-seat="${i}" data-rank-before="${old.indexOf(i)+1}" data-rank-after="${n+1}"><span class="rank">${n+1}</span><span>${esc(game.names[i])} ${i===0?'<span class="you-label">YOU</span>':''}</span><span class="rank-shift ${shift>0?'up':shift<0?'down':'steady'}" title="${old.indexOf(i)+1}위 → ${n+1}위">${shift?`${shift>0?'▲':'▼'} ${Math.abs(shift)}`:'—'}</span><span class="delta ${d<0?'negative':''}">${d>0?'+':''}${d.toLocaleString()}</span><span class="score">${points[i].toLocaleString()}</span></div>`;
 }).join('')}</div>`;
}
function resultWinner(d,second=false){
 const s=d.score,hand=R.sorted(d.hand.filter(id=>id!==d.winTile));hand.push(d.winTile);
 return`<div class="${second?'winner-separator':''}"><div class="result-person">${game.names[d.i]} ${d.i===0?'· YOU':'· CPU'} · ${game.seat(d.i)===0?'친':'자'}${d.from!=null?' · '+game.names[d.from]+'에게 론':''}</div><div class="result-hand">${hand.map((id,n)=>tile(id,'',n===hand.length-1?'mini-highlight drawn':'','',false,{ura:d.ura})).join('')}${d.melds.map(m=>meldHTML(m,'',{ura:d.ura})).join('')}</div><div class="result-han"><strong data-amount="${s.total}"><span class="amount-number">${s.total.toLocaleString()}</span><small>점</small></strong><span>${s.limit?s.limit+' · ':''}${s.yakuman?'역만 '+s.yakuman+'배':s.han+'판 '+s.fu+'부'}</span></div><div class="yaku-list">${s.yaku.map(y=>`<div class="yaku-item">${y.name}<span>${y.yakuman?(y.yakuman>1?y.yakuman+'배 역만':'역만'):y.han+'판'}</span></div>`).join('')}</div>${d.ura.length?`<div class="ura-row"><small>우라도라 표시패</small>${d.ura.map(id=>tile(id,'tiny','','',false,{indicator:true})).join('')}</div>`:''}</div>`;
}
function showResult(){
 if(game.phase!=='result')return;
 const r=game.result,win=r.kind==='win',first=r.winners?.[0];
 if(win){const before=r.points.map((v,i)=>v-r.delta[i]),after=RiichiFX.order(r.points),old=RiichiFX.order(before),loser=r.delta.findIndex(x=>x<0);if(loser>=0)Characters.say(loser,after.indexOf(loser)>old.indexOf(loser)?'down':'loss',prefs,{force:true});}
 let title=win?(r.winners.length>1?'두 명의 화료, 더블 론.':first.i===0?'좋은 한 수였습니다.':'이번 국의 승자가 정해졌습니다.'):'다음 패산에서 다시 만나요.';
 let html=`${closeButton()}<p class="modal-kicker">${game.roundWind()===0?'EAST':'SOUTH'} ${game.roundIndex%4+1} · HAND RESULT</p><div class="result-heading"><h2 id="modalTitle">${title}</h2><span class="result-kanji">${win?first.method==='tsumo'?'自摸':'ロン':'流局'}</span></div>`;
 if(win){html+=r.winners.map((d,n)=>resultWinner(d,n>0)).join('');html+=`<p class="result-note">위 화료점에는 본장·공탁금이 포함되지 않습니다.<br>${r.honba}본장 · 공탁금 ${(r.sticks*1000).toLocaleString()}점은 아래 점수 변동에 반영되었습니다.</p>`;}
 else {html+=`<p class="modal-desc">${esc(r.name)}${r.tenpai?` · 텐파이 ${r.tenpai.filter(Boolean).length}명`:''}</p>`;
  if(r.tenpai)html+=`<div class="yaku-list">${r.tenpai.map((t,i)=>`<div class="yaku-item">${game.names[i]}<span>${t?'텐파이':'노텐'}</span></div>`).join('')}</div>`;
 }
 html+=`<div class="settlement-label"><span>점수 정산 · 순위 변동</span><span>정산 직전 대비</span></div>`+scoreRows(r.points,r.delta)+`<p class="result-note">${game.options.mode==='single'?'1국 연습이 끝났습니다. 최종 순위를 확인하세요.':r.repeat?'친이 유지되어 다음 국은 '+(game.honba+1)+'본장으로 진행합니다.':'다음 국에서는 친이 바뀝니다.'}</p><div class="result-actions"><button class="primary-btn" data-act="next">${game.options.mode==='single'?'최종 순위 보기':'다음으로'} →</button><button class="secondary-btn" data-act="review">손패 확인</button></div>`;
 openModal('result',html,true);fx.settle(r);
}
function showReview(){
 if(!game.result)return;
 openModal('review',`<p class="modal-kicker">END-OF-HAND REVIEW</p><h2 id="modalTitle">모두의 마지막 손패.</h2><p class="modal-desc">종료된 국의 손패입니다. 진행 중에는 CPU 손패가 공개되지 않습니다.</p><div class="review-hands">${game.players.map((p,i)=>`<div class="review-player"><strong>${game.names[i]} · ${windChars[game.seat(i)]}</strong><small>${p.riichi?'리치':p.melds.some(m=>m.open)?'부로':'멘젠'}</small><div>${R.sorted(p.hand).map(id=>tile(id,'small')).join('')}${p.melds.map(m=>meldHTML(m)).join('')}</div></div>`).join('')}</div><div class="modal-bottom"><button class="primary-btn" data-act="show-result">결과로 돌아가기</button></div>`,true);
}
function showEnding(){
 if(game.phase!=='finished')return;
 persist();const rank=game.ranking(),myRank=rank.indexOf(0)+1;
 openModal('ending',`<p class="modal-kicker ending-title">THE TABLE IS COMPLETE</p><div class="ending-medal">${myRank}</div><h2 class="ending-title" id="modalTitle">${myRank===1?'오늘의 달은, 당신의 편.':'다음 한 판은 또 다르니까.'}</h2><p class="modal-desc ending-title">${modeNames[game.options.mode]} 종료 · 플레이어 ${myRank}위<br>당신의 최종 점수는 ${game.points[0].toLocaleString()}점입니다.</p>${scoreRows(game.points)}<p class="result-note">동점이면 최초 좌석 순서로 순위를 정합니다.<br>종료 시 남은 공탁금은 최종 1위에게 지급합니다. 우마·오카는 적용하지 않습니다.</p><div class="result-actions"><button class="primary-btn" data-act="new">새로운 대국 →</button><button class="secondary-btn" data-act="export">기록 저장</button></div>`);
}
function exportRecord(){
 const payload={format:'tsukikage-riichi-record',version:1,exportedAt:new Date().toISOString(),notes:'상태 스냅샷과 대국 이벤트. 전용 재생기는 포함되지 않습니다.',state:stateData(),events:record};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='tsukikage-riichi-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);notice('대국 기록을 JSON 파일로 저장했습니다.');
}
function togglePause(){
 input?.cancel();
 if(!started||fx?.active||['result','finished'].includes(game.phase))return;
 paused=!paused;clearTimeout(timer);render();if(!paused)queue();
}
function handleAction(action){
 if(fx?.active)return;
 const inGameActions=['discard','riichi','riichi-cancel','tsumo','ron','pass','kan','nine','close-choices'];
 if((modalType||paused)&&(inGameActions.includes(action)||action.startsWith('call-')))return;
 switch(action){
 case'request-guide':{const old=prefs.guideLevel;prefs.guideLevel='auto';renderGuide(analysis());prefs.guideLevel=old;openModal('guide',closeButton()+'<h2 id="modalTitle">현재 손패 설명</h2>'+$('guideContent').innerHTML);break;}
 case'start':startFromWelcome();break;
 case'restore':restoreSaved();break;
 case'new':showWelcome();break;
 case'close-modal':if(modalType==='welcome'&&!started)return;closeModal();break;
 case'discard':discardSelected();break;
 case'riichi':toggleRiichi();break;
 case'riichi-cancel':riichiMode=false;selected=null;render();break;
 case'tsumo':game.tsumo(0);break;
 case'ron':if(game.pending?.from!==0)game.resolve({kind:'ron'});break;
 case'pass':if(game.pending?.from!==0)game.resolve(null);break;
 case'kan':chooseGroup('kan');break;
 case'nine':game.abortNine(0);break;
 case'close-choices':choiceList=null;render();break;
 case'pause':togglePause();break;
 case'next':closeModal(false);game.nextHand();break;
 case'show-result':showResult();break;
 case'show-ending':showEnding();break;
 case'review':showReview();break;
 case'export':exportRecord();break;
 case'save-settings':readSettings();closeModal();break;
 case'preview-fx':previewEffects();break;
 default:if(action.startsWith('call-'))chooseGroup(action.slice(5));
 }
}
document.addEventListener('click',e=>{
 if(fx?.active)return;
 const mode=e.target.closest('[data-mode]');if(mode){$('modalCard').querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b===mode));return;}
 const action=e.target.closest('[data-act]');if(action&&!action.disabled){safe(()=>handleAction(action.dataset.act));return;}
 const t=e.target.closest('[data-tile]');if(t&&!t.disabled){safe(()=>tileClick(Number(t.dataset.tile)));return;}
 const c=e.target.closest('[data-choice]');if(c&&choiceList){const list=choiceList,o=list.items[Number(c.dataset.choice)];safe(()=>{if(list.kan)game.declareKan(0,o);else game.resolve(o);});}
});
$('soundBtn').addEventListener('click',()=>{prefs.sound=!prefs.sound;savePrefs();sound('select');notice(prefs.sound?'효과음을 켰습니다.':'효과음을 껐습니다.');});
$('fullscreenBtn').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch(e){notice('전체 화면을 지원하지 않는 환경입니다. 브라우저의 F11 키를 사용할 수 있습니다.');}});
$('settingsBtn').addEventListener('click',showSettings);$('designBtn').addEventListener('click',showSettings);$('helpBtn').addEventListener('click',showHelp);
$('pauseBtn').addEventListener('click',togglePause);$('resumePauseBtn').addEventListener('click',togglePause);$('newBtn').addEventListener('click',showWelcome);
$('hintToggle').addEventListener('change',e=>{prefs.hints=e.target.checked;savePrefs();render();});
$('autoWin').addEventListener('change',e=>{prefs.alerts=e.target.checked;savePrefs();});
document.addEventListener('keydown',e=>{
 if(fx?.active){
  if(['Enter','Escape',' '].includes(e.key)){e.preventDefault();fx.skip();}
  else if(e.key==='Tab'){e.preventDefault();$('skipWin').focus();}
  return;
 }
 if(modalType){
  if(e.key==='Tab'){
   const items=[...$('modalCard').querySelectorAll('button:not(:disabled),a[href],input,select,[tabindex="0"]')];
   if(items.length){const first=items[0],last=items[items.length-1];if(e.shiftKey&&(document.activeElement===first||document.activeElement===$('modalCard'))){last.focus();e.preventDefault();}else if(!e.shiftKey&&document.activeElement===last){first.focus();e.preventDefault();}}
  }
  if(e.key==='Escape'&&!['welcome','ending','error'].includes(modalType)){e.preventDefault();if(modalType==='review')showResult();else closeModal();}return;
 }
 if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;
 if(e.key===' '&&e.target===document.body)e.preventDefault();
 if(paused){if(e.key===' '||e.key.toLowerCase()==='p'){togglePause();e.preventDefault();}return;}
 safe(()=>{
  if(e.key==='Enter'){if(game.phase==='result')showResult();else discardSelected();e.preventDefault();}
  else if(e.key.toLowerCase()==='r'){toggleRiichi();e.preventDefault();}
  else if(e.key.toLowerCase()==='w'){
   if(game.phase==='turn'&&game.current===0)game.tsumo(0);else if(game.pending?.choices[0]?.some(o=>o.kind==='ron'))game.resolve({kind:'ron'});e.preventDefault();
  }else if(e.key==='Escape'){input?.cancel();
   if(choiceList){choiceList=null;render();}else if(riichiMode){riichiMode=false;selected=null;render();}else if(game.pending&&game.pending.from!==0){game.resolve(null);}else{selected=null;render();}e.preventDefault();
  }else if(e.key.toLowerCase()==='p'){togglePause();e.preventDefault();}
  else if(['ArrowLeft','ArrowRight'].includes(e.key)&&game.phase==='turn'&&game.current===0){
   const ids=R.sorted(riichiMode?game.riichiOptions(0):game.legalDiscards(0));const index=ids.indexOf(selected),step=e.key==='ArrowRight'?1:-1;if(ids.length){selected=ids[(index+step+ids.length)%ids.length];render();}e.preventDefault();
  }
 });
});
window.addEventListener('beforeunload',()=>persist());
 document.addEventListener('visibilitychange',()=>{input?.cancel();if(document.hidden){backgroundPaused=started&&!paused&&!modalType&&!fx?.active;clearTimeout(timer);persist();Characters.stopAudio();}else if(backgroundPaused){backgroundPaused=false;queue();}});
window.Tsukikage={
 game:null,
 start(options={}){fx?.reset();started=true;paused=false;closeModal(false);initGame(options);},
 pause(value=true){paused=value;clearTimeout(timer);render();if(!value)queue();},
 snapshot(){return new URLSearchParams(location.search).has('qa')?JSON.parse(JSON.stringify(stateData())):{version:game.version,phase:game.phase,points:game.points.slice(),myHand:game.players[0].hand.slice(),publicPlayers:game.players.map(p=>({river:p.river,melds:p.melds,riichi:p.riichi,handCount:p.hand.length})),indicators:game.indicators()};},
 tileSvg,
 showHelp,showSettings,render,previewEffects,
 get visuals(){return fx;},
 get prefs(){return{...prefs};}
};
document.addEventListener('settlementDisplay',render);
let inspectTimer=null,pressTimer=null;
function inspectTile(el){
 if(!el||!prefs.publicHighlight)return;const id=Number(el.dataset.publicTile),t=R.type(id);
 document.querySelectorAll('[data-face-type]').forEach(x=>x.classList.toggle('public-match',Number(x.dataset.faceType)===t));
 $('tileInspect').innerHTML=tile(id,'')+'<strong>'+esc(R.tileName(id,game.options.aka))+'</strong>';$('tileInspect').hidden=false;clearTimeout(inspectTimer);inspectTimer=setTimeout(clearInspect,2200);
}
function clearInspect(){clearTimeout(inspectTimer);$('tileInspect').hidden=true;document.querySelectorAll('.public-match').forEach(el=>el.classList.remove('public-match'));}
document.addEventListener('pointerover',e=>{if(e.pointerType!=='touch')inspectTile(e.target.closest('[data-public-tile]'));});
document.addEventListener('focusin',e=>inspectTile(e.target.closest('[data-public-tile]')));
document.addEventListener('pointerdown',e=>{const el=e.target.closest('[data-public-tile]');if(el&&e.pointerType==='touch')pressTimer=setTimeout(()=>inspectTile(el),450);});
for(const name of ['pointerup','pointercancel','pointermove'])document.addEventListener(name,()=>clearTimeout(pressTimer));
document.addEventListener('keydown',e=>{if(e.key==='Escape')clearInspect();});
fx=window.RiichiFX.create({R,getGame:()=>game,getPrefs:()=>prefs,tile,back,esc,sound});
 input=window.RiichiInput.create({canUse:id=>started&&!paused&&!modalType&&!fx.active&&game.legalDiscards(0).includes(id)&&(!riichiMode||game.riichiOptions(0).includes(id)),getVersion:()=>game.version,select:id=>{selected=id;render();},discard:id=>{selected=id;discardSelected();}});
 Characters.preload();
fx.applyPrefs();initGame({mode:'east'});renderIcons();showWelcome();
})();

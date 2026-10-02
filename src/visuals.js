/* Presentation only. This module never mutates engine points, tiles or turn state. */
(function(root){
'use strict';
const $=id=>document.getElementById(id);
const order=points=>[0,1,2,3].sort((a,b)=>points[b]-points[a]||a-b);
const format=n=>Math.round(n).toLocaleString('ko-KR');
const countFrames=new WeakMap();
function countTo(el,from,to,duration=700,delay=0){
 if(!el)return;
 const prior=countFrames.get(el);if(prior)cancelAnimationFrame(prior);
 el.dataset.target=String(to);
 if(!duration){el.textContent=format(to);return;}
 const start=performance.now()+delay;
 el.textContent=format(from);
 function tick(now){
  if(!el.isConnected)return;
  const t=Math.max(0,Math.min(1,(now-start)/duration));
  el.textContent=format(from+(to-from)*(1-Math.pow(1-t,3)));
  if(t<1)countFrames.set(el,requestAnimationFrame(tick));else countFrames.delete(el);
 }
 countFrames.set(el,requestAnimationFrame(tick));
}
function doraInfo(R,id,game,options={}){
 const indicators=options.indicators??(game?.dead?game.indicators():[]);
 const ura=options.ura||[];
 const normal=indicators.filter(d=>R.doraNext(R.type(d))===R.type(id)).length;
 const hidden=ura.filter(d=>R.doraNext(R.type(d))===R.type(id)).length;
 const red=game?.options?.aka!==false&&R.red(id)?1:0;
 return {normal,ura:hidden,red,total:normal+hidden+red};
}
function create({R,getGame,getPrefs,tile,back,esc,sound}){
 let active=false,sceneTimer=null,exitTimer=null,sceneDone=null,sceneToken=0;
 let rankPoints=null,rankOrder=null,wallKey='',lastWallCount=0,lastHand=-1,liveReady=false;
 let rankFlashTimer=null,lastModalAnimations=[],focusBefore=null;
 const media=matchMedia('(prefers-reduced-motion: reduce)');
 function motion(){return media.matches?'off':getPrefs().motion||'full';}
 function applyPrefs(){
  const p=getPrefs();
  document.documentElement.dataset.tileTheme=['ivory','jade','midnight'].includes(p.tileTheme)?p.tileTheme:'ivory';
  document.documentElement.dataset.motion=motion();
  document.documentElement.dataset.doraGlow=p.doraGlow===false?'off':'on';document.documentElement.dataset.helperLabels=p.helperLabels===false?'off':'on';document.documentElement.dataset.actualDora=p.actualDora===false?'off':'on';
 }
 media.addEventListener?.('change',()=>{applyPrefs();if(active&&media.matches)skip();});
 function reset(){
  cancel();rankPoints=null;rankOrder=null;wallKey='';lastWallCount=0;lastHand=-1;
  clearTimeout(rankFlashTimer);
 }
 function createRankRows(){
  const names=getGame().names;
  $('rankList').innerHTML=names.map((name,i)=>`<div class="live-rank-row ${i===0?'is-you':''}" data-seat="${i}" role="listitem"><span class="live-rank-number">${i+1}</span><span class="live-rank-avatar a${i}">${Characters.portrait(i,'neutral','rank-portrait')}</span><div class="live-rank-person"><strong>${esc(name)}</strong><small>${i===0?'YOU · 플레이어':['','CPU · 공격형','CPU · 수비형','CPU · 균형형'][i]}</small></div><div class="live-rank-values"><strong class="live-rank-score">25,000</strong><span class="live-rank-change">—</span></div></div>`).join('');
  liveReady=true;
 }
 function renderRanks(){
  const g=getGame();if(!liveReady)createRankRows();
  const p=g.points,rank=order(p),same=rankPoints&&rankPoints.every((v,i)=>v===p[i]);
  const m=motion(),anim=m==='full'?850:m==='short'?300:0;
  $('rankRound').textContent=`${g.roundWind()===0?'EAST':'SOUTH'} ${g.roundIndex%4+1}`;
  if(same)return;
  const before=rankPoints?.slice(),oldOrder=rankOrder?.slice();
  const rowHeight=innerWidth>1040&&innerHeight<=980?46:innerWidth<=450?51:55;
  $('rankList').style.height=(rowHeight*4)+'px';
  for(const row of $('rankList').children){
   const i=Number(row.dataset.seat),n=rank.indexOf(i),old=oldOrder?oldOrder.indexOf(i):n;
   row.style.setProperty('--rank',n);row.style.setProperty('--rank-height',rowHeight+'px');
   row.style.transitionDuration=anim+'ms';
   row.setAttribute('aria-label',`${n+1}위 ${g.names[i]} ${format(p[i])}점`);
   row.classList.toggle('is-leader',n===0);
   row.querySelector('.live-rank-number').textContent=n+1;
   const score=row.querySelector('.live-rank-score');
   countTo(score,before?Number(score.textContent.replace(/,/g,'')):p[i],p[i],before?anim:0);
   const change=row.querySelector('.live-rank-change'),delta=before?p[i]-before[i]:0;
   const move=old-n;
   change.className='live-rank-change '+(move>0?'up':move<0?'down':delta>0?'up':delta<0?'down':'');
   change.textContent=move?`${move>0?'▲':'▼'} ${Math.abs(move)}위 ${delta>=0?'+':''}${format(delta)}`:delta?`${delta>0?'+':''}${format(delta)}`:'—';
   row.classList.toggle('rank-up',move>0);row.classList.toggle('rank-down',move<0);
  }
  rankPoints=p.slice();rankOrder=rank.slice();
  if(before){
   $('rankStatus').textContent=rank.indexOf(0)===0?'현재 선두입니다.':`선두까지 ${format(p[rank[0]]-p[0])}점`;
   clearTimeout(rankFlashTimer);rankFlashTimer=setTimeout(()=>{
    $('rankList').querySelectorAll('.rank-up,.rank-down').forEach(el=>el.classList.remove('rank-up','rank-down'));
   },3000);
  }else $('rankStatus').textContent='동점이면 최초 좌석 순서로 표시합니다.';
 }
 function renderWall(){
  const g=getGame(),ind=g.indicators();
  const key=[g.handNumber,ind.join(','),g.options.aka,getPrefs().tileTheme].join('|');
  if(key===wallKey)return;
  const newReveal=lastHand===g.handNumber&&ind.length>lastWallCount;
  const doraMap=new Map();for(const id of ind){const t=R.doraNext(R.type(id));doraMap.set(t,(doraMap.get(t)||0)+1);}
  const stack=(top,bottom,cls='',attrs='')=>`<span class="wall-stack ${cls}" ${attrs}><span class="wall-lower">${bottom}</span><span class="wall-upper">${top}</span></span>`;
  const rinshan=Array.from({length:2},(_,i)=>stack(back('wall-tile'),back('wall-tile'),'rinshan-stack',`title="린샹패 자리 · 미공개"`)).join('');
  const slots=Array.from({length:5},(_,i)=>{
   const isFace=i<ind.length;
   const face=isFace?tile(ind[i],'wall-tile','indicator-face','',false,{indicator:true}):back('wall-tile');
   return stack(face,back('wall-tile'),isFace?'revealed':'sealed',`data-indicator-index="${i}" data-revealed="${isFace}" title="${isFace?esc('도라 표시패 '+R.tileName(ind[i],g.options.aka)+' → 도라 '+R.name(R.doraNext(R.type(ind[i])))):'미공개 깡도라 표시패'}"`);
  }).join('');
  $('wallHud').innerHTML=`<div class="wall-heading"><strong><span>王牌</span> 왕패</strong><small>도라 표시패 <b>${ind.length}</b> / 5</small></div><div class="wall-stacks"><div class="rinshan-stacks">${rinshan}</div><i class="wall-divider"></i><div class="indicator-stacks">${slots}</div><span class="wall-lock" title="아래쪽 우라도라는 화료 결과에서만 공개합니다.">14<span>장</span></span></div><div class="actual-dora"><span class="actual-dora-title">현재 도라 <b>→</b></span><div class="actual-dora-tiles">${[...doraMap].map(([t,n])=>`<span class="actual-dora-item">${tile(t*4+1,'tiny','dora-example','',false,{indicator:true})}<small>${esc(R.name(t))}${n>1?' ×'+n:''}</small></span>`).join('')}</div><span class="dora-key" title="금색 별은 실제 도라입니다. 표시패 자체가 도라는 아닙니다.">✦</span></div>`;
  if(newReveal&&motion()!=='off'){
   const el=$('wallHud').querySelector(`[data-indicator-index="${ind.length-1}"] .wall-upper`);
   el?.animate?.([{transform:'perspective(240px) rotateY(-90deg)',opacity:.2},{transform:'perspective(240px) rotateY(0deg)',opacity:1}],{duration:motion()==='full'?650:250,easing:'cubic-bezier(.18,.8,.25,1)'});
   $('wallHud').classList.remove('wall-revealing');void $('wallHud').offsetWidth;$('wallHud').classList.add('wall-revealing');
  }
  wallKey=key;lastHand=g.handNumber;lastWallCount=ind.length;
 }
 function layoutRanks(){
  if(!liveReady)return;
  const h=innerWidth>1040&&innerHeight<=980?46:innerWidth<=450?51:55;
  $('rankList').style.height=(h*4)+'px';
  for(const row of $('rankList').children)row.style.setProperty('--rank-height',h+'px');
 }
 function settle(result){
  lastModalAnimations.forEach(a=>a.cancel());lastModalAnimations=[];
  const duration=motion()==='full'?900:motion()==='short'?300:0;
  const rows=[...$('modalCard').querySelectorAll('.score-row[data-seat]')];
  const delta=result?.delta;
  if(!delta)return;
  const before=result.points.map((v,i)=>v-delta[i]),old=order(before),after=order(result.points);
  const stride=rows.length>1?rows[1].offsetTop-rows[0].offsetTop:53;
  const delay=duration?260:0;
  for(const row of rows){
   const i=Number(row.dataset.seat),d=(old.indexOf(i)-after.indexOf(i))*stride;
   if(duration&&row.animate)lastModalAnimations.push(row.animate([{transform:`translateY(${d}px)`,opacity:.6},{transform:'translateY(0)',opacity:1}],{duration,delay,easing:'cubic-bezier(.2,.85,.2,1)',fill:'backwards'}));
   countTo(row.querySelector('.score'),before[i],result.points[i],duration,delay);
  }
  const amounts=$('modalCard').querySelectorAll('.result-han strong[data-amount]');
  amounts.forEach(el=>{
   const number=el.querySelector('.amount-number');
   countTo(number,0,Number(el.dataset.amount),duration,100);
  });
 }
 function cancel(){
  stages.forEach(clearTimeout);stages=[];Characters.stopAudio();
  sceneToken++;clearTimeout(sceneTimer);clearTimeout(exitTimer);sceneDone=null;active=false;
  const scene=$('winScene');scene.hidden=true;scene.innerHTML='';scene.className='win-scene';
  document.querySelector('.app').inert=false;
 }
 function finish(){
  if(!demoScene){settlementReady=true;renderRanks();document.dispatchEvent(new Event('settlementDisplay'));}
  const done=sceneDone;sceneDone=null;
  cancel();if(done)done();else if(focusBefore?.isConnected)focusBefore.focus({preventScroll:true});
 }
 function skip(){if(!active)return;clearTimeout(sceneTimer);clearTimeout(exitTimer);finish();}
 function tier(s){return s.yakuman||s.basic>=8000?'yakuman':s.basic>=6000?'sanbaiman':s.basic>=4000?'baiman':s.basic>=3000?'haneman':s.basic>=2000?'mangan':'normal';}
 function stick(i){
  if(motion()==='off')return;
  const a=$(i?'seat'+i:'selfInfo').getBoundingClientRect(),b=$('centerBoard').getBoundingClientRect(),el=document.createElement('i');el.className='stick-flight';el.setAttribute('aria-hidden','true');el.style.left=a.left+'px';el.style.top=a.top+'px';document.body.appendChild(el);
  el.animate([{transform:'translate(0,0) rotate(-12deg)'},{transform:`translate(${b.left-a.left+30}px,${b.top-a.top+35}px)`}],{duration:600,easing:'ease-in-out'}).onfinish=()=>el.remove();setTimeout(()=>el.remove(),800);
 }
 let settlementReady=false,demoScene=false,stages=[];
 function play(result,done,{demo=false}={}){
  cancel();const mode=motion();demoScene=demo;settlementReady=false;
  if(mode==='off'){settlementReady=true;if(!demo){renderRanks();document.dispatchEvent(new Event('settlementDisplay'));}done();return;}
  const g=getGame(),scene=$('winScene'),token=sceneToken;active=true;sceneDone=done;focusBefore=document.activeElement;document.querySelector('.app').inert=true;
  scene.hidden=false;scene.className='win-scene staged-scene';scene.innerHTML='<div class="win-vignette"></div><div id="sceneBody"></div><button type="button" id="skipWin" class="win-skip">연출 건너뛰기 · Enter / Esc</button><div class="phase-track" id="phaseTrack"></div>';
  $('skipWin').onclick=skip;$('skipWin').focus({preventScroll:true});
  let at=0;const step=mode==='short'?180:850;
  const schedule=(fn,duration)=>{stages.push(setTimeout(()=>{if(token===sceneToken&&active)fn();},at));at+=duration;};
  const show=(d,phase,content)=>{
   const t=tier(d.score),special=t==='sanbaiman'||t==='yakuman';
   scene.dataset.tier=t;scene.dataset.character=Characters.ids[d.i];scene.dataset.phase=phase;scene.style.setProperty('--hero-accent',Characters.colors[d.i]);
   $('phaseTrack').textContent=['캐릭터','화료패','역 공개','최종 점수','점수 이동 · 순위'].map((x,k)=>k===phase?'['+x+']':x).join(' → ');
   $('sceneBody').innerHTML=`<div class="scene-motif" aria-hidden="true">${['☾','✦','◇','❀'][d.i]}</div><img class="scene-character" src="${Characters.path(d.i,special?'special':'cutin')}" width="384" height="512" alt="${Characters.names[d.i]} 화료 컷인" onerror="this.hidden=true"><div class="scene-copy"><p class="scene-kicker">${demo?'연출 미리보기 · 대국에 반영 없음':result.winners.length>1?'동시 화료 '+(result.winners.indexOf(d)+1)+' / '+result.winners.length:'달빛 리치 클럽'}</p><h2 id="winSceneTitle">${Characters.names[d.i]}</h2><p class="scene-line">${Characters.lines[d.i][t==='normal'?'win':'limit'][0]}</p>${content}</div>`;
  };
  for(const d of result.winners){
   schedule(()=>{show(d,0,'<div class="scene-limit">'+esc(d.score.limit||'화료')+'</div>');if(!demo)Characters.say(d.i,tier(d.score)==='normal'?'win':'limit',getPrefs(),{force:true});},step);
   schedule(()=>show(d,1,`<div class="scene-winning-tile">${tile(d.winTile,'hero-tile','','',false,{ura:d.ura,indicators:result.indicators||d.indicators})}<strong>${d.method==='ron'?'론':'쯔모'} · 화료패</strong></div>`),step);
   schedule(()=>{
    show(d,2,'<div class="scene-yaku" id="sceneYaku"></div>');
    d.score.yaku.forEach((y,k)=>stages.push(setTimeout(()=>{if(token!==sceneToken||!active||!$('sceneYaku'))return;const el=document.createElement('div');el.textContent=y.name+' · '+(y.yakuman?y.yakuman+'배 역만':y.han+'판');$('sceneYaku').appendChild(el);},k*(mode==='short'?35:180))));
   },Math.max(step,d.score.yaku.length*(mode==='short'?35:180)+350));
   schedule(()=>{show(d,3,`<div class="scene-limit">${esc(d.score.limit||'화료')} · ${d.score.yakuman?d.score.yakuman+'배 역만':d.score.han+'판 '+d.score.fu+'부'}</div><div class="scene-total"><strong id="winTotal">0</strong><small>점</small></div><p class="scene-fine">본장·공탁금 제외 · 정산 내역이 이어집니다.</p>`);countTo($('winTotal'),0,d.score.total,mode==='short'?130:600);sound('win');},step);
  }
  schedule(()=>{
   const points=result.points||g.points,delta=result.delta||[0,0,0,0],before=points.map((v,i)=>v-delta[i]),old=order(before),after=order(points);scene.dataset.phase='4';$('phaseTrack').textContent='점수 이동 · 순위 변화';
   $('sceneBody').innerHTML='<div class="scene-settlement"><h2 id="winSceneTitle">'+(demo?'정산 미리보기':'점수 이동 · 순위')+'</h2>'+after.map((i,n)=>`<div class="scene-score-row"><b>${old.indexOf(i)+1}위 → ${n+1}위</b>${Characters.portrait(i,delta[i]>0?'win':delta[i]<0?'loss':'neutral')}<span>${g.names[i]}</span><strong id="sceneScore${i}">${format(before[i])}</strong><small>${delta[i]>0?'+':''}${format(delta[i])}</small></div>`).join('')+'</div>';
   for(let i=0;i<4;i++)countTo($('sceneScore'+i),before[i],points[i],mode==='short'?130:700);
   settlementReady=true;if(!demo){renderRanks();document.dispatchEvent(new Event('settlementDisplay'));Characters.say(after[0],old.indexOf(after[0])>0?'up':'win',getPrefs(),{force:true});}sound('rank');
  },step);
  schedule(finish,0);
 }
 function sample({tier:requested='mangan',character:i=0}={}){
  const types=requested==='yakuman'?[0,0,8,9,17,18,26,27,28,29,30,31,32,33]:[0,1,2,3,4,5,13,13,15,16,17,18,19,20],used={};
  const hand=types.map(t=>t*4+(used[t]=(used[t]||0)+1)-1),winTile=requested==='yakuman'?hand[0]:hand.find(id=>R.type(id)===18);
  const count={normal:0,mangan:1,haneman:2,baiman:3,sanbaiman:4,yakuman:0}[requested]??1;
  const indicators=[48,49,50,51].slice(0,count);if(requested==='sanbaiman')indicators.push(13);
  const score=R.evaluate(hand,[],{method:'ron',winTile,seat:getGame().seat(i),round:getGame().roundWind(),riichi:true,ippatsu:requested==='mangan',indicators,ura:[],aka:false,doubleYakuman:true});
  return {kind:'win',honba:0,sticks:0,indicators,winners:[{i,method:'ron',from:(i+1)%4,hand,melds:[],score,winTile,ura:[],indicators}]};
 }
 function redraw(){applyPrefs();renderWall();renderRanks();}
 return {prepareSettlement(){settlementReady=false;},applyPrefs,renderWall,renderRanks,layoutRanks,reset,settle,play,skip,cancel,sample,redraw,motion,tier,stick,get settlementReady(){return settlementReady;},get active(){return active;}};
}
root.RiichiFX={create,doraInfo,countTo,order};
})(window);

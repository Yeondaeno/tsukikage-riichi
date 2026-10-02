(function(root){
'use strict';
const names=['츠키시로 히나','아사히 아카네','미나세 시즈쿠','하나모리 코하루'];
const ids=['hina','akane','shizuku','koharu'];
const colors=['#b8e8ca','#ffa88c','#b7d9fa','#efc8d5'];
const expressions=['neutral','smile','thinking','surprise','riichi','win','loss'];
const lines=[
 {start:['한 수씩, 함께해요.','오늘도 달빛 아래서!'],call:['이 패, 빌릴게!','이어 볼게!'],riichi:['좋아, 이 한 수로 갈게!','내 마음을 이 패에!'],win:['기다리던 패야!','우리, 멋진 한 수였지?'],limit:['달빛이 길을 열었어!','반짝이는 순간이야!'],loss:['다음 패를 기다릴게.','아직 기회는 있어.'],draw:['잠깐 쉬어 가자.'],up:['한 걸음 앞으로!'],down:['천천히 다시 올라가자.'],end:['함께해 줘서 고마워.']},
 {start:['자, 신나게 시작하자!','오늘은 내가 앞서 갈 거야!'],call:['빠르게 이어 갈게!','내가 가져갈게!'],riichi:['이번엔 내가 먼저야!','준비됐지? 리치!'],win:['좋아, 제대로 잡았어!','태양처럼 빛나는 한 수!'],limit:['뜨겁게 달려 볼까!','끝까지 밀어붙였어!'],loss:['다음엔 내가 이겨!','좋은 한 수였네!'],draw:['다음 국에는 더 빠르게!'],up:['선두까지 달려!'],down:['금방 따라갈 거야!'],end:['다음에 또 승부하자!']},
 {start:['차분하게 시작해요.','오늘의 흐름을 살펴볼게요.'],call:['이 조합이 좋겠어요.','조심스럽게 이어 갈게요.'],riichi:['이제 준비됐어요.','확신이 서네요. 리치.'],win:['기다린 보람이 있네요.','고요한 물결이 닿았어요.'],limit:['수정처럼 맑은 순간이에요.','끝까지 기다린 결과네요.'],loss:['좋은 수였어요.','다시 살펴볼게요.'],draw:['파도가 잠시 쉬네요.'],up:['조금씩 나아가네요.'],down:['서두르지 않을게요.'],end:['함께한 시간, 즐거웠어요.']},
 {start:['좋은 바람이 불어오네.','오늘도 편하게 즐기자.'],call:['이 패가 이어 주네.','흐름을 따라가 볼게.'],riichi:['흐름이 좋아졌네.','바람이 등을 밀어 주네.'],win:['이번엔 내가 가져갈게.','꽃잎처럼 딱 맞았네.'],limit:['바람에 꽃이 피었어!','지금이 가장 좋은 순간!'],loss:['다음 바람을 기다릴게.','잠깐 돌아가는 길이네.'],draw:['흐름을 다시 만나자.'],up:['좋은 바람이야.'],down:['괜찮아, 다음을 보자.'],end:['다음에 또 같이 놀자.']}
];
const path=(i,kind='neutral')=>'assets/characters/'+ids[i]+'/'+kind+'.webp';
function portrait(i,kind='neutral',cls='character-portrait'){return `<img class="${cls}" src="${path(i,kind)}" alt="${names[i]} · ${kind==='riichi'?'집중':kind==='win'?'기쁨':kind==='loss'?'아쉬움':'표정'}" width="128" height="128" onerror="this.hidden=true">`;}
let sequence=0,lastAt=0,lastLine='',timer=null;
function say(i,event,prefs,{force=false}={}){
 if(prefs.dialogue===false||(!force&&performance.now()-lastAt<(prefs.dialogueFrequency==='low'?9000:3500)))return;
 const choices=lines[i][event]||lines[i].start;let line=choices[sequence++%choices.length];if(line===lastLine&&choices.length>1)line=choices[(sequence)%choices.length];
 lastAt=performance.now();lastLine=line;const el=document.getElementById('characterDialogue');
 el.innerHTML=portrait(i,event==='riichi'?'riichi':event==='win'||event==='limit'?'win':event==='loss'?'loss':'smile')+`<div><strong>${names[i]}</strong><span>${line}</span></div>`;el.hidden=false;clearTimeout(timer);timer=setTimeout(()=>el.hidden=true,4200);
}
const manifest={version:3,characters:ids.map((id,i)=>({id,name:names[i],theme:colors[i],base:path(i,'base'),portrait:path(i),expressions:Object.fromEntries(expressions.map(e=>[e,path(i,e)])),cutin:path(i,'cutin'),special:path(i,'special'),voice:null})),audio:{tile:'assets/audio/tile.wav',select:'assets/audio/select.wav',riichi:'assets/audio/riichi.wav',call:'assets/audio/call.wav',win:'assets/audio/win.wav',draw:'assets/audio/draw.wav',rank:'assets/audio/rank.wav'}};
let audioUnlocked=false;const playing=new Set();
document.addEventListener('pointerdown',()=>audioUnlocked=true,{once:true});document.addEventListener('keydown',()=>audioUnlocked=true,{once:true});
function sound(kind,prefs){if(!audioUnlocked||!prefs.sound||!(prefs.sfxVolume>0))return;const a=new Audio(manifest.audio[kind]||manifest.audio.tile);a.volume=Math.min(1,prefs.sfxVolume/100);playing.add(a);a.onended=a.onerror=()=>playing.delete(a);a.play().catch(()=>playing.delete(a));}
function stopAudio(){for(const a of playing){a.pause();a.currentTime=0;}playing.clear();}
function preload(){for(let i=0;i<4;i++)for(const k of ['neutral','riichi','win','cutin','special']){const im=new Image();im.src=path(i,k);}}
root.Characters={names,ids,colors,lines,path,portrait,say,manifest,sound,stopAudio,preload};
})(window);

(function(){
'use strict';

const RED_IDS=new Set([16,52,88]);
const TILE={w:.48,h:.22,d:.68,gap:.055};
const FACE={w:TILE.w*.92,d:TILE.d*.94};
const css=(stage,name,fallback)=>getComputedStyle(stage).getPropertyValue(name).trim()||fallback;
const tileId=value=>Number(typeof value==='object'?value.id:value);
const compactLayout=(width,height)=>width/Math.max(height,1)>1.75&&height<500;
const compactScale=height=>Math.max(1.5,Math.min(2,540/Math.max(height,1)));
const layoutKey=(width,height)=>compactLayout(width,height)?'compact:'+compactScale(height).toFixed(3):'classic';

function inert(onStatus,reason){
 let disposed=false;
 onStatus?.(false,reason);
 return{ready:Promise.resolve(false),sync(){},resize(){},dispose(){disposed=true;},get active(){return false;},diagnostics(){return{active:false,reason,renderer:'WebGL2',revision:0,drawCalls:0,triangles:0,textures:0,pixelRatio:0,width:0,height:0,frames:0,publicTiles:[],hiddenCount:0,faceTextureCount:0,disposed};},loseContext(){},restoreContext(){}};
}

function create({stage,host,controls,getView,tileName,onStatus}={}){
 const T=window.THREE;
 if(!T||!stage||!host||!controls||typeof getView!=='function')return inert(onStatus,!T?'missing-three':'invalid-host');

 let renderer;
 try{
  renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
 }catch(error){console.warn('Three.js table unavailable:',error);return inert(onStatus,'webgl-unavailable');}

 const scene=new T.Scene(),camera=new T.PerspectiveCamera(38,1,.1,100),dynamic=new T.Group();
 const geometries=new Set(),materials=new Set(),surfaceTextures=new Set(),textureCache=new Map(),publicMeshes=[];
 const tileGeometry=trackGeometry(new T.BoxGeometry(TILE.w,TILE.h,TILE.d));
 const faceGeometry=trackGeometry(new T.PlaneGeometry(FACE.w,FACE.d));
 const palette={
  felt:css(stage,'--table-felt-mid','#247056'),feltDark:css(stage,'--table-felt-dark','#124939'),
  wood:css(stage,'--table-wood-edge','#4d2919'),woodLight:css(stage,'--table-wood-highlight','#bc7d3e'),
  ivory:css(stage,'--table-river-face','#fff9de'),edge:css(stage,'--table-river-edge','#f5e7bb'),
  gold:css(stage,'--table-back-mid','#efa92e'),goldDark:css(stage,'--table-back-dark','#ba7225')
 };
 const woodTexture=surfaceTexture('wood'),feltTexture=surfaceTexture('felt');
 const mat={
  felt:trackMaterial(new T.MeshStandardMaterial({color:0xffffff,map:feltTexture,roughness:.92,metalness:0})),
  feltDark:trackMaterial(new T.MeshStandardMaterial({color:0xffffff,map:feltTexture,roughness:1})),
  wood:trackMaterial(new T.MeshStandardMaterial({color:0xffffff,map:woodTexture,roughness:.68,metalness:.05})),
  woodLight:trackMaterial(new T.MeshStandardMaterial({color:palette.woodLight,roughness:.56,metalness:.08})),
  ivory:trackMaterial(new T.MeshStandardMaterial({color:palette.ivory,roughness:.5})),
  edge:trackMaterial(new T.MeshStandardMaterial({color:palette.edge,roughness:.62})),
  gold:trackMaterial(new T.MeshStandardMaterial({color:palette.gold,roughness:.5,metalness:.08})),
  goldDark:trackMaterial(new T.MeshStandardMaterial({color:palette.goldDark,roughness:.66}))
 };
 let active=false,loading=false,reason='loading',disposed=false,lost=false,signature='',revision=0,frames=0,hiddenCount=0,pendingBuild=0,lastView=null,resizeObserver,lastWidth=0,lastHeight=0,lastPixelRatio=0,builtLayout='';
 let settleReady,readySettled=false;const ready=new Promise(resolve=>{settleReady=resolve;});

 function trackGeometry(value){geometries.add(value);return value;}
 function trackMaterial(value){materials.add(value);return value;}
 function dimensions(){return{width:Math.max(1,host.clientWidth||stage.clientWidth),height:Math.max(1,host.clientHeight||stage.clientHeight)};}
 function surfaceTexture(kind){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const context=canvas.getContext('2d'),wood=kind==='wood';
  context.fillStyle=wood?palette.wood:palette.feltDark;context.fillRect(0,0,256,256);
  const wash=context.createLinearGradient(0,0,256,256);
  wash.addColorStop(0,wood?palette.woodLight:palette.felt);wash.addColorStop(.52,wood?palette.wood:palette.felt);wash.addColorStop(1,wood?palette.wood:palette.feltDark);
  context.globalAlpha=wood ? .42 : .72;context.fillStyle=wash;context.fillRect(0,0,256,256);
  if(wood){
   context.globalAlpha=.2;context.strokeStyle=palette.woodLight;context.lineWidth=1;
   for(let y=7;y<256;y+=9){context.beginPath();for(let x=0;x<=256;x+=8){const wave=y+Math.sin((x+y)*.055)*2+Math.sin(x*.16+y)*.8;x?context.lineTo(x,wave):context.moveTo(x,wave);}context.stroke();}
   context.globalAlpha=.18;
   for(let i=0;i<5;i++){context.beginPath();context.ellipse(34+i*47,45+(i%3)*67,12+i%2*5,4+i%2*2,i*.21,0,Math.PI*2);context.stroke();}
  }else{
   context.lineWidth=.6;
   for(let n=2;n<256;n+=4){context.globalAlpha=n%8?.08:.13;context.strokeStyle=n%8?palette.felt:palette.ivory;context.beginPath();context.moveTo(n,0);context.lineTo(n,256);context.stroke();context.beginPath();context.moveTo(0,n);context.lineTo(256,n);context.stroke();}
   context.globalAlpha=.22;context.strokeStyle=palette.woodLight;context.lineWidth=1.5;context.strokeRect(19,19,218,218);context.beginPath();context.arc(128,128,48,0,Math.PI*2);context.stroke();
   context.globalAlpha=.18;context.fillStyle=palette.ivory;context.font='600 22px Georgia, serif';context.textAlign='center';context.fillText('月 影',128,136);
  }
  context.globalAlpha=1;
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  if(wood){texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(4,2);}
  surfaceTextures.add(texture);return texture;
 }
 function box(w,h,d,material,x,y,z){
  const mesh=new T.Mesh(trackGeometry(new T.BoxGeometry(w,h,d)),material);mesh.position.set(x,y,z);scene.add(mesh);return mesh;
 }

 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
 renderer.outputColorSpace=T.SRGBColorSpace;
 renderer.shadowMap.enabled=true;
 renderer.shadowMap.type=T.PCFSoftShadowMap;
 renderer.domElement.setAttribute('aria-hidden','true');
 renderer.domElement.tabIndex=-1;
 renderer.domElement.style.cssText='display:block;width:100%;height:100%;pointer-events:none';
 host.replaceChildren(renderer.domElement);
 scene.add(dynamic,new T.HemisphereLight(0xfff3d0,0x09271e,2.2));
 const moon=new T.DirectionalLight(0xffe1a3,3.2);moon.position.set(-7,13,8);moon.castShadow=true;scene.add(moon);
 const fill=new T.DirectionalLight(0x65c9ab,1.1);fill.position.set(8,5,-6);scene.add(fill);

 box(19.4,.72,12.4,mat.wood,0,-.42,0).receiveShadow=true;
 box(18.55,.28,11.55,mat.woodLight,0,-.15,0).receiveShadow=true;
 box(17.8,.34,10.8,mat.felt,0,.08,0).receiveShadow=true;
 box(16.8,.025,9.8,mat.feltDark,0,.27,0).receiveShadow=true;

 renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;fallback('context-lost');});
 renderer.domElement.addEventListener('webglcontextrestored',()=>{if(disposed)return;lost=false;signature='';sync(true);});
 resizeObserver=new ResizeObserver(()=>resize());resizeObserver.observe(host);

 function fallback(nextReason){
  if(disposed)return;
  active=false;loading=false;reason=nextReason;stage.dataset.active3D='css';renderer.domElement.style.visibility='hidden';controls.replaceChildren();onStatus?.(false,nextReason);
  if(!readySettled){readySettled=true;settleReady(false);}
 }

 function textureFor(id,aka,theme){
  const type=Math.floor(id/4),red=aka&&RED_IDS.has(id)&&id%4===0;
  const faceKey=red?'red-'+id:String(type).padStart(2,'0'),key=textureKey(id,aka,theme);
  if(textureCache.has(key))return textureCache.get(key);
  const promise=new Promise((resolve,reject)=>{
   let source=window.RiichiTileFaces?.[faceKey]||'assets/tiles/'+faceKey+'.svg';
   const faceTop=css(stage,'--face-top',palette.ivory),faceBottom=css(stage,'--face-bottom',palette.ivory);
   if(source.startsWith('data:image/svg+xml;base64,')){
    const svg=new TextDecoder().decode(Uint8Array.from(atob(source.split(',')[1]),character=>character.charCodeAt(0))).replace(/var\((--tile-[\w-]+)\)/g,(_,name)=>css(stage,name,palette.ivory));
    source='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
   }
   new T.TextureLoader().load(source,sourceTexture=>{
    if(disposed){sourceTexture.dispose();resolve(sourceTexture);return;}
    const canvas=document.createElement('canvas');canvas.width=176;canvas.height=248;
    const context=canvas.getContext('2d'),wash=context.createLinearGradient(0,0,canvas.width,canvas.height);
    wash.addColorStop(0,faceTop);wash.addColorStop(1,faceBottom);
    context.fillStyle=wash;context.fillRect(0,0,canvas.width,canvas.height);
    context.drawImage(sourceTexture.image,0,0,canvas.width,canvas.height);sourceTexture.dispose();
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    textureCache.set(key,Promise.resolve(texture));resolve(texture);
   },undefined,()=>reject(new Error('tile texture '+key)));
  }).catch(error=>{textureCache.delete(key);throw error;});
  textureCache.set(key,promise);return promise;
 }

 function faceMaterial(texture,variant='normal'){
  const cache=texture.userData.riichiFaceMaterials||(texture.userData.riichiFaceMaterials={});
  let value=cache[variant];
  if(!value){
   value=trackMaterial(new T.MeshStandardMaterial({color:0xffffff,map:texture,roughness:.48,transparent:true}));
   if(variant!=='normal'){value.emissive.set(variant==='latest'?0xd7a12a:0x744315);value.emissiveIntensity=variant==='latest' ? .32 : .14;}
   cache[variant]=value;
  }
  return value;
 }

 function clearDynamic(){
  publicMeshes.length=0;hiddenCount=0;
  while(dynamic.children.length)dynamic.remove(dynamic.children[0]);
  controls.replaceChildren();
 }

 function tileMesh(id,seat,kind,x,z,rotation=0,flags={}){
  const texture=textureCache.get(flags.textureKey);
  if(!texture||typeof texture.then==='function')throw new Error('texture not ready');
  const group=new T.Group(),body=new T.Mesh(tileGeometry,mat.edge),face=new T.Mesh(faceGeometry,faceMaterial(texture,flags.latest?'latest':flags.called?'called':'normal'));
  face.rotation.x=-Math.PI/2;face.position.y=TILE.h/2+.006;body.castShadow=true;body.receiveShadow=true;group.add(body,face);
  group.position.set(x,flags.latest ? .52 : flags.called ? .47 : .43,z);group.rotation.y=rotation+(flags.riichi?Math.PI/2:0);
  group.scale.setScalar((flags.scale||1)*(flags.latest?1.08:1));
  if(flags.riichi)group.scale.x*=compactLayout(stage.clientWidth,stage.clientHeight)&&stage.clientHeight<260?1.35:1.2;
  group.userData={id,seat,kind,riichi:!!flags.riichi,called:!!flags.called,name:flags.name||''};
  dynamic.add(group);publicMeshes.push(group);return group;
 }

 function hiddenTile(x,z,rotation,upright=false,scale=1){
  const mesh=new T.Mesh(tileGeometry,mat.gold);
  mesh.position.set(x,upright ? .72 : .43,z);mesh.rotation.order='YXZ';mesh.rotation.y=rotation;mesh.rotation.x=upright?-Math.PI/2:0;mesh.scale.setScalar(scale);mesh.castShadow=true;dynamic.add(mesh);hiddenCount++;return mesh;
 }

 function valueName(value,view){
  if(value&&typeof value==='object'&&(value.tileName||value.name))return value.tileName||value.name;
  const id=tileId(value);return tileName?.(id)||id+'번 패';
 }

 function textureKey(id,aka=true,theme='ivory'){return theme+'|'+(aka&&RED_IDS.has(id)&&id%4===0?'red-'+id:String(Math.floor(id/4)).padStart(2,'0'));}

 function rowOffset(river,index,columns,scale){
  const start=Math.floor(index/columns)*columns,row=river.slice(start,start+columns);
  const extra=row.map(entry=>((entry.riichi?TILE.d:TILE.w)*(entry.latest?1.08:1)-TILE.w)*scale);
  return extra.slice(0,index-start).reduce((sum,width)=>sum+width,0)+extra[index-start]/2-extra.reduce((sum,width)=>sum+width,0)/2;
 }

 function publicEntries(view){
  const entries=[];
  view.players.forEach((player,seat)=>{
   (player.river||[]).forEach(tile=>entries.push({id:tileId(tile),name:valueName(tile,view)}));
   (player.melds||[]).forEach(meld=>(meld.tiles||[]).forEach((tile,index)=>{
    if(meld.open!==false||(index!==0&&index!==(meld.tiles.length-1)))entries.push({id:tileId(tile),name:valueName(tile,view)});
   }));
  });
  return entries;
 }

 function buildRivers(view,compact,height){
  const scale=compact?compactScale(height):1;
  view.players.forEach((player,seat)=>{
   const river=player.river||[];
   river.forEach((entry,index)=>{
    let x,z,rotation=0;
    if(compact){
     const centers=[-5.3,-2,1.8,5.6],col=index%5,row=Math.floor(index/5),band=seat%2?-2.8:2.8;
     x=centers[seat]+(col-2)*(TILE.w*scale+TILE.gap)+rowOffset(river,index,5,scale);z=band+(row-1.5)*(TILE.d*scale+TILE.gap);
    }else if(seat===0||seat===2){
     const col=index%6,row=Math.floor(index/6);x=(col-2.5)*(TILE.w+TILE.gap)+rowOffset(river,index,6,1);z=(seat===0?2.55:-2.55)+(seat===0?1:-1)*row*(TILE.d+TILE.gap);rotation=seat===2?Math.PI:0;
    }else{
     const col=index%6,row=Math.floor(index/6);z=(col-2.5)*(TILE.w+TILE.gap)+rowOffset(river,index,6,1);x=(seat===1?3.3:-3.3)+(seat===1?1:-1)*row*(TILE.d+TILE.gap);rotation=seat===1?-Math.PI/2:Math.PI/2;
    }
    tileMesh(tileId(entry),seat,'river',x,z,rotation,{textureKey:textureKey(tileId(entry),view.aka,view.theme),riichi:entry.riichi,called:entry.called,latest:entry.latest,name:valueName(entry,view),scale});
   });
  });
 }

 function buildMelds(view,compact,height){
  const scale=compact?compactScale(height):1;
  view.players.forEach((player,seat)=>{
   let offset=0;
   (player.melds||[]).forEach((meld,meldIndex)=>{
    (meld.tiles||[]).forEach((entry,index)=>{
     const id=tileId(entry),step=TILE.w*scale+TILE.gap;let x,z,rotation=0;
     if(seat===0||seat===2){x=5.4-(offset+index)*step;z=seat===0?4.62:-4.62;rotation=seat===2?Math.PI:0;}
     else{x=seat===1?7.85:-7.85;z=4.1-(offset+index)*step;rotation=seat===1?-Math.PI/2:Math.PI/2;}
     if(meld.open===false&&(index===0||index===meld.tiles.length-1))hiddenTile(x,z,rotation,false,scale);
     else tileMesh(id,seat,'meld',x,z,rotation,{textureKey:textureKey(id,view.aka,view.theme),called:id===meld.called,name:valueName(entry,view),scale});
    });
    offset+=(meld.tiles||[]).length+.45;
   });
  });
 }

 function buildHidden(view){
  [1,2,3].forEach(seat=>{
   const count=Math.max(0,Number(view.players[seat]?.handCount)||0),step=TILE.w+TILE.gap;
   for(let index=0;index<count;index++){
    if(seat===2)hiddenTile((index-(count-1)/2)*step,-4.72,Math.PI,true);
    else hiddenTile(seat===1?8.05:-8.05,(index-(count-1)/2)*step,seat===1?-Math.PI/2:Math.PI/2,true);
   }
  });
 }

 function rebuild(view){
  clearDynamic();
  const {width,height}=dimensions(),compact=compactLayout(width,height);
  stage.dataset.tableLayout=compact?'compact':'classic';
  builtLayout=layoutKey(width,height);
  mat.edge.color.set(css(stage,'--tile-edge',palette.edge));
  buildRivers(view,compact,height);buildMelds(view,compact,height);buildHidden(view);
  revision++;active=true;reason='ready';stage.dataset.active3D='three';renderer.domElement.style.visibility='visible';onStatus?.(true,'ready');resize(true);
  if(!readySettled){readySettled=true;settleReady(true);}
 }

 function sync(force=false){
  if(disposed||lost)return;
  let view;
  try{view=getView();}catch(error){console.warn('Three.js table view failed:',error);fallback('invalid-view');return;}
  if(!view||!Array.isArray(view.players)||view.players.length!==4){fallback('invalid-view');return;}
  const next=JSON.stringify({aka:view.aka,theme:view.theme,players:view.players.map(player=>({river:player.river,melds:player.melds,handCount:player.handCount,riichi:player.riichi,wind:player.wind})),indicators:view.indicators||[],sticks:view.sticks,roundWind:view.roundWind,roundIndex:view.roundIndex,honba:view.honba,remaining:view.remaining,current:view.current,handNumber:view.handNumber});
  if(active&&!loading)reason=stage.querySelector('#pauseCover:not([hidden])')?'paused':'ready';
  if(!force&&next===signature)return;
  signature=next;lastView=view;const token=++pendingBuild;
  const entries=publicEntries(view),needed=[...new Set(entries.map(entry=>entry.id))];
  loading=true;reason='loading';
  if(!revision){active=false;onStatus?.(false,'loading');}
  Promise.all(needed.map(id=>textureFor(id,view.aka,view.theme))).then(textures=>{
   if(disposed||lost||token!==pendingBuild)return;
   textures.forEach((texture,index)=>textureCache.set(textureKey(needed[index],view.aka,view.theme),texture));
   loading=false;
   rebuild(view);
  }).catch(error=>{if(token!==pendingBuild||disposed)return;console.warn('Three.js tile texture failed:',error);fallback('texture-failed');});
 }

 function setCamera(width,height){
  const aspect=width/Math.max(height,1),compact=compactLayout(width,height);
  camera.aspect=aspect;camera.fov=compact?(height<260?22:24):aspect<1.15?52:36;
  camera.position.set(0,compact?18:15,compact?18:16);camera.lookAt(0,0,compact?0:.25);camera.updateProjectionMatrix();
 }

 function resize(force=false){
  if(disposed)return;
  const {width,height}=dimensions();
  const pixelRatio=Math.min(devicePixelRatio||1,1.5);
  if(!force&&width===lastWidth&&height===lastHeight&&pixelRatio===lastPixelRatio)return;
  lastWidth=width;lastHeight=height;lastPixelRatio=pixelRatio;renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width,height,false);setCamera(width,height);
  if(active&&lastView&&builtLayout!==layoutKey(width,height)){rebuild(lastView);return;}
  render();
 }

 function render(){
  if(disposed||!active)return;
  reason=stage.querySelector('#pauseCover:not([hidden])')?'paused':'ready';
  renderer.render(scene,camera);frames++;updateControls();
 }

 function projectedBounds(mesh){
  const points=[[-1,-1],[-1,1],[1,-1],[1,1]].map(([x,z])=>new T.Vector3(x*FACE.w/2,TILE.h/2+.006,z*FACE.d/2));
  mesh.updateWorldMatrix(true,false);points.forEach(point=>mesh.localToWorld(point).project(camera));
  const canvas=renderer.domElement.getBoundingClientRect(),root=stage.getBoundingClientRect();
  const xs=points.map(point=>canvas.left-root.left+(point.x+1)*canvas.width/2),ys=points.map(point=>canvas.top-root.top+(1-point.y)*canvas.height/2);
  const left=Math.min(...xs),top=Math.min(...ys),right=Math.max(...xs),bottom=Math.max(...ys);
  return{x:left,y:top,width:right-left,height:bottom-top};
 }

 function updateControls(){
  const fragment=document.createDocumentFragment();
  publicMeshes.forEach(mesh=>{
   const bounds=projectedBounds(mesh),button=document.createElement('button'),data=mesh.userData;
   button.type='button';button.className='public-tile-hit';button.tabIndex=0;button.dataset.publicTile=String(data.id);button.dataset.faceType=String(Math.floor(data.id/4));
   button.setAttribute('aria-label',data.name+(data.riichi?' 리치 선언패':'')+(data.called?' 가져간 패':''));
   const hitWidth=Math.max(12,bounds.width),hitHeight=Math.max(12,bounds.height);
   button.style.cssText=`position:absolute;left:${bounds.x-(hitWidth-bounds.width)/2}px;top:${bounds.y-(hitHeight-bounds.height)/2}px;width:${hitWidth}px;height:${hitHeight}px;min-width:12px;min-height:12px;padding:0;border:0;background:transparent;color:transparent;`;
   fragment.appendChild(button);
  });
  controls.replaceChildren(fragment);
 }

 function diagnostics(){
  const size=new T.Vector2();renderer.getSize(size);
  return{active,loading,reason,theme:lastView?.theme,aka:lastView?.aka,renderer:'WebGL2',revision,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,textures:renderer.info.memory.textures,pixelRatio:renderer.getPixelRatio(),width:size.x,height:size.y,frames,publicTiles:publicMeshes.map(mesh=>({id:mesh.userData.id,seat:mesh.userData.seat,kind:mesh.userData.kind,...projectedBounds(mesh),riichi:mesh.userData.riichi,called:mesh.userData.called})),hiddenCount,faceTextureCount:[...textureCache.values()].filter(value=>typeof value?.then!=='function').length};
 }

 function dispose(){
  if(disposed)return;disposed=true;pendingBuild++;resizeObserver.disconnect();controls.replaceChildren();
  textureCache.forEach(value=>{if(typeof value?.then!=='function')value.dispose();});surfaceTextures.forEach(value=>value.dispose());geometries.forEach(value=>value.dispose());materials.forEach(value=>value.dispose());
  renderer.dispose();renderer.domElement.remove();publicMeshes.length=0;active=false;reason='disposed';
 }

 resize();
 return{ready,sync,resize,dispose,get active(){return active;},diagnostics,loseContext(){if(!disposed)renderer.forceContextLoss();},restoreContext(){if(!disposed)renderer.forceContextRestore();}};
}

window.RiichiTable3D={create};
})();

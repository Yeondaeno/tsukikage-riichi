(function(root){
'use strict';
function create({canUse,select,discard,getVersion}){
 let drag=null,suppressUntil=0,busy=false;
 const hand=document.getElementById('handRow'),zone=document.getElementById('discardZone');
 hand.addEventListener('dragstart',e=>e.preventDefault());
 function cancel(){if(drag?.moved)suppressUntil=performance.now()+450;if(drag?.ghost)drag.ghost.remove();drag=null;zone.classList.remove('drop-ready','drop-valid');}
 function commit(id){if(busy||!canUse(id))return false;busy=true;try{return discard(id);}finally{busy=false;}}
 hand.addEventListener('pointerdown',e=>{
  const el=e.target.closest('button[data-tile]');if(!el||el.disabled||e.button!==0)return;
  const id=Number(el.dataset.tile);if(!canUse(id))return;
  drag={id,pointer:e.pointerId,x:e.clientX,y:e.clientY,version:getVersion(),el,moved:false};
  el.setPointerCapture?.(e.pointerId);
 });
 document.addEventListener('pointermove',e=>{
  if(!drag||drag.pointer!==e.pointerId)return;
  if(!canUse(drag.id)||drag.version!==getVersion()){cancel();return;}
  if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<9)return;
  if(!drag.moved){drag.moved=true;drag.ghost=drag.el.cloneNode(true);drag.ghost.removeAttribute('data-tile');drag.ghost.className='tile drag-ghost';drag.ghost.setAttribute('aria-hidden','true');document.body.appendChild(drag.ghost);zone.classList.add('drop-ready');}
  drag.ghost.style.left=e.clientX+'px';drag.ghost.style.top=e.clientY+'px';
  const b=zone.getBoundingClientRect();zone.classList.toggle('drop-valid',e.clientX>=b.left&&e.clientX<=b.right&&e.clientY>=b.top&&e.clientY<=b.bottom);e.preventDefault();
 });
 document.addEventListener('pointerup',e=>{
  if(!drag||drag.pointer!==e.pointerId)return;
  const d=drag,b=zone.getBoundingClientRect(),valid=d.moved&&d.version===getVersion()&&canUse(d.id)&&e.clientX>=b.left&&e.clientX<=b.right&&e.clientY>=b.top&&e.clientY<=b.bottom;
  if(d.moved){suppressUntil=performance.now()+450;e.preventDefault();}cancel();
  if(valid)commit(d.id);
 });
 document.addEventListener('pointercancel',()=>{suppressUntil=performance.now()+450;cancel();});
 hand.addEventListener('lostpointercapture',()=>{if(drag?.moved)cancel();});
 hand.addEventListener('click',e=>{if(performance.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();}},true);
 for(const name of ['resize','orientationchange','blur'])root.addEventListener(name,cancel);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});
 return{cancel,commit,get dragging(){return !!drag?.moved;}};
}
root.RiichiInput={create};
})(window);

(function(root){
'use strict';
const R=root.Riichi||(typeof require==='function'?require('../src/engine.js'):null);
function types(text){const out=[];for(const m of text.matchAll(/([0-9]+)([mpsz])/g))for(const d of m[1])out.push({m:0,p:9,s:18,z:27}[m[2]]+Number(d)-1);return out;}
function ids(text,used=new Set()){return types(text).map(t=>{for(const copy of [0,1,2,3]){const id=t*4+copy;if(!used.has(id)){used.add(id);return id;}}throw new Error('Fifth physical tile');});}
function rig(hands,options={}){
 const g=new R.Engine({mode:'single',seed:12345,...options});g.start();const used=new Set();
 for(let i=0;i<4;i++)Object.assign(g.players[i],{hand:hands[i]?ids(hands[i],used):[],melds:[],river:[],drawn:null,drawCount:2,riichi:false,doubleRiichi:false,ippatsu:false,tempFuriten:false,riichiFuriten:false,rinshan:false,forbid:[]});
 const rest=Array.from({length:136},(_,i)=>i).filter(i=>!used.has(i));
 for(let i=0;i<4;i++)if(!hands[i])while(g.players[i].hand.length<13)g.players[i].hand.push(rest.shift());
 g.dead=rest.splice(-14);g.wall=rest;g.callCount=0;g.current=0;g.phase='turn';g.pending=null;g.points=[25000,25000,25000,25000];g.sticks=0;g.kanCount=0;g.kanOwners=[];g.result=null;
 if(g.players[0].hand.length===14)g.players[0].drawn=g.players[0].hand.at(-1);
 g.assertIntegrity();return g;
}
function install(g,fixture){for(const k of Object.keys(fixture))if(!['onChange','rng'].includes(k))g[k]=fixture[k];g.version++;g.assertIntegrity();if(root.Tsukikage)root.Tsukikage.render();return g;}
const api={types,ids,rig,install};if(typeof module!=='undefined')module.exports=api;root.Fixtures=api;
})(typeof window!=='undefined'?window:globalThis);

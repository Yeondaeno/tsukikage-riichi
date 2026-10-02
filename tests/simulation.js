'use strict';
const assert=require('node:assert/strict');
const R=require('../src/engine.js');
let seed=107010;const rng=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
const stats={hands:0,wins:0,draws:0,aborts:0,riichi:0,chi:0,pon:0,kan:0,calls:0,ron:0,tsumo:0,multipleRon:0,steps:0};
const start=Date.now();
for(let trial=0;trial<100;trial++){
 const g=new R.Engine({mode:trial%2?'east':'single',difficulty:trial%3===0?'easy':'normal',rng},event=>{if(event==='call')stats.calls++;});g.start();
 let steps=0;
 while(g.phase!=='result'&&steps++<500){
  g.assertIntegrity();
  if(g.phase==='turn')g.cpuTurn();
  else if(['response','kanResponse'].includes(g.phase)){
   const q=g.pending;g.resolve(q.from===0?null:g.cpuCall(0,q.choices[0],q.from,q.id));
  }else throw new Error('Unexpected phase '+g.phase);
 }
 assert(steps<500,'No infinite hand');g.assertIntegrity();stats.steps+=steps;stats.hands++;
 const r=g.result;
 if(r.kind==='win'){stats.wins++;for(const w of r.winners)stats[w.method]++;if(r.winners.length>1)stats.multipleRon++;}
 else if(r.kind==='draw')stats.draws++;else stats.aborts++;
 stats.riichi+=g.players.filter(p=>p.riichi).length;
 for(const p of g.players)for(const m of p.melds)if(m.kind==='chi')stats.chi++;else if(m.kind==='pon')stats.pon++;else if(m.kind==='kan')stats.kan++;
 g.nextHand();g.assertIntegrity();
 if((trial+1)%20===0)console.log('Completed',trial+1,'hands',Date.now()-start,'ms');
}
console.log(JSON.stringify({...stats,elapsedMs:Date.now()-start},null,2));

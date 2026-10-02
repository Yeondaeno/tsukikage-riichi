'use strict';
const R=require('../src/engine.js'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const runs=[];
for(const mode of ['east','half'])for(const seed of [21,72,133]){
 const started=performance.now(),g=new R.Engine({mode,seed,difficulty:'normal'});g.start();let steps=0,hands=0;
 while(g.phase!=='finished'&&steps++<15000){
  g.assertIntegrity();
  if(g.phase==='turn')g.cpuTurn();
  else if(['response','kanResponse'].includes(g.phase)){const q=g.pending;g.resolve(q.from===0?null:g.cpuCall(0,q.choices[0],q.from,q.id));}
  else if(g.phase==='result'){hands++;g.nextHand();}
  else throw new Error('Unexpected phase '+g.phase);
 }
 assert.equal(g.phase,'finished');g.assertIntegrity();assert.equal(g.points.reduce((a,b)=>a+b,0),100000);
 runs.push({mode,seed,hands,steps,points:g.points,ms:+(performance.now()-started).toFixed(2)});console.log('PASS complete match',mode,seed,hands,'hands');
}
fs.writeFileSync(path.join(__dirname,'results','full-matches.json'),JSON.stringify({runAt:new Date().toISOString(),runs},null,2));


'use strict';
const assert=require('node:assert/strict'),R=require('../src/engine.js'),P=require('../src/policy.js'),F=require('./fixtures.js'),fs=require('node:fs'),path=require('node:path');
const results=[],test=(name,fn)=>{const at=performance.now();fn();results.push({name,passed:true,ms:+(performance.now()-at).toFixed(2)});console.log('PASS',name);};
test('Seed and restored random stream reproduce the same wall',()=>{
 const a=new R.Engine({seed:8192}),b=new R.Engine({seed:8192});a.start();b.start();assert.deepEqual(a.wall,b.wall);assert.deepEqual(a.dead,b.dead);
 const state=a.rngState,c=new R.Engine({seed:1});c.rngState=state;assert.equal(a.rng(),c.rng());
});
test('Accepted riichi emits once after the pending declaration and before next draw',()=>{
 const g=F.rig(['123456m55789p234s']),events=[];g.onChange=(e,d)=>events.push({e,d,points:g.points.slice()});
 const id=g.riichiOptions(0)[0];assert(g.discard(0,id,true));assert.equal(g.points[0],25000);g.pending.cpu={};g.resolve();
 assert.deepEqual(events.map(x=>x.e),['discard','riichiAccepted','draw']);assert.equal(g.sticks,1);assert.equal(events[1].points[0],24000);g.acceptRiichi();assert.equal(g.sticks,1);g.assertIntegrity();
});
test('Ron on declaration never accepts or charges a riichi stick',()=>{
 const g=F.rig(['123456m55789p23s','123p789m666s55z23m4s']),events=[];g.onChange=e=>events.push(e);g.current=1;const id=g.players[1].hand.find(x=>R.type(x)===21);g.players[1].drawn=id;assert(g.discard(1,id,true));g.pending.cpu={};assert(g.resolve({kind:'ron'}));assert(!events.includes('riichiAccepted'));assert.equal(g.sticks,0);g.assertIntegrity();
});
test('Repeated win, draw, resolve and next-hand messages do not settle twice',()=>{
 const g=F.rig(['123456m55789p123s']);const id=g.players[0].hand.find(x=>R.type(x)===18);g.players[0].drawn=id;assert(g.tsumo(0));const points=g.points.slice(),result=g.result;
 assert.equal(g.finishWin([0],'tsumo',null,id),false);assert.equal(g.exhaustive(),false);assert.equal(g.resolve(),false);assert.deepEqual(g.points,points);assert.equal(g.result,result);g.nextHand();g.nextHand();assert.equal(g.phase,'finished');g.assertIntegrity();
});
test('Red and ordinary fives keep distinct physical identities',()=>{
 const g=F.rig(['555m123p456s789m11z']);assert(g.players[0].hand.includes(16));assert(g.players[0].hand.includes(17));assert(g.discard(0,17));assert(g.players[0].hand.includes(16));assert(!g.players[0].hand.includes(17));g.assertIntegrity();
});
test('CPU personality differs for a shared efficiency-value-risk position',()=>{
 const c=[{id:0,shanten:2,value:-194,risk:1.3,bonus:0},{id:4,shanten:3,value:-296,risk:0,bonus:0},{id:8,shanten:2,value:-199,risk:.9,bonus:1.2}];
 const decisions=P.profiles.slice(1).map(p=>P.choose(c,p,true,'normal',()=>.1));assert.notEqual(decisions[0].id,decisions[1].id);assert(decisions[1].risk<=decisions[0].risk);assert.equal(decisions.length,3);
});
test('CPU choices use public information across several seeds',()=>{
 for(const seed of [12,39,84,211,8192])for(const seat of [1,2,3]){
  const g=new R.Engine({seed});g.start();g.current=seat;const p=g.players[seat];g.draw(seat);const state=g.rngState,chosen=g.cpuDiscard(seat),other=(seat+1)%4,a=g.players[other].hand[0],b=g.wall[0];g.players[other].hand[0]=b;g.wall[0]=a;g.rngState=state;assert.equal(g.cpuDiscard(seat),chosen);g.assertIntegrity();
 }
});
const comparisons=[];
for(const seed of [101,202,303,404,505])for(const difficulty of ['normal','easy'])for(const i of [1,2,3]){
 const g=F.rig(['31m4899p259s11245z'],{seed,difficulty});
 [g.players[0].hand,g.players[i].hand]=[g.players[i].hand,g.players[0].hand];
 [g.players[0].drawn,g.players[i].drawn]=[g.players[i].drawn,g.players[0].drawn];
 g.current=i;const threat=(i+1)%4;g.players[threat].riichi=true;
 const safe=g.wall.splice(g.wall.findIndex(id=>R.type(id)===27),1)[0];g.players[threat].river.push({id:safe,riichi:true,called:false,tsumogiri:false});g.assertIntegrity();
 const ownTypes=g.players[i].hand.map(R.type),at=performance.now(),id=g.cpuDiscard(i),last=g.decisions.at(-1);
 comparisons.push({seed,character:P.profiles[i].id,difficulty,ownTypes,id,ms:+(performance.now()-at).toFixed(3),...last});
}
assert(comparisons.every(x=>JSON.stringify(x.ownTypes)===JSON.stringify(comparisons[0].ownTypes)));
assert(new Set(comparisons.filter(x=>x.seed===101&&x.difficulty==='normal').map(x=>x.id)).size>1);
const output=path.join(__dirname,'results');fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'v3-engine.json'),JSON.stringify({runAt:new Date().toISOString(),results,comparisons},null,2));console.log(results.length+' v3 engine checks passed; '+comparisons.length+' timed CPU decisions recorded.');

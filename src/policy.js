(function(root){
'use strict';
const profiles=[
 {id:'hina',label:'함께 배우는 균형형',efficiency:1,value:1,risk:1,call:.55,riichi:.9},
 {id:'akane',label:'공격형',efficiency:1.05,value:1.5,risk:.42,call:.95,riichi:1},
 {id:'shizuku',label:'수비형',efficiency:.95,value:.8,risk:2.1,call:.25,riichi:.6},
 {id:'koharu',label:'균형형',efficiency:1,value:1.1,risk:1,call:.6,riichi:.85}
];
function choose(candidates,profile,threat,difficulty,random){
 const min=Math.min(...candidates.map(x=>x.shanten)),weight=threat?(min>=2?115:min===1?32:9):0;
 const ranked=candidates.map(o=>({...o,policyValue:o.value*profile.efficiency-(o.bonus||0)*(profile.value-1)-o.risk*weight*profile.risk})).sort((a,b)=>b.policyValue-a.policyValue||a.id-b.id);
 return difficulty==='easy'?ranked[Math.floor(random()*Math.min(3,ranked.length))]:ranked[0];
}
const api={profiles,choose};if(typeof module!=='undefined')module.exports=api;root.RiichiPolicy=api;
})(typeof window!=='undefined'?window:globalThis);

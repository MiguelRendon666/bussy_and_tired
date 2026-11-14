/* Bot con límite humano de pulsaciones: MINTAP ticks entre inicios de pulsación (24 = 100 ms) */
const C=require('./core.js'),L=require('./levels.js');const {CFG,Simulation,LevelManager}=C;
const name=process.argv[2],DECIDE=+process.argv[3]||8,MINTAP=+process.argv[4]||24,BEAM=+process.argv[5]||800,FROM=+process.argv[6]||0;
const level=LevelManager.build(LevelManager.validate(L.OfficialLevels[name]()).data);
const sim=new Simulation(level);
if(FROM){sim.player.x=FROM*30;sim.player.px=sim.player.x;}
let states=[{s:sim.save(),prevHeld:true,lp:999}],best=0;
while(states.length){const next=new Map();
 for(const st of states)for(const held of [false,true]){
  const press=held&&!st.prevHeld; if(press&&st.lp<MINTAP)continue;
  sim.load(st.s);let ok=true;
  for(let i=0;i<DECIDE;i++){sim.step(held);if(!sim.player.alive){ok=false;break;}if(sim.finished)break;}
  if(!ok)continue;best=Math.max(best,sim.player.x);
  const sv=sim.save();if(sim.finished){console.log('COMPLETABLE (tap>=',MINTAP*1000/240,'ms)');process.exit(0);}
  const lp=press?DECIDE:Math.min(999,st.lp+DECIDE);
  const key=[sv.m,Math.round(sv.y/4),Math.round(sv.vy/25),sv.g,sv.d,Math.min(lp,MINTAP+8),held].join('|');
  if(!next.has(key))next.set(key,{s:sv,prevHeld:held,lp});}
 states=[...next.values()];if(states.length>BEAM){const t=states.length/BEAM;states=Array.from({length:BEAM},(_,i)=>states[Math.floor(i*t)]);}}
console.log('FALLA cerca de x='+(best/30).toFixed(1)+' (tap>= '+MINTAP*1000/240+' ms)');

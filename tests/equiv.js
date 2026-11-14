// Equivalencia física v1 vs v2 en Stereo Madness con entradas pseudoaleatorias y con el plan del bot
const A=require('C:/Users/Pablninn18/geometry-dash-v1-backup/src/core.js'), B=require('./core.js');
function mk(M){const lv=M.LevelManager.build(M.LevelManager.validate(M.Levels.stereoMadness()).data);return new M.Simulation(lv);}
let seed=12345;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
let diffs=0,steps=0,deaths=0;
for(let run=0;run<300;run++){
  const a=mk(A),b=mk(B);
  // empezar en puntos distintos del nivel para cubrir cubo y nave
  const start=[0,330*30,372*30,420*30,520*30,700*30,800*30][run%7];
  for(const s of [a,b]){s.player.x=start;s.player.px=start;if(start>=372*30&&start<640*30){s.player.mode='ship';s.bounds={floor:0,ceil:270};s.player.y=135;}}
  let held=false,hold=0;
  for(let i=0;i<20000&&a.player.alive&&!a.finished;i++){
    if(hold--<=0){held=rnd()<0.5;hold=Math.floor(rnd()*40)+2;}
    a.step(held);b.step(held);steps++;
    const pa=a.player,pb=b.player;
    if(pa.x!==pb.x||pa.y!==pb.y||pa.vy!==pb.vy||pa.rot!==pb.rot||pa.alive!==pb.alive||pa.mode!==pb.mode||pa.speedMul!==pb.speedMul){diffs++;break;}
  }
  if(!a.player.alive)deaths++;
}
console.log('pasos comparados',steps,'divergencias',diffs,'muertes',deaths);

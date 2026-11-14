const C=require('./core.js'),L=require('./levels.js');const {Simulation,LevelManager,CFG,Levels}=C;
const plans=JSON.parse(require('fs').readFileSync('plans.json','utf8'));
const raws={'stereo-madness':Levels.stereoMadness(),'orbital-hop':L.OfficialLevels.ufo(),'neon-slope':L.OfficialLevels.wave(),'flip-circuit':L.OfficialLevels.ball(),'abyss-protocol':L.OfficialLevels.demon(),'changes-after-all':L.OfficialLevels.changes(),'witzy-witzy-spider':L.OfficialLevels.spider()};
let bad=0;
for(const id of Object.keys(raws)){
  const data=LevelManager.validate(raws[id]).data,plan=plans[id],res=[];
  for(const fps of [30,60,75,120,144,240]){
    const s=new Simulation(LevelManager.build(data));let acc=0,frames=0;
    while(s.player.alive&&!s.finished&&frames<400000){
      acc+=1/fps;frames++;
      while(acc>=CFG.TICK&&s.player.alive&&!s.finished){acc-=CFG.TICK;
        const held=!!plan[Math.min(plan.length-1,Math.floor(Math.round(s.time/CFG.TICK)/8))];s.step(held);}
    }
    res.push((s.finished?'FIN':'x'+(s.player.x/30).toFixed(1))+'@'+s.time.toFixed(3));
  }
  const ok=res.every(r=>r===res[0]);if(!ok)bad++;console.log(ok?'OK  ':'FALLA',id,res[0],ok?'':res.join(' '));
}
process.exit(bad?1:0);

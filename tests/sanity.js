const C=require('./core.js');const {Simulation,LevelManager,Levels,FixedStepper,CFG}=C;
const lv=LevelManager.build(LevelManager.validate(Levels.stereoMadness()).data);
function run(fn){const s=new Simulation(lv);let n=0;while(s.player.alive&&!s.finished&&n<400000){s.step(fn(s,n));n++;}return {x:(s.player.x/30).toFixed(1),alive:s.player.alive,fin:s.finished,t:s.time.toFixed(2)};}
console.log('sin input',run(()=>false));
console.log('siempre salto',run(()=>true));
// muro de 3 bloques: imposible
const wall=LevelManager.build(LevelManager.validate({objs:[['block',10,0,0],['block',10,1,0],['block',10,2,0],['end',30,0,0]]}).data);
const s=new Simulation(wall);let died=false;for(let i=0;i<20000&&s.player.alive&&!s.finished;i++)s.step(i%90<45);
console.log('muro3 sobrevive?',s.player.alive,s.finished);
// independencia de FPS
function at(fps){const s=new Simulation(lv);const st=new FixedStepper(s);let t=0;const dt=1/fps;while(t<3.0){st.advance(dt*(fps===77?(1+0.3*Math.sin(t*50)):1),false);t+=dt;if(!s.player.alive)break;}return {x:s.player.x.toFixed(2),time:s.time.toFixed(3)};}
for(const f of [30,60,120,144,240,77])console.log('fps',f,at(f));
// validación
console.log(LevelManager.validate('{bad').error);
console.log(LevelManager.validate({objs:[['nope',1,1,0]]}).error);
console.log(LevelManager.validate({objs:[['spike',1,1,45]]}).error);
console.log(LevelManager.validate({objs:[['spike',1,1,90]],name:'  ',mode:'cube'}).ok);

export const rules = 'Hold A / ← and D / → for the flippers. Hold Space (or the launch button), then release to launch. Hit cosmic bumpers and light all three orbit beacons. You have three balls. Touch players: use the two flipper buttons below the table. The first two seconds of each ball have a launch save.';

const W=480,H=660,R=8,STEP=1/180,GRAVITY=590;
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
// Coordinates and physics stay in table space; CSS only scales the rendering.
const WALLS=[
 [24,612,24,102],[24,102,72,42],[72,42,392,42],[392,42,462,102],[462,102,462,620],
 [430,148,430,614], // Separate launch lane; the upper opening feeds the playfield.
 [24,441,100,535],[100,535,140,562],[430,441,376,525],[376,525,340,562],
 [48,356,68,426],[68,426,115,475],[406,356,388,426],[388,426,365,475],
 [76,99,58,130]
];
const BUMPERS=[{x:171,y:204,r:27},{x:309,y:204,r:27},{x:240,y:296,r:30}];
const SLINGS=[{a:[89,461],b:[128,522],side:1},{a:[391,461],b:[352,522],side:-1}];
const BEACONS=[{x:145,y:107},{x:240,y:93},{x:335,y:107}];

export function mount(host,api){
  host.innerHTML=`<section class="pin-game" aria-label="Cosmic Current pinball"><div class="pin-top"><span>ORBITAL AMUSEMENTS / 1987</span><span class="pin-ball-label">BALL 1 / 3</span></div><div class="pin-table-wrap"><canvas class="pin-canvas" width="960" height="1320" tabindex="0" role="img" aria-label="Cosmic Current pinball table. Use A and D or left and right arrow keys to operate the flippers. Hold and release Space to launch. Three balls per game."></canvas><div class="pin-overlay"><span class="pin-kicker">A LITTLE GRAVITY. A LOT OF GLORY.</span><h2>COSMIC<br><em>CURRENT</em></h2><p>Three balls. Two flippers.<br>One more trip around the galaxy.</p><p class="pin-overlay-help">Hold <b>A / ←</b> and <b>D / →</b> to flip.<br>Hold <b>Space</b>, then release to launch.</p><button type="button" class="pin-start">Enter orbit →</button><small>Or use the touch controls below.</small></div></div><div class="pin-power" aria-hidden="true"><span>LAUNCH ENERGY</span><div><i></i></div></div><div class="pin-controls"><button type="button" class="pin-flip pin-left" aria-label="Hold left flipper, A or left arrow"><span>←</span> LEFT FLIPPER<small>A / ← · HOLD</small></button><button type="button" class="pin-launch" aria-label="Hold and release to launch the ball"><span>↑</span> LAUNCH<small>SPACE · HOLD</small></button><button type="button" class="pin-flip pin-right" aria-label="Hold right flipper, D or right arrow"><span>→</span> RIGHT FLIPPER<small>D / → · HOLD</small></button></div><p class="pin-status" role="status" aria-live="polite">Ready when you are. Enter orbit to begin.</p><p class="pin-note">Light three orbit beacons for a 1,000-point bonus. Launch save: first 2 seconds.</p></section>`;
  const root=host.querySelector('.pin-game'),canvas=root.querySelector('canvas'),ctx=canvas.getContext('2d'),overlay=root.querySelector('.pin-overlay'),status=root.querySelector('.pin-status'),energy=root.querySelector('.pin-power i'),launchButton=root.querySelector('.pin-launch'),ballLabel=root.querySelector('.pin-ball-label');
  ctx.setTransform(2,0,0,2,0,0);
  let alive=true,raf=0,last=0,accum=0,time=0,score=0,balls=3,best=api.best('pinball',0),started=false,gameover=false,ready=true,charging=false,charge=0,serveTime=0,savedThisBall=false,stuck=0,lastBallPos={x:446,y:581},paused=false;
  const ball={x:446,y:581,vx:0,vy:0,trail:[]};
  const left={x:140,y:567,length:89,angle:.32,rest:.32,up:-.48,omega:0,held:false};
  const right={x:340,y:567,length:89,angle:Math.PI-.32,rest:Math.PI-.32,up:Math.PI+.48,omega:0,held:false};
  const bumperStates=BUMPERS.map(()=>({cool:0,flash:0})),slingStates=SLINGS.map(()=>({cool:0,flash:0}));
  let beacons=[false,false,false],beaconCools=[0,0,0];
  const keys=new Set(),pointers=new Map(),listeners=[],timers=new Set();
  function on(el,type,fn,options){el.addEventListener(type,fn,options);listeners.push(()=>el.removeEventListener(type,fn,options));}
  function say(text){status.textContent=text;api.announce(text);}
  function stats(){best=api.best('pinball',score);api.stats({Score:score,Balls:balls,Best:best});ballLabel.textContent=gameover?'GAME OVER':`BALL ${4-balls} / 3`;}
  function points(n){score+=n;stats();}
  function setHeld(){left.held=keys.has('a')||keys.has('arrowleft')||[...pointers.values()].includes('left');right.held=keys.has('d')||keys.has('arrowright')||[...pointers.values()].includes('right');root.querySelector('.pin-left').classList.toggle('pin-held',left.held);root.querySelector('.pin-right').classList.toggle('pin-held',right.held);}
  function showIntro(){overlay.hidden=false;overlay.innerHTML=`<span class="pin-kicker">A LITTLE GRAVITY. A LOT OF GLORY.</span><h2>COSMIC<br><em>CURRENT</em></h2><p>Three balls. Two flippers.<br>One more trip around the galaxy.</p><p class="pin-overlay-help">Hold <b>A / ←</b> and <b>D / →</b> to flip.<br>Hold <b>Space</b>, then release to launch.</p><button type="button" class="pin-start">Enter orbit →</button><small>Or use the touch controls below.</small>`;overlay.querySelector('button').addEventListener('click',begin);}
  function begin(){if(gameover)return;started=true;overlay.hidden=true;canvas.focus({preventScroll:true});say('Ball ready. Hold Space or the launch button, then release.');}
  function serve(){ready=true;charging=false;charge=0;energy.style.width='0%';ball.x=446;ball.y=581;ball.vx=ball.vy=0;ball.trail=[];serveTime=0;stuck=0;lastBallPos={x:ball.x,y:ball.y};launchButton.disabled=false;launchButton.querySelector('small').textContent='SPACE · HOLD';}
  function startCharge(){if(!alive||gameover||paused||api.isPaused()||document.hidden||!ready||charging)return;if(!started)begin();charging=true;charge=0;}
  function launch(){if(!charging)return;charging=false;if(paused||api.isPaused()||document.hidden)return;ready=false;ball.vx=-8;ball.vy=-(920+Math.min(charge,1.2)*180);serveTime=0;ball.trail=[];launchButton.disabled=true;launchButton.querySelector('small').textContent='BALL IN PLAY';energy.style.width='0%';api.sound('tap');say('Ball launched. Keep it in orbit!');}
  function loseBall(){if(serveTime<2&&!savedThisBall){savedThisBall=true;serve();say('Launch save! Your ball is back in the lane.');return;}balls--;stats();if(balls<=0){gameover=true;ready=false;charging=false;launchButton.disabled=true;overlay.hidden=false;overlay.innerHTML=`<span class="pin-kicker">END OF TRANSMISSION</span><h2>NICE<br><em>ORBIT.</em></h2><p class="pin-final-score">${score.toLocaleString()}<span>FINAL SCORE</span></p><p>Best: ${best.toLocaleString()} · Three more balls?</p><button type="button" class="pin-start">Play again ↗</button>`;overlay.querySelector('button').addEventListener('click',restart);say(`Game over. Final score ${score}. Best ${best}. Play again whenever you're ready.`);api.sound('win');}else{savedThisBall=false;serve();say(`${balls} ${balls===1?'ball':'balls'} left. Hold and release to launch again.`);}}
  function restart(){score=0;balls=3;gameover=false;started=false;savedThisBall=false;beacons=[false,false,false];beaconCools=[0,0,0];keys.clear();pointers.clear();setHeld();left.angle=left.rest;right.angle=right.rest;bumperStates.forEach(s=>s.cool=s.flash=0);slingStates.forEach(s=>s.cool=s.flash=0);serve();stats();showIntro();say('Fresh game. Enter orbit when you are ready.');last=0;accum=0;}
  // Circle/segment collision returns the impact, so collision-specific scoring
  // happens once on approach rather than once for every overlapping frame.
  function collideSegment(ax,ay,bx,by,restitution=.8,flipper=null){
    const dx=bx-ax,dy=by-ay,len2=dx*dx+dy*dy,t=clamp(((ball.x-ax)*dx+(ball.y-ay)*dy)/len2,0,1),cx=ax+dx*t,cy=ay+dy*t;
    let nx=ball.x-cx,ny=ball.y-cy,dist=Math.hypot(nx,ny);const radius=R+(flipper?5:2);
    if(dist>=radius)return false;
    if(dist<.001){const l=Math.hypot(dx,dy);nx=-dy/l;ny=dx/l;dist=0;}else{nx/=dist;ny/=dist;}
    ball.x+=nx*(radius-dist+.03);ball.y+=ny*(radius-dist+.03);
    let sx=0,sy=0;
    if(flipper){sx=-flipper.omega*(cy-flipper.y);sy=flipper.omega*(cx-flipper.x);}
    const relative=(ball.vx-sx)*nx+(ball.vy-sy)*ny;
    if(relative<0){const impulse=-(1+restitution)*relative;ball.vx+=impulse*nx;ball.vy+=impulse*ny;
      // A flipping rubber face transfers extra upward energy near its tip.
      if(flipper&&Math.abs(flipper.omega)>1&&ny<.5){ball.vy=Math.min(ball.vy,-420-250*t);ball.vx+=(flipper===left?1:-1)*95*t;}
      return true;
    }return false;
  }
  function step(dt){
    time+=dt;
    for(const f of [left,right]){const old=f.angle,target=f.held?f.up:f.rest,max=dt*(f.held?15:9);f.angle+=clamp(target-f.angle,-max,max);f.omega=(f.angle-old)/dt;}
    bumperStates.forEach(s=>{s.cool=Math.max(0,s.cool-dt);s.flash=Math.max(0,s.flash-dt*3)});slingStates.forEach(s=>{s.cool=Math.max(0,s.cool-dt);s.flash=Math.max(0,s.flash-dt*4)});beaconCools=beaconCools.map(c=>Math.max(0,c-dt));
    if(charging){charge=Math.min(1.2,charge+dt);energy.style.width=`${Math.round(charge/1.2*100)}%`;}
    if(ready||!started||gameover)return;
    serveTime+=dt;ball.vy+=GRAVITY*dt;ball.vx*=.9997;ball.vy*=.9999;
    const speed=Math.hypot(ball.vx,ball.vy);if(speed>1400){ball.vx*=1400/speed;ball.vy*=1400/speed;}
    ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;
    WALLS.forEach(w=>collideSegment(...w));
    SLINGS.forEach((s,i)=>{if(collideSegment(...s.a,...s.b,.95)&&slingStates[i].cool===0){ball.vx+=s.side*180;ball.vy-=240;slingStates[i].cool=.18;slingStates[i].flash=1;points(30);api.sound('tap');}});
    for(const f of [left,right])collideSegment(f.x,f.y,f.x+Math.cos(f.angle)*f.length,f.y+Math.sin(f.angle)*f.length,.84,f);
    BUMPERS.forEach((b,i)=>{let dx=ball.x-b.x,dy=ball.y-b.y,d=Math.hypot(dx,dy),min=b.r+R;if(d<min){if(d<.01){dx=0;dy=-1;d=1;}const nx=dx/d,ny=dy/d;ball.x=b.x+nx*(min+.1);ball.y=b.y+ny*(min+.1);const v=ball.vx*nx+ball.vy*ny;if(v<0){const impulse=-(1.05)*v+270;ball.vx+=impulse*nx;ball.vy+=impulse*ny;if(!bumperStates[i].cool){bumperStates[i].cool=.16;bumperStates[i].flash=1;points(100);api.sound('pop');}}}});
    BEACONS.forEach((b,i)=>{if(Math.hypot(ball.x-b.x,ball.y-b.y)<23&&!beaconCools[i]){beaconCools[i]=.6;if(!beacons[i]){beacons[i]=true;points(150);api.sound('pop');if(beacons.every(Boolean)){points(1000);beacons=[false,false,false];beaconCools=[1,1,1];say('All three orbit beacons! 1,000-point bonus.');api.sound('win');}}}});
    // Recover very rare stationary contacts rather than trapping a ball forever.
    const motion=Math.hypot(ball.x-lastBallPos.x,ball.y-lastBallPos.y);lastBallPos={x:ball.x,y:ball.y};stuck=motion<.14?stuck+dt:0;if(stuck>2.2){ball.vx+=(ball.x<240?1:-1)*120;ball.vy=-240;stuck=0;}
    if(ball.y>H+20)loseBall();
    // A weak or obstructed launch that settles in its lane is re-served for free.
    if(ball.x>438&&ball.y>600&&ball.vy>0){serve();say('Ball reset in the launch lane. Hold, then release to launch.');}
  }
  function rounded(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
  function text(str,x,y,size,color='#e7dce9',align='center',font='monospace'){ctx.font=`${size}px ${font}`;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(str,x,y);}
  function line(ax,ay,bx,by,color,width){ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.stroke();}
  function circle(x,y,r,color,stroke=null,width=1){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);if(color){ctx.fillStyle=color;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
  function draw(){
    ctx.clearRect(0,0,W,H);ctx.fillStyle='#0d101f';ctx.fillRect(0,0,W,H);
    const bg=ctx.createRadialGradient(240,230,30,240,290,370);bg.addColorStop(0,'#30203d');bg.addColorStop(1,'#0d1327');rounded(14,20,456,632,24,bg,'#61456a');
    ctx.save();ctx.beginPath();ctx.rect(25,43,404,580);ctx.clip();
    // Deterministic stars: no timers or random layout changes while playing.
    for(let i=0;i<77;i++){const x=30+(i*137.51)%394,y=50+(i*i*13.7)%545;circle(x,y,i%6===0?1.3:.65,i%3===0?'#e6b36c88':'#85d8ef66');}
    ctx.strokeStyle='#59c9da15';ctx.lineWidth=1;for(let y=80;y<620;y+=32){ctx.beginPath();ctx.moveTo(26,y);ctx.lineTo(428,y);ctx.stroke();}for(let x=26;x<430;x+=32){ctx.beginPath();ctx.moveTo(x,43);ctx.lineTo(x,622);ctx.stroke();}
    ctx.restore();
    ctx.save();ctx.translate(240,316);ctx.rotate(-.32);ctx.beginPath();ctx.ellipse(0,0,136,52,0,0,Math.PI*2);ctx.strokeStyle='#b57bb333';ctx.lineWidth=14;ctx.stroke();ctx.beginPath();ctx.ellipse(0,0,136,52,0,0,Math.PI*2);ctx.strokeStyle='#eda7cc44';ctx.lineWidth=1;ctx.stroke();ctx.restore();
    text('COSMIC',240,376,38,'#e8caca','center','"Arial Black", sans-serif');text('C U R R E N T',240,399,20,'#eea5cb','center','sans-serif');text('KEEP THE GOOD TIMES IN ORBIT',240,422,7,'#a4a0ba');
    // Orbit beacons sit above the bumper cluster and are rollover targets.
    BEACONS.forEach((b,i)=>{circle(b.x,b.y,17,beacons[i]?'#eebc6a':'#191c2c',beacons[i]?'#ffe4a5':'#9d825c',2);text(['I','II','III'][i],b.x,b.y+4,11,beacons[i]?'#25182d':'#bfa277');});
    text('L I G H T   T H E   O R B I T',240,66,8,'#b5d7dd');
    // Launch chute and spring.
    rounded(436,155,20,455,9,'#090e1c');line(446,592,446,620,'#ce9f67',4);ctx.beginPath();for(let y=604;y<640;y+=5){ctx.lineTo(440,y);ctx.lineTo(452,y+2.5);}ctx.strokeStyle='#9a789b';ctx.lineWidth=2;ctx.stroke();text('↑',446,220,20,'#d7b285');text('↑',446,300,20,'#d7b285');
    // Rails have a dark bevel and a bright rubber face.
    WALLS.forEach(w=>{line(...w,'#060c16',10);line(...w,'#63728b',5);line(...w,'#b1d0d3',1.5);});
    SLINGS.forEach((s,i)=>{ctx.beginPath();ctx.moveTo(s.a[0],s.a[1]);ctx.lineTo(s.b[0],s.b[1]);ctx.lineTo(s.side===1?72:408,520);ctx.closePath();ctx.fillStyle=slingStates[i].flash>0?'#fff0cf':'#d76f9c';ctx.fill();ctx.strokeStyle='#f4bbd5';ctx.lineWidth=2;ctx.stroke();text('30',s.side===1?90:390,505,9,'#31223e');});
    BUMPERS.forEach((b,i)=>{const flash=bumperStates[i].flash;ctx.shadowColor='#55e4df';ctx.shadowBlur=flash*24;circle(b.x,b.y,b.r+5,'#141c30','#74e0da',2);circle(b.x,b.y,b.r,flash?'#cffaf0':'#233f50','#77dcd3',3);ctx.shadowBlur=0;circle(b.x,b.y,b.r-8,'#19283d','#7cabc0',1);ctx.save();ctx.translate(b.x,b.y);ctx.rotate(i*.8+.2);ctx.beginPath();for(let j=0;j<8;j++){const a=j*Math.PI/4,r=j%2===0?14:5;const x=Math.cos(a)*r,y=Math.sin(a)*r;j?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.fillStyle=flash?'#fff':'#eac18a';ctx.fill();ctx.restore();});
    text('100',171,249,8,'#91bfc7');text('100',309,249,8,'#91bfc7');text('100',240,345,8,'#91bfc7');
    for(const f of [left,right]){const tx=f.x+Math.cos(f.angle)*f.length,ty=f.y+Math.sin(f.angle)*f.length;line(f.x,f.y,tx,ty,'#070c16',16);line(f.x,f.y,tx,ty,f.held?'#ffdfaa':'#dba4c0',11);line(f.x,f.y-2,tx,ty-2,'#fff0d0',2);circle(f.x,f.y,9,'#d9a86d','#ffdfaa',2);circle(f.x,f.y,3,'#554158');}
    text('← A',95,602,10,'#8a9daf');text('D →',383,602,10,'#8a9daf');text('D E E P   S P A C E',240,643,8,'#74859c');
    if(!gameover){ball.trail.forEach((p,i)=>circle(p.x,p.y,R*(i/ball.trail.length)*.7,`rgba(108,216,226,${i/ball.trail.length*.2})`));const shine=ctx.createRadialGradient(ball.x-3,ball.y-3,0,ball.x,ball.y,R);shine.addColorStop(0,'#fff');shine.addColorStop(.3,'#dfedf0');shine.addColorStop(.75,'#8bafc6');shine.addColorStop(1,'#425b76');ctx.shadowColor='#8bd8ef';ctx.shadowBlur=8;circle(ball.x,ball.y,R,shine);ctx.shadowBlur=0;}
    if(!ready&&serveTime<2&&!savedThisBall)text('LAUNCH SAVE ACTIVE',240,620,8,'#efd095');
    if((paused||api.isPaused())&&started&&!gameover){rounded(130,270,220,80,12,'#0b1025ee','#d1ac73');text('ORBIT PAUSED',240,318,18,'#efc78c');}
  }
  function frame(now){if(!alive)return;const blocked=paused||api.isPaused()||document.hidden;if(blocked){last=now;accum=0;clearInput();}else{const dt=last?Math.min((now-last)/1000,.04):0;last=now;accum+=dt;while(accum>=STEP){step(STEP);accum-=STEP;}if(!ready&&!gameover){ball.trail.push({x:ball.x,y:ball.y});if(ball.trail.length>9)ball.trail.shift();}}draw();raf=requestAnimationFrame(frame);}
  function clearInput(){keys.clear();pointers.clear();setHeld();if(charging){charging=false;charge=0;energy.style.width='0%';}}
  const gameKeys=new Set(['a','d','arrowleft','arrowright',' ']);
  function isInteractive(target){return target instanceof Element&&target.closest('button,a,input,textarea,select,[contenteditable]');}
  on(window,'keydown',e=>{const k=e.key.toLowerCase();if(!gameKeys.has(k)||isInteractive(e.target)||paused||api.isPaused()||document.hidden||!alive)return;if(gameover)return;e.preventDefault();if(k===' '){if(!e.repeat){keys.add(k);startCharge();}}else{keys.add(k);setHeld();}});
  on(window,'keyup',e=>{const k=e.key.toLowerCase();if(!gameKeys.has(k))return;const owned=keys.has(k),interactive=isInteractive(e.target);keys.delete(k);setHeld();if(interactive){if(k===' '&&owned){charging=false;charge=0;energy.style.width='0%';}return;}if(owned)e.preventDefault();if(k===' '&&owned)launch();});
  function bindPointer(button,action){on(button,'pointerdown',e=>{if(e.button!==0||gameover||api.isPaused()||paused)return;e.preventDefault();button.setPointerCapture(e.pointerId);pointers.set(e.pointerId,action);if(action==='launch')startCharge();else setHeld();});on(button,'pointerup',e=>{if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);if(action==='launch')launch();else setHeld();});const cancel=e=>{pointers.delete(e.pointerId);if(action==='launch'){charging=false;charge=0;energy.style.width='0%';}setHeld();};on(button,'pointercancel',cancel);on(button,'lostpointercapture',e=>{if(pointers.has(e.pointerId))cancel(e);});
    // Native button activation remains available to assistive technology.
    on(button,'click',e=>{if(e.detail===0){if(action==='launch'){startCharge();launch();}else{const token=Symbol(action);pointers.set(token,action);setHeld();const timer=setTimeout(()=>{timers.delete(timer);pointers.delete(token);if(alive)setHeld();},130);timers.add(timer);}}});}
  bindPointer(root.querySelector('.pin-left'),'left');bindPointer(root.querySelector('.pin-right'),'right');bindPointer(launchButton,'launch');
  on(window,'blur',clearInput);on(document,'visibilitychange',()=>{clearInput();last=0;accum=0;});
  showIntro();stats();raf=requestAnimationFrame(frame);
  return {restart,pause(value=true){paused=value;clearInput();last=0;accum=0;},destroy(){alive=false;cancelAnimationFrame(raf);listeners.forEach(remove=>remove());timers.forEach(timer=>clearTimeout(timer));clearInput();host.innerHTML='';}};
}

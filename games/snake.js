export const rules = 'Collect glowing food to grow and earn 10 points. Steer with arrow keys, WASD, a swipe, or the direction buttons. You cannot turn directly back into yourself. Avoid the walls and your own tail. Choose a pace, then press Start. Pause whenever you need a breather.';
export function spawnFood(body, size = 20, rng = Math.random) {
  const open = [];
  for (let y=0;y<size;y++) for(let x=0;x<size;x++) if(!body.some(p=>p.x===x&&p.y===y)) open.push({x,y});
  return open.length ? open[Math.min(open.length-1,Math.floor(rng()*open.length))] : null;
}
export function createSnakeState(rng = Math.random) {
  const body=[{x:9,y:10},{x:8,y:10},{x:7,y:10}];
  return {body,dir:{x:1,y:0},food:spawnFood(body,20,rng),score:0,over:false,won:false};
}
export function stepSnake(state, requested = state.dir, rng = Math.random) {
  if(state.over) return state;
  const dir=requested.x===-state.dir.x&&requested.y===-state.dir.y ? state.dir : requested;
  const head={x:state.body[0].x+dir.x,y:state.body[0].y+dir.y};
  const eats=state.food&&head.x===state.food.x&&head.y===state.food.y;
  const collisionBody=eats ? state.body : state.body.slice(0,-1);
  if(head.x<0||head.y<0||head.x>=20||head.y>=20||collisionBody.some(p=>p.x===head.x&&p.y===head.y)) return {...state,dir,over:true};
  const body=[head,...state.body]; if(!eats) body.pop();
  const food=eats?spawnFood(body,20,rng):state.food;
  return {body,dir,food,score:state.score+(eats?10:0),over:food===null,won:food===null};
}
export function mount(host, api) {
  host.innerHTML=`<div class="snk-game"><div class="snk-tools"><label>Pace <select class="snk-speed" aria-label="Snake pace"><option value="180">Relaxed</option><option value="125" selected>Classic</option><option value="85">Quick</option></select></label><button class="snk-pause" type="button" hidden disabled>Pause</button></div><div class="snk-field"><canvas class="snk-canvas" width="800" height="800" role="img" aria-label="Snake grid. Snake starts near the center facing right."></canvas><div class="snk-overlay"><span class="snk-kicker">A LITTLE MOMENTUM</span><h3>Follow your appetite.</h3><p>Pick up a glow. Make a little room.</p><button class="snk-start" type="button">Start playing →</button></div></div><p class="snk-status" role="status">Ready when you are. Use arrows, WASD, swipes or the buttons below.</p><div class="snk-dpad" role="group" aria-label="Snake direction"><button type="button" data-dir="up" aria-label="Move up">↑</button><button type="button" data-dir="left" aria-label="Move left">←</button><button type="button" data-dir="down" aria-label="Move down">↓</button><button type="button" data-dir="right" aria-label="Move right">→</button></div><p class="snk-hint">DON’T HIT THE WALL. DON’T EAT YOUR TAIL.</p></div>`;
  const canvas=host.querySelector('canvas'),ctx=canvas.getContext('2d'),overlay=host.querySelector('.snk-overlay'),status=host.querySelector('.snk-status'),pauseButton=host.querySelector('.snk-pause'),speed=host.querySelector('.snk-speed');
  const directions={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}};
  const keys={ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down',ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right'};
  let state=createSnakeState(),queued=state.dir,turnPending=false,running=false,paused=false,disposed=false,last=0,elapsed=0,raf=0,pointer=null;
  const removers=[];function on(el,event,handler,options){el.addEventListener(event,handler,options);removers.push(()=>el.removeEventListener(event,handler,options));}
  function stats(){api.stats({Score:state.score,Best:api.best('snake',state.score),Length:state.body.length});}
  function paint(){
    const cell=40;ctx.fillStyle='#081c26';ctx.fillRect(0,0,800,800);ctx.strokeStyle='#15303a';ctx.lineWidth=1;
    for(let i=1;i<20;i++){ctx.beginPath();ctx.moveTo(i*cell,0);ctx.lineTo(i*cell,800);ctx.stroke();ctx.beginPath();ctx.moveTo(0,i*cell);ctx.lineTo(800,i*cell);ctx.stroke();}
    if(state.food){ctx.shadowColor='#ffb86b';ctx.shadowBlur=22;ctx.fillStyle='#ffb86b';ctx.beginPath();ctx.arc(state.food.x*cell+20,state.food.y*cell+20,11,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}
    state.body.forEach((p,i)=>{ctx.fillStyle=i===0?'#c2ffe4':`hsl(158 64% ${Math.max(35,65-i*.7)}%)`;ctx.beginPath();ctx.roundRect(p.x*cell+3,p.y*cell+3,34,34,9);ctx.fill();});
    const head=state.body[0];ctx.fillStyle='#0a3632';const vx=state.dir.x,vy=state.dir.y;for(const side of [-1,1]){ctx.beginPath();ctx.arc(head.x*cell+20+vx*7+vy*side*7,head.y*cell+20+vy*7+vx*side*7,3,0,Math.PI*2);ctx.fill();}
  }
  function stopMessage(title,detail,button){overlay.hidden=false;overlay.innerHTML=`<span class="snk-kicker">${state.won?'PERFECT APPETITE':'ONE MORE GO?'}</span><h3>${title}</h3><p>${detail}</p><button class="snk-start" type="button">${button}</button>`;}
  function reset(){state=createSnakeState();queued=state.dir;turnPending=false;running=false;paused=false;elapsed=0;last=0;pauseButton.disabled=true;pauseButton.textContent='Pause';overlay.hidden=false;overlay.innerHTML='<span class="snk-kicker">A LITTLE MOMENTUM</span><h3>Follow your appetite.</h3><p>Pick up a glow. Make a little room.</p><button class="snk-start" type="button">Start playing →</button>';status.textContent='Ready when you are. Press Start to begin.';stats();paint();}
  function start(){if(api.isPaused())return;if(state.over)reset();running=true;paused=false;overlay.hidden=true;pauseButton.disabled=false;pauseButton.textContent='Pause';elapsed=0;last=0;status.textContent='Keep moving. Your next glow is waiting.';api.announce('Snake started. Use arrow keys, WASD, swipes or direction buttons.');api.sound('tap');}
  function steer(name){if(!running||paused||api.isPaused()||turnPending)return;const d=directions[name];if(d.x===-state.dir.x&&d.y===-state.dir.y)return;queued=d;turnPending=true;}
  function tick(time){if(disposed)return;raf=requestAnimationFrame(tick);if(!running||paused||document.hidden||api.isPaused()){last=0;return;}if(!last){last=time;return;}elapsed+=Math.min(time-last,200);last=time;if(elapsed<Number(speed.value))return;elapsed=0;const old=state.score;state=stepSnake(state,queued);queued=state.dir;turnPending=false;paint();if(state.score>old){stats();api.sound('pop');}if(state.over){running=false;pauseButton.disabled=true;stats();const message=state.won?'Every square. Every glow.':`A good run: ${state.score} points.`;status.textContent=message;stopMessage(state.won?'You filled the grid!':'A little too close.',message,'Try again →');api.announce(`${state.won?'You won!':'Game over.'} Score ${state.score}.`);if(state.won)api.sound('win');}canvas.setAttribute('aria-label',`Snake grid. Score ${state.score}. Length ${state.body.length}. Head at column ${state.body[0].x+1}, row ${state.body[0].y+1}. Food at ${state.food?`column ${state.food.x+1}, row ${state.food.y+1}`:'no remaining square'}.`);}
  on(host,'click',e=>{if(e.target.closest('.snk-start'))start();const d=e.target.closest('[data-dir]');if(d)steer(d.dataset.dir);});
  on(pauseButton,'click',()=>{if(!running||api.isPaused())return;paused=!paused;pauseButton.textContent=paused?'Resume':'Pause';elapsed=0;last=0;status.textContent=paused?'Paused. Take your time.':'Back to the glow.';api.announce(paused?'Snake paused.':'Snake resumed.');});
  on(document,'keydown',e=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||e.altKey||e.ctrlKey||e.metaKey||api.isPaused())return;const name=keys[e.key];if(name){e.preventDefault();steer(name);}});
  on(canvas,'pointerdown',e=>{pointer={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});on(canvas,'pointerup',e=>{if(!pointer)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;pointer=null;if(Math.max(Math.abs(dx),Math.abs(dy))<15)return;steer(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'));});on(canvas,'pointercancel',()=>{pointer=null;});
  on(document,'visibilitychange',()=>{last=0;elapsed=0;});
  stats();paint();raf=requestAnimationFrame(tick);
  return {restart:reset,destroy(){disposed=true;cancelAnimationFrame(raf);removers.forEach(f=>f());host.innerHTML='';}};
}

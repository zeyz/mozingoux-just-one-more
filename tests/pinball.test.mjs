import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// A tiny rendering harness lets the actual table simulation run, without
// exporting test-only controls from the shipped game module.
const nodes=new Map();
const context=new Proxy({}, {get:(_,p)=>p==='createRadialGradient'?()=>({addColorStop(){}}):()=>{},set:()=>true});
function node(key){if(!nodes.has(key))nodes.set(key,{innerHTML:'',hidden:false,disabled:false,textContent:'',style:{},classList:{toggle(){}},querySelector:s=>node(key+' '+s),addEventListener(){},removeEventListener(){},focus(){},getContext:()=>context,setPointerCapture(){}});return nodes.get(key);}
const windowListeners=new Map();
globalThis.window={addEventListener(type,fn){windowListeners.set(type,fn);},removeEventListener(type){windowListeners.delete(type);}};
globalThis.document={hidden:false,addEventListener(){},removeEventListener(){}};
globalThis.requestAnimationFrame=()=>1;
globalThis.cancelAnimationFrame=()=>{};
globalThis.Element=class {constructor(interactive=false){this.interactive=interactive;}closest(){return this.interactive?this:null;}};
const source=fs.readFileSync(new URL('../games/pinball.js',import.meta.url),'utf8');
const seam='return {restart,pause(value=true)';
assert(source.includes(seam),'table test seam must exist');
const instrumented=source.replace(seam,'return {debug:{step,frame,startCharge,launch,ball,left,right,setServeTime:t=>serveTime=t,state:()=>({score,balls,ready,gameover})},restart,pause(value=true)');
const {mount}=await import('data:text/javascript;base64,'+Buffer.from(instrumented).toString('base64'));
let best=0;
const game=mount(node('host'),{best:(_,n)=>(best=Math.max(best,n)),stats(){},announce(){},sound(){},isPaused:()=>false});
const d=game.debug;
function launch(hold=0){d.startCharge();for(let i=0;i<hold*180;i++)d.step(1/180);d.launch();}
function ticks(n){for(let i=0;i<n;i++){d.step(1/180);assert(Number.isFinite(d.ball.x)&&Number.isFinite(d.ball.y));assert(Number.isFinite(d.ball.vx)&&Number.isFinite(d.ball.vy));}}

test('minimum and full spring launches both escape the chute and reach scoring play',()=>{
 for(const hold of [0,.6,1.2]){game.restart();launch(hold);let entered=false;
  for(let i=0;i<180*25;i++){ticks(1);if(d.ball.x<400&&d.ball.y<330)entered=true;if(d.state().ready)break;}
  assert(entered,`launch charge ${hold} should escape the chute`);
  assert(d.state().score>0,'a normal launch reaches bumpers or rollover beacons');
 }
});
test('an activating flipper strikes an approaching ball back into the playfield',()=>{
 game.restart();launch();Object.assign(d.ball,{x:195,y:540,vx:0,vy:200});d.left.held=true;let returned=false;
 for(let i=0;i<50;i++){ticks(1);if(d.ball.vy< -200)returned=true;}
 assert(returned,'moving flipper must transfer upward velocity');assert(d.ball.y<500);
});
test('one bumper approach scores once, not once for every overlapping frame',()=>{
 game.restart();launch();Object.assign(d.ball,{x:171,y:169,vx:0,vy:150});ticks(12);assert.equal(d.state().score,100);
});
test('three ordinary drains end the game, and restart restores three balls',()=>{
 game.restart();for(let i=0;i<3;i++){launch();d.setServeTime(3);Object.assign(d.ball,{x:240,y:690,vx:0,vy:100});ticks(1);assert.equal(d.state().balls,2-i);}
 assert(d.state().gameover);game.restart();assert.deepEqual(d.state(),{score:0,balls:3,ready:true,gameover:false});
});
test('pause and hidden tab freeze physics without a large resume jump',()=>{
 game.restart();launch();d.frame(1000);const before={x:d.ball.x,y:d.ball.y};game.pause(true);d.frame(90000);assert.deepEqual({x:d.ball.x,y:d.ball.y},before);game.pause(false);d.frame(180000);assert.deepEqual({x:d.ball.x,y:d.ball.y},before);document.hidden=true;d.frame(200000);assert.deepEqual({x:d.ball.x,y:d.ball.y},before);document.hidden=false;d.frame(200016);assert(Math.abs(d.ball.y-before.y)<25);
});
test('focused buttons keep native Space and keyup clears flippers after focus moves',()=>{
 game.restart();const button=new Element(true),canvas=new Element(false);let prevented=0;
 const event=(key,target)=>({key,target,repeat:false,preventDefault(){prevented++;}});
 windowListeners.get('keydown')(event(' ',button));windowListeners.get('keyup')(event(' ',button));
 assert.equal(prevented,0);assert(d.state().ready,'Space on a button must not launch');
 windowListeners.get('keydown')(event('a',canvas));assert(d.left.held);
 windowListeners.get('keyup')(event('a',button));assert(!d.left.held,'releasing after focus moves cannot leave a flipper held');
 windowListeners.get('keydown')(event(' ',canvas));windowListeners.get('keyup')(event(' ',button));
 assert(d.state().ready,'moving focus to a button cancels a charged launch');
 windowListeners.get('keydown')(event(' ',canvas));windowListeners.get('keyup')(event(' ',canvas));
 assert(!d.state().ready,'Space on the canvas still launches');
});
test('destroy clears the host and animation ownership',()=>{game.destroy();assert.equal(node('host').innerHTML,'');});

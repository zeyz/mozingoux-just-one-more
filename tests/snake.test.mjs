import test from 'node:test';
import assert from 'node:assert/strict';
import {createSnakeState,stepSnake,spawnFood} from '../games/snake.js';
test('food always spawns outside the snake, including a nearly full grid',()=>{const body=[];for(let y=0;y<20;y++)for(let x=0;x<20;x++)if(x!==19||y!==19)body.push({x,y});assert.deepEqual(spawnFood(body,20,()=>0),{x:19,y:19});body.push({x:19,y:19});assert.equal(spawnFood(body),null);});
test('moving preserves length and does not mutate the previous state',()=>{const a=createSnakeState(()=>0);const b=stepSnake(a);assert.equal(b.body.length,3);assert.equal(b.body[0].x,10);assert.equal(a.body[0].x,9);assert.equal(b.score,0);});
test('reversal is ignored',()=>{const state=createSnakeState(()=>0);assert.deepEqual(stepSnake(state,{x:-1,y:0}).dir,{x:1,y:0});});
test('food grows the snake and adds points',()=>{const a=createSnakeState(()=>0);a.food={x:10,y:10};const b=stepSnake(a,undefined,()=>0);assert.equal(b.score,10);assert.equal(b.body.length,4);assert(!b.body.some(p=>p.x===b.food.x&&p.y===b.food.y));});
test('walls and self end the run, but entering a departing tail is valid',()=>{const base=createSnakeState(()=>0);assert.equal(stepSnake({...base,body:[{x:19,y:10},{x:18,y:10}]}).over,true);const square={...base,body:[{x:1,y:1},{x:1,y:2},{x:0,y:2},{x:0,y:1}],dir:{x:0,y:-1},food:{x:9,y:9}};assert.equal(stepSnake(square,{x:-1,y:0}).over,false);assert.equal(stepSnake({...square,body:[...square.body,{x:0,y:0}]},{x:-1,y:0}).over,true);});

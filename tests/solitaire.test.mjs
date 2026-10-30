import assert from 'node:assert/strict';
import {createState,canMove,moveCard,drawCard,autoFoundation,hasProgress,foundationCount} from '../games/solitaire.js';
const c=(rank,suit,faceUp=true)=>({id:`${suit}-${rank}`,rank,suit,faceUp});
const blank=()=>({stock:[],waste:[],tableau:[[],[],[],[],[],[],[]],foundations:[[],[],[],[]],moves:0});
let s=createState(()=>.37);assert.equal(s.stock.length,24);assert.deepEqual(s.tableau.map(p=>p.length),[1,2,3,4,5,6,7]);assert.equal(s.tableau.flat().filter(c=>c.faceUp).length,7);assert.equal(new Set([...s.stock,...s.tableau.flat()].map(c=>c.id)).size,52);
s=blank();s.tableau[0]=[c(9,0,false),c(8,1),c(7,2)];s.tableau[1]=[c(9,2)];assert(canMove(s,{type:'tableau',column:0,index:1},{type:'tableau',column:1}));const moved=moveCard(s,{type:'tableau',column:0,index:1},{type:'tableau',column:1});assert.equal(moved.tableau[0][0].faceUp,true);assert.equal(s.tableau[0][0].faceUp,false);assert.equal(moved.tableau[1].length,3);assert.equal(moved.moves,1);assert(!canMove(s,{type:'tableau',column:0,index:0},{type:'tableau',column:1}));assert(!canMove(s,{type:'tableau',column:0,index:2},{type:'tableau',column:2}));
s=blank();s.waste=[c(13,1)];assert(canMove(s,{type:'waste'},{type:'tableau',column:0}));s.tableau[0]=[c(12,3)];assert(!canMove(s,{type:'waste'},{type:'tableau',column:0}));
s=blank();s.waste=[c(1,1)];assert(canMove(s,{type:'waste'},{type:'foundation',column:1}));assert(!canMove(s,{type:'waste'},{type:'foundation',column:0}));s.tableau[0]=[c(3,2,false),c(2,1)];let a=autoFoundation(s);assert.equal(a.foundations[1].length,2);assert(a.tableau[0][0].faceUp);assert.equal(a.moves,2);assert.equal(foundationCount(a),2);
s=blank();s.stock=[c(1,0,false),c(2,1,false),c(3,2,false)];const order=[];for(let i=0;i<3;i++){s=drawCard(s);order.push(s.waste.at(-1).id);}s=drawCard(s);assert.equal(s.waste.length,0);assert(s.stock.every(c=>!c.faceUp));const again=[];for(let i=0;i<3;i++){s=drawCard(s);again.push(s.waste.at(-1).id);}assert.deepEqual(again,order);assert.equal(s.moves,7);
s=blank();s.stock=[c(1,0,false)];assert(hasProgress(s));s.stock=[c(7,0,false)];assert(!hasProgress(s));assert.equal(drawCard(blank()),null);assert.equal(autoFoundation(blank()),null);
s=blank();s.foundations[0]=[c(1,0)];s.tableau[0]=[c(2,1)];assert(canMove(s,{type:'foundation',column:0},{type:'tableau',column:0}));
s=blank();s.tableau[0]=[c(8,0),c(7,2)];s.tableau[1]=[c(9,1)];assert(!canMove(s,{type:'tableau',column:0,index:0},{type:'tableau',column:1}));
console.log('Solitaire engine: deal, legality, hidden flips, immutability, stock recycle, foundations, auto-foundation, progress checks passed.');
// Exercise long action histories and ensure moves never create, lose, or mutate cards.
let seed=9;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
s=createState(random);
for(let turn=0;turn<400;turn++){
 const before=JSON.stringify(s),allSources=[{type:'waste'},...s.foundations.map((_,column)=>({type:'foundation',column})),...s.tableau.flatMap((p,column)=>p.map((_,index)=>({type:'tableau',column,index})))];
 const targets=[...s.tableau.map((_,column)=>({type:'tableau',column})),...s.foundations.map((_,column)=>({type:'foundation',column}))];
 const legal=allSources.flatMap(src=>targets.filter(dst=>canMove(s,src,dst)).map(dst=>({src,dst})));
 const choice=legal.length&&random()<.7?legal[Math.floor(random()*legal.length)]:null;
 const next=choice?moveCard(s,choice.src,choice.dst):drawCard(s);
 assert.equal(JSON.stringify(s),before,'an action must not mutate its input');if(next)s=next;
 const cards=[...s.stock,...s.waste,...s.tableau.flat(),...s.foundations.flat()];assert.equal(cards.length,52);assert.equal(new Set(cards.map(c=>c.id)).size,52);
 for(const p of s.tableau){let seen=false;for(const card of p){if(card.faceUp)seen=true;else assert(!seen,'hidden cards must precede face-up cards');}if(p.length)assert(p.at(-1).faceUp);}
 s.foundations.forEach((p,suit)=>p.forEach((card,index)=>{assert.equal(card.suit,suit);assert.equal(card.rank,index+1);}));
}
console.log('400 deterministic mixed actions: card conservation, immutable inputs, visible tops, and foundation ordering passed.');

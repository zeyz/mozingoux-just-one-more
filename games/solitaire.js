export const rules = 'Klondike, draw one. Deal seven tableau columns with only each top card face up. Draw from the stock to the waste; an empty stock recycles the waste without a penalty. Build tableau columns downward in alternating red and black suits. Move any complete face-up descending alternating sequence. Only a King or a sequence beginning with a King may enter an empty column. Build each suit foundation upward from Ace to King. Foundation top cards can return to the tableau. Select a face-up card, then select its destination; keyboard users can Tab between buttons and press Enter or Space. Undo reverses a whole action, including stock draws, recycling, flips, and auto-foundation. Auto-foundation moves available top cards upward; these moves are legal but are not always strategically helpful. Win by moving all 52 cards to the foundations. Some deals cannot be won.';
const SUITS = ['♠','♥','♣','♦'];
const red = c => c.suit === 1 || c.suit === 3;
const rank = n => ['','A','2','3','4','5','6','7','8','9','10','J','Q','K'][n];
const label = c => `${rank(c.rank)} of ${['spades','hearts','clubs','diamonds'][c.suit]}`;
export const foundationCount = s => s.foundations.reduce((n,p)=>n+p.length,0);
export function createState(random = Math.random) {
 const deck = SUITS.flatMap((_,suit)=>Array.from({length:13},(_,n)=>({id:`${suit}-${n+1}`,suit,rank:n+1,faceUp:false})));
 for(let i=deck.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
 const tableau=Array.from({length:7},(_,i)=>{const p=deck.splice(0,i+1);p[p.length-1].faceUp=true;return p;});
 return {stock:deck,waste:[],tableau,foundations:[[],[],[],[]],moves:0};
}
function sourcePile(s,src){if(src.type==='waste')return s.waste;if(src.type==='foundation')return s.foundations[src.column];if(src.type==='tableau')return s.tableau[src.column];return null;}
export function movable(s,src){
 const p=sourcePile(s,src);if(!p?.length)return null;
 const i=src.type==='tableau'?src.index:p.length-1;if(!Number.isInteger(i)||i<0||i>=p.length)return null;
 const cards=p.slice(i);if(cards.some(c=>!c.faceUp))return null;
 for(let n=1;n<cards.length;n++)if(cards[n-1].rank!==cards[n].rank+1||red(cards[n-1])===red(cards[n]))return null;
 return cards;
}
export function canMove(s,src,dst){
 const cards=movable(s,src);if(!cards)return false;
 const first=cards[0];
 if(dst.type==='tableau'){
  if(!Number.isInteger(dst.column)||dst.column<0||dst.column>6)return false;
  if(src.type==='tableau'&&src.column===dst.column)return false;
  const p=s.tableau[dst.column],top=p.at(-1);
  return !top?first.rank===13:top.faceUp&&top.rank===first.rank+1&&red(top)!==red(first);
 }
 if(dst.type==='foundation'){
  if(!Number.isInteger(dst.column)||dst.column<0||dst.column>3)return false;
  if(src.type==='foundation'&&src.column===dst.column)return false;
  return cards.length===1&&first.suit===dst.column&&first.rank===s.foundations[dst.column].length+1;
 }
 return false;
}
export function moveCard(s,src,dst){
 if(!canMove(s,src,dst))return null;
 const next=structuredClone(s),p=sourcePile(next,src),index=src.type==='tableau'?src.index:p.length-1;
 const cards=p.splice(index);(dst.type==='tableau'?next.tableau[dst.column]:next.foundations[dst.column]).push(...cards);
 if(src.type==='tableau'&&p.length)p.at(-1).faceUp=true;
 next.moves++;return next;
}
export function drawCard(s){
 if(!s.stock.length&&!s.waste.length)return null;
 const next=structuredClone(s);
 if(next.stock.length){const c=next.stock.pop();c.faceUp=true;next.waste.push(c);}
 else{next.stock=next.waste.reverse().map(c=>({...c,faceUp:false}));next.waste=[];}
 next.moves++;return next;
}
function sources(s){return [{type:'waste'},...s.foundations.map((_,column)=>({type:'foundation',column})),...s.tableau.flatMap((p,column)=>p.map((_,index)=>({type:'tableau',column,index})))].filter(src=>movable(s,src));}
export function autoFoundation(s){
 let next=s,count=0;
 while(true){const src=sources(next).find(src=>src.type!=='foundation'&&movable(next,src).length===1&&canMove(next,src,{type:'foundation',column:movable(next,src)[0].suit}));if(!src)break;next=moveCard(next,src,{type:'foundation',column:movable(next,src)[0].suit});count++;}
 return count?next:null;
}
export function hasProgress(s){
 const destinations=[...s.tableau.map((_,column)=>({type:'tableau',column})),...s.foundations.map((_,column)=>({type:'foundation',column}))];
 if(sources(s).some(src=>destinations.some(dst=>canMove(s,src,dst))))return true;
 // In draw-one, every stock/waste card becomes accessible after cycling.
 return [...s.stock,...s.waste].some(card=>{
  const trial={...s,waste:[{...card,faceUp:true}]};return destinations.some(dst=>canMove(trial,{type:'waste'},dst));
 });
}
export function mount(host,api){
 let state=createState(),history=[],selected=null,won=false,destroyed=false;
 const paused=()=>destroyed||api.isPaused?.();
 const announce=t=>api.announce?.(t);
 function stats(){const n=foundationCount(state);const best=api.best?.('solitaire-foundations',n)??n;api.stats?.({Moves:state.moves,Foundations:`${n} / 52`,Best:best});}
 function srcAttr(src){return `data-type="${src.type}"${src.column!==undefined?` data-column="${src.column}"`:''}${src.index!==undefined?` data-index="${src.index}"`:''}`;}
 function isSelected(src){return selected&&selected.type===src.type&&selected.column===src.column&&selected.index===src.index;}
 function card(c,src,extra=''){
  const sel=isSelected(src);
  return `<button type="button" class="sol-card ${red(c)?'sol-red':'sol-black'} ${sel?'sol-selected':''} ${extra}" ${srcAttr(src)} data-card="${c.id}" aria-label="${label(c)}${sel?', selected':''}" aria-pressed="${!!sel}"><span class="sol-corner">${rank(c.rank)}<span>${SUITS[c.suit]}</span></span><span class="sol-pip" aria-hidden="true">${SUITS[c.suit]}</span></button>`;
 }
 function render(focusId){
  stats();const n=foundationCount(state),selection=selected?movable(state,selected):null;
  const top=`<div class="sol-tools"><p class="sol-instruction" id="sol-instruction">${selection?`${label(selection[0])} selected. Choose a destination.`:'Select a face-up card, then its destination.'}</p><div><button type="button" class="sol-action" data-action="undo" ${history.length?'':'disabled'}>↶ Undo</button><button type="button" class="sol-action" data-action="auto">Auto-foundation</button>${selected?'<button type="button" class="sol-action" data-action="cancel">Cancel selection</button>':''}</div></div>`;
  const stock=`<div class="sol-pile"><span class="sol-pile-label">Stock · ${state.stock.length}</span><button type="button" class="sol-card sol-stock ${state.stock.length?'sol-backed':'sol-empty'}" data-action="draw" aria-label="${state.stock.length?`Draw one card. ${state.stock.length} cards in stock`:`Recycle ${state.waste.length} waste cards`}" ${state.stock.length||state.waste.length?'':'disabled'}><span aria-hidden="true">${state.stock.length?'✦':'↻'}</span></button></div>`;
  const waste=`<div class="sol-pile"><span class="sol-pile-label">Waste · ${state.waste.length}</span>${state.waste.length?card(state.waste.at(-1),{type:'waste'}):'<div class="sol-card sol-empty" aria-label="Waste empty"><span aria-hidden="true">—</span></div>'}</div>`;
  const foundations=state.foundations.map((p,column)=>`<div class="sol-pile"><span class="sol-pile-label">${SUITS[column]} <span class="sol-sr">foundation</span> · ${p.length}</span>${p.length?card(p.at(-1),{type:'foundation',column}):`<button type="button" class="sol-card sol-empty ${column===1||column===3?'sol-red':''}" data-type="foundation" data-column="${column}" aria-label="Empty ${['spades','hearts','clubs','diamonds'][column]} foundation. Place an Ace"><span aria-hidden="true">${SUITS[column]}</span></button>`}</div>`).join('');
  const columns=state.tableau.map((p,column)=>{
   const hidden=p.filter(c=>!c.faceUp).length;
   return `<div class="sol-column" aria-label="Tableau ${column+1}, ${hidden} hidden cards" style="--sol-count:${Math.max(1,p.length)}"><span class="sol-pile-label">${column+1}<span class="sol-sr"> · ${hidden} hidden</span></span><div class="sol-stack">${p.length?p.map((c,index)=>`<div class="sol-card-position" style="--sol-index:${index}">${c.faceUp?card(c,{type:'tableau',column,index}):'<div class="sol-card sol-backed" aria-hidden="true"><span>✦</span></div>'}</div>`).join(''):`<button type="button" class="sol-card sol-empty" data-type="tableau" data-column="${column}" aria-label="Empty tableau column ${column+1}. Place a King"><span aria-hidden="true">K</span></button>`}</div></div>`;
  }).join('');
  host.innerHTML=`<section class="sol-game" aria-label="Klondike solitaire">${top}<div class="sol-board" aria-describedby="sol-instruction"><div class="sol-top"><div class="sol-draw-piles">${stock}${waste}</div><div class="sol-foundations">${foundations}</div></div><div class="sol-tableau">${columns}</div></div><p class="sol-feedback" role="status">${n===52?'All 52 cards home. You won!':!hasProgress(state)?'No legal progress remains in this deal. Undo an earlier action or start a new deal.':'Draw one · Unlimited stock recycles · Kings fill empty columns'}</p><details class="sol-rules"><summary>How to play Klondike</summary><p>${rules}</p></details></section>`;
  if(focusId){const target=[...host.querySelectorAll('[data-card]')].find(el=>el.dataset.card===focusId)||host.querySelector(`[data-action="${focusId}"]`);target?.focus({preventScroll:true});}
 }
 function commit(next,message,focusId){if(!next)return false;history.push(state);state=next;selected=null;api.sound?.('tap');render(focusId);announce(message);if(foundationCount(state)===52&&!won){won=true;api.sound?.('win');announce('You won Klondike. All 52 cards are on the foundations.');}return true;}
 function click(e){
  const b=e.target.closest('button');if(!b||!host.contains(b)||paused())return;
  const action=b.dataset.action;
  if(action==='draw'){commit(drawCard(state),state.stock.length?'Drew one card to the waste.':'Recycled the waste into the stock.','draw');return;}
  if(action==='undo'){if(history.length){state=history.pop();selected=null;won=false;render('undo');announce('Last action undone.');api.sound?.('tap');}return;}
  if(action==='auto'){if(!commit(autoFoundation(state),'Moved available cards to the foundations.','auto'))announce('No available card can move to a foundation.');return;}
  if(action==='cancel'){selected=null;render();announce('Selection cleared.');return;}
  if(!b.dataset.type)return;
  const src={type:b.dataset.type};if(b.dataset.column!==undefined)src.column=Number(b.dataset.column);if(b.dataset.index!==undefined)src.index=Number(b.dataset.index);
  const id=b.dataset.card;
  if(selected){
   if(isSelected(src)){selected=null;render(id);announce('Selection cleared.');return;}
   const next=moveCard(state,selected,{type:src.type,column:src.column});
   if(next){commit(next,'Card moved.',movable(state,selected)[0].id);return;}
  }
  const cards=movable(state,src);
  if(cards){selected=src;render(id);announce(`${label(cards[0])}${cards.length>1?` and ${cards.length-1} following cards`:''} selected. Choose a destination.`);}
  else announce('That destination does not accept the selected card. Tableau builds down in alternating colors; only Kings enter empty columns.');
 }
 host.addEventListener('click',click);render();
 return {restart(){if(destroyed)return;state=createState();history=[];selected=null;won=false;render();announce('New Klondike deal.');},destroy(){destroyed=true;host.removeEventListener('click',click);host.innerHTML='';}};
}

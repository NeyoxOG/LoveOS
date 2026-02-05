const KEY='fiaos_session';
let user=null,score=0,level=1,filled=0;
const foods=['🥛','🧃','🍎','🥕','🥚','🧀','🍇'];

function init(){const s=localStorage.getItem(KEY); if(!s)return; user=JSON.parse(s); user.id=user.id||user.userId; buildGrid(); document.getElementById('start').classList.add('active');}
function buildGrid(){const g=document.getElementById('fridge'); g.innerHTML=''; for(let i=0;i<24;i++){const d=document.createElement('div'); d.className='slot'; d.dataset.i=i; d.onclick=()=>place(d); g.appendChild(d);} renderDock();}
function renderDock(){const d=document.getElementById('dock'); d.innerHTML=''; for(let i=0;i<3;i++){const e=document.createElement('div'); e.className='food'; e.textContent=foods[Math.floor(Math.random()*foods.length)]; d.appendChild(e);} }
function startGame(){score=0; level=1; filled=0; document.querySelectorAll('.slot').forEach(s=>{s.className='slot'; s.textContent='';}); update(); document.getElementById('start').classList.remove('active'); document.getElementById('end').classList.remove('active');}
function place(slot){if(slot.classList.contains('filled')) return; slot.classList.add('filled'); slot.textContent=foods[Math.floor(Math.random()*foods.length)]; filled++; score += 10*level; if(filled%6===0){level++; score += 25; renderDock();}
 if(level>6 || filled>=24){endGame();} update();}
function update(){document.getElementById('score').textContent=score; document.getElementById('level').textContent=level;}
function endGame(){document.getElementById('final').textContent=score; document.getElementById('end').classList.add('active'); save();}
function save(){if(!user)return; const key=`fiaos_user_${user.id}_games`; let d=JSON.parse(localStorage.getItem(key)||'{}'); d.fillfridge=d.fillfridge||{best:0,plays:0}; d.fillfridge.last=score; d.fillfridge.plays++; d.fillfridge.best=Math.max(d.fillfridge.best,score); localStorage.setItem(key,JSON.stringify(d));}
init();

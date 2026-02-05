const SESSION='fiaos_session';
const words=['LIEBE','HERZ','MOND','LUNA','SPIEL','AURORA','GLAS','RUHE','FLOW','FOKUS'];
let user=null,score=0,timeLeft=3000,current='',timer=null;

function init(){const s=localStorage.getItem(SESSION); if(!s)return; user=JSON.parse(s); user.id=user.id||user.userId; nextWord(); resetTimer();}
function scramble(w){return w.split('').sort(()=>Math.random()-0.5).join('');}
function nextWord(){current=words[Math.floor(Math.random()*words.length)]; document.getElementById('scramble').textContent=scramble(current); document.getElementById('answer').value='';}
function resetTimer(){clearInterval(timer); const start=Date.now(); timer=setInterval(()=>{const elapsed=Date.now()-start; const remain=Math.max(0,timeLeft-elapsed); document.getElementById('timer').textContent=(remain/1000).toFixed(2); if(remain<=0){clearInterval(timer); endGame();}},30);} 
window.submitWord=function(){const val=document.getElementById('answer').value.trim().toUpperCase(); if(!val) return; if(val===current){score+=10; document.getElementById('score').textContent=score; timeLeft=Math.max(300,timeLeft-180); document.getElementById('hint').textContent='Stärker! Neues Zeitlimit: '+(timeLeft/1000).toFixed(2)+'s'; nextWord(); resetTimer();} else {document.getElementById('hint').textContent='Fast! Versuch es nochmal.';}}
function endGame(){document.getElementById('hint').textContent='Runde vorbei. Tippe Enter für neue Runde.'; save(); setTimeout(()=>{score=0; document.getElementById('score').textContent='0'; timeLeft=3000; nextWord(); resetTimer();},1200);} 
function save(){if(!user)return; const k=`fiaos_user_${user.id}_games`; let d=JSON.parse(localStorage.getItem(k)||'{}'); d.word=d.word||{best:0,plays:0}; d.word.last=score; d.word.plays++; d.word.best=Math.max(d.word.best,score); localStorage.setItem(k,JSON.stringify(d));}
init();

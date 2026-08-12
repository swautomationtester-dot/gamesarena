
function ensureKbcQuizBrand(){
 const host=document.querySelector("main")||document.body;
 if(!host || document.querySelector(".kbcQuizBrand")) return;
 const el=document.createElement("div");
 el.className="kbcQuizBrand";
 el.setAttribute("aria-label","KBC Quiz");
 el.innerHTML='<span class="kbcOrb">KBC</span><span class="kbcQuizWord">QUIZ</span>';
 host.insertBefore(el,host.firstChild);
}
document.addEventListener("DOMContentLoaded",ensureKbcQuizBrand);
const s=io({transports:["polling","websocket"],upgrade:true,reconnection:true,reconnectionAttempts:Infinity,reconnectionDelay:500,reconnectionDelayMax:4000,timeout:15000}),$=id=>document.getElementById(id);
let me="",gameToken="",accessToken="",tvUniqueUrl="",hasJoined=false,fastSeq=[],fastIndex=0,fastTimer=null,fastStarted=false,lastFastestToken="",eliminationTimer=null,eliminationUntil=0,audiencePollCounts={},audiencePollActive=false,currentQuestion=null,fiftyFiftyRemoved=[],liveState=null,questionClockTimer=null,pollClockTimer=null;
let questionAudio=null,lastQuestionAudioIndex=-1;
function playQuestionAudio(questionIndex){
  if(questionIndex===lastQuestionAudioIndex)return;
  lastQuestionAudioIndex=questionIndex;
  try{
    if(!questionAudio){questionAudio=new Audio("/assets/kbc-question.mp3");questionAudio.preload="auto";questionAudio.volume=0.85;}
    questionAudio.currentTime=0;
    questionAudio.play().catch(()=>{});
  }catch(e){}
}
function updateQuizTimers(x){
 liveState=x;
 clearInterval(questionClockTimer);clearInterval(pollClockTimer);
 const paint=()=>{
   const el=$("questionTimer"); if(!el)return;
   const total=Math.max(1,Number(x.questionTimerTotalMs||30000));
   let ms=Number(x.questionTimerRemaining||0);
   if(x.questionTimerRunning&&x.questionTimerStartAt)ms=Math.max(0,ms-(Date.now()-x.questionTimerStartAt));
   const sec=ms/1000;
   el.textContent=x.questionTimerPaused?`PAUSED • ${sec.toFixed(1)}s`:`${sec.toFixed(1)}s`;
   el.classList.toggle("paused",!!x.questionTimerPaused);
   el.classList.toggle("urgent",sec<=10&&!x.questionTimerPaused);
   const ring=$("timerProgress");
   if(ring){const pct=Math.max(0,Math.min(1,ms/total));ring.style.strokeDashoffset=String(276.46*(1-pct));}
 };
 paint();if(x.questionTimerRunning)questionClockTimer=setInterval(paint,100);
 const paintPoll=()=>{const el=$("audiencePollTimer");if(!el)return;let ms=Number(x.pollTimerRemaining||0);if(x.pollTimerRunning&&x.pollTimerStartAt)ms=Math.max(0,ms-(Date.now()-x.pollTimerStartAt));el.textContent=x.pollTimerRunning?`${(ms/1000).toFixed(1)}s`:`WAITING`;};
 paintPoll();if(x.pollTimerRunning)pollClockTimer=setInterval(paintPoll,100);
}
const prizeLadder=[5,10,15,20,25,30,35,40,45,50];
const safeHavens=[20,40];
function playerScore(users){const u=(users||[]).find(v=>v.employeeCode===me);return u?Number(u.score||0):0}
function renderPlayerLadder(users){ /* hidden in the live player view */ }
function clearAnswerResult(){if($("result"))$("result").innerHTML="";}
function setQuizActive(active){
 const page=document.querySelector(".participantPage");
 if(page)page.classList.toggle("quiz-active",!!active);
}

const q=new URLSearchParams(location.search);if(q.get("room"))$("room").value=q.get("room").replace(/\D/g,"").slice(0,4);gameToken=q.get("game")||"";accessToken=q.get("accessToken")||"";
function redirectToTV(){const room=$("room").value.trim().toUpperCase();if(tvUniqueUrl)location.href=tvUniqueUrl;else if(room)location.href=`/tv.html?room=${encodeURIComponent(room)}`}
s.on("connect",()=>{
  $("connection").textContent="🟢 Connected to game server";
  $("connection").className="box status ok";
  if(hasJoined){
    const room=$("room")?.value.trim(), name=$("name")?.value.trim(), employeeCode=me;
    if(/^\d{4}$/.test(room) && name && employeeCode){
      $("connection").textContent="🔄 Reconnecting your game session…";
      s.emit("player:resume",{code:room,name,employeeCode,game:gameToken,accessToken});
    }
  }
});
s.on("disconnect",()=>{$("connection").textContent="🔴 Connection lost — reconnecting…";$("connection").className="box status bad"});
s.on("connect_error",()=>{$("connection").textContent="🔴 Could not connect to game server";$("connection").className="box status bad"});
// Registration acknowledgement/error handling.
s.on("joined", data=>{
  registrationPending=false;
  const button=document.querySelector('#form button.primary');if(button){button.disabled=false;button.textContent="Register & Join";}
  hasJoined=true;
  const room=$("room")?.value.trim()||new URLSearchParams(location.search).get("room")||"----";
  const name=data?.name||$("name")?.value.trim()||"Player";
  me=data?.employeeCode||me||$("emp")?.value.trim()||"";
  try{sessionStorage.setItem("gamesarena_player_session",JSON.stringify({room,name,employeeCode:me,game:gameToken,accessToken}));}catch(e){}
  if($("playerName"))$("playerName").textContent=name;
  if($("playerRoom"))$("playerRoom").textContent=room;
  $("form")?.classList.add("hidden");
  $("game")?.classList.remove("hidden");
  $("registrationLobby")?.classList.remove("hidden");
  $("playerMain")?.classList.add("hidden");
  $("connection")?.classList.add("hidden");
  document.querySelector(".participantPage")?.classList.add("registered-view");
  if($("registrationMessage"))$("registrationMessage").innerHTML="🟢 <b>Registered successfully.</b><br>Waiting for the host to start Fastest Finger.";
});
s.on("errorMsg", message=>{
  registrationPending=false;
  const button=document.querySelector('#form button.primary');if(button){button.disabled=false;button.textContent="Register & Join";}
  hasJoined=false;
  if($("connection")){
    $("connection").textContent=`⚠️ ${message||"Unable to register for this room."}`;
    $("connection").className="box status bad";
    $("connection").classList.remove("hidden");
  }
  $("form")?.classList.remove("hidden");
  $("game")?.classList.add("hidden");
});

["room","emp"].forEach(id=>{const el=$(id);if(el)el.addEventListener("input",()=>{el.value=el.value.replace(/\\D/g,"").slice(0,id==="room"?4:12);});});

try{const saved=JSON.parse(sessionStorage.getItem("gamesarena_player_session")||"null");if(saved&&q.get("room")&&String(saved.room)===String(q.get("room"))){$("room").value=saved.room;$("name").value=saved.name;$("emp").value=saved.employeeCode;me=saved.employeeCode;hasJoined=true;gameToken=q.get("game")||saved.game||"";accessToken=q.get("accessToken")||saved.accessToken||"";}}catch(e){}
const nameInput=$("name");if(nameInput)nameInput.addEventListener("input",()=>{nameInput.value=nameInput.value.replace(/[^A-Za-z ]/g,"").replace(/\\s+/g," ").replace(/^ /,"");});
let registrationPending=false;
function join(){
 if(registrationPending)return;
 const room=$("room").value.trim(),name=$("name").value.trim();me=$("emp").value.trim();
 if(!/^\d{4}$/.test(room))return alert("Enter the 4-digit room code.");
 if(!/^[A-Za-z]+(?:[ ][A-Za-z]+)*$/.test(name))return alert("Name must contain alphabets only.");
 if(!/^\d+$/.test(me))return alert("Register number must contain numbers only.");
 if(!name)return alert("Enter your full name.");
 if(!me)return alert("Enter employee code.");
 registrationPending=true;
 const button=document.querySelector('#form button.primary');if(button){button.disabled=true;button.textContent="Registering…";}
 $("connection").textContent="⏳ Registering…";$("connection").className="box status";
 try{sessionStorage.setItem("gamesarena_player_session",JSON.stringify({room,name,employeeCode:me,game:gameToken}));}catch(e){}
 s.emit("join",{code:room,name,employeeCode:me,role:"player",game:gameToken,accessToken});
 setTimeout(()=>{
   if(registrationPending){registrationPending=false;
     if(button){button.disabled=false;button.textContent="Register & Join";}
     $("connection").textContent="⚠️ Registration timed out. Please check the room code and try again.";
     $("connection").className="box status bad";
   }
 },12000);
}
function answer(i){
 if(answerLocked)return;
 answerLocked=true;
 document.querySelectorAll("#answers .answer").forEach(b=>b.disabled=true);
 $("status").innerHTML=`🔒 <b>ANSWER LOCKED</b><br>Waiting for host approval…`;
 s.emit("player:answer",{choice:i});
}
function renderQuitButton(amount,enabled=true,currentQuestion=-1){
 const wrap=$("quitWrap"),btn=$("quitBtn"),hint=$("quitHint"); if(!wrap||!btn)return;
 const n=Number(amount||0);
 const milestoneReady=(n===20&&Number(currentQuestion)>=4)||(n===40&&Number(currentQuestion)>=8);
 const ready=Boolean(enabled)&&n>0&&milestoneReady;
 wrap.classList.remove("hidden");
 btn.textContent=ready?`🚪 Quit & Take ₹${n}`:n>0?`🛡️ ₹${n} Safe Money Secured`:"🚪 Safe Money Not Yet Secured";
 btn.disabled=!ready;
 if(hint)hint.innerHTML=ready?`<span class="safeQuitGoldNote">🛡️ Safe Money secured: ₹${n}</span><br>Host approval is required to walk away.`:n>0?`<span class="safeQuitGoldNote">🛡️ ₹${n} secured.</span><br>${n===20?"Safe Quit unlocks in Q5 after completing Q4.":"Safe Quit unlocks in Q9 after completing Q8."}`:`<span class="safeQuitGoldNote">🛡️ Safe Money milestones: ₹20 after Q4 • ₹40 after Q8</span><br>Safe Quit becomes available in Q5/Q9 and requires Host approval.`;
}
function hideQuitButton(){const w=$("quitWrap");if(w)w.classList.add("hidden");}
let safeQuitNoticeUntil=0;
function showSafeQuitNotice(data){
 const name=data?.name||data?.contestant?.name||$("playerName")?.textContent||"Player";
 const amount=Number(data?.amount||0);
 safeQuitNoticeUntil=Date.now()+5000;
 hideQuitButton();
 if($("answers"))$("answers").innerHTML="";
 if($("life"))$("life").innerHTML="";
 if($("result"))$("result").innerHTML="";
 if($("status"))$("status").innerHTML=`<div class="quitDecision safeQuitFarewell">
   <div class="eyebrow">🏆 WELL PLAYED</div>
   <h2>${escapeHtml(name)} LEFT WITH THE SAFE MONEY</h2>
   <p>${escapeHtml(data?.message||`${name} left with the safe money of ₹${amount.toLocaleString("en-IN")}. Well played!`)}</p>
   <strong>₹${amount.toLocaleString("en-IN")}</strong>
 </div>`;
}

function quitGame(){
 if(answerLocked)return; const btn=$("quitBtn"); if(btn?.disabled)return;
 const amount=Number(btn.textContent.replace(/\D/g,"")||0); if(amount<=0)return;
 if(!confirm(`Quit the quiz and take the guaranteed ₹${amount}?`))return;
 btn.disabled=true; $("status").innerHTML=`🚪 <b>Safe Quit requested.</b><br>Waiting for the Host to approve your guaranteed ₹${amount}…`; s.emit("player:quit");
}
function life(type){
 if(answerLocked)return;
 const btn=document.querySelector(`#life button[onclick="life('${type}')"]`);
 if(btn?.disabled)return;
 if(type==="audience"){
   $("status").innerHTML="🗳️ <b>Audience Poll requested.</b><br>Waiting for the Host to approve…";
   s.emit("player:requestAudiencePoll");
   return;
 }
 s.emit("lifeline",{type});
}
function renderFastest(pool,sequence,startAt,duration,difficulty,direction){
 const p=pool.find(x=>x.employeeCode===me);
 clearInterval(fastTimer);
 if(!p){
   $("answers").innerHTML="";
   $("status").innerHTML="⏳ <b>Waiting for the next Fastest Finger round.</b><br>You remain registered and may be selected in the next group of 7.";
   return;
 }
 fastStarted=false;
 fastSeq=[]; fastIndex=0;
 const items=Array.isArray(sequence)?sequence:[];
 $("status").innerHTML="";
 $("answers").innerHTML=`
   <section class="fastestPlayerStage sequenceChallengeStage" aria-label="Fastest Finger Sequence Challenge">
     <div class="fastestPlayerKicker">⚡ FASTEST FINGER</div>
     <h2>SEQUENCE CHALLENGE</h2>
     <p class="fastestPlayerHint">Arrange the numbers in the correct order as quickly as possible.</p>
     <div class="sequenceChallengeMeta"><span>DIFFICULTY: <b>${escapeHtml(difficulty||"HARD")}</b></span><span>ORDER: <b>${escapeHtml(direction||"LOWEST → HIGHEST")}</b></span><span>${items.length} NUMBERS</span></div>
     <div class="fastestPlayerTimer" id="fastCountdown">GET READY</div>
     <div class="fastPad sequencePad" id="sequencePad">${items.map((item,i)=>`<button type="button" class="fastKey sequenceKey" data-index="${i}" disabled>${item.value}</button>`).join("")}</div>
     <div class="fastestPlayerProgress" id="fastProgress">SELECT THE LOWEST NUMBER FIRST</div>
   </section>`;
 const buttons=[...document.querySelectorAll("#sequencePad .sequenceKey")];
 const setEnabled=v=>buttons.forEach(b=>b.disabled=!v);
 const submitSequence=(index)=>{
   if(!fastStarted)return;
   const btn=buttons[index]; if(!btn||btn.disabled)return;
   btn.classList.add("pressed");
   setTimeout(()=>btn.classList.remove("pressed"),120);
   s.emit("fastest:submitSequence",{index:Number(index)});
 };
 buttons.forEach((btn,i)=>btn.addEventListener("click",()=>submitSequence(i)));
 setEnabled(false);
 const begin=()=>{
   fastStarted=true;
   setEnabled(true);
   $("fastCountdown").textContent=`${(duration/1000).toFixed(1)}s`;
   if($("fastProgress"))$("fastProgress").textContent=`⚡ START • LOWEST → HIGHEST • ${items.length} NUMBERS`;
   clearInterval(fastTimer);
   fastTimer=setInterval(()=>{
     const remain=Math.max(0,startAt+duration-Date.now());
     if($("fastCountdown"))$("fastCountdown").textContent=`${(remain/1000).toFixed(1)}s`;
     if(remain<=0){
       clearInterval(fastTimer);fastStarted=false;setEnabled(false);
       if($("fastCountdown"))$("fastCountdown").textContent="⏱️ TIME UP";
       if($("fastProgress"))$("fastProgress").textContent="TIME UP • WAIT FOR RESULT";
     }
   },50);
 };
 const wait=()=>{
   const ms=Math.max(0,startAt-Date.now());
   if($("fastCountdown"))$("fastCountdown").textContent=ms>0?`STARTING IN ${(ms/1000).toFixed(1)}s`:"GO!";
   if(ms<=0)begin();
 };
 fastTimer=setInterval(wait,50);wait();
}

s.on("fastestSequenceResult",r=>{
 if(r.correct){
   const buttons=[...document.querySelectorAll("#sequencePad .sequenceKey")];
   const exact=buttons.find(b=>Number(b.dataset.index)===Number(r.index));
   if(exact && Number(r.progress||0)>fastIndex){
     exact.classList.add("sequenceDone");
     exact.disabled=true;
     fastIndex=Number(r.progress||fastIndex+1);
   }
   if($("fastProgress"))$("fastProgress").textContent=r.complete?`🏆 COMPLETE • ${(Number(r.elapsed||0)/1000).toFixed(2)} seconds`:`✓ CORRECT • ${Number(r.progress||0)} / ${Number(r.total||buttons.length)}`;
   if(r.complete){
     fastStarted=false;clearInterval(fastTimer);buttons.forEach(b=>b.disabled=true);
     if($("fastCountdown"))$("fastCountdown").textContent=`🏆 ${(Number(r.elapsed||0)/1000).toFixed(2)}s`;
   }
 }else{
   if($("fastProgress"))$("fastProgress").textContent=`❌ WRONG ORDER • ${Number(r.progress||0)} / ${Number(r.total||8)} • TRY AGAIN`;
   const buttons=[...document.querySelectorAll("#sequencePad .sequenceKey")];
   const wrong=buttons.find(b=>Number(b.dataset.index)===Number(r.index));
   if(wrong){wrong.classList.remove("wrongKey");void wrong.offsetWidth;wrong.classList.add("wrongKey");}
 }
});

function showEliminationNotice(info){
 clearInterval(eliminationTimer);
 const until=Number(info.until||Date.now()+30000);
 const name=info.name||"Contestant";
 const score=Number(info.pointsEarned??info.score??0);
 $("answers").innerHTML="";
 $("life").innerHTML="";
 const tick=()=>{
   const remaining=Math.max(0,until-Date.now());
   const seconds=Math.ceil(remaining/1000);
   $("status").innerHTML=`<div class="eliminationCard"><div class="eliminationIcon">✕</div><div class="eyebrow">WELL PLAYED</div><h2>${name}</h2><p>Thank you for playing!</p><div class="securedPoints">Points secured <strong>₹${score.toLocaleString("en-IN")}</strong></div><div class="redirectCountdown">Returning to the TV screen in <b>${seconds}</b> seconds…</div></div>`;
   if(remaining<=0){clearInterval(eliminationTimer);eliminationUntil=0;redirectToTV();}
 };
 tick();
 eliminationTimer=setInterval(tick,250);
}
s.on("eliminationNotice",info=>{
 eliminationUntil=Number(info.until||Date.now()+30000);
 showEliminationNotice(info);
});

let playerWinnerAudio=null;
let playerWinnerTimer=null;
function startPlayerWinnerAudio(until){
  if(playerWinnerTimer)clearInterval(playerWinnerTimer);
  const btn=$("playerWinnerSound");
  const play=()=>{
    try{
      if(!playerWinnerAudio){
        playerWinnerAudio=new Audio("/assets/kbc-theme.mp3");
        playerWinnerAudio.preload="auto";
        playerWinnerAudio.volume=0.9;
      }
      playerWinnerAudio.currentTime=0;
      playerWinnerAudio.play().catch(()=>{});
      if(btn)btn.textContent="🔊 CELEBRATION MUSIC PLAYING";
    }catch(e){}
  };
  if(btn)btn.onclick=play;
  play();
  const tick=()=>{
    const left=Math.max(0,Math.ceil((until-Date.now())/1000));
    const el=$("playerWinnerCountdown");if(el)el.textContent=left;
    if(left<=0){
      clearInterval(playerWinnerTimer);
      if(playerWinnerAudio){playerWinnerAudio.pause();playerWinnerAudio.currentTime=0;}
    }
  };
  tick();playerWinnerTimer=setInterval(tick,250);
}
function renderAudiencePollResult(counts, question){
 const el=$("audiencePollResult");
 if(!el)return;
 const c=counts||{};
 const total=Object.values(c).reduce((a,b)=>a+Number(b||0),0);
 if(!audiencePollActive){el.classList.add("hidden");el.innerHTML="";return;}
 const opts=(question?.options)||currentQuestion?.options||["Option A","Option B","Option C","Option D"];
 el.classList.remove("hidden");
 el.innerHTML=`<div class="pollPanelTitle">🗳️ LIVE AUDIENCE POLL <span class="pollTimerBadge">HOST TIMER: <b id="audiencePollTimer">WAITING</b></span></div><div class="pollPanelQuestion">${question?.text||"Audience votes"}</div>`+opts.map((o,i)=>{const n=Number(c[i]||0),pct=total?Math.round(n*100/total):0;return `<div class="pollVoteRow"><div><b>${String.fromCharCode(65+i)}. ${o}</b><strong>${pct}%</strong></div><div class="pollTrack"><i style="width:${pct}%"></i></div><small>${n} vote${n===1?"":"s"}</small></div>`}).join("")+`<div class="pollTotal">${total} total vote${total===1?"":"s"}</div>`;
}

let playerRulesLocalClosed=true;
function togglePlayerRules(show=true){
  const modal=$("playerRulesModal"); if(!modal)return;
  playerRulesLocalClosed=!show;
  modal.classList.toggle("hidden",!show);
}
function closePlayerRules(){
  const modal=$("playerRulesModal"); if(!modal)return;
  playerRulesLocalClosed=true;
  modal.classList.add("hidden");
}
function syncRulesVisibility(x){
  const modal=$("playerRulesModal"); if(!modal)return;
  const visible=!!x.rulesVisible;
  if(visible && !syncRulesVisibility.last && playerRulesLocalClosed){
    modal.classList.remove("hidden");
    playerRulesLocalClosed=false;
  } else if(!visible){
    modal.classList.add("hidden");
    playerRulesLocalClosed=true;
  }
  syncRulesVisibility.last=visible;
}

s.on("state",x=>{ tvUniqueUrl=x.screenUrl||tvUniqueUrl; updateQuizTimers(x); syncRulesVisibility(x); renderPlayerLadder(x.users);
 if(safeQuitNoticeUntil>Date.now()){ return; }
 if(x.contestantQuit && x.contestantQuit.employeeCode===me){
   showSafeQuitNotice({name:x.contestantQuit.name,amount:x.contestantQuit.amount,message:x.contestantQuit.message});
   return;
 }
 if(eliminationUntil>Date.now()){
   return;
 }
 if(x.eliminatedContestant && x.eliminatedContestant.employeeCode===me && Date.now()<Number(x.eliminatedContestant.until||0)){
   eliminationUntil=Number(x.eliminatedContestant.until);
   showEliminationNotice(x.eliminatedContestant);
   return;
 }
 clearInterval(eliminationTimer);
 if(x.phase==="registration"){
   hideQuitButton();
   if(!audiencePollActive)clearAnswerResult();
   if(hasJoined){
     $("form").classList.add("hidden");
     $("game").classList.remove("hidden");
     $("registrationLobby")?.classList.remove("hidden");
     $("playerMain")?.classList.add("hidden");
     document.querySelector(".participantPage")?.classList.add("registered-view");
     if($("playerRoom"))$("playerRoom").textContent=$("room")?.value.trim()||"----";
     if($("registrationMessage"))$("registrationMessage").innerHTML="🟢 <b>Registered successfully.</b><br>Waiting for the host to start Fastest Finger.";
   }
   return;
}
 if(x.phase==="fastest"){$("registrationMessage")?.classList.add("hidden");$("registrationLobby")?.classList.add("hidden");$("playerMain")?.classList.remove("hidden");hideQuitButton();audiencePollActive=false;renderAudiencePollResult({},null);clearAnswerResult();if(lastFastestToken!==x.fastestToken){lastFastestToken=x.fastestToken||"active";renderFastest(x.pool,x.fastestSequence,x.fastestStartAt,x.fastestDurationMs,x.fastestSequenceDifficulty,x.fastestSequenceDirection);}$("life")?.replaceChildren();return}
 if(x.phase==="fastestResult"){lastFastestToken="";$("registrationMessage")?.classList.add("hidden");$("registrationLobby")?.classList.add("hidden");$("playerMain")?.classList.remove("hidden");hideQuitButton();audiencePollActive=false;renderAudiencePollResult({},null);clearAnswerResult();
   const iWon=x.winner&&x.winner.employeeCode===me;
   $("answers").innerHTML="";
   if(iWon){
     $("status").innerHTML="🏆 <b>You won Fastest Finger!</b><br>Wait for the host to start your new game.";
   }else{
     $("status").innerHTML="⏳ <b>Not selected this round.</b><br>You remain in the waiting list. Stay here — the host can select you in the next Fastest Finger round.";
   }
   return
 }
 if(x.phase==="fastestTimeout"){lastFastestToken="";$("registrationMessage")?.classList.add("hidden");$("registrationLobby")?.classList.add("hidden");$("playerMain")?.classList.remove("hidden");hideQuitButton();audiencePollActive=false;renderAudiencePollResult({},null);clearAnswerResult();
   $("answers").innerHTML="";
   $("status").innerHTML="⏳ <b>Waiting for the next Fastest Finger round.</b><br>You remain registered and may be selected in the next round.";
   return}
 if(x.phase==="eliminated"){$("registrationLobby")?.classList.add("hidden");$("playerMain")?.classList.remove("hidden");hideQuitButton();audiencePollActive=false;renderAudiencePollResult({},null);clearAnswerResult();$("status").innerHTML="❌ <b>Game result is being shown…</b>";return}
 if(x.phase==="question"&&x.question){$("registrationMessage")?.classList.add("hidden");$("registrationLobby")?.classList.add("hidden");$("playerMain")?.classList.remove("hidden");currentQuestion=x.question;playQuestionAudio(x.current);if(!audiencePollActive)clearAnswerResult(); audiencePollActive=!!x.pollActive; audiencePollCounts=x.pollCounts||audiencePollCounts; renderAudiencePollResult(audiencePollCounts,x.question);
   if(x.contestant&&x.contestant.employeeCode===me){
     setQuizActive(true);
     hasJoined=true;
     $("form").classList.add("hidden");
     $("connection").classList.add("hidden");
     $("game").classList.remove("hidden");answerLocked=!!x.pendingAnswer;
     fiftyFiftyRemoved=Array.isArray(x.fiftyFiftyRemoved)?x.fiftyFiftyRemoved.map(Number):[];
     $("status").innerHTML=`<div class=eyebrow>YOUR GAME • QUESTION ${x.current+1} OF ${(x.totalQuestions||10)} • ${x.question.points} POINTS</div><div class="questionCategory">${x.question.category||"General Knowledge"}</div><br><b>${x.question.text}</b>`;
     $("answers").innerHTML="";
     x.question.options.forEach((o,i)=>{
       const b=document.createElement("button");
       b.className="answer";
       b.textContent=`${String.fromCharCode(65+i)}. ${o}`;
       if(fiftyFiftyRemoved.includes(i)){
         b.classList.add("eliminatedOption");
         b.innerHTML=`<span class="fiftyStrike">✕</span> OPTION REMOVED`;
         b.disabled=true;
       }
       if(x.pendingAnswer && x.pendingAnswer.choice===i){
         b.classList.add("lockedAnswer");
         b.innerHTML=`🔒 ${String.fromCharCode(65+i)}. ${o} <span>LOCKED</span>`;
         b.disabled=true;
       }
       b.onclick=()=>{ if(!fiftyFiftyRemoved.includes(i)) answer(i); };
       $("answers").appendChild(b);
     });
     const used=x.lifelines||{};
const used5050=!!used["5050"],usedAudience=!!used["audience"],usedPhone=!!used["phone"];
const lockAudience=usedAudience;
const lock5050=used5050;
$("life").innerHTML=`<button onclick="life('5050')" ${lock5050?"disabled":""}>${used5050?"✓ ":""}50:50</button><button onclick="life('audience')" ${lockAudience?"disabled":""}>${usedAudience?"✓ ":""}Audience</button><button onclick="life('phone')" ${usedPhone?"disabled":""}>${usedPhone?"✓ ":""}Phone-a-Friend</button>`;
     const meUser=(x.users||[]).find(u=>u.employeeCode===me); const assured=Number(x.contestantAssuredMoney||meUser?.assuredMoney||0); renderQuitButton(assured,!x.pendingAnswer&&!x.pendingQuit,x.current);
   }else{
     setQuizActive(false);
     $("status").innerHTML="📺 <b>You are not the current contestant.</b><br>Watch the projector screen.";
     $("answers").innerHTML="";
     $("life").innerHTML="";
     hideQuitButton();
   }
   return;
 }
 if(x.phase==="winnerCelebration"){
  hideQuitButton();
  setQuizActive(true);
  clearAnswerResult();
  const iWon=x.winner&&x.winner.employeeCode===me;
  if(iWon){
    const until=Number(x.winnerCelebrationUntil||Date.now()+30000);
    $("answers").innerHTML="";
    $("life").innerHTML="";
    $("status").innerHTML=`<div class="winnerPlayer">
      <div class="eyebrow">🏆 GAMESARENA QUIZ • FINAL CHECK</div>
      <div class="winnerCrown">🏆</div>
      <h1>CONGRATULATIONS</h1>
      <h2>${x.winner.name||"Champion"}</h2>
      <p>ALL 10 ANSWERS CORRECT</p>
      <strong>₹50</strong>
      <div class="winnerCountdown" id="playerWinnerCountdown">30</div>
      <button class="primary" id="playerWinnerSound">🔊 PLAY CELEBRATION MUSIC</button>
    </div>`;
    startPlayerWinnerAudio(until);
  }else{
    $("status").innerHTML="🏆 <b>We have a winner!</b><br>Watch the TV screen.";
    $("answers").innerHTML="";
    $("life").innerHTML="";
  }
  return;
}
if(x.phase==="finished"){clearAnswerResult();$("status").innerHTML="📺 <b>Game complete.</b>";setTimeout(redirectToTV,1000)}
});
s.on("answerResult",r=>{
 if(r.eliminated){
   const c=r.contestant||{};
   showEliminationNotice({name:c.name||"Contestant",pointsEarned:r.pointsEarned||0,until:Date.now()+30000});
 }
});
s.on("audiencePollApproved",d=>{
  audiencePollActive=false;
  audiencePollCounts=d.counts||{};
  $("status").innerHTML="🗳️ <b>Audience Poll approved.</b><br>The audience can vote now.";
  renderAudiencePollResult(audiencePollCounts,currentQuestion);
});
s.on("poll",counts=>{
  audiencePollActive=true;
  audiencePollCounts={...counts};
  renderAudiencePollResult(audiencePollCounts,currentQuestion);
  const total=Object.values(counts||{}).reduce((a,b)=>a+Number(b||0),0);
  if($("status") && total)$("status").innerHTML=`🗳️ <b>Audience Poll is live.</b><br>${total} audience vote${total===1?"":"s"} received.`;
});
s.on("audiencePollRejected",()=>{audiencePollActive=false;audiencePollCounts={};renderAudiencePollResult({},null);});
s.on("audiencePollStopped",()=>{audiencePollActive=false;audiencePollCounts={};renderAudiencePollResult({},null);});
s.on("audiencePollTimeUp",()=>{audiencePollActive=false;audiencePollCounts={};renderAudiencePollResult({},null);if($("status"))$("status").innerHTML="⏱️ <b>Audience Poll time is up.</b><br>The question timer has resumed.";});
s.on("audiencePollStarted",()=>{audiencePollActive=true;renderAudiencePollResult(audiencePollCounts,currentQuestion);});
s.on("lifelineResult",r=>{
 if(r.error){
   $("result").innerHTML=`<div class="box bad">⚠️ ${r.error}</div>`;
   return;
 }
 if(r.type==="5050" && Array.isArray(r.remove)){
   r.remove.forEach(i=>{
     const b=document.querySelector(`#answers .answer:nth-child(${Number(i)+1})`);
     if(b){b.disabled=true;b.classList.add("eliminatedOption");b.innerHTML=`<span class="fiftyStrike">✕</span> OPTION REMOVED`;}
   });
   $("result").innerHTML='<div class="box">🎯 <b>50:50 USED</b><br>Two incorrect options have been removed.</div>';
   return;
 }
 if(r.type==="audience" && r.counts){
   const total=Object.values(r.counts).reduce((a,b)=>a+Number(b||0),0);
   const rows=[0,1,2,3].map(i=>`${String.fromCharCode(65+i)}: ${total?Math.round((Number(r.counts[i]||0)*100)/total):0}%`).join(" • ");
   audiencePollActive=true; audiencePollCounts=r.counts||{}; renderAudiencePollResult(audiencePollCounts,currentQuestion);
 }else{
   $("result").innerHTML='<div class=box>'+(r.message||"Lifeline used.")+"</div>";
 }
});

s.on("answerLocked",a=>{
 if(a.contestant.employeeCode!==me)return;
 answerLocked=true;
 document.querySelectorAll("#answers .answer").forEach((b,i)=>{
   b.disabled=true;
   if(i===a.choice){b.classList.add("lockedAnswer");b.innerHTML=`🔒 ${String.fromCharCode(65+i)}. ${a.option} <span>LOCKED</span>`;}
 });
 $("status").innerHTML=`🔒 <b>ANSWER LOCKED</b><br>Waiting for host to approve and reveal.`;
});
s.on("answerRejected",a=>{
 if(a.contestant.employeeCode!==me)return;
 answerLocked=false;
 $("status").innerHTML=`↶ <b>ANSWER UNLOCKED</b><br>You can select another answer.`;
 document.querySelectorAll("#answers .answer").forEach(b=>b.disabled=false);
});
s.on("answerRevealed",a=>{
 if(a.contestant.employeeCode!==me)return;
 document.querySelectorAll("#answers .answer").forEach((b,i)=>{
   if(i===a.choice){
     b.classList.remove("lockedAnswer");
     b.classList.add(a.correct?"correctAnswer":"wrongAnswer");
     b.innerHTML=`${a.correct?"🟢":"🔴"} ${String.fromCharCode(65+i)}. ${a.option} <span>${a.correct?"CORRECT":"WRONG"}</span>`;
   }
 });
 if(a.correct){
   $("status").innerHTML=`<div class="answerDecision correctDecision">🟢 <b>CORRECT ANSWER</b><small>Question value: ₹${Number(a.points||0).toLocaleString("en-IN")} • Guaranteed amount: ₹${Number(a.assuredMoney||0).toLocaleString("en-IN")}</small></div>`;
 }else{
   $("status").innerHTML=`<div class="answerDecision wrongDecision">🔴 <b>WRONG ANSWER</b><small>₹0 prize. You are eliminated.</small></div>`;
 }
});
s.on("quitPending",r=>{
 const amount=Number(r.amount||0);
 const btn=$("quitBtn"); if(btn)btn.disabled=true;
 $("status").innerHTML=`<div class="quitDecision"><div class="eyebrow">🚪 SAFE QUIT REQUESTED</div><h2>Waiting for Host approval</h2><p>Your guaranteed amount is</p><strong>₹${amount.toLocaleString("en-IN")}</strong><small>The Host must approve the walk-away request.</small></div>`;
});
s.on("quitRejected",r=>{
 const btn=$("quitBtn"); if(btn)btn.disabled=false;
 $("status").innerHTML=`⚠️ <b>Safe Quit was not approved.</b><br>${r.reason||"Continue the game."}`;
});
s.on("quitAccepted",r=>{
 showSafeQuitNotice(r);
});
s.on("audiencePollRequested",()=>{});
s.on("audiencePollApproved",()=>{
 $("status").innerHTML="🗳️ <b>Audience Poll is OPEN!</b><br>The audience can now vote.";
 if($("result"))$("result").innerHTML='<div class="box">The Host opened the Audience Poll. Audience votes will update live.</div>';
});
s.on("audiencePollRejected",()=>{
 $("status").innerHTML="↶ <b>Audience Poll rejected.</b><br>You can continue with another lifeline or answer.";
 if($("result"))$("result").innerHTML='<div class="box">The Host rejected the Audience Poll request.</div>';
});

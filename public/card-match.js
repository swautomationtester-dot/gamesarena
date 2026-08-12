const s=io({transports:["websocket","polling"],reconnection:true,reconnectionAttempts:20,reconnectionDelay:700}),$=id=>document.getElementById(id);
let role="",pid="",playerToken="",tvToken="",state=null,room="",accessToken="";
const tokenKey=()=>`gamesarena_cardmatch_player_${room}`;
const tvKey=()=>`gamesarena_cardmatch_tv_${room}`;
function loadTokens(){
  if(!room)return;
  playerToken=localStorage.getItem(tokenKey())||"";
  tvToken=localStorage.getItem(tvKey())||"";
}
accessToken=new URLSearchParams(location.search).get("accessToken")||sessionStorage.getItem(`gamesarena_cardmatch_access_${room}`)||"";
function requestResume(){
  if(!room)return;
  loadTokens();
  if(role==="player"&&playerToken) s.emit("cm:resume",{code:room,playerToken,name:$("name")?.value?.trim()||""});
  else if(role==="tv"&&tvToken) s.emit("cm:tv-resume",{code:room,tvToken});
}
function show(id){document.querySelectorAll(".cmScreen").forEach(x=>x.classList.remove("active"));$(id).classList.add("active")}
function toast(t){let x=$("toast");x.textContent=t;x.classList.add("show");clearTimeout(window._cmToast);window._cmToast=setTimeout(()=>x.classList.remove("show"),2600)}
function esc(x){return String(x||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function emit(type,data={}){s.emit(type,{...data,code:room})}
function syncRoleClass(){document.body.classList.toggle("cmIsPlayer",role==="player");document.body.classList.toggle("cmIsTv",role==="tv");}
function setParticipantIdentity(){
  syncRoleClass();
  const p=(state?.players||[]).find(x=>x.id===pid);
  const name=p?.name||"";
  const targets=[$("participantIdentityJoin"),$("participantIdentityLobby"),$("participantIdentityGame")];
  targets.forEach(el=>{
    if(!el)return;
    const showIt=role==="player"&&Boolean(name);
    el.classList.toggle("hidden",!showIt);
    if(showIt) el.innerHTML=`<span class="identityDot" style="--player:${p.color||"#20c997"}"></span><span><small>YOU ARE PLAYING AS</small><b>${esc(name)}</b></span>`;
  });
}

function current(){return state?.players?.[state.turn]||null}
function next(){return state?.nextTurn==null?null:state.players[state.nextTurn]||null}
s.on("connect",()=>{
  console.log("Card Match connected",s.id);
  if(room) requestResume();
});
s.on("connect_error",()=>toast("Game server connection failed — reconnecting…"));
s.on("cm:room",d=>{
  role="tv";room=d.code;tvToken=d.tvToken||tvToken;syncRoleClass();
  if(tvToken)localStorage.setItem(tvKey(),tvToken);
  $("code").textContent=d.code;
  const joinUrl=String(d.joinUrl||"").replace(/^https?,\s*/i,"");
  $("url").href=joinUrl;$("url").textContent="Open player page ↗";
  $("qr").innerHTML="";
  if(window.QRCode)new QRCode($("qr"),{text:joinUrl,width:160,height:160});
  show("lobby");
});
s.on("cm:joined",d=>{
  role="player";pid=d.playerId;room=d.code;playerToken=d.playerToken||playerToken;syncRoleClass();
  if(playerToken)localStorage.setItem(tokenKey(),playerToken);
  show("game");
  setParticipantIdentity();
});

s.on("cm:error",d=>{toast(d.message);if(String(d.message||"").toLowerCase().includes("room not found")){show("joinPage");$("room").classList.add("expired");$("joinHint").textContent="That room has expired. Create a new Host game and use its new code."}});
s.on("cm:state",d=>{state=d;render()});

$("create").onclick=()=>{role="";room="";tvToken="";emit("cm:create")};
$("join").onclick=()=>show("joinPage");
$("back").onclick=()=>show("home");
$("start").onclick=()=>{if(!room)return toast("Create a room first.");emit("cm:start",{code:room})};
$("restartGame").onclick=()=>{if(role==="tv")emit("cm:restart",{code:room});else toast("Only the Host can start a new game.")};
$("refreshGame").onclick=()=>{if(role==="tv")emit("cm:refresh",{code:room});else toast("Only the Host can refresh the board.")};
$("again").onclick=()=>{if(role==="tv")emit("cm:restart",{code:room});else toast("Only the Host can start a new game.")};
$("winnerRefresh").onclick=()=>{if(role==="tv")emit("cm:refresh",{code:room});else toast("Only the Host can refresh the board.")};
$("lobbyNew").onclick=()=>{role="";room="";tvToken="";emit("cm:create")};
$("joinNow").onclick=()=>{
 let n=$("name").value.trim()||"Player",c=$("room").value.trim();
 if(!/^\d{4}$/.test(c))return toast("Enter the 4-digit room code.");
 room=c;loadTokens();
 sessionStorage.setItem(`gamesarena_cardmatch_access_${room}`,accessToken); emit("cm:join",{name:n,accessToken});
};

function render(){
 if(!state)return;

 // Board size is determined by the number of players: four players use a
 // 5×5 / 25-cell board; smaller rooms use the classic 4×4 / 16-cell board.
 // If a reconnect delivered a partial state, ask the server for the
 // authoritative state instead of leaving a blank board.
 const expectedCards=(state.players||[]).length===4?25:16;
 if((state.status==="playing"||state.status==="finished") && (!Array.isArray(state.deck)||state.deck.length!==expectedCards)){
   $("board").innerHTML=`<div class="cmBoardLoading"><span>↻</span><b>Syncing game board…</b><small>Restoring the live cards</small></div>`;
   if(s.connected)requestResume();
   return;
 }

 if(state.status==="lobby"){
   show("lobby");
   syncRoleClass();
   const lobbyCode=$("code"), lobbyQr=$("qr"), lobbyUrl=$("url");
   const isPlayerLobby=role==="player";
   const lobbyNew=$("lobbyNew");
   if(lobbyNew) lobbyNew.style.display=role==="tv"?"":"none";
   if(lobbyCode) lobbyCode.setAttribute("aria-hidden",String(isPlayerLobby));
   if(lobbyQr) lobbyQr.setAttribute("aria-hidden",String(isPlayerLobby));
   if(lobbyUrl) lobbyUrl.setAttribute("aria-hidden",String(isPlayerLobby));
   setParticipantIdentity();
   $("players").innerHTML=(state.players||[]).map(p=>`<div class="cmPlayer" style="--player:${p.color}"><span class="playerDot"></span><div><b>${esc(p.name)}</b><small style="color:${p.color}">${p.id===pid?"YOU • REGISTERED":"Ready to play"}</small></div></div>`).join("")||`<div class="cmEmpty">Waiting for players…</div>`;
   const startBtn=$("start");
   if(startBtn){
     startBtn.style.display=role==="tv"?"":"none";
     startBtn.disabled=(state.players||[]).length<2;
   }
   const panelLabel=document.querySelector("#lobby .cmPanel > label");
   if(panelLabel) panelLabel.textContent=role==="player"?"WAITING FOR HOST":"ROOM READY";
   const lobbyTitle=document.querySelector("#lobby .cmPanel > p");
   if(lobbyTitle) lobbyTitle.textContent=role==="player"?"You are registered. The Host will start the match when everyone is ready.":"Scan the QR code or enter the room code.";
   return;
 }

 if(state.status==="finished"){
   show("winner");
   const winners=state.winner||[];
   $("winnerText").textContent=winners.length===1?winners[0]+" wins!":winners.length>1?"It's a tie!":"Game complete";
   if($("winnerAmount"))$("winnerAmount").textContent=state.winnerAmount?`WINNING AMOUNT • ₹${state.winnerAmount}`:"";
   const fmt=ms=>{const sec=Math.max(0,Math.round((ms||0)/1000));return `${Math.floor(sec/60)}m ${String(sec%60).padStart(2,"0")}s`};
   const reason=state.winnerReason?`<div class="cmTieReason">${esc(state.winnerReason)}</div>`:"";
   $("final").innerHTML=reason+(state.players||[]).slice().sort((a,b)=>b.score-a.score||(a.timeMs||0)-(b.timeMs||0)).map(p=>`<div class="cmFinalRow" style="border-left:4px solid ${p.color}"><b>${esc(p.name)}</b><small>${p.score} pair${p.score===1?"":"s"} · ${fmt(p.timeMs)}</small></div>`).join("");
   return;
 }

 show("game");
 setParticipantIdentity();
 const players=state.players||[];
 const cur=players[state.turn]||null,nxt=state.nextTurn==null?null:players[state.nextTurn]||null;
 $("turn").innerHTML=`<span style="color:${cur?.color||"#fff"}">${esc(cur?.name||"Player")}</span>'s turn`;
 const statusEl=$("status"); if(statusEl) statusEl.textContent=role==="player"&&cur?.id===pid?"Your turn — find a pair!":"";
 const roomLabelEl=$("roomLabel"); if(roomLabelEl) roomLabelEl.textContent=`Room ${state.code}`;

 const nextEl=$("nextPlayer"),nextDot=$("nextDot");
 if(nextEl)nextEl.textContent=nxt?.name||"—";
 if(nextDot)nextDot.style.setProperty("--player",nxt?.color||"#5c8dff");
 if($("sidePlayers"))$("sidePlayers").textContent=`${players.length}/4`;
 if($("sidePairs"))$("sidePairs").textContent=players.reduce((n,p)=>n+(p.score||0),0);
 if($("sideRoom"))$("sideRoom").textContent=state.code||"—";
 if($("sideScores"))$("sideScores").innerHTML=players.map(p=>`<div class="sideScoreRow"><span class="scoreDot" style="--player:${p.color}"></span><b>${esc(p.name)}</b><strong>${p.score}</strong></div>`).join("");

 const open=new Set(state.flipped||[]);
 const board=$('board');
 board.classList.toggle('board-5x5',state.deck.length===25);
 board.classList.toggle('board-4x4',state.deck.length!==25);
 $("board").innerHTML=state.deck.map(c=>{
   const visible=open.has(c.id)||Boolean(c.matched);
   const ok=role==="player"&&cur?.id===pid&&!c.matched&&(state.flipped||[]).length<2;
   const ownerColor=c.matchedByColor||"";
   const ownerClass=ownerColor?` ownedPair`:"";
   const bonusClass=c.bonus?` bonusCard`:"";
   const ownerStyle=ownerColor?` style="--pair-color:${ownerColor}"`:"";
   const revealClass=c.matched?` pairRevealed`:"";
   return `<button class="cmCard ${visible?"open ":""}${c.matched?"matched":""}${revealClass}${ownerClass}${bonusClass}"${ownerStyle} data-id="${c.id}" aria-disabled="${!ok}" ${ok?"":"disabled"} title="${c.bonus?"Bonus card":c.matched?"Matched pair":"Card"}">
     <span class="cmInner">
       <span class="cmFace cmBack"><img class="gaCardLogo" src="/assets/gamesarena-logo-premium.png" alt="GamesArena"></span>
       <span class="cmFace cmFront"><img src="${esc(c.image)}" alt="${esc(c.key||"memory card")}"></span>
     </span>
   </button>`;
 }).join("");

 document.querySelectorAll(".cmCard").forEach(c=>c.onclick=()=>{
   if(c.getAttribute("aria-disabled")!=="true")emit("cm:flip",{cardId:+c.dataset.id});
 });

 $("refreshGame").style.display=role==="tv"?"inline-flex":"none";
 $("restartGame").style.display=role==="tv"?"inline-flex":"none";
 const hostOnly=document.querySelectorAll(".hostOnlyControl");hostOnly.forEach(el=>el.style.display=role==="tv"?"":"none");
}

const q=new URLSearchParams(location.search).get("join");
if(q&&/^\d{4}$/.test(q)){
  room=q;loadTokens();
  $("room").value=q;show("joinPage");
  $("joinHint").textContent="Room "+q+" — enter your name and join the card game.";
}

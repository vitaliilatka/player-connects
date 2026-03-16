const token = localStorage.getItem("token");

if (!token) window.location.href = "/index.html";

let squad = [];
let lineup = new Array(11).fill(null);
let subs = new Array(5).fill(null);

let currentMatch = null;
let motm = null;

let existingPrediction = null;

let playerModal;
let modalCallback;

/* =========================
INIT
========================= */

document.addEventListener("DOMContentLoaded", () => {

playerModal = new bootstrap.Modal(document.getElementById("playerModal"));

loadDashboard();

});

/* =========================
HELPERS
========================= */

function getActivePlayers(){
return [...lineup,...subs].filter(Boolean);
}

/* =========================
DASHBOARD
========================= */

async function loadDashboard(){

const res = await fetch("/user/dashboard",{
headers:{Authorization:"Bearer "+token}
});

const data = await res.json();

document.getElementById("userInfo").innerText =
data.user.username+" | "+(data.user.selectedTeam || "no team");

/* USER RATING */

document.getElementById("userRating").innerHTML = `
Total Points: <b>${data.user.totalPoints || 0}</b><br>
Rating Position: <b>${data.user.ratingPosition || "-"}</b>
`;

currentMatch = data.nextMatch;
existingPrediction = data.existingPrediction || null;

if(currentMatch){

const kickoff = new Date(currentMatch.kickoff);
const deadline = new Date(kickoff.getTime()-90*60000);

nextMatchInfo.innerHTML = `
<b>Matchday ${currentMatch.matchday}</b><br>
${currentMatch.homeTeam} vs ${currentMatch.awayTeam}<br>
Kickoff: ${kickoff.toLocaleString()}<br>
Deadline: ${deadline.toLocaleString()}
`;

}

await loadSquad(data.user.selectedTeam);

buildPitch();
buildSubs();

if(existingPrediction){
autofillPrediction();
}

}

/* =========================
LOAD SQUAD
========================= */

async function loadSquad(team){

const res = await fetch("/user/squad/"+team,{
headers:{Authorization:"Bearer "+token}
});

const data = await res.json();

squad = data.players;

}

/* =========================
AUTOFILL
========================= */

function autofillPrediction(){

if(!existingPrediction) return;

/* lineup */

existingPrediction.players?.forEach((p,i)=>{
lineup[i]=p.player || p;
});

/* subs */

existingPrediction.subs?.forEach((s,i)=>{
subs[i]=s.player || s;
});

/* score */

if(existingPrediction.predictedScore){

homeScore.value = existingPrediction.predictedScore.home;
awayScore.value = existingPrediction.predictedScore.away;

}

/* motm */

if(existingPrediction.motm){
motm = existingPrediction.motm;
motmName.innerText = motm.name;
}

buildPitch();
buildSubs();

}

/* =========================
PLAYER MODAL
========================= */

function pickPlayer(callback,players=null){

modalCallback = callback;

const list = document.getElementById("modalPlayerList");

list.innerHTML = "";

const pool = players || squad;

pool.forEach(p=>{

const div = document.createElement("div");

div.className="player-item";
div.innerText=p.name;

div.onclick=()=>{

modalCallback(p);
playerModal.hide();

};

list.appendChild(div);

});

playerModal.show();

}

/* =========================
PITCH
========================= */

function buildPitch(){

buildLine("gk",1,0);
buildLine("def",4,1);
buildLine("mid",4,5);
buildLine("att",2,9);

}

function buildLine(id,count,start){

const line = document.getElementById(id);
line.innerHTML="";

for(let i=0;i<count;i++){

let index=start+i;

const slot=document.createElement("div");

slot.className="player-slot";

slot.innerText=lineup[index]?.name || "empty";

slot.onclick=()=>{

let pool = squad;

// if(id==="gk"){
// pool = squad.filter(p=>p.position==="GK");
// }else{
// pool = squad.filter(p=>p.position!=="GK");
// }

pickPlayer(player=>{

if(lineup.some(p=>p?._id===player._id) || subs.some(p=>p?._id===player._id)){
alert("Player already used");
return;
}

lineup[index]=player;

buildPitch();

},pool);

};

line.appendChild(slot);

}

}

/* =========================
SUBS
========================= */

function buildSubs(){

const div=document.getElementById("subs");
div.innerHTML="";

for(let i=0;i<5;i++){

const slot=document.createElement("div");

slot.className="player-slot";
slot.innerText=subs[i]?.name || "empty";

slot.onclick=()=>{

pickPlayer(player=>{

if(lineup.some(p=>p?._id===player._id) || subs.some(p=>p?._id===player._id)){
alert("Player already used");
return;
}

subs[i]=player;

buildSubs();

});

};

div.appendChild(slot);

}

}

/* =========================
GOALS
========================= */

function generateGoals(){

let home=parseInt(homeScore.value||0);
let away=parseInt(awayScore.value||0);

if(home>15||away>15){
alert("Max goals = 15");
return;
}

goalInputs.innerHTML="";

for(let i=0;i<home;i++){

const block=document.createElement("div");
block.className="border p-2 mb-2 goal-block";

block.innerHTML=`
<div><b>Goal ${i+1}</b></div>

<div>
Scorer:
<button class="btn btn-sm btn-outline-primary scorer-btn">
select
</button>
</div>

<div>
Assist:
<button class="btn btn-sm btn-outline-secondary assist-btn">
select
</button>
</div>

<div class="mt-1">
<label>
<input type="checkbox" class="penalty-checkbox">
 penalty
</label>
</div>

<div class="penalty-earned-wrapper mt-1" style="display:none;">
Penalty earned:
<button class="btn btn-sm btn-outline-warning earned-btn">
select
</button>
</div>
`;

goalInputs.appendChild(block);

}

attachGoalListeners();

}

function attachGoalListeners(){

document.querySelectorAll(".goal-block").forEach(block=>{

const scorerBtn=block.querySelector(".scorer-btn");
const assistBtn=block.querySelector(".assist-btn");
const penaltyBox=block.querySelector(".penalty-checkbox");
const earnedWrapper=block.querySelector(".penalty-earned-wrapper");
const earnedBtn=block.querySelector(".earned-btn");

/* scorer */

scorerBtn.onclick=()=>{

pickPlayer(player=>{

scorerBtn.innerText=player.name;
scorerBtn.dataset.id=player._id;

if(assistBtn.dataset.id===player._id){
assistBtn.innerText="select";
assistBtn.dataset.id="";
}

},getActivePlayers());

};

/* assist */

assistBtn.onclick=()=>{

pickPlayer(player=>{

if(player._id===scorerBtn.dataset.id){
alert("Scorer cannot assist himself");
return;
}

assistBtn.innerText=player.name;
assistBtn.dataset.id=player._id;

},getActivePlayers());

};

/* penalty */

penaltyBox.onchange=()=>{

if(penaltyBox.checked){

assistBtn.disabled=true;
assistBtn.innerText="penalty goal";
assistBtn.dataset.id="";

earnedWrapper.style.display="block";

}else{

assistBtn.disabled=false;
assistBtn.innerText="select";

earnedWrapper.style.display="none";

}

};

/* earned */

earnedBtn.onclick=()=>{

pickPlayer(player=>{

earnedBtn.innerText=player.name;
earnedBtn.dataset.id=player._id;

},getActivePlayers());

};

});

}

/* =========================
MOTM
========================= */

function selectMotm(){

const players = getActivePlayers();

if(players.length===0){
alert("Select lineup first");
return;
}

pickPlayer(player=>{

motm=player;
motmName.innerText=player.name;

},players);

}

/* =========================
COLLECT PREDICTION
========================= */

function collectPrediction(){

const goals=[];

document.querySelectorAll(".goal-block").forEach(block=>{

const scorer=block.querySelector(".scorer-btn")?.dataset?.id;
const assist=block.querySelector(".assist-btn")?.dataset?.id;
const penalty=block.querySelector(".penalty-checkbox")?.checked;
const earned=block.querySelector(".earned-btn")?.dataset?.id;

if(!scorer) return;

goals.push({
scorer,
assist: penalty ? null : assist || null,
isPenalty: penalty || false,
penaltyEarned: penalty ? earned || null : null
});

});

/* =========================
PLAYERS WITH POSITIONS
========================= */

const players = lineup.map((p,i)=>{

if(!p) return null;

let position="MID";

if(i===0) position="GK";
else if(i>=1 && i<=4) position="DEF";
else if(i>=5 && i<=8) position="MID";
else if(i>=9) position="ATT";

return {
playerId:p._id,
position
};

}).filter(Boolean);


/* =========================
SUBS
========================= */

const subsPayload = subs
.filter(p=>p)
.map(p=>({
playerId:p._id
}));


return {

team:"home",

players: players,

subs: subsPayload,

predictedScore:{
home:Number(homeScore.value||0),
away:Number(awayScore.value||0)
},

goals,

motm: motm?._id || null

};

}

/* =========================
SUBMIT (единственный)
========================= */

async function submitPrediction(){

if(!currentMatch || !currentMatch._id){
alert("Match not loaded yet");
return;
}

if(lineup.filter(p=>p).length !== 11){
alert("Starting lineup must contain exactly 11 players");
return;
}

    const payload = collectPrediction();
    

console.log("PREDICTION PAYLOAD", payload)

const res = await fetch(`/matches/${currentMatch._id}/predict-lineup`,{

method:"POST",

headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+token
},

body:JSON.stringify(payload)

});

const data = await res.json();

if(!res.ok){
alert(data.message || "Prediction failed");
return;
}

alert("Prediction saved");

}

/* =========================
OVERRIDE BUTTONS
========================= */

async function submitLineup(){
submitPrediction();
}

async function submitResult(){
submitPrediction();
}

/* =========================
LEADERBOARD
========================= */

async function loadLeaderboard(){

const res = await fetch("/leaderboard");
const data = await res.json();

let html="<h5>Leaderboard</h5>";
html+="<table class='table'>";
html+="<tr><th>#</th><th>User</th><th>Points</th></tr>";

data.forEach(u=>{

html+=`
<tr>
<td>${u.position}</td>
<td>${u.username}</td>
<td>${u.points}</td>
</tr>
`;

});

html+="</table>";

nextMatchInfo.innerHTML=html;

}

/* =========================
HISTORY
========================= */

async function loadHistory(){

const res = await fetch("/user/history",{
headers:{Authorization:"Bearer "+token}
});

const data = await res.json();

let html="<h5>Prediction History</h5>";

html+="<table class='table'>";
html+="<tr><th>Matchday</th><th>Points</th></tr>";

data.forEach(h=>{

html+=`
<tr>
<td>${h.matchday}</td>
<td>${h.points}</td>
</tr>
`;

});

html+="</table>";

nextMatchInfo.innerHTML=html;

}

/* =========================
LOGOUT
========================= */

logoutBtn.onclick=()=>{

localStorage.removeItem("token");

window.location.href="/index.html";

};

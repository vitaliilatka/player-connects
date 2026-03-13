const token = localStorage.getItem("token");

if (!token) window.location.href = "/index.html";

let squad = [];
let lineup = new Array(11).fill(null);
let subs = new Array(5).fill(null);

let currentMatch = null;
let motm = null;

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

pickPlayer(player=>{

if(lineup.some(p=>p?._id===player._id) || subs.some(p=>p?._id===player._id)){
alert("Player already used");
return;
}

lineup[index]=player;

buildPitch();

});

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

let html="";

for(let i=0;i<home;i++){

html+=`
<div class="border p-2 mb-2">

Goal ${i+1}<br>

Scorer:
<button onclick="goalPick(this)">select</button><br>

Assist:
<button onclick="goalPick(this)" class="assistBtn">select</button>

</div>
`;

}

goalInputs.innerHTML=html;

}

function goalPick(btn){

const players = getActivePlayers();

if(players.length===0){
alert("Select lineup first");
return;
}

pickPlayer(p=>{

btn.innerText=p.name;

btn.dataset.id=p._id;

},players);

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
SUBMIT LINEUP
========================= */

async function submitLineup(){

const players=[...lineup,...subs].filter(Boolean);

const unique=new Set(players.map(p=>p._id));

if(unique.size!==players.length){
alert("Duplicate players");
return;
}

await fetch(`/matches/${currentMatch._id}/predict-lineup`,{

method:"POST",

headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+token
},

body:JSON.stringify({
lineup:lineup.map(p=>p?._id),
subs:subs.map(p=>p?._id)
})

});

alert("Lineup saved");

}

/* =========================
SUBMIT RESULT
========================= */

async function submitResult(){

if(!motm){
alert("Select MOTM");
return;
}

await fetch(`/matches/${currentMatch._id}/predict-result`,{

method:"POST",

headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+token
},

body:JSON.stringify({
homeScore:homeScore.value,
awayScore:awayScore.value,
motm:motm._id
})

});

alert("Result saved");

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


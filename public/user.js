const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "/index.html";
}

async function init() {

  await loadUser();
  await loadDashboard();
  await loadLeaderboard();
  await loadPlayers();

}

async function loadUser() {

  const res = await fetch("/auth/me", {
    headers:{ Authorization:`Bearer ${token}` }
  });

  if(!res.ok){
    localStorage.clear();
    window.location.href="/index.html";
  }

  const user = await res.json();

  document.getElementById("welcomeUser").innerText =
  `👤 ${user.username}`;

}

async function loadDashboard(){

  const res = await fetch("/user/dashboard",{
    headers:{ Authorization:`Bearer ${token}` }
  });

  const data = await res.json();

  const match = data.nextMatch;

  if(!match){
    document.getElementById("nextMatch").innerHTML =
    "No upcoming matches";
    return;
  }

  document.getElementById("nextMatch").innerHTML = `
  
  <p><strong>${match.homeTeam} vs ${match.awayTeam}</strong></p>

  <input id="homeScore" type="number" class="form-control mb-2" placeholder="Home score">

  <input id="awayScore" type="number" class="form-control mb-2" placeholder="Away score">

  <button class="btn btn-primary" onclick="submitPrediction('${match._id}')">
  Submit prediction
  </button>
  
  `;

}

async function submitPrediction(matchId){

  const homeScore = document.getElementById("homeScore").value;
  const awayScore = document.getElementById("awayScore").value;

  await fetch(`/matches/${matchId}/predict`,{

    method:"POST",

    headers:{
      "Content-Type":"application/json",
      Authorization:`Bearer ${token}`
    },

    body:JSON.stringify({
      homeScore,
      awayScore
    })

  });

  alert("Prediction saved");

}

async function loadLeaderboard(){

  const res = await fetch("/leaderboard");

  const users = await res.json();

  let html="";

  users.forEach((u,i)=>{

    html+=`
    <div>
    ${i+1}. ${u.username} — ${u.totalPoints}
    </div>
    `;

  });

  document.getElementById("leaderboard").innerHTML=html;

}

async function loadPlayers(){

  const res = await fetch("/players");

  const players = await res.json();

  const container = document.getElementById("players");

  container.innerHTML="";

  players.forEach(p=>{

    const card=document.createElement("div");

    card.className="col-md-3";

    card.innerHTML=`

    <div class="card p-2 h-100">

    <strong>${p.name}</strong>

    <small>${p.team}</small>

    <div>rating: ${p.rating}</div>

    </div>
    
    `;

    container.appendChild(card);

  });

}

document.getElementById("logoutBtn").onclick=()=>{
localStorage.clear();
window.location.href="/index.html";
}

init();

// // user.js

// const API_URL = "https://player-stats-backend.onrender.com";
// const token = localStorage.getItem("token");
// const role = localStorage.getItem("role");

// // If no token → guest
// if (!token) {
//   window.location.href = "/guest.html";
// }

// // If an admin accidentally opened this page → redirect
// if (role === "admin") {
//   window.location.href = "/admin.html";
// }

// // Validate token and load players
// async function init() {
//   try {
//     const res = await fetch(`${API_URL}/auth/me`, {
//       headers: { Authorization: `Bearer ${token}` },
//     });

//     if (!res.ok) {
//       localStorage.clear();
//       return (window.location.href = "/guest.html");
//     }

//     const user = await res.json();
//     document.querySelector("h1").innerText = `👤 Player Stats (User: ${user.username})`;

//     loadPlayers(user.username);

//   } catch (err) {
//     console.error(err);
//     window.location.href = "/guest.html";
//   }
// }

// async function loadPlayers(username) {
//   const res = await fetch(`${API_URL}/players`);
//   const players = await res.json();

//   const container = document.getElementById("players-cards");
//   container.innerHTML = "";

//   players.forEach((p) => {
//     const card = document.createElement("div");
//     card.className = "col-md-4";

//     card.innerHTML = `
//       <div class="card h-100 ${p.name.toLowerCase().includes("ronaldo") ? "border-success border-3" : ""}">
//         <div class="card-header">${p.name}</div>
//         <div class="card-body">
//           <p><strong>Team:</strong> ${p.team}</p>
//           <p><strong>Position:</strong> ${p.position}</p>
//         </div>
//       </div>
//     `;

//     container.appendChild(card);
//   });
// }

// // Logout
// document.getElementById("logoutBtn").addEventListener("click", () => {
//   localStorage.clear();
//   window.location.href = "/guest.html";
// });

// init();

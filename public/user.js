const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "/index.html";
}

async function init() {

  await loadUser();
  await loadDashboard();
  await loadLeaderboard();

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
  `👤 ${user.username} | Team: ${user.team ?? "not selected"}`;

}

async function loadDashboard(){

  const res = await fetch("/user/dashboard",{
    headers:{ Authorization:`Bearer ${token}` }
  });

  const data = await res.json();

  const match = data.nextMatch;
  const prediction = data.existingPrediction;

  if(!match){
    document.getElementById("nextMatch").innerHTML =
      "No upcoming matches";
    return;
  }

  let predictionInfo = "";

  if(prediction && prediction.predictedScore){
    predictionInfo = `
      <div class="alert alert-success mt-2">
        Your prediction: 
        <strong>
          ${prediction.predictedScore.home} :
          ${prediction.predictedScore.away}
        </strong>
      </div>
    `;
  }

  document.getElementById("nextMatch").innerHTML = `
  
  <p><strong>${match.homeTeam} vs ${match.awayTeam}</strong></p>

  <input id="homeScore" type="number" class="form-control mb-2" placeholder="Home score">

  <input id="awayScore" type="number" class="form-control mb-2" placeholder="Away score">

  <button class="btn btn-primary" onclick="submitPrediction('${match._id}')">
    Submit prediction
  </button>

  ${predictionInfo}

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

  let html = "";

  users.forEach((u)=>{

    html += `
      <div>
        ${u.position}. ${u.username} — ${u.points} pts
      </div>
    `;

  });

  document.getElementById("leaderboard").innerHTML = html;

}


document.getElementById("logoutBtn").onclick=()=>{
localStorage.clear();
window.location.href="/index.html";
}

init();


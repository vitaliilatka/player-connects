const token = localStorage.getItem("token");

console.log("USER JS LOADED");

if (!token) {
  window.location.href = "/index.html";
}

let squad = [];
let selectedPlayer = null;

let lineup = new Array(11).fill(null);
let subs = new Array(5).fill(null);

let currentMatch = null;

/* =======================
LOAD DASHBOARD
======================= */

async function loadDashboard() {

  const res = await fetch("/user/dashboard", {
    headers: { Authorization: "Bearer " + token }
  });

  if (res.status === 401) {
    localStorage.clear();
    window.location.href = "/index.html";
    return;
  }

  const data = await res.json();

  document.getElementById("userInfo").innerText =
    data.user.username + " | Team: " + (data.user.selectedTeam || "not selected");

  currentMatch = data.nextMatch;

  if (!currentMatch) {
    document.getElementById("nextMatchInfo").innerHTML = "No upcoming match";
  } else {

    const kickoff = new Date(currentMatch.kickoff);
    const deadline = new Date(kickoff.getTime() - 90 * 60 * 1000);

    document.getElementById("nextMatchInfo").innerHTML = `
      <div>Matchday ${currentMatch.matchday}</div>
      <div>${kickoff.toLocaleString()}</div>
      <div>Deadline: ${deadline.toLocaleString()}</div>
      <div><strong>${currentMatch.homeTeam} vs ${currentMatch.awayTeam}</strong></div>
    `;

  }

  if (data.user.selectedTeam) {
    await loadSquad(data.user.selectedTeam);
  }

  buildPitch();
  buildSubs();
}

/* =======================
LOAD SQUAD
======================= */

async function loadSquad(team) {

  const res = await fetch("/user/squad/" + team, {
    headers: { Authorization: "Bearer " + token }
  });

  const data = await res.json();

  squad = data.players;

  renderPlayers();
  renderMotm();
}

/* =======================
RENDER PLAYERS
======================= */

function renderPlayers() {

  const list = document.getElementById("playerList");
  list.innerHTML = "";

  squad.forEach(p => {

    const div = document.createElement("div");

    div.className = "player-item";
    div.innerText = p.name;

    div.onclick = () => {
      selectedPlayer = p;
    };

    list.appendChild(div);

  });

}

/* =======================
RENDER MOTM
======================= */

function renderMotm() {

  const select = document.getElementById("motm");

  select.innerHTML = squad.map(p =>
    `<option value="${p._id}">${p.name}</option>`
  ).join("");

}

/* =======================
BUILD LINEUP
======================= */

function buildPitch() {

  const pitch = document.getElementById("pitch");
  pitch.innerHTML = "";

  for (let i = 0; i < 11; i++) {

    const slot = document.createElement("div");

    slot.className = "player-slot";
    slot.innerText = lineup[i]?.name || "empty";

    slot.onclick = () => {

      if (!selectedPlayer) return;

      if (lineup.some(p => p?._id === selectedPlayer._id)) {
        alert("Player already in lineup");
        return;
      }

      lineup[i] = selectedPlayer;
      buildPitch();

    };

    pitch.appendChild(slot);

  }

}

/* =======================
BUILD SUBS
======================= */

function buildSubs() {

  const container = document.getElementById("subs");
  container.innerHTML = "";

  for (let i = 0; i < 5; i++) {

    const slot = document.createElement("div");

    slot.className = "player-slot";
    slot.innerText = subs[i]?.name || "empty";

    slot.onclick = () => {

      if (!selectedPlayer) return;

      if (lineup.some(p => p?._id === selectedPlayer._id) ||
          subs.some(p => p?._id === selectedPlayer._id)) {

        alert("Player already selected");
        return;
      }

      subs[i] = selectedPlayer;
      buildSubs();

    };

    container.appendChild(slot);

  }

}

/* =======================
GENERATE GOALS
======================= */

function generateGoals() {

  const home = parseInt(homeScore.value || 0);
  const container = document.getElementById("goalInputs");

  const availablePlayers = [...lineup, ...subs].filter(Boolean);

  if (availablePlayers.length === 0) {
    alert("Select lineup first");
    return;
  }

  container.innerHTML = "";

  for (let i = 0; i < home; i++) {

    container.innerHTML += `

<div class="border p-2 mb-2">

<b>Goal ${i + 1}</b>

<select class="form-select mb-1 scorer">
${availablePlayers.map(p => `<option value="${p._id}">${p.name}</option>`).join("")}
</select>

<select class="form-select mb-1 assist">
<option value="">No assist</option>
${availablePlayers.map(p => `<option value="${p._id}">${p.name}</option>`).join("")}
</select>

<label><input type="checkbox" class="penalty"> Is penalty</label>

<select class="form-select penalty-earned mt-1">
<option value="">Penalty earned</option>
${availablePlayers.map(p => `<option value="${p._id}">${p.name}</option>`).join("")}
</select>

</div>

`;

  }

  attachGoalValidation();
}

/* =======================
GOAL VALIDATION
======================= */

function attachGoalValidation() {

  const goals = document.querySelectorAll("#goalInputs > div");

  goals.forEach(goal => {

    const scorer = goal.querySelector(".scorer");
    const assist = goal.querySelector(".assist");
    const penalty = goal.querySelector(".penalty");

    scorer.onchange = () => {

      if (assist.value === scorer.value) {
        alert("Scorer cannot assist himself");
        assist.value = "";
      }

    };

    assist.onchange = () => {

      if (assist.value === scorer.value) {
        alert("Assist cannot be the same as scorer");
        assist.value = "";
      }

    };

    penalty.onchange = () => {

      if (penalty.checked) {
        assist.disabled = true;
        assist.value = "";
      } else {
        assist.disabled = false;
      }

    };

  });

}

/* =======================
SUBMIT LINEUP
======================= */

async function submitLineup() {

  const unique = new Set([...lineup, ...subs].map(p => p?._id));

  if (unique.size !== lineup.filter(Boolean).length + subs.filter(Boolean).length) {
    alert("Duplicate players detected");
    return;
  }

  await fetch(`/matches/${currentMatch._id}/predict-lineup`, {

    method: "POST",

    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },

    body: JSON.stringify({
      lineup: lineup.map(p => p?._id),
      subs: subs.map(p => p?._id)
    })

  });

  alert("Lineup saved");

}

/* =======================
SUBMIT RESULT
======================= */

async function submitResult() {

  const motm = document.getElementById("motm").value;

  const allowedPlayers = [...lineup, ...subs].map(p => p?._id);

  if (!allowedPlayers.includes(motm)) {
    alert("MOTM must be from lineup or subs");
    return;
  }

  await fetch(`/matches/${currentMatch._id}/predict-result`, {

    method: "POST",

    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },

    body: JSON.stringify({
      homeScore: homeScore.value,
      awayScore: awayScore.value,
      motm
    })

  });

  alert("Result saved");

}

/* =======================
LOGOUT
======================= */

document.getElementById("logoutBtn").onclick = () => {

  localStorage.removeItem("token");
  window.location.href = "/index.html";

};

/* =======================
START
======================= */

loadDashboard();


// const token = localStorage.getItem("token");

// console.log("USER JS LOADED");

// if (!token) {
//   window.location.href = "/index.html";
// }

// let squad = [];
// let selectedPlayer = null;

// let lineup = new Array(11).fill(null);
// let subs = new Array(5).fill(null);

// let currentMatch = null;

// /* =======================
// LOAD DASHBOARD
// ======================= */

// async function loadDashboard() {

//   console.log("Loading dashboard...");

//   const res = await fetch("/user/dashboard", {
//     headers: { Authorization: "Bearer " + token }
//   });

//   if (res.status === 401) {
//     localStorage.clear();
//     window.location.href = "/index.html";
//     return;
//   }

//   const data = await res.json();

//   console.log("Dashboard data:", data);

//   document.getElementById("userInfo").innerText =
//     data.user.username + " | Team: " + (data.user.selectedTeam || "not selected");

//   currentMatch = data.nextMatch;

//   if (!currentMatch) {
//     document.getElementById("nextMatchInfo").innerHTML = "No upcoming match";
//   } else {

//     const kickoff = new Date(currentMatch.kickoff);
//     const deadline = new Date(kickoff.getTime() - 90 * 60 * 1000);

//     document.getElementById("nextMatchInfo").innerHTML = `
//       <div>Matchday ${currentMatch.matchday}</div>
//       <div>${kickoff.toLocaleString()}</div>
//       <div>Deadline: ${deadline.toLocaleString()}</div>
//       <div><strong>${currentMatch.homeTeam} vs ${currentMatch.awayTeam}</strong></div>
//     `;

//   }

//   if (!data.user.selectedTeam) {
//     console.log("User has no team selected");
//     return;
//   }

//   console.log("Loading squad for:", data.user.selectedTeam);

//   await loadSquad(data.user.selectedTeam);

//   buildPitch();
//   buildSubs();
// }


// /* =======================
// LOAD SQUAD
// ======================= */

// async function loadSquad(team) {

//   console.log("Requesting squad:", team);

//   const res = await fetch("/user/squad/" + team, {
//     headers: { Authorization: "Bearer " + token }
//   });

//   console.log("Squad response status:", res.status);



//   if (res.status === 401) {
//     localStorage.clear();
//     window.location.href = "/index.html";
//     return;
//   }

//   const data = await res.json();

//   console.log("Squad data:", data);

//   squad = data.players;

//   renderPlayers();
//   renderMotm();
// }

// /* =======================
// RENDER PLAYERS
// ======================= */

// function renderPlayers() {

//   const list = document.getElementById("playerList");
//   list.innerHTML = "";

//   squad.forEach(p => {

//     const div = document.createElement("div");

//     div.className = "player-item";
//     div.innerText = p.name;

//     div.onclick = () => {
//       selectedPlayer = p;
//     };

//     list.appendChild(div);

//   });

// }

// /* =======================
// RENDER MOTM
// ======================= */

// function renderMotm() {

//   const select = document.getElementById("motm");

//   select.innerHTML = squad.map(p =>
//     `<option value="${p._id}">${p.name}</option>`
//   ).join("");

// }

// /* =======================
// BUILD LINEUP
// ======================= */

// function buildPitch() {

//   const pitch = document.getElementById("pitch");
//   pitch.innerHTML = "";

//   for (let i = 0; i < 11; i++) {

//     const slot = document.createElement("div");

//     slot.className = "player-slot";
//     slot.innerText = lineup[i]?.name || "empty";

//     slot.onclick = () => {

//       if (selectedPlayer) {
//         lineup[i] = selectedPlayer;
//         buildPitch();
//       }

//     };

//     pitch.appendChild(slot);

//   }

// }

// /* =======================
// BUILD SUBS
// ======================= */

// function buildSubs() {

//   const container = document.getElementById("subs");
//   container.innerHTML = "";

//   for (let i = 0; i < 5; i++) {

//     const slot = document.createElement("div");

//     slot.className = "player-slot";
//     slot.innerText = subs[i]?.name || "empty";

//     slot.onclick = () => {

//       if (selectedPlayer) {
//         subs[i] = selectedPlayer;
//         buildSubs();
//       }

//     };

//     container.appendChild(slot);

//   }

// }

// /* =======================
// GENERATE GOALS
// ======================= */

// function generateGoals() {

//   const home = parseInt(homeScore.value || 0);
//   const container = document.getElementById("goalInputs");

//   container.innerHTML = "";

//   for (let i = 0; i < home; i++) {

//     container.innerHTML += `

// <div class="border p-2 mb-2">

// <b>Goal ${i + 1}</b>

// <select class="form-select mb-1">
// ${squad.map(p => `<option value="${p._id}">${p.name}</option>`).join("")}
// </select>

// <select class="form-select mb-1">
// <option>Assist</option>
// ${squad.map(p => `<option value="${p._id}">${p.name}</option>`).join("")}
// </select>

// <label><input type="checkbox"> Is penalty</label>

// <label><input type="checkbox"> Penalty earned</label>

// </div>

// `;

//   }

// }

// /* =======================
// SUBMIT LINEUP
// ======================= */

// async function submitLineup() {

//   await fetch(`/matches/${currentMatch._id}/predict-lineup`, {

//     method: "POST",

//     headers: {
//       "Content-Type": "application/json",
//       Authorization: "Bearer " + token
//     },

//     body: JSON.stringify({
//       lineup: lineup.map(p => p?._id),
//       subs: subs.map(p => p?._id)
//     })

//   });

//   alert("Lineup saved");

// }

// /* =======================
// SUBMIT RESULT
// ======================= */

// async function submitResult() {

//   await fetch(`/matches/${currentMatch._id}/predict-result`, {

//     method: "POST",

//     headers: {
//       "Content-Type": "application/json",
//       Authorization: "Bearer " + token
//     },

//     body: JSON.stringify({
//       homeScore: homeScore.value,
//       awayScore: awayScore.value,
//       motm: document.getElementById("motm").value
//     })

//   });

//   alert("Result saved");

// }

// /* =======================
// LOGOUT
// ======================= */

// document.getElementById("logoutBtn").onclick = () => {

//   localStorage.removeItem("token");
//   window.location.href = "/index.html";

// };

// /* =======================
// START
// ======================= */

// loadDashboard();


const API_URL =
  window.location.hostname.includes("netlify")
    ? "https://player-connects.onrender.com"
    : "";

let currentLineup = { home: [], away: [] };
let squadFull = { home: [], away: [] };
let selectedMotm = null;
let currentMatchId = null;

document.addEventListener("DOMContentLoaded", () => {

  const token = localStorage.getItem("token");

  const matchdaySelect = document.querySelector('[name="matchday"]');
  const homeSelect = document.getElementById("homeTeamSelect");
  const awaySelect = document.getElementById("awayTeamSelect");

  const resultsMatchday = document.getElementById("resultsMatchday");
  const resultsMatch = document.getElementById("resultsMatch");

  const homeScore = document.getElementById("homeScore");
  const awayScore = document.getElementById("awayScore");
  const motmSelect = document.getElementById("motmSelect");

  /* =========================
     MATCHDAY INIT
  ========================= */
  for (let i = 1; i <= 38; i++) {
    matchdaySelect.appendChild(new Option(`Matchday ${i}`, i));
    resultsMatchday.appendChild(new Option(`Matchday ${i}`, i));
  }

  /* =========================
     LOAD TEAMS
  ========================= */
  async function loadTeams() {
    const res = await fetch("${API_URL}/admin/leagues", {
      headers: { Authorization: `Bearer ${token}` }
    });

    const leagues = await res.json();

    homeSelect.innerHTML = "";
    awaySelect.innerHTML = "";

    leagues.forEach(l => {
      homeSelect.appendChild(new Option(l.name, l.name));
      awaySelect.appendChild(new Option(l.name, l.name));
    });
  }

  loadTeams();

  /* =========================
   PLAYERS TAB
========================= */

const playersLeagueSelect = document.getElementById("leagueSelect");
  const playersList = document.getElementById("playersList");
  console.log(playersList);

async function loadPlayerLeagues() {

  const res = await fetch("${API_URL}/admin/leagues", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const leagues = await res.json();

  playersLeagueSelect.innerHTML = `<option value="">Select team</option>`;

  leagues.forEach(l => {
    playersLeagueSelect.appendChild(
      new Option(l.name, l._id)
    );
  });
  }
  
  playersLeagueSelect.onchange = async () => {

  console.log("CHANGE WORKS");

  if (!playersLeagueSelect.value) return;

  const res = await fetch(
    `${API_URL}/admin/players/${playersLeagueSelect.value}`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

    console.log("FETCH DONE");
    
  document.getElementById("addPlayerForm").onsubmit = async (e) => {

      e.preventDefault();

      const form = e.target;

      const formData = new FormData();

      formData.append("name", form.name.value);
      formData.append("leagueId", playersLeagueSelect.value);
      // formData.append("team", form.team.value);
      formData.append("position", form.position.value);

      if (form.image.files[0]) {
        formData.append("image", form.image.files[0]);
      }

      const res = await fetch("${API_URL}/admin/players", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        return alert(data.message);
      }

      alert("Player created");

      form.reset();

      playersLeagueSelect.dispatchEvent(new Event("change"));
    };


  const players = await res.json();

  console.log(players);

  playersList.innerHTML = "";

  players.forEach(p => {

    console.log("PLAYER:", p.name);

    const div = document.createElement("div");

    div.className =
      "d-flex justify-content-between align-items-center border p-2 mb-2";

    div.innerHTML = `
      <div>
        ${p.name} (${p.position})
      </div>

      <button class="btn btn-danger btn-sm">
        Delete
      </button>
    `;

    console.log(div);

    playersList.appendChild(div);

    console.log("APPENDED");
  });
};

loadPlayerLeagues();

  /* =========================
     CREATE MATCH (🔥 FIX)
  ========================= */
  document.getElementById("createMatchForm").onsubmit = async (e) => {
    e.preventDefault();

    const form = e.target;

    const payload = {
      matchday: form.matchday.value,
      homeTeam: homeSelect.value,
      awayTeam: awaySelect.value,
      date: form.date.value,
      time: form.time.value
    };

    const res = await fetch("${API_URL}/admin/matches", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) return alert(data.message);

    alert("Match created");
  };

  /* =========================
     LINEUP
  ========================= */
  const lineupMatchday = document.getElementById("lineupMatchday");
  const lineupMatch = document.getElementById("lineupMatch");

  for (let i = 1; i <= 38; i++) {
    lineupMatchday.appendChild(new Option(`Matchday ${i}`, i));
  }

  lineupMatchday.onchange = async () => {
    const matches = await fetch(`${API_URL}/matches?matchday=${lineupMatchday.value}`)
      .then(r => r.json());

    lineupMatch.innerHTML = `<option></option>`;

    matches.forEach(m => {
      const opt = new Option(`${m.homeTeam} vs ${m.awayTeam}`, m._id);
      opt.dataset.home = m.homeTeam;
      opt.dataset.away = m.awayTeam;
      lineupMatch.appendChild(opt);
    });
  };

  lineupMatch.onchange = async () => {
    const selected = lineupMatch.options[lineupMatch.selectedIndex];
    if (!selected.value) return;

    currentMatchId = selected.value;

    const [home, away] = await Promise.all([
      fetch(`${API_URL}/players/team/${selected.dataset.home}`).then(r => r.json()),
      fetch(`${API_URL}/players/team/${selected.dataset.away}`).then(r => r.json())
    ]);

    renderLineupSlots("homePlayers", home.players);
    renderLineupSlots("awayPlayers", away.players);
  };

  function renderLineupSlots(containerId, players) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";

    for (let i = 0; i < 11; i++) {
      const div = document.createElement("div");
      div.className = "col-2";

      div.innerHTML = `
        <select class="form-select form-select-sm">
          <option></option>
          ${players.map(p => `<option value="${p._id}"
            data-position="${p.position}"
            >
              ${p.name} (${p.position})
        </option>`).join("")}
        </select>
      `;

      container.appendChild(div);
    }
  }

  document.getElementById("saveLineupBtn").onclick = async () => {

    const home = [...document.querySelectorAll("#homePlayers select")]
      .map(select => {

        const option =
          select.options[select.selectedIndex];

        if (!option.value) return null;

        return {
          playerId: option.value,
          position: option.dataset.position
        };
      })
      .filter(Boolean);

    const away = [...document.querySelectorAll("#awayPlayers select")]
      .map(select => {

        const option =
          select.options[select.selectedIndex];

        if (!option.value) return null;

        return {
          playerId: option.value,
          position: option.dataset.position
        };
      })
      .filter(Boolean);

    const res = await fetch(`${API_URL}/admin/matches/${currentMatchId}/lineup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ home, away })
    });

    const data = await res.json();

    if (!res.ok) return alert(data.message);

    alert("Lineup saved");
  };

  /* =========================
     RESULTS (🔥 FULL)
  ========================= */

  resultsMatchday.onchange = async () => {

    const matches = await fetch(`${API_URL}/matches?matchday=${resultsMatchday.value}`)
      .then(r => r.json());

    resultsMatch.innerHTML = `<option></option>`;

    matches.forEach(m => {
      const opt = new Option(`${m.homeTeam} vs ${m.awayTeam}`, m._id);
      opt.dataset.home = m.homeTeam;
      opt.dataset.away = m.awayTeam;
      resultsMatch.appendChild(opt);
    });
  };

  resultsMatch.onchange = async () => {

    const selected = resultsMatch.options[resultsMatch.selectedIndex];
    if (!selected.value) return;

    currentMatchId = selected.value;

    const match = await fetch(`${API_URL}/matches/${currentMatchId}`).then(r => r.json());

    currentLineup.home = match.lineups.home;
    currentLineup.away = match.lineups.away;

    renderLineup("home");
    renderLineup("away");

    homeScore.value = match.score?.home || 0;
    awayScore.value = match.score?.away || 0;

    const [home, away] = await Promise.all([
      fetch(`${API_URL}/players/team/${match.homeTeam}`).then(r => r.json()),
      fetch(`${API_URL}/players/team/${match.awayTeam}`).then(r => r.json())
    ]);

    squadFull.home = home.players;
    squadFull.away = away.players;

    renderSubs("home");
    renderSubs("away");
    renderGoals("home", Number(homeScore.value || 0));
    renderGoals("away", Number(awayScore.value || 0));
    renderMotm();
  };

  function renderLineup(team) {
    document.getElementById(team + "Lineup").innerHTML =
      currentLineup[team].map(p => `<div>${p.player.name}</div>`).join("");
  }

  function renderSubs(team) {
    const container = document.getElementById(team + "Subs");
    container.innerHTML = "";

    for (let i = 0; i < 5; i++) {
      const div = document.createElement("div");

      div.innerHTML = `
        <select class="out">
          ${currentLineup[team].map(p => `<option value="${p.player._id}">${p.player.name}</option>`).join("")}
        </select>
        →
        <select class="in">
          ${squadFull[team].map(p => `<option value="${p._id}">${p.name}</option>`).join("")}
        </select>
        <input class="minute" type="number">
      `;

      container.appendChild(div);
    }
  }

  function collectSubs(team) {
    return [...document.querySelectorAll(`#${team}Subs div`)]
      .map(d => ({
        playerOut: d.querySelector(".out").value,
        playerIn: d.querySelector(".in").value,
        minute: Number(d.querySelector(".minute").value)
      }))
      .filter(s => s.playerOut && s.playerIn && s.minute);
  }


  function renderGoals(team, count) {

    const container = document.getElementById(team + "Goals");
    container.innerHTML = "";

    for (let i = 0; i < count; i++) {

      const div = document.createElement("div");
      div.className = "goal-card mb-2";

      div.innerHTML = `
        <div class="row g-2">

          <div class="col">
            <select class="scorer form-select form-select-sm">
              ${squadFull[team].map(p =>
                `<option value="${p._id}">${p.name}</option>`
              ).join("")}
            </select>
          </div>

          <div class="col">
            <select class="assist form-select form-select-sm">
              <option value="">No assist</option>

              ${squadFull[team].map(p =>
                `<option value="${p._id}">${p.name}</option>`
              ).join("")}
            </select>
          </div>

          <div class="col-2">
            <input class="minute form-control form-control-sm"
                  type="number"
                  placeholder="min">
          </div>

          <div class="col-auto d-flex align-items-center">
            <label>
              <input type="checkbox" class="penalty">
              Pen
            </label>
          </div>

        </div>

        <div class="earned mt-2" style="display:none">

          <label>Earned by</label>

          <select class="earnedBy form-select form-select-sm">

            <option value="">Select</option>

            ${squadFull[team].map(p =>
              `<option value="${p._id}">${p.name}</option>`
            ).join("")}

          </select>

        </div>
      `;

      const penalty = div.querySelector(".penalty");
      const earned = div.querySelector(".earned");
      const assist = div.querySelector(".assist");

      penalty.onchange = () => {

        earned.style.display =
          penalty.checked ? "block" : "none";

        assist.disabled = penalty.checked;
      };

      container.appendChild(div);
    }
  }


  function collectGoals(team) {

    return [...document.querySelectorAll(`#${team}Goals .goal-card`)]
      .map(d => {

        const scorer = d.querySelector(".scorer").value;
        const assist = d.querySelector(".assist").value;
        const minute = Number(d.querySelector(".minute").value);

        const isPenalty =
          d.querySelector(".penalty").checked;

        const earnedBy =
          d.querySelector(".earnedBy")?.value;

        if (!scorer || !minute)
          return null;

        if (assist && assist === scorer) {
          alert("Scorer cannot assist himself");
          return null;
        }

        return {
          scorer,

          assist:
            isPenalty
              ? null
              : assist || null,

          minute,

          penalty: {
            isPenalty,

            earnedBy:
              isPenalty
                ? earnedBy || null
                : null
          }
        };
      })
      .filter(Boolean);
  }


  // homeScore.oninput = () => renderGoals("home", Number(homeScore.value || 0));
  // awayScore.oninput = () => renderGoals("away", Number(awayScore.value || 0));

  function updateGoalsUI() {
      renderGoals("home", Number(homeScore.value || 0));
      renderGoals("away", Number(awayScore.value || 0));
    }

    homeScore.addEventListener("change", updateGoalsUI);
    awayScore.addEventListener("change", updateGoalsUI);

    homeScore.addEventListener("input", updateGoalsUI);
  awayScore.addEventListener("input", updateGoalsUI);
  


  function renderMotm() {
    const players = [
      ...currentLineup.home.map(p => p.player),
      ...currentLineup.away.map(p => p.player)
    ];

    motmSelect.innerHTML = `<option></option>`;

    players.forEach(p => {
      motmSelect.appendChild(new Option(p.name, p._id));
    });

    motmSelect.onchange = () => {
      selectedMotm = motmSelect.value;
    };
  }

  window.addMissedPenalty = function(team) {

  const div = document.createElement("div");

  div.innerHTML = `
    <select class="player form-select form-select-sm">

      ${squadFull[team].map(p =>
        `<option value="${p._id}">${p.name}</option>`
      ).join("")}

    </select>

    <input class="minute form-control form-control-sm mt-1"
           type="number"
           placeholder="minute">
  `;

  document
    .getElementById(team + "MissedPenalties")
    .appendChild(div);
};

function collectMissed(team) {

  return [...document.querySelectorAll(
    `#${team}MissedPenalties div`
  )]
    .map(d => ({
      player:
        d.querySelector(".player").value,

      minute:
        Number(d.querySelector(".minute").value)
    }))
    .filter(p => p.player && p.minute);
  }
  

  window.addCard = function(team) {

  const div = document.createElement("div");

  div.innerHTML = `
    <div class="row g-2 mt-1">

      <div class="col">
        <select class="player form-select form-select-sm">

          ${squadFull[team].map(p =>
            `<option value="${p._id}">${p.name}</option>`
          ).join("")}

        </select>
      </div>

      <div class="col">
        <select class="type form-select form-select-sm">
          <option value="yellow">Yellow</option>
          <option value="red">Red</option>
        </select>
      </div>

      <div class="col-3">
        <input class="minute form-control form-control-sm"
               type="number"
               placeholder="min">
      </div>

    </div>
  `;

  document
    .getElementById(team + "Cards")
    .appendChild(div);
};

function collectCards(team) {

  return [...document.querySelectorAll(
    `#${team}Cards > div`
  )]
    .map(d => {

      const player = d.querySelector(".player");
      const type = d.querySelector(".type");
      const minute = d.querySelector(".minute");

      if (!player || !type || !minute)
        return null;

      return {
        player: player.value,
        type: type.value,
        minute: Number(minute.value)
      };
    })
    .filter(c => c && c.player && c.minute);
}
  



  document.getElementById("saveResultBtn").onclick = async () => {


    const payload = {

  goals: {
    home: collectGoals("home"),
    away: collectGoals("away")
  },

  substitutions: {
    home: collectSubs("home"),
    away: collectSubs("away")
  },

  missedPenalties: {
    home: collectMissed("home"),
    away: collectMissed("away")
  },

  cards: {
    home: collectCards("home"),
    away: collectCards("away")
  },

  motm: selectedMotm,

  score: {
    home: Number(homeScore.value || 0),
    away: Number(awayScore.value || 0)
  }
};

    console.log("GOALS HOME:", collectGoals("home"));
    console.log("GOALS AWAY:", collectGoals("away"));

    const res = await fetch(`${API_URL}/admin/matches/${currentMatchId}/full`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) return alert(data.message);

    alert("Saved!");
  };

});



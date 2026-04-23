// admin.js

const API_URL = "";
let currentLeagueId = null;

let currentLineup = {
  home: [],
  away: []
};


document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");

  const createLeagueBtn = document.getElementById("createLeagueBtn");
  const leagueSelect = document.getElementById("leagueSelect");
  const addPlayerForm = document.getElementById("addPlayerForm");
  const playersTbody = document.getElementById("playersTbody");

  const createMatchForm = document.getElementById("createMatchForm");
  const matchdaySelect = document.querySelector('[name="matchday"]');

  const homeTeamSelect = document.getElementById("homeTeamSelect");
  const awayTeamSelect = document.getElementById("awayTeamSelect");

  const lineupMatchday = document.getElementById("lineupMatchday");
  const lineupMatch = document.getElementById("lineupMatch");

  const homePlayersContainer = document.getElementById("homePlayers");
  const awayPlayersContainer = document.getElementById("awayPlayers");

  const saveLineupBtn = document.getElementById("saveLineupBtn");

  const resultsMatchday = document.getElementById("resultsMatchday");
  const resultsMatch = document.getElementById("resultsMatch");

  const homeScoreInput = document.getElementById("homeScore");
  const awayScoreInput = document.getElementById("awayScore");

  const homeTeamName = document.getElementById("homeTeamName");
  const awayTeamName = document.getElementById("awayTeamName");

  const saveResultBtn = document.getElementById("saveResultBtn");

  let currentMatchId = null;

  if (!token) {
    window.location.href = "/index.html";
    return;
  }

  // =========================
  // MATCHDAY OPTIONS (CREATE MATCH)
  // =========================
  for (let i = 1; i <= 38; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `Matchday ${i}`;
    matchdaySelect.appendChild(opt);
  }

  // =========================
  // MATCHDAY OPTIONS (LINEUP)
  // =========================
  for (let i = 1; i <= 38; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `Matchday ${i}`;
    lineupMatchday.appendChild(opt);
  }

  // =========================
  // MATCHDAY OPTIONS (RESULTS)
  // =========================\

  for (let i = 1; i <= 38; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `Matchday ${i}`;
    resultsMatchday.appendChild(opt);
  }

  async function loadMatchById(matchId) {
    const res = await fetch(`/matches/${matchId}`);
    const match = await res.json();

    console.log("MATCH DATA:", match); // debug

    return match;
  }


  resultsMatchday.addEventListener("change", async () => {
    const res = await fetch(`/matches?matchday=${resultsMatchday.value}`);
    const matches = await res.json();

    resultsMatch.innerHTML = `<option value="">Select match</option>`;

    matches.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m._id;
      opt.textContent = `${m.homeTeam} vs ${m.awayTeam}`;
      opt.dataset.home = m.homeTeam;
      opt.dataset.away = m.awayTeam;
      resultsMatch.appendChild(opt);
    });
  });


  resultsMatch.addEventListener("change", async () => {
    const selected = resultsMatch.options[resultsMatch.selectedIndex];
    if (!selected.value) return;

    currentMatchId = selected.value;

    homeTeamName.textContent = selected.dataset.home;
    awayTeamName.textContent = selected.dataset.away;

    try {
      const match = await loadMatchById(currentMatchId);

      if (!match.lineups || !match.lineups.home?.length) {
        alert("Lineup not set for this match");
        return;
      }

      currentLineup.home = match.lineups.home;
      currentLineup.away = match.lineups.away;

      renderLineup(currentLineup.home, "homeLineup");
      renderLineup(currentLineup.away, "awayLineup");

    } catch (err) {
      console.error("Error loading match:", err);
    }
  });

  // -----------------------------------------------------------------------------

  // resultsMatch.addEventListener("change", () => {
  //   const selected = resultsMatch.options[resultsMatch.selectedIndex];
  //   if (!selected.value) return;

  //   currentMatchId = selected.value;

  //   homeTeamName.textContent = selected.dataset.home;
  //   awayTeamName.textContent = selected.dataset.away;
  // });
  // -----------------------------------------------------------------------------------


  function renderLineup(players, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = "";

    players.forEach(p => {
      const col = document.createElement("div");
      col.className = "col-md-3";

      const name = p.name || p.player?.name || "Unknown";

      col.innerHTML = `
        <div class="card p-2 text-center">
          ${name} (${p.position})
        </div>
      `;

      container.appendChild(col);
    });
  }


  saveResultBtn.addEventListener("click", async () => {

    const homeScore = Number(homeScoreInput.value);
    const awayScore = Number(awayScoreInput.value);

    if (isNaN(homeScore) || isNaN(awayScore)) {
      alert("Enter valid scores");
      return;
    }

    // 🔥 отправляем ДВА запроса (home + away)
    const body = {
      score: {
        home: homeScore,
        away: awayScore
      }
    };

    const [homeRes, awayRes] = await Promise.all([
      fetch(`/admin/matches/${currentMatchId}/result`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ...body, team: "home" })
      }),

      fetch(`/admin/matches/${currentMatchId}/result`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ...body, team: "away" })
      })
    ]);

    if (!homeRes.ok || !awayRes.ok) {
      alert("Error saving result");
      return;
    }

    alert("Result saved!");
  });



  // =========================
  // LOAD LEAGUES
  // =========================
  async function loadLeagues() {
    try {
      const res = await fetch(`${API_URL}/leagues`);
      const leagues = await res.json();

      leagueSelect.innerHTML = `<option value="">Choose team...</option>`;
      homeTeamSelect.innerHTML = `<option value="">Home team...</option>`;
      awayTeamSelect.innerHTML = `<option value="">Away team...</option>`;

      leagues.forEach((league) => {
        const id = league.id;

        // players tab
        const opt = document.createElement("option");
        opt.value = id;
        opt.textContent = league.name;
        leagueSelect.appendChild(opt);

        // matches tab (🔥 используем ID!)
        const homeOpt = document.createElement("option");
        homeOpt.value = id;
        homeOpt.textContent = league.name;
        homeTeamSelect.appendChild(homeOpt);

        const awayOpt = document.createElement("option");
        awayOpt.value = id;
        awayOpt.textContent = league.name;
        awayTeamSelect.appendChild(awayOpt);
      });

    } catch (err) {
      console.error("Error loading leagues:", err);
    }
  }

  // =========================
  // LOAD PLAYERS
  // =========================
  async function loadPlayers(leagueId) {
    if (!leagueId) return;

    currentLeagueId = leagueId;

    try {
      const res = await fetch(`${API_URL}/admin/players/${leagueId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const players = await res.json();
      renderPlayers(players);

    } catch (err) {
      console.error("Error loading players:", err);
    }
  }

  leagueSelect.addEventListener("change", (e) => {
    loadPlayers(e.target.value);
  });

  function renderPlayers(players) {
    playersTbody.innerHTML = "";

    if (!players.length) {
      playersTbody.innerHTML = `<tr><td colspan="16">No players</td></tr>`;
      return;
    }

    players.forEach((p) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${p.name}</td>
        <td>${p.position}</td>
        <td>
          <button class="btn btn-danger btn-sm delete">Delete</button>
        </td>
      `;

      tr.querySelector(".delete").addEventListener("click", async () => {
        await fetch(`${API_URL}/admin/players/${p._id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });

        loadPlayers(currentLeagueId);
      });

      playersTbody.appendChild(tr);
    });
  }

  // =========================
  // ADD PLAYER
  // =========================
  addPlayerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(addPlayerForm);
    formData.append("leagueId", currentLeagueId);

    await fetch(`${API_URL}/admin/players`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    addPlayerForm.reset();
    loadPlayers(currentLeagueId);
  });

  // =========================
  // CREATE LEAGUE
  // =========================
  createLeagueBtn.addEventListener("click", async () => {
    const name = prompt("Team name:");
    if (!name) return;

    await fetch(`${API_URL}/admin/leagues`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name }),
    });

    loadLeagues();
  });

  // =========================
  // CREATE MATCH
  // =========================
  createMatchForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(createMatchForm);

    await fetch(`${API_URL}/admin/matches`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        matchday: formData.get("matchday"),
        homeTeam: homeTeamSelect.value,
        awayTeam: awayTeamSelect.value,
        date: formData.get("date"),
        time: formData.get("time"),
      }),
    });

    alert("Match created");
    createMatchForm.reset();
  });

  // =========================
  // LOAD MATCHES BY MATCHDAY
  // =========================
  lineupMatchday.addEventListener("change", async () => {
    const matchday = lineupMatchday.value;

    const res = await fetch(`/matches?matchday=${matchday}`);
    const matches = await res.json();

    lineupMatch.innerHTML = `<option value="">Select match</option>`;

    matches.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m._id;
      opt.textContent = `${m.homeTeam} vs ${m.awayTeam}`;
      opt.dataset.home = m.homeTeam;
      opt.dataset.away = m.awayTeam;
      lineupMatch.appendChild(opt);
    });
  });

  // =========================
  // SELECT MATCH → LOAD BOTH SQUADS
  // =========================
  lineupMatch.addEventListener("change", async () => {
    const selected = lineupMatch.options[lineupMatch.selectedIndex];
    if (!selected.value) return;

    currentMatchId = selected.value;

    const home = selected.dataset.home;
    const away = selected.dataset.away;

    await loadBothSquads(home, away);
  });

  // =========================
  // LOAD BOTH TEAMS
  // =========================

    async function loadBothSquads(home, away) {
      try {
        const [homeRes, awayRes] = await Promise.all([
          fetch(`/leagues/team/${home}`),
          fetch(`/leagues/team/${away}`)
        ]);

        const homePlayers = await homeRes.json();
        const awayPlayers = await awayRes.json();

        renderSquad(homePlayers, homePlayersContainer);
        renderSquad(awayPlayers, awayPlayersContainer);

      } catch (err) {
        console.error("Error loading squads:", err);
      }
    }

  // =========================
  // RENDER SQUAD
  // =========================
  function renderSquad(players, container) {
    container.innerHTML = "";

    players.forEach(p => {
      const col = document.createElement("div");
      col.className = "col-md-3";

      col.innerHTML = `
        <div class="card p-2">
          <label>
            <input type="checkbox" value="${p._id}">
            ${p.name}
          </label>

          <select class="form-select form-select-sm mt-1">
            <option value="">Pos</option>
            <option value="GK">GK</option>
            <option value="DEF">DEF</option>
            <option value="MID">MID</option>
            <option value="FW">FW</option>
          </select>
        </div>
      `;

      container.appendChild(col);
    });
  }

  // =========================
  // COLLECT PLAYERS
  // =========================
  function collectPlayers(container) {
    const cards = container.querySelectorAll(".card");

    const players = [];

    cards.forEach(card => {
      const checkbox = card.querySelector("input");
      const select = card.querySelector("select");

      if (checkbox.checked) {
        players.push({
          playerId: checkbox.value,
          position: select.value
        });
      }
    });

    return players;
  }

  // =========================
  // SAVE LINEUPS
  // =========================
  saveLineupBtn.addEventListener("click", async () => {

    const homePlayers = collectPlayers(homePlayersContainer);
    const awayPlayers = collectPlayers(awayPlayersContainer);

    const res = await fetch(`/admin/matches/${currentMatchId}/lineup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        home: homePlayers,
        away: awayPlayers
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message);
      return;
    }

    alert("Lineups saved!");
  });

  // INIT
  loadLeagues();
});


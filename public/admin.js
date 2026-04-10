// admin.js

const API_URL = "";
let currentLeagueId = null;

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

  if (!token) {
    window.location.href = "/index.html";
    return;
  }

  // =========================
  // MATCHDAY OPTIONS
  // =========================
  for (let i = 1; i <= 38; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `Matchday ${i}`;
    matchdaySelect.appendChild(opt);
  }

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
        // 🔥 FIX: id (НЕ _id)
        const id = league.id;

        // players tab
        const opt = document.createElement("option");
        opt.value = id;
        opt.textContent = league.name;
        leagueSelect.appendChild(opt);

        // matches tab
        const homeOpt = document.createElement("option");
        homeOpt.value = league.name.toLowerCase();
        homeOpt.textContent = league.name;
        homeTeamSelect.appendChild(homeOpt);

        const awayOpt = document.createElement("option");
        awayOpt.value = league.name.toLowerCase();
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
    console.log("🔥 loadPlayers:", leagueId);

    if (!leagueId) return;

    currentLeagueId = leagueId;

    try {
      const res = await fetch(`${API_URL}/admin/players/${leagueId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Server error:", text);
        return;
      }

      const players = await res.json();
      renderPlayers(players);

    } catch (err) {
      console.error("Error loading players:", err);
    }
  }

  // =========================
  // SELECT CHANGE
  // =========================
  leagueSelect.addEventListener("change", (e) => {
    const leagueId = e.target.value;

    console.log("✅ SELECT CHANGED:", leagueId);

    if (!leagueId) {
      playersTbody.innerHTML = `
        <tr>
          <td colspan="16" class="text-center text-muted">
            Select a team
          </td>
        </tr>`;
      return;
    }

    loadPlayers(leagueId);
  });

  // =========================
  // RENDER PLAYERS
  // =========================
  function renderPlayers(players) {
    playersTbody.innerHTML = "";

    if (!players || players.length === 0) {
      playersTbody.innerHTML =
        `<tr><td colspan="16">No players</td></tr>`;
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

    if (!currentLeagueId) return alert("Select team");

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

  // старт
  loadLeagues();
});

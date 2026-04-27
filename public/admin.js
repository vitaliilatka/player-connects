const API_URL = "";

let currentLineup = { home: [], away: [] };
let bench = { home: [], away: [] };
let squadFull = { home: [], away: [] };

let selectedMotm = null;

document.addEventListener("DOMContentLoaded", () => {

  const token = localStorage.getItem("token");

  const resultsMatchday = document.getElementById("resultsMatchday");
  const resultsMatch = document.getElementById("resultsMatch");

  const homeTeamName = document.getElementById("homeTeamName");
  const awayTeamName = document.getElementById("awayTeamName");

  const homeScore = document.getElementById("homeScore");
  const awayScore = document.getElementById("awayScore");

  const motmSelect = document.getElementById("motmSelect");

  let currentMatchId = null;

  if (!token) {
    window.location.href = "/index.html";
    return;
  }

  // =========================
  // MATCHDAY
  // =========================
  for (let i = 1; i <= 38; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `Matchday ${i}`;
    resultsMatchday.appendChild(opt);
  }

  // =========================
  // LOAD MATCHES
  // =========================
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

  // =========================
  // SELECT MATCH
  // =========================
  resultsMatch.addEventListener("change", async () => {

    const selected = resultsMatch.options[resultsMatch.selectedIndex];
    if (!selected.value) return;

    currentMatchId = selected.value;

    homeTeamName.textContent = selected.dataset.home;
    awayTeamName.textContent = selected.dataset.away;

    const match = await fetch(`/matches/${currentMatchId}`).then(r => r.json());

    currentLineup.home = match.lineups.home;
    currentLineup.away = match.lineups.away;

    renderLineup(currentLineup.home, "homeLineup");
    renderLineup(currentLineup.away, "awayLineup");

    const [homeSquad, awaySquad] = await Promise.all([
      fetch(`/leagues/team/${match.homeTeam}`).then(r => r.json()),
      fetch(`/leagues/team/${match.awayTeam}`).then(r => r.json())
    ]);

    squadFull.home = homeSquad;
    squadFull.away = awaySquad;

    renderSubstitutions("home");
    renderSubstitutions("away");

    renderMotmSelect();
  });

  // =========================
  // LINEUP (READ ONLY)
  // =========================
  function renderLineup(players, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";

    players.forEach(p => {
      const div = document.createElement("div");
      div.className = "col-md-3";

      div.innerHTML = `
        <div class="card p-2 text-center">
          ${p.player?.name}
        </div>
      `;

      container.appendChild(div);
    });
  }

  // =========================
  // SUBSTITUTIONS
  // =========================
  function renderSubstitutions(team) {

    const container = document.getElementById(team + "Subs");
    container.innerHTML = "";

    const lineup = currentLineup[team];
    const squad = squadFull[team];

    for (let i = 0; i < 5; i++) {

      const div = document.createElement("div");
      div.className = "card p-2 mb-2";

      div.innerHTML = `
        <select class="form-select mb-1 out">
          <option value="">OUT</option>
          ${lineup.map(p =>
            `<option value="${p.player._id}">${p.player.name}</option>`
          ).join("")}
        </select>

        <select class="form-select mb-1 in">
          <option value="">IN</option>
          ${squad.map(p =>
            `<option value="${p._id}">${p.name}</option>`
          ).join("")}
        </select>

        <input type="number" class="form-control minute" placeholder="Minute">
      `;

      container.appendChild(div);
    }
  }

  function collectSubs(team) {

    const cards = document
      .getElementById(team + "Subs")
      .querySelectorAll(".card");

    const subs = [];
    const used = new Set();

    for (let c of cards) {

      const out = c.querySelector(".out").value;
      const inp = c.querySelector(".in").value;
      const minute = Number(c.querySelector(".minute").value);

      if (out && inp && minute) {

        if (used.has(out)) {
          alert("Duplicate substitution");
          return null;
        }

        used.add(out);

        subs.push({
          playerOut: out,
          playerIn: inp,
          minute
        });
      }
    }

    return subs;
  }

  // =========================
  // GOALS
  // =========================
  function renderGoals(team, count) {

    const container = document.getElementById(team + "Goals");
    container.innerHTML = "";

    for (let i = 0; i < count; i++) {

      const div = document.createElement("div");
      div.className = "card p-2 mb-2";

      div.innerHTML = `
        <b>Goal ${i + 1}</b>

        <select class="form-select scorer">
          ${squadFull[team].map(p =>
            `<option value="${p._id}">${p.name}</option>`
          ).join("")}
        </select>

        <select class="form-select assist">
          <option value="">No assist</option>
          ${squadFull[team].map(p =>
            `<option value="${p._id}">${p.name}</option>`
          ).join("")}
        </select>

        <input type="number" class="form-control minute" placeholder="Minute">

        <label>
          <input type="checkbox" class="penalty"> Penalty
        </label>

        <div class="earned mt-1" style="display:none;">
          <select class="form-select earnedBy">
            ${squadFull[team].map(p =>
              `<option value="${p._id}">${p.name}</option>`
            ).join("")}
          </select>
        </div>
      `;

      const penalty = div.querySelector(".penalty");
      const earned = div.querySelector(".earned");
      const assist = div.querySelector(".assist");

      penalty.addEventListener("change", () => {
        earned.style.display = penalty.checked ? "block" : "none";
        assist.disabled = penalty.checked;
        if (penalty.checked) assist.value = "";
      });

      container.appendChild(div);
    }
  }

  function collectGoals(team) {

    const cards = document
      .getElementById(team + "Goals")
      .querySelectorAll(".card");

    const goals = [];

    for (let c of cards) {

      const scorer = c.querySelector(".scorer").value;
      const assist = c.querySelector(".assist").value;
      const minute = Number(c.querySelector(".minute").value);
      const penalty = c.querySelector(".penalty").checked;
      const earnedBy = c.querySelector(".earnedBy")?.value;

      if (!scorer || !minute) {
        alert("Goal invalid");
        return null;
      }

      if (assist && assist === scorer) {
        alert("Scorer cannot assist himself");
        return null;
      }

      goals.push({
        scorer,
        assist: penalty ? null : assist || null,
        minute,
        penalty: {
          isPenalty: penalty,
          penaltyEarnedBy: penalty ? earnedBy || null : null
        }
      });
    }

    return goals;
  }

  homeScore.addEventListener("input", () =>
    renderGoals("home", Number(homeScore.value || 0))
  );

  awayScore.addEventListener("input", () =>
    renderGoals("away", Number(awayScore.value || 0))
  );

  // =========================
  // MISSED PENALTY
  // =========================
  window.addMissedPenalty = function(team) {

    const container = document.getElementById(team + "MissedPenalties");

    const div = document.createElement("div");
    div.className = "card p-2 mb-2";

    div.innerHTML = `
      <select class="player">
        ${squadFull[team].map(p =>
          `<option value="${p._id}">${p.name}</option>`
        ).join("")}
      </select>
      <input type="number" class="minute" placeholder="Minute">
    `;

    container.appendChild(div);
  };

  function collectMissed(team) {
    return [...document
      .getElementById(team + "MissedPenalties")
      .querySelectorAll(".card")
    ].map(c => ({
      player: c.querySelector(".player").value,
      minute: Number(c.querySelector(".minute").value)
    }));
  }

  // =========================
  // CARDS
  // =========================
  window.addCard = function(team) {

    const container = document.getElementById(team + "Cards");

    const div = document.createElement("div");
    div.className = "card p-2 mb-2";

    div.innerHTML = `
      <select class="player">
        ${squadFull[team].map(p =>
          `<option value="${p._id}">${p.name}</option>`
        ).join("")}
      </select>

      <select class="type">
        <option value="yellow">Yellow</option>
        <option value="red">Red</option>
      </select>

      <input type="number" class="minute" placeholder="Minute">
    `;

    container.appendChild(div);
  };

  function collectCards(team) {
    return [...document
      .getElementById(team + "Cards")
      .querySelectorAll(".card")
    ].map(c => ({
      player: c.querySelector(".player").value,
      type: c.querySelector(".type").value,
      minute: Number(c.querySelector(".minute").value)
    }));
  }

  // =========================
  // MOTM
  // =========================
  function renderMotmSelect() {

    const players = [
      ...currentLineup.home.map(p => p.player),
      ...currentLineup.away.map(p => p.player)
    ];

    motmSelect.innerHTML = `<option value="">Select MOTM</option>`;

    players.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p._id;
      opt.textContent = p.name;
      motmSelect.appendChild(opt);
    });

    motmSelect.onchange = () => {
      selectedMotm = motmSelect.value;
    };
  }

  // =========================
  // SAVE RESULT
  // =========================

  document.getElementById("saveResultBtn").addEventListener("click", async () => {

  const homeGoals = collectGoals("home");
  const awayGoals = collectGoals("away");

  if (!homeGoals || !awayGoals) return;

  const homeSubs = collectSubs("home");
  const awaySubs = collectSubs("away");

  const homeMissed = collectMissed("home");
  const awayMissed = collectMissed("away");

  const homeCards = collectCards("home");
  const awayCards = collectCards("away");

  const score = {
    home: Number(homeScore.value || 0),
    away: Number(awayScore.value || 0)
  };

  try {

    // HOME
    const resHome = await fetch(`/admin/matches/${currentMatchId}/result`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        team: "home",
        goals: homeGoals,
        subs: homeSubs,
        missed: homeMissed,
        cards: homeCards,
        motm: selectedMotm,
        score
      })
    });

    const dataHome = await resHome.json();

    if (!resHome.ok) {
      alert("HOME ERROR: " + dataHome.message);
      return;
    }

    // AWAY
    const resAway = await fetch(`/admin/matches/${currentMatchId}/result`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        team: "away",
        goals: awayGoals,
        subs: awaySubs,
        missed: awayMissed,
        cards: awayCards,
        score
      })
    });

    const dataAway = await resAway.json();

    if (!resAway.ok) {
      alert("AWAY ERROR: " + dataAway.message);
      return;
    }

    alert("Saved!");

  } catch (err) {
    console.error(err);
    alert("Server error");
  }

});


});



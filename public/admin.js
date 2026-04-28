const API_URL = "";

let currentLineup = { home: [], away: [] };
let squadFull = { home: [], away: [] };
let selectedMotm = null;

document.addEventListener("DOMContentLoaded", () => {

  const token = localStorage.getItem("token");

  const resultsMatchday = document.getElementById("resultsMatchday");
  const resultsMatch = document.getElementById("resultsMatch");

  const homeScore = document.getElementById("homeScore");
  const awayScore = document.getElementById("awayScore");

  const motmSelect = document.getElementById("motmSelect");

  let currentMatchId = null;

  // MATCHDAY
  for (let i = 1; i <= 38; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `Matchday ${i}`;
    resultsMatchday.appendChild(opt);
  }

  // LOAD MATCHES
  resultsMatchday.addEventListener("change", async () => {

    const matches = await fetch(`/matches?matchday=${resultsMatchday.value}`)
      .then(r => r.json());

    resultsMatch.innerHTML = `<option value="">Select</option>`;

    matches.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m._id;
      opt.textContent = `${m.homeTeam} vs ${m.awayTeam}`;
      opt.dataset.home = m.homeTeam;
      opt.dataset.away = m.awayTeam;
      resultsMatch.appendChild(opt);
    });
  });

  // SELECT MATCH
  resultsMatch.addEventListener("change", async () => {

    const selected = resultsMatch.options[resultsMatch.selectedIndex];
    if (!selected.value) return;

    currentMatchId = selected.value;

    const match = await fetch(`/matches/${currentMatchId}`).then(r => r.json());

    currentLineup.home = match.lineups.home;
    currentLineup.away = match.lineups.away;

    renderLineup("home");
    renderLineup("away");

    const [home, away] = await Promise.all([
      fetch(`/leagues/team/${match.homeTeam}`).then(r => r.json()),
      fetch(`/leagues/team/${match.awayTeam}`).then(r => r.json())
    ]);

    squadFull.home = home;
    squadFull.away = away;

    renderSubs("home");
    renderSubs("away");

    renderMotm();
  });

  // LINEUP
  function renderLineup(team) {
    const container = document.getElementById(team + "Lineup");
    container.innerHTML = currentLineup[team]
      .map(p => `<div>${p.player.name}</div>`)
      .join("");
  }

  // SUBS
  function renderSubs(team) {
    const container = document.getElementById(team + "Subs");
    container.innerHTML = "";

    for (let i = 0; i < 5; i++) {

      const div = document.createElement("div");

      div.innerHTML = `
        <select class="out">
          <option></option>
          ${currentLineup[team].map(p =>
            `<option value="${p.player._id}">${p.player.name}</option>`
          ).join("")}
        </select>

        →
        <select class="in">
          <option></option>
          ${squadFull[team].map(p =>
            `<option value="${p._id}">${p.name}</option>`
          ).join("")}
        </select>

        <input class="minute" type="number" placeholder="min">
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

  // GOALS
  function renderGoals(team, count) {

    const container = document.getElementById(team + "Goals");
    container.innerHTML = "";

    for (let i = 0; i < count; i++) {

      const div = document.createElement("div");
      div.className = "goal-card";

      div.innerHTML = `
        <select class="scorer">
          ${squadFull[team].map(p =>
            `<option value="${p._id}">${p.name}</option>`
          ).join("")}
        </select>

        <select class="assist">
          <option value="">no assist</option>
          ${squadFull[team].map(p =>
            `<option value="${p._id}">${p.name}</option>`
          ).join("")}
        </select>

        <input class="minute" type="number">

        <label>
          <input type="checkbox" class="penalty"> P
        </label>

        <div class="earned" style="display:none">
          <select class="earnedBy">
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
        earned.style.display = penalty.checked ? "block" : "none";
        assist.disabled = penalty.checked;
      };

      container.appendChild(div);
    }
  }

  function collectGoals(team) {
  return [...document.querySelectorAll(`#${team}Goals .goal-card`)]
    .map(d => {

      const scorerEl = d.querySelector(".scorer");
      const minuteEl = d.querySelector(".minute");

      if (!scorerEl || !minuteEl) return null;

      const scorer = scorerEl.value;
      const assist = d.querySelector(".assist")?.value;
      const minute = Number(minuteEl.value);
      const isPenalty = d.querySelector(".penalty")?.checked;
      const earnedBy = d.querySelector(".earnedBy")?.value;

      if (!scorer || !minute) return null;

      if (assist && assist === scorer) {
        alert("assist = scorer");
        return null;
      }

      return {
        scorer,
        assist: isPenalty ? null : assist || null,
        minute,
        penalty: {
          isPenalty,
          earnedBy: isPenalty ? earnedBy || null : null
        }
      };
    })
    .filter(Boolean);
}

  homeScore.oninput = () =>
    renderGoals("home", Number(homeScore.value || 0));

  awayScore.oninput = () =>
    renderGoals("away", Number(awayScore.value || 0));

  // MISSED PENALTIES
  window.addMissedPenalty = function(team) {

    const div = document.createElement("div");

    div.innerHTML = `
      <select class="player">
        ${squadFull[team].map(p =>
          `<option value="${p._id}">${p.name}</option>`
        ).join("")}
      </select>

      <input class="minute" type="number">
    `;

    document.getElementById(team + "MissedPenalties").appendChild(div);
  };

  function collectMissed(team) {
    return [...document.querySelectorAll(`#${team}MissedPenalties div`)]
      .map(d => ({
        player: d.querySelector(".player").value,
        minute: Number(d.querySelector(".minute").value)
      }));
  }

  // CARDS
  window.addCard = function(team) {

    const div = document.createElement("div");

    div.innerHTML = `
      <select class="player">
        ${squadFull[team].map(p =>
          `<option value="${p._id}">${p.name}</option>`
        ).join("")}
      </select>

      <select class="type">
        <option value="yellow">Y</option>
        <option value="red">R</option>
      </select>

      <input class="minute" type="number">
    `;

    document.getElementById(team + "Cards").appendChild(div);
  };

  function collectCards(team) {
    return [...document.querySelectorAll(`#${team}Cards div`)]
      .map(d => ({
        player: d.querySelector(".player").value,
        type: d.querySelector(".type").value,
        minute: Number(d.querySelector(".minute").value)
      }));
  }

  // MOTM
  function renderMotm() {

    const players = [
      ...currentLineup.home.map(p => p.player),
      ...currentLineup.away.map(p => p.player)
    ];

    motmSelect.innerHTML = `<option></option>`;

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

  // SAVE
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

    const res = await fetch(`/admin/matches/${currentMatchId}/full`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message);
      return;
    }

    alert("Saved!");
  };

});

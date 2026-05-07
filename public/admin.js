const API_URL = "";

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
    const res = await fetch("/admin/leagues", {
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

    const res = await fetch("/admin/matches", {
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
    const matches = await fetch(`/matches?matchday=${lineupMatchday.value}`)
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
      fetch(`/players/team/${selected.dataset.home}`).then(r => r.json()),
      fetch(`/players/team/${selected.dataset.away}`).then(r => r.json())
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
          ${players.map(p => `<option value="${p._id}">${p.name}</option>`).join("")}
        </select>
      `;

      container.appendChild(div);
    }
  }

  document.getElementById("saveLineupBtn").onclick = async () => {

    const home = [...document.querySelectorAll("#homePlayers select")]
      .map(s => s.value)
      .filter(Boolean)
      .map(id => ({ playerId: id, position: "MID" }));

    const away = [...document.querySelectorAll("#awayPlayers select")]
      .map(s => s.value)
      .filter(Boolean)
      .map(id => ({ playerId: id, position: "MID" }));

    const res = await fetch(`/admin/matches/${currentMatchId}/lineup`, {
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

    const matches = await fetch(`/matches?matchday=${resultsMatchday.value}`)
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

    const match = await fetch(`/matches/${currentMatchId}`).then(r => r.json());

    currentLineup.home = match.lineups.home;
    currentLineup.away = match.lineups.away;

    renderLineup("home");
    renderLineup("away");

    const [home, away] = await Promise.all([
      fetch(`/players/team/${match.homeTeam}`).then(r => r.json()),
      fetch(`/players/team/${match.awayTeam}`).then(r => r.json())
    ]);

    squadFull.home = home.players;
    squadFull.away = away.players;

    renderSubs("home");
    renderSubs("away");
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

  // function renderGoals(team, count) {
  //   const container = document.getElementById(team + "Goals");
  //   container.innerHTML = "";

  //   for (let i = 0; i < count; i++) {
  //     const div = document.createElement("div");

  //     div.innerHTML = `
  //       <select class="scorer">
  //         ${squadFull[team].map(p => `<option value="${p._id}">${p.name}</option>`).join("")}
  //       </select>
  //       <input class="minute" type="number">
  //     `;

  //     container.appendChild(div);
  //   }
  // }

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

  // function collectGoals(team) {
  //   return [...document.querySelectorAll(`#${team}Goals div`)]
  //     .map(d => ({
  //       scorer: d.querySelector(".scorer").value,
  //       minute: Number(d.querySelector(".minute").value)
  //     }))
  //     .filter(g => g.scorer && g.minute);
  // }

  homeScore.oninput = () => renderGoals("home", Number(homeScore.value || 0));
  awayScore.oninput = () => renderGoals("away", Number(awayScore.value || 0));

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
    `#${team}Cards div`
  )]
    .map(d => ({
      player:
        d.querySelector(".player").value,

      type:
        d.querySelector(".type").value,

      minute:
        Number(d.querySelector(".minute").value)
    }))
    .filter(c => c.player && c.minute);
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

    // const payload = {
    //   goals: {
    //     home: collectGoals("home"),
    //     away: collectGoals("away")
    //   },
    //   substitutions: {
    //     home: collectSubs("home"),
    //     away: collectSubs("away")
    //   },
    //   missedPenalties: { home: [], away: [] },
    //   cards: { home: [], away: [] },
    //   motm: selectedMotm,
    //   score: {
    //     home: Number(homeScore.value || 0),
    //     away: Number(awayScore.value || 0)
    //   }
    // };

    const res = await fetch(`/admin/matches/${currentMatchId}/full`, {
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





// -------------------------------------------------------

// const API_URL = "";

// let currentLineup = { home: [], away: [] };
// let squadFull = { home: [], away: [] };
// let selectedMotm = null;

// document.addEventListener("DOMContentLoaded", () => {

//   const token = localStorage.getItem("token");

//   const resultsMatchday = document.getElementById("resultsMatchday");
//   const resultsMatch = document.getElementById("resultsMatch");

//   const homeScore = document.getElementById("homeScore");
//   const awayScore = document.getElementById("awayScore");

//   const motmSelect = document.getElementById("motmSelect");

//   let currentMatchId = null;

//   // MATCHDAY
//   for (let i = 1; i <= 38; i++) {
//     const opt = document.createElement("option");
//     opt.value = i;
//     opt.textContent = `Matchday ${i}`;
//     resultsMatchday.appendChild(opt);
//   }

//   // LOAD MATCHES
//   resultsMatchday.addEventListener("change", async () => {

//     const matches = await fetch(`/matches?matchday=${resultsMatchday.value}`)
//       .then(r => r.json());

//     resultsMatch.innerHTML = `<option value="">Select</option>`;

//     matches.forEach(m => {
//       const opt = document.createElement("option");
//       opt.value = m._id;
//       opt.textContent = `${m.homeTeam} vs ${m.awayTeam}`;
//       opt.dataset.home = m.homeTeam;
//       opt.dataset.away = m.awayTeam;
//       resultsMatch.appendChild(opt);
//     });
//   });

//   // SELECT MATCH
//   resultsMatch.addEventListener("change", async () => {

//     const selected = resultsMatch.options[resultsMatch.selectedIndex];
//     if (!selected.value) return;

//     currentMatchId = selected.value;

//     const match = await fetch(`/matches/${currentMatchId}`).then(r => r.json());

//     currentLineup.home = match.lineups.home;
//     currentLineup.away = match.lineups.away;

//     renderLineup("home");
//     renderLineup("away");

//     const [home, away] = await Promise.all([
//       fetch(`/players/team/${match.homeTeam}`).then(r => r.json()),
//       fetch(`/players/team/${match.awayTeam}`).then(r => r.json())
//     ]);

//     // const [home, away] = await Promise.all([
//     //   fetch(`/leagues/team/${match.homeTeam}`).then(r => r.json()),
//     //   fetch(`/leagues/team/${match.awayTeam}`).then(r => r.json())
//     // ]);

//     squadFull.home = home.players;
//     squadFull.away = away.players;

//     renderSubs("home");
//     renderSubs("away");

//     renderMotm();
//   });

//   // LINEUP
//   function renderLineup(team) {
//     const container = document.getElementById(team + "Lineup");
//     container.innerHTML = currentLineup[team]
//       .map(p => `<div>${p.player.name}</div>`)
//       .join("");
//   }

//   // SUBS
//   function renderSubs(team) {
//     const container = document.getElementById(team + "Subs");
//     container.innerHTML = "";

//     for (let i = 0; i < 5; i++) {

//       const div = document.createElement("div");

//       div.innerHTML = `
//         <select class="out">
//           <option></option>
//           ${currentLineup[team].map(p =>
//             `<option value="${p.player._id}">${p.player.name}</option>`
//           ).join("")}
//         </select>

//         →
//         <select class="in">
//           <option></option>
//           ${squadFull[team].map(p =>
//             `<option value="${p._id}">${p.name}</option>`
//           ).join("")}
//         </select>

//         <input class="minute" type="number" placeholder="min">
//       `;

//       container.appendChild(div);
//     }
//   }

//   function collectSubs(team) {
//     return [...document.querySelectorAll(`#${team}Subs div`)]
//       .map(d => ({
//         playerOut: d.querySelector(".out").value,
//         playerIn: d.querySelector(".in").value,
//         minute: Number(d.querySelector(".minute").value)
//       }))
//       .filter(s => s.playerOut && s.playerIn && s.minute);
//   }

//   // GOALS
//   function renderGoals(team, count) {

//     const container = document.getElementById(team + "Goals");
//     container.innerHTML = "";

//     for (let i = 0; i < count; i++) {

//       const div = document.createElement("div");
//       div.className = "goal-card";

//       div.innerHTML = `
//         <select class="scorer">
//           ${squadFull[team].map(p =>
//             `<option value="${p._id}">${p.name}</option>`
//           ).join("")}
//         </select>

//         <select class="assist">
//           <option value="">no assist</option>
//           ${squadFull[team].map(p =>
//             `<option value="${p._id}">${p.name}</option>`
//           ).join("")}
//         </select>

//         <input class="minute" type="number">

//         <label>
//           <input type="checkbox" class="penalty"> P
//         </label>

//         <div class="earned" style="display:none">
//           <select class="earnedBy">
//             ${squadFull[team].map(p =>
//               `<option value="${p._id}">${p.name}</option>`
//             ).join("")}
//           </select>
//         </div>
//       `;

//       const penalty = div.querySelector(".penalty");
//       const earned = div.querySelector(".earned");
//       const assist = div.querySelector(".assist");

//       penalty.onchange = () => {
//         earned.style.display = penalty.checked ? "block" : "none";
//         assist.disabled = penalty.checked;
//       };

//       container.appendChild(div);
//     }
//   }

//   function collectGoals(team) {
//   return [...document.querySelectorAll(`#${team}Goals .goal-card`)]
//     .map(d => {

//       const scorerEl = d.querySelector(".scorer");
//       const minuteEl = d.querySelector(".minute");

//       if (!scorerEl || !minuteEl) return null;

//       const scorer = scorerEl.value;
//       const assist = d.querySelector(".assist")?.value;
//       const minute = Number(minuteEl.value);
//       const isPenalty = d.querySelector(".penalty")?.checked;
//       const earnedBy = d.querySelector(".earnedBy")?.value;

//       if (!scorer || !minute) return null;

//       if (assist && assist === scorer) {
//         alert("assist = scorer");
//         return null;
//       }

//       return {
//         scorer,
//         assist: isPenalty ? null : assist || null,
//         minute,
//         penalty: {
//           isPenalty,
//           earnedBy: isPenalty ? earnedBy || null : null
//         }
//       };
//     })
//     .filter(Boolean);
// }

//   homeScore.oninput = () =>
//     renderGoals("home", Number(homeScore.value || 0));

//   awayScore.oninput = () =>
//     renderGoals("away", Number(awayScore.value || 0));

//   // MISSED PENALTIES
//   window.addMissedPenalty = function(team) {

//     const div = document.createElement("div");

//     div.innerHTML = `
//       <select class="player">
//         ${squadFull[team].map(p =>
//           `<option value="${p._id}">${p.name}</option>`
//         ).join("")}
//       </select>

//       <input class="minute" type="number">
//     `;

//     document.getElementById(team + "MissedPenalties").appendChild(div);
//   };

//   function collectMissed(team) {
//     return [...document.querySelectorAll(`#${team}MissedPenalties div`)]
//       .map(d => ({
//         player: d.querySelector(".player").value,
//         minute: Number(d.querySelector(".minute").value)
//       }));
//   }

//   // CARDS
//   window.addCard = function(team) {

//     const div = document.createElement("div");

//     div.innerHTML = `
//       <select class="player">
//         ${squadFull[team].map(p =>
//           `<option value="${p._id}">${p.name}</option>`
//         ).join("")}
//       </select>

//       <select class="type">
//         <option value="yellow">Y</option>
//         <option value="red">R</option>
//       </select>

//       <input class="minute" type="number">
//     `;

//     document.getElementById(team + "Cards").appendChild(div);
//   };

//   function collectCards(team) {
//     return [...document.querySelectorAll(`#${team}Cards div`)]
//       .map(d => ({
//         player: d.querySelector(".player").value,
//         type: d.querySelector(".type").value,
//         minute: Number(d.querySelector(".minute").value)
//       }));
//   }

//   // MOTM
//   function renderMotm() {

//     const players = [
//       ...currentLineup.home.map(p => p.player),
//       ...currentLineup.away.map(p => p.player)
//     ];

//     motmSelect.innerHTML = `<option></option>`;

//     players.forEach(p => {
//       const opt = document.createElement("option");
//       opt.value = p._id;
//       opt.textContent = p.name;
//       motmSelect.appendChild(opt);
//     });

//     motmSelect.onchange = () => {
//       selectedMotm = motmSelect.value;
//     };
//   }

//   // SAVE
//   document.getElementById("saveResultBtn").onclick = async () => {

//     const payload = {
//       goals: {
//         home: collectGoals("home"),
//         away: collectGoals("away")
//       },
//       substitutions: {
//         home: collectSubs("home"),
//         away: collectSubs("away")
//       },
//       missedPenalties: {
//         home: collectMissed("home"),
//         away: collectMissed("away")
//       },
//       cards: {
//         home: collectCards("home"),
//         away: collectCards("away")
//       },
//       motm: selectedMotm,
//       score: {
//         home: Number(homeScore.value || 0),
//         away: Number(awayScore.value || 0)
//       }
//     };

//     const res = await fetch(`/admin/matches/${currentMatchId}/full`, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${token}`
//       },
//       body: JSON.stringify(payload)
//     });

//     const data = await res.json();

//     if (!res.ok) {
//       alert(data.message);
//       return;
//     }

//     alert("Saved!");
//   };

// });

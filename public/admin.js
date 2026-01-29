// admin.js

const API_URL = "https://player-connects-backend.onrender.com";
let currentLeagueId = null;

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");
  const createLeagueBtn = document.getElementById("createLeagueBtn");
  const leagueSelect = document.getElementById("leagueSelect");
  const addPlayerForm = document.getElementById("addPlayerForm");
  const playersTbody = document.getElementById("playersTbody");

  // === Check authentication ===
  if (!token) {
    window.location.href = "/index.html";
    return;
  }

  // === Toast notifications ===
  function showToast(message, type = "success") {
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div");

    toast.className = `toast align-items-center text-white border-0 show bg-${
      type === "success" ? "success" : "danger"
    }`;

    toast.setAttribute("role", "alert");
    toast.setAttribute("aria-live", "assertive");
    toast.setAttribute("aria-atomic", "true");

    toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" 
                data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 500);
    }, 3000);
  }

  // === Load leagues ===
  async function loadLeagues() {
    try {
      const res = await fetch(`${API_URL}/admin/leagues`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const leagues = await res.json();
      if (!Array.isArray(leagues)) {
        console.error("Failed to load leagues:", leagues);
        return;
      }

      leagueSelect.innerHTML = `<option value="">Choose league...</option>`;
      leagues.forEach((lg) => {
        const opt = document.createElement("option");
        opt.value = lg._id;
        opt.textContent = lg.name;
        leagueSelect.appendChild(opt);
      });

    } catch (err) {
      console.error("Error loading leagues:", err);
    }
  }

  // ============================================
  //             RENDERING PLAYERS
  // ============================================
  function renderPlayers(players) {
    playersTbody.innerHTML = "";

    if (!players || players.length === 0) {
      playersTbody.innerHTML = `<tr><td colspan="16" class="text-center text-muted">No players</td></tr>`;
      return;
    }

    players.forEach((p) => {
      const tr = document.createElement("tr");
      const safe = (val) => (val ?? 0);

      const rating =
        safe(p.goals) * 4 +
        safe(p.assists) * 3 +
        safe(p.blocks) * 2 +
        safe(p.saves) * 2 +
        safe(p.cleansheets) -
        (safe(p.goalsconceded) +
          safe(p.yellowcards) +
          safe(p.redcards) * 2) +
        safe(p.bonus);

      tr.innerHTML = `
        <td class="text-center td-thumb position-relative">
          <img src="${p.image ? `${p.image}` : "https://via.placeholder.com/40"}"
               class="thumb player-photo" 
               style="cursor:pointer;"
               title="Click to change photo">

          <input type="file" class="form-control form-control-sm img-input" 
                 accept="image/*" style="display:none;">
        </td>
        <td><input class="form-control form-control-sm" value="${p.name || ""}"></td>
        <td><input class="form-control form-control-sm" value="${p.team || ""}"></td>
        <td>
          <select class="form-select form-select-sm">
            <option value="" ${!p.position ? "selected" : ""}>—</option>
            <option value="GK" ${p.position === "GK" ? "selected" : ""}>GK</option>
            <option value="DEF" ${p.position === "DEF" ? "selected" : ""}>DEF</option>
            <option value="MID" ${p.position === "MID" ? "selected" : ""}>MID</option>
            <option value="FW" ${p.position === "FW" ? "selected" : ""}>FW</option>
          </select>
        </td>

        <td><input name="games" type="number" class="form-control form-control-sm" value="${safe(p.games)}"></td>
        <td><input name="goals" type="number" class="form-control form-control-sm" value="${safe(p.goals)}"></td>
        <td><input name="assists" type="number" class="form-control form-control-sm" value="${safe(p.assists)}"></td>
        <td><input name="blocks" type="number" class="form-control form-control-sm" value="${safe(p.blocks)}"></td>
        <td><input name="saves" type="number" class="form-control form-control-sm" value="${safe(p.saves)}"></td>
        <td><input name="cleansheets" type="number" class="form-control form-control-sm" value="${safe(p.cleansheets)}"></td>
        <td><input name="goalsconceded" type="number" class="form-control form-control-sm" value="${safe(p.goalsconceded)}"></td>
        <td><input name="penalty_earned" type="number" class="form-control form-control-sm" value="${safe(p.penalty_earned)}"></td>
        <td><input name="penalty_missed" type="number" class="form-control form-control-sm" value="${safe(p.penalty_missed)}"></td>
        <td><input name="penalty_saved" type="number" class="form-control form-control-sm" value="${safe(p.penalty_saved)}"></td>

        <td><input name="yellowcards" type="number" class="form-control form-control-sm" value="${safe(p.yellowcards)}"></td>
        <td><input name="redcards" type="number" class="form-control form-control-sm" value="${safe(p.redcards)}"></td>
        <td><input name="bonus" type="number" class="form-control form-control-sm" value="${safe(p.bonus)}"></td>

        <td class="fw-bold text-primary text-center">${rating.toFixed(1)}</td>

        <td class="actions text-center">
          <button class="btn btn-sm btn-success"><i class="fa-solid fa-floppy-disk"></i></button>
          <button class="btn btn-sm btn-danger"><i class="fa-solid fa-trash"></i></button>
        </td>
      `;

      // === Validation for numbers and cards ===
      tr.querySelectorAll('input[type="number"]').forEach((input) => {
        input.addEventListener("input", (e) => {
          let val = e.target.value.replace(/\D/g, "");
          if (val === "") val = "0";
          let num = Math.min(parseInt(val, 10), 999);
          if (num < 0 || isNaN(num)) num = 0;

          const gamesInput = tr.querySelector('input[name="games"]');
          const games = gamesInput ? +gamesInput.value || 0 : 0;

          // 🔴 Cards can't exceed number of games
          if (input.name === "redcards") {
            if (num > games) num = games;
          } 
          else if (input.name === "yellowcards") {
            if (num > games * 2) num = games * 2;
          }

          e.target.value = num;
          updateRating();
        });
      });

      // === Dynamic rating calculation ===
      function updateRating() {
        const get = (name) =>
          +tr.querySelector(`input[name="${name}"]`)?.value || 0;

        const games = get("games");
        const goals = get("goals");
        const assists = get("assists");
        const blocks = get("blocks");
        const saves = get("saves");
        const cleansheets = get("cleansheets");
        const goalsconceded = get("goalsconceded");

        const penalty_earned = get("penalty_earned");
        const penalty_missed = get("penalty_missed");
        const penalty_saved = get("penalty_saved");

        const yellowcards = get("yellowcards");
        const redcards = get("redcards");
        const bonus = get("bonus");

        let rating = 0;

        if (games > 0) {
          const baseScore =
            games * 2 +
            goals * 4 +
            assists * 3 +
            blocks * 1 +
            saves * 1 +
            cleansheets * 4 +
            penalty_earned * 2 +
            penalty_saved * 4 -
            penalty_missed * 2 +
            bonus * 3;

          // Penalty cannot exceed baseScore
          const penalty = Math.min(
            baseScore,
            goalsconceded + yellowcards + redcards * 2
          );

          rating = baseScore - penalty;
        }

        const ratingCell = tr.querySelector("td:nth-last-child(2)");
        ratingCell.textContent = rating.toFixed(1);
      }

      updateRating();

      // === Photo editing ===
      const img = tr.querySelector(".player-photo");
      const imgInput = tr.querySelector(".img-input");

      img.addEventListener("click", () => imgInput.click());

      imgInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            img.src = ev.target.result;
          };
          reader.readAsDataURL(file);
        }
      });

      // === Save player ===
      tr.querySelector(".btn-success").addEventListener("click", async () => {
        const inputs = tr.querySelectorAll("input, select");
        const newImageFile =
          imgInput.files.length > 0 ? imgInput.files[0] : null;

        const updated = {
          name: inputs[1].value,
          team: inputs[2].value,
          position: inputs[3].value,
          games: +inputs[4].value || 0,
          goals: +inputs[5].value || 0,
          assists: +inputs[6].value || 0,
          blocks: +inputs[7].value || 0,
          saves: +inputs[8].value || 0,
          cleansheets: +inputs[9].value || 0,
          goalsconceded: +inputs[10].value || 0,
          penalty_earned: +inputs[11].value || 0,
          penalty_missed: +inputs[12].value || 0,
          penalty_saved: +inputs[13].value || 0,
          yellowcards: +inputs[14].value || 0,
          redcards: +inputs[15].value || 0,
          bonus: +inputs[16].value || 0,
        };

        try {
          await updatePlayer(p._id, updated, newImageFile);
          showToast(`Player "${updated.name}" saved!`, "success");
          loadPlayers(currentLeagueId);
        } catch (err) {
          console.error("Save error:", err);
          showToast(`Failed to save player "${updated.name}"`, "danger");
        }
      });

      // === Delete player ===
      tr.querySelector(".btn-danger").addEventListener("click", async () => {
        if (confirm(`Delete player ${p.name}?`)) {
          await deletePlayer(p._id);
          loadPlayers(currentLeagueId);
          showToast("Player deleted", "success");
        }
      });

      playersTbody.appendChild(tr);
    });
  }

  // ============================================
  //                   API
  // ============================================
  async function loadPlayers(leagueId) {
    currentLeagueId = leagueId;
    if (!leagueId) return;

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

  // Alert for quick messages
  function showSaveAlert(message, type = "success") {
    const alertBox = document.getElementById("adminAlert");
    alertBox.innerHTML = `
      <div class="alert alert-${type} alert-dismissible fade show py-1 px-2" 
           role="alert" style="font-size:0.85rem;">
        ${message}
        <button type="button" class="btn-close btn-sm" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>`;
    setTimeout(() => (alertBox.innerHTML = ""), 3000);
  }


  async function updatePlayer(id, data, newImageFile = null) {
  const formData = new FormData();

  // обычные поля
  for (const [key, value] of Object.entries(data)) {
    formData.append(key, value);
  }

  // файл — ТОЛЬКО если выбран
  if (newImageFile) {
    formData.append("image", newImageFile);
  }

  const res = await fetch(`${API_URL}/admin/players/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Player update error:", text);
    throw new Error("Failed to update player");
  }

  return await res.json();
}

  // async function updatePlayer(id, data, newImageFile = null) {
  //   const formData = new FormData();

  //   for (const [key, value] of Object.entries(data)) {
  //     formData.append("image", fileInput.files[0]);
  //     formData.append("name", nameValue);
  //     formData.append("team", teamValue);
  //     formData.append("position", positionValue);
  //     formData.append(key, value);
  //   }

  //   if (newImageFile) {
  //     formData.append("image", newImageFile);
  //   }

  //   const res = await fetch(`${API_URL}/admin/players/${id}`, {
  //     method: "PUT",
  //     headers: { Authorization: `Bearer ${token}` },
  //     body: formData,
  //   });

  //   if (!res.ok) {
  //     const text = await res.text();
  //     console.error("Player update error:", text);
  //   }


    // if (!res.ok) console.error("Player update error");
  }

  async function deletePlayer(id) {
    const res = await fetch(`${API_URL}/admin/players/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) console.error("Player deletion error");
  }

  // ============================================
  //             ADDING A PLAYER
  // ============================================
  addPlayerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentLeagueId) return alert("Select a league!");

    const formData = new FormData(addPlayerForm);
    formData.append("leagueId", currentLeagueId);

    function showAlert(message, type = "danger") {
      const box = document.getElementById("adminAlert");
      box.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show py-1 px-2" role="alert" style="font-size:0.85rem;">
          ${message}
          <button type="button" class="btn-close btn-sm" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>`;
      setTimeout(() => (box.innerHTML = ""), 4000);
    }

    try {
      const res = await fetch(`${API_URL}/admin/players`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();   // <-- НЕ JSON!
        console.error("Server error response:", text);
        showAlert("Server error while adding player", "danger");
        return;
      }


      // if (!res.ok) {
      //   const errData = await res.json();
      //   showAlert(errData.message || "Failed to add player", "warning");
      //   return;
      // }

      showAlert("Player added successfully!", "success");

      addPlayerForm.reset();
      loadPlayers(currentLeagueId);
    } catch (err) {
      console.error(err);
    }
  });

  // ============================================
  //             CREATING A LEAGUE
  // ============================================
  createLeagueBtn.addEventListener("click", async () => {
    const name = prompt("Enter league name:");
    if (!name) return;

    try {
      const res = await fetch(`${API_URL}/admin/leagues`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, createdBy: userId }),
      });

      const league = await res.json();

      await loadLeagues();
      leagueSelect.value = league._id;
      loadPlayers(league._id);
    } catch (err) {
      console.error("Error creating league:", err);
    }
  });

  // ============================================
  //         LEAGUE SWITCH & BANNER
  // ============================================
  leagueSelect.addEventListener("change", (e) => {
    const selectedOption = leagueSelect.options[leagueSelect.selectedIndex];
    const leagueName = selectedOption.textContent;
    const banner = document.getElementById("leagueBanner");

    if (e.target.value) {
      banner.style.display = "block";
      setTimeout(() => banner.classList.add("show"), 10);
      banner.textContent = `Welcome to ${leagueName} League! 🎉`;
    } else {
      banner.classList.remove("show");
      setTimeout(() => (banner.style.display = "none"), 300);
    }

    loadPlayers(e.target.value);
  });

  // Start
  loadLeagues();
});

// document.addEventListener("DOMContentLoaded", () => loadPlayersPublic());

const API_URL = "https://player-connects-backend.onrender.com";


const DEFAULT_IMG = "https://placehold.co/150x200?text=No%20Image";

// === Renamed function ===
async function loadPlayers(leagueId) {
  try {
    const url = leagueId
      ? `${API_URL}/players?leagueId=${leagueId}`
      : `${API_URL}/players`;

    const res = await fetch(url, { cache: "no-store" });
    const players = await res.json();
    renderPlayers(
      players
        .map(p => ({ ...p, rating: calcRating(p) }))
        .sort((a, b) => b.rating - a.rating)
    );
  } catch (err) {
    console.error(err);
  }
}

function calcRating(p) {
  return (p.games || 0) * 2 + (p.goals || 0) * 4 + (p.assists || 0) * 3 +
         (p.cleansheets || 0) * 5 + (p.blocks || 0) + (p.saves || 0) +
         (p.bonus || 0) * 3 - (p.penalty_missed) * 2 - (p.goalsconceded || 0) - (p.yellowcards || 0) - (p.redcards || 0) * 2;
}

function getPosBadge(pos) {
  switch ((pos || "").toUpperCase()) {
    case "GK": return `<span class="badge bg-success">GK</span>`;
    case "DEF": return `<span class="badge bg-primary">DEF</span>`;
    case "MID": return `<span class="badge bg-warning text-dark">MID</span>`;
    case "FW": return `<span class="badge bg-danger">FW</span>`;
    default: return `<span class="badge bg-secondary">—</span>`;
  }
}

function renderPlayers(players) {
  const container = document.getElementById("players-cards");
  if (!container) {
    console.warn("No #players-cards container found in DOM");
    return;
  }
  container.innerHTML = "";
  players.forEach(p => {
    const col = document.createElement("div");
    col.className = "col-12 col-md-6 col-lg-4";
    col.innerHTML = `
      <div class="card h-100 d-flex flex-column">
        <div class="card-header text-center">
          <h5 class="mb-1">${escapeHtml(p.name)}</h5>
          <div class="fs-5 fw-bold text-warning">${p.rating} pts</div>
        </div>
        <div class="card-body flex-grow-1">
          <div class="row text-center mb-3">
            <div class="col-6"><i class="fa-solid fa-people-group me-1"></i>${escapeHtml(p.team ?? "—")}</div>
            <div class="col-6">${getPosBadge(p.position)}</div>
          </div>
          <div class="row text-center">
            <div class="col-6"><i class="fa-solid fa-futbol text-success me-1"></i>${p.goals ?? 0}</div>
            <div class="col-6"><i class="fa-solid fa-arrow-right-long text-primary me-1"></i>${p.assists ?? 0}</div>
          </div>
        </div>
        <div class="card-footer text-center">
          <button class="btn btn-outline-primary btn-sm btn-details"><i class="fa-solid fa-circle-info"></i> Details</button>
        </div>
      </div>`;
    col.querySelector(".btn-details").addEventListener("click", () => openDetails(p));
    container.appendChild(col);
  });
}

function escapeHtml(text) {
  if (!text && text !== 0) return "";
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function openDetails(p) {
  const label = document.getElementById("playerModalLabel");
  if (label) label.textContent = `${p.name} — ${p.rating} pts`;

  let playerImg = DEFAULT_IMG;
  if (p.image && typeof p.image === "string") {
    const v = p.image.trim();
    if (v.startsWith("data:") || v.startsWith("http://") || v.startsWith("https://") || v.startsWith("/")) {
      playerImg = v;
    }
  }

  const bodyEl = document.getElementById("playerModalBody");
  if (!bodyEl) {
    console.warn("No #playerModalBody element found");
    return;
  }

  bodyEl.innerHTML = `
    <div class="row">
      <div class="col-md-4 text-center border-end">
        <h4>${escapeHtml(p.name)}</h4>
        <div class="text-muted mb-2">${escapeHtml(p.team ?? "—")}</div>
        <img id="modalPlayerImg" src="${playerImg}" alt="${escapeHtml(p.name)}" class="img-fluid rounded mb-2" style="max-height:200px; object-fit:cover;">
        <div class="mb-2">${getPosBadge(p.position)}</div>
        <div class="fw-bold fs-5 text-warning">${p.rating} pts</div>
      </div>
      <div class="col-md-8">
        <ul class="list-group list-group-flush">
          <li class="list-group-item"><i class="fa-solid fa-gamepad me-1 text-secondary"></i>Games: ${p.games ?? 0}</li>
          <li class="list-group-item"><i class="fa-solid fa-futbol me-1 text-success"></i>Goals: ${p.goals ?? 0}</li>
          <li class="list-group-item"><i class="fa-solid fa-arrow-right-long me-1 text-primary"></i>Assists: ${p.assists ?? 0}</li>
          <li class="list-group-item"><i class="fa-solid fa-shield-halved me-1 text-info"></i>Blocks: ${p.blocks ?? 0}</li>
          <li class="list-group-item"><i class="fa-solid fa-hand me-1 text-warning"></i>Saves: ${p.saves ?? 0}</li>
          <li class="list-group-item"><i class="fa-solid fa-broom me-1 text-success"></i>Clean sheets: ${p.cleansheets ?? 0}</li>
          <li class="list-group-item"><i class="fa-regular fa-futbol me-1 text-danger"></i>Goals conceded: ${p.goalsconceded ?? 0}</li>

          <li class="list-group-item"><i class="fa-solid fa-arrow-trend-up me-1 text-success"></i>Penalty earned: ${p.penalty_earned ?? 0}</li>
          <li class="list-group-item"><i class="fa-solid fa-xmark me-1 text-danger"></i>Penalty missed: ${p.penalty_missed ?? 0}</li>
          <li class="list-group-item"><i class="fa-solid fa-hand-back-fist me-1 text-primary"></i>Penalty saved: ${p.penalty_saved ?? 0}</li>
          
          <li class="list-group-item">
            <span style="display:inline-block;width:12px;height:18px;background:yellow;border:1px solid #333;margin-right:5px;"></span>
            Yellow cards: ${p.yellowcards ?? 0}
          </li>
          <li class="list-group-item">
            <span style="display:inline-block;width:12px;height:18px;background:red;border:1px solid #333;margin-right:5px;"></span>
            Red cards: ${p.redcards ?? 0}
          </li>
          <li class="list-group-item"><i class="fa-solid fa-star me-1 text-warning"></i>Bonus: ${p.bonus ?? 0}</li>
        </ul>
      </div>
    </div>`;

  const imgEl = document.getElementById("modalPlayerImg");
  if (imgEl) {
    imgEl.onerror = () => {
      imgEl.onerror = null;
      imgEl.src = DEFAULT_IMG;
    };
  }

  try { 
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
  } catch (e) {}

  const modal = new bootstrap.Modal(document.getElementById("playerModal"));
  modal.show();
}

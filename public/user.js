// user.js

const API_URL = "https://player-stats-backend.onrender.com";
const token = localStorage.getItem("token");
const role = localStorage.getItem("role");

// If no token → guest
if (!token) {
  window.location.href = "/guest.html";
}

// If an admin accidentally opened this page → redirect
if (role === "admin") {
  window.location.href = "/admin.html";
}

// Validate token and load players
async function init() {
  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      localStorage.clear();
      return (window.location.href = "/guest.html");
    }

    const user = await res.json();
    document.querySelector("h1").innerText = `👤 Player Stats (User: ${user.username})`;

    loadPlayers(user.username);

  } catch (err) {
    console.error(err);
    window.location.href = "/guest.html";
  }
}

async function loadPlayers(username) {
  const res = await fetch(`${API_URL}/players`);
  const players = await res.json();

  const container = document.getElementById("players-cards");
  container.innerHTML = "";

  players.forEach((p) => {
    const card = document.createElement("div");
    card.className = "col-md-4";

    card.innerHTML = `
      <div class="card h-100 ${p.name.toLowerCase().includes("ronaldo") ? "border-success border-3" : ""}">
        <div class="card-header">${p.name}</div>
        <div class="card-body">
          <p><strong>Team:</strong> ${p.team}</p>
          <p><strong>Position:</strong> ${p.position}</p>
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

// Logout
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.clear();
  window.location.href = "/guest.html";
});

init();

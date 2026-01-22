// guest.js

const API_URL = "https://player-stats-backend.onrender.com";

// -------------------------
// Load players
// -------------------------
async function loadPlayers(leagueId) {
  let url = `${API_URL}/players`;
  if (leagueId) url += `?leagueId=${leagueId}`;

  console.log("Player request:", url);

  const res = await fetch(url);
  const players = await res.json();

  const container = document.getElementById("players-cards");
  container.innerHTML = "";

  players.forEach((p) => {
    const card = document.createElement("div");
    card.className = "col-md-4";
    card.innerHTML = `
      <div class="card h-100">
        <div class="card-header">${p.name}</div>
        <div class="card-body">
          <p><strong>Team:</strong> ${p.team}</p>
          <p><strong>Position:</strong> ${p.position}</p>
        </div>
      </div>`;
    container.appendChild(card);
  });
}

// -------------------------
// Login handler
// -------------------------
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    console.log("Server response:", data);

    if (!res.ok) {
      document.getElementById("loginMessage").innerText =
        data.message || "Login error";
      return;
    }

    // Save login data to localStorage
    if (data.token) localStorage.setItem("token", data.token);
    if (data.role) localStorage.setItem("role", data.role);
    if (data.username) localStorage.setItem("username", data.username);
    if (data.userId) {
      localStorage.setItem("userId", data.userId);
      console.log("✅ userId saved:", data.userId);
    }

    // Redirect based on role
    if (data.role === "admin") {
      window.location.href = "/admin.html";
    } else {
      window.location.href = "/user.html";
    }
  } catch (err) {
    console.error("Login error:", err);
    document.getElementById("loginMessage").innerText =
      "Server connection error";
  }
});

// -------------------------
// Auto-load default league
// -------------------------
async function initDefaultLeague() {
  try {
    console.log("Fetching default league...");

    const res = await fetch(`${API_URL}/leagues/default`);
    const data = await res.json();

    console.log("Default league:", data);

    if (!data.id) {
      console.warn("⚠ Default league not found, loading all players.");
      await loadPlayers();
      return;
    }

    // Load players from the default league
    await loadPlayers(data.id);

  } catch (err) {
    console.error("Error loading default league:", err);
    loadPlayers(); // fallback
  }
}

// -------------------------
// Init on page load
// -------------------------
initDefaultLeague();

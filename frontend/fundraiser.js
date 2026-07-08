import API_BASE from "./config/api.js";
import { initNavbar } from "./navbar.js";

let allFundraisers = [];
let currentCategory = "all";
let searchQuery = "";

async function loadFundraisers() {
  const grid = document.getElementById("fundraisersGrid");

  try {
    const res = await fetch(`${API_BASE}/api/fundraisers`);
    const data = await res.json();

    // Store campaigns, filtering out private ones
    allFundraisers = data.filter(f => f.fundraiserType !== "private");

    renderFundraisers();
    setupFilters();
  } catch (err) {
    console.error("Error loading fundraisers:", err);
    grid.innerHTML = "<p>Failed to load fundraisers.</p>";
  }
}

function renderFundraisers() {
  const grid = document.getElementById("fundraisersGrid");
  grid.innerHTML = "";

  const role = localStorage.getItem("role");
  const userWallet = localStorage.getItem("wallet");
  const watchlist = JSON.parse(localStorage.getItem("watchlist") || "[]");

  // Apply filters
  const filtered = allFundraisers.filter(f => {
    const matchesCategory = currentCategory === "all" || f.category === currentCategory;
    const matchesSearch = f.title.toLowerCase().includes(searchQuery) || f.description.toLowerCase().includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #64748b; padding: 40px;">No campaigns match your search or filter.</p>`;
    return;
  }

  filtered.forEach(f => {
    const ownerWallet = f.ownerWallet;
    const shortDesc = f.description.length > 100
      ? f.description.substring(0, 100) + "..."
      : f.description;

    const raised = parseFloat(f.raised || 0);
    const goal = parseFloat(f.goal);
    const raisedInr = raised * 300000;
    const goalInr = goal * 300000;
    const progressPercent = Math.min((raised / goal) * 100, 100);

    const donateButton =
      (role === "ngo" && userWallet === ownerWallet)
        ? "" // NGO cannot donate to own fundraiser
        : `<button class="donate-btn" data-fundraiser-id="${f.fundraiserId}" style="flex: 1; padding: 10px; border-radius: 8px; border: none; font-weight: 700; cursor: pointer; transition: all 0.2s; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white;">Donate</button>`;

    // Goal achieved badge check
    const goalBadge = raised >= goal
      ? `<span style="background: #dcfce7; color: #166534; padding: 4px 10px; border-radius: 12px; font-weight: 700; font-size: 12px; border: 1px solid #bbf7d0; display: inline-block; margin-bottom: 10px;">Goal Achieved! 🎉</span>`
      : "";

    // Closed campaign indicator
    const closedBadge = f.status === "closed"
      ? `<span style="background: #ffe4e6; color: #9f1239; padding: 4px 10px; border-radius: 12px; font-weight: 700; font-size: 12px; border: 1px solid #fecdd3; display: inline-block; margin-bottom: 10px;">Closed 🔒</span>`
      : "";

    // Watchlist Heart Toggle (Donors only)
    const isFavorited = watchlist.includes(f.fundraiserId);
    const heartColor = isFavorited ? "#ef4444" : "#94a3b8";
    const heartIcon = role === "donor"
      ? `<button class="fav-btn" data-fundraiser-id="${f.fundraiserId}" style="background: none; border: none; cursor: pointer; font-size: 22px; color: ${heartColor}; transition: transform 0.2s; padding: 0; display: flex; align-items: center; justify-content: center;" title="Add to watchlist">❤️</button>`
      : "";

    const card = `
      <div class="card" style="position: relative; display: flex; flex-direction: column; justify-content: space-between; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; background: white; box-shadow: 0 4px 20px rgba(0,0,0,0.02); transition: transform 0.2s;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 10px;">
            <h3 style="font-size: 20px; font-weight: 800; color: #1e293b; margin: 0; line-height: 1.3;">${f.title}</h3>
            ${heartIcon}
          </div>
          <div style="display: flex; gap: 5px; flex-wrap: wrap;">
            ${closedBadge}
            ${goalBadge}
          </div>
          <p style="color: #64748b; font-size: 14px; margin-bottom: 15px; line-height: 1.5;">${shortDesc}</p>

          <p style="font-size: 13px; color: #475569; margin: 5px 0;"><strong>Category:</strong> ${f.category}</p>
          <p style="font-size: 13px; color: #475569; margin: 5px 0; margin-bottom: 15px;"><strong>People Affected:</strong> ${f.peopleAffected}</p>
        </div>

        <div>
          <p style="font-size: 13px; font-weight: 600; color: #1e293b; margin-bottom: 8px;">
            <strong>Raised:</strong> ${raised.toFixed(4)} ETH <span style="font-size:11px; opacity:0.8;">(~₹${raisedInr.toLocaleString('en-IN')})</span> / <br>
            ${goal.toFixed(4)} ETH <span style="font-size:11px; opacity:0.8;">(~₹${goalInr.toLocaleString('en-IN')})</span>
          </p>

          <div class="progress-bar" style="width: 100%; height: 8px; background: #e2e8f0; border-radius: 10px; overflow: hidden; margin-bottom: 20px;">
            <div class="progress-fill" style="height: 100%; width:${progressPercent}%; background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);"></div>
          </div>

          <div class="buttons" style="display: flex; gap: 10px;">
            <button class="details-btn" data-fundraiser-id="${f.fundraiserId}" style="flex: 1; padding: 10px; border-radius: 8px; border: 1.5px solid #cbd5e1; background: white; font-weight: 700; color: #475569; cursor: pointer; transition: all 0.2s;">
              View Details
            </button>
            ${f.status === "closed" ? "" : donateButton}
          </div>
        </div>
      </div>
    `;

    grid.innerHTML += card;
  });

  wireFundraiserCardActions();
}

function setupFilters() {
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderFundraisers();
    });
  }

  const filterButtons = document.querySelectorAll(".filter-btn");
  filterButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
      filterButtons.forEach(b => b.classList.remove("active"));
      e.target.classList.add("active");
      currentCategory = e.target.getAttribute("data-category");
      renderFundraisers();
    });
  });
}

function wireFundraiserCardActions() {
  document.querySelectorAll('[data-fundraiser-id]').forEach((btn) => {
    const id = parseInt(btn.getAttribute('data-fundraiser-id'));
    if (!id) return;

    if (btn.classList.contains('details-btn')) {
      btn.addEventListener('click', () => {
        window.location.href = `fundraiser-detail.html?id=${id}`;
      });
    }

    if (btn.classList.contains('donate-btn')) {
      btn.addEventListener('click', () => {
        window.location.href = `fundraiser-detail.html?id=${id}`;
      });
    }

    // Heart toggle bookmark watchlist handler
    if (btn.classList.contains('fav-btn')) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        let watchlist = JSON.parse(localStorage.getItem("watchlist") || "[]");
        if (watchlist.includes(id)) {
          watchlist = watchlist.filter(item => item !== id);
          btn.style.color = "#94a3b8";
        } else {
          watchlist.push(id);
          btn.style.color = "#ef4444";
          // Heart pump micro-animation
          btn.style.transform = "scale(1.3)";
          setTimeout(() => btn.style.transform = "scale(1)", 200);
        }
        localStorage.setItem("watchlist", JSON.stringify(watchlist));
      });
    }
  });
}

window.onload = () => {
  initNavbar();
  loadFundraisers();
};

import API_BASE from "./config/api.js";
import { initNavbar } from "./navbar.js";


// Protect dashboard: only NGOs allowed
window.onload = () => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token || role !== "ngo") {
    alert("Access Denied! Please login as NGO.");
    window.location.href = "login.html";
    return;
  }

  initNavbar();

  // Wire up event listeners
  const editProfileBtn = document.getElementById("editProfileBtn");
  if (editProfileBtn) {
    editProfileBtn.addEventListener("click", () => {
      window.location.href = "edit-profile.html";
    });
  }

  const createCampaignBtn = document.getElementById("createCampaignBtn");
  if (createCampaignBtn) {
    createCampaignBtn.addEventListener("click", () => {
      window.location.href = "create-fundraiser.html";
    });
  }

  const myCampaignsBtn = document.getElementById("myCampaignsBtn");
  if (myCampaignsBtn) {
    myCampaignsBtn.addEventListener("click", () => {
      loadMyFundraisers();
    });
  }

  const connectMetaMaskBtn = document.getElementById("connectMetaMaskBtn");
  if (connectMetaMaskBtn) {
    connectMetaMaskBtn.addEventListener("click", () => {
      connectMetaMask();
    });
  }
};

// Load My Fundraisers
async function loadMyFundraisers() {
  const token = localStorage.getItem("token");
  const container = document.getElementById("fundraisersList");

  container.innerHTML = "<p>Loading...</p>";

  try {
    const res = await fetch(`${API_BASE}/api/my-fundraisers`, {
      headers: {
        "Authorization": "Bearer " + token
      }
    });

    if (!res.ok) {
      container.innerHTML = "<p>Failed to load campaigns.</p>";
      return;
    }

    const fundraisers = await res.json();

    if (fundraisers.length === 0) {
      container.innerHTML = "<p>You have not created any fundraisers yet.</p>";
      return;
    }

    container.innerHTML = "";

    fundraisers.forEach(f => {
      const raised = parseFloat(f.raised || 0);
      const goal = parseFloat(f.goal || 0);
      const raisedInr = raised * 300000;
      const goalInr = goal * 300000;
      const percent = goal > 0 ? Math.min((raised / goal) * 100, 100) : 0;

      container.innerHTML += `
        <div class="fundraiser-card">
          <h3>${f.title}</h3>
          <p>${f.description.substring(0, 120)}...</p>

          <div class="fundraiser-info">
            <div class="info-item"><strong>Category</strong><span>${f.category}</span></div>
            <div class="info-item"><strong>People</strong><span>${f.peopleAffected}</span></div>
            <div class="info-item"><strong>Raised</strong><span>${raised.toFixed(4)} ETH<br><small style="color: #64748b;">(~₹${raisedInr.toLocaleString('en-IN')})</small></span></div>
            <div class="info-item"><strong>Goal</strong><span>${goal.toFixed(4)} ETH<br><small style="color: #64748b;">(~₹${goalInr.toLocaleString('en-IN')})</small></span></div>
          </div>

          <div class="progress-bar">
            <div class="progress-fill" style="width:${percent}%"></div>
          </div>

          <button class="btn btn-primary"
            onclick="window.location.href='fundraiser-detail.html?id=${f.fundraiserId}'">
            View
          </button>
        </div>
      `;
    });

  } catch (err) {
    console.error(err);
    container.innerHTML = "<p>Error loading fundraisers.</p>";
  }
}


// Connect MetaMask
async function connectMetaMask() {
  const status = document.getElementById("walletStatus");

  if (!window.ethereum) {
    status.textContent = "MetaMask not installed!";
    status.className = "disconnected";
    return;
  }

  try {
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts"
    });

    const wallet = accounts[0];
    status.textContent = "Connected Wallet: " + wallet;
    status.className = "connected";

    localStorage.setItem("wallet", wallet);
  } catch (err) {
    status.textContent = "MetaMask connection rejected.";
    status.className = "disconnected";
  }
}

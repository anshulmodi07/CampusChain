import API_BASE from "./config/api.js";
import { initNavbar } from "./navbar.js";

let currentEditCampaignId = null;

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
  loadMyFundraisers();

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

  // Load cached wallet address on load if valid
  const wallet = localStorage.getItem("wallet");
  const status = document.getElementById("walletStatus");
  if (wallet && /^0x[a-fA-F0-9]{40}$/.test(wallet) && status) {
    status.textContent = "Connected Wallet: " + wallet;
    status.className = "connected";
  }

  const connectMetaMaskBtn = document.getElementById("connectMetaMaskBtn");
  if (connectMetaMaskBtn) {
    if (!window.ethereum) {
      connectMetaMaskBtn.innerText = "Install MetaMask 🦊";
    }
    connectMetaMaskBtn.addEventListener("click", () => {
      connectMetaMask();
    });
  }

  // Modal event listeners
  const closeEditModalBtn = document.getElementById("closeEditModalBtn");
  if (closeEditModalBtn) {
    closeEditModalBtn.addEventListener("click", () => {
      document.getElementById("editDescriptionModal").style.display = "none";
    });
  }

  const saveEditModalBtn = document.getElementById("saveEditModalBtn");
  if (saveEditModalBtn) {
    saveEditModalBtn.addEventListener("click", async () => {
      const desc = document.getElementById("editDescTextarea").value.trim();

      try {
        const res = await fetch(`${API_BASE}/api/fundraiser/${currentEditCampaignId}/description`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ description: desc })
        });
        if (res.ok) {
          document.getElementById("editDescriptionModal").style.display = "none";
          loadMyFundraisers();
        } else {
          const errData = await res.json();
          alert("Failed to save description: " + errData.message);
        }
      } catch (err) {
        console.error("Error saving fundraiser description:", err);
      }
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

      const statusBadge = f.status === "closed"
        ? `<span style="background: #ffe4e6; color: #9f1239; padding: 4px 10px; border-radius: 12px; font-weight: 700; font-size: 12px; border: 1px solid #fecdd3; display: inline-block; margin-bottom: 10px;">Closed 🔒</span>`
        : `<span style="background: #e6fffa; color: #00875a; padding: 4px 10px; border-radius: 12px; font-weight: 700; font-size: 12px; border: 1px solid #c1f2e8; display: inline-block; margin-bottom: 10px;">Active 🟢</span>`;

      container.innerHTML += `
        <div class="fundraiser-card" style="position: relative;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <h3>${f.title}</h3>
            ${statusBadge}
          </div>
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

          <div class="fundraiser-actions" style="display: flex; gap: 10px; margin-top: 15px; flex-wrap: wrap;">
            <button class="btn btn-primary view-details-btn" data-fundraiser-id="${f.fundraiserId}" style="flex: 1; min-width: 120px;">View Details</button>
            <button class="btn edit-desc-btn" data-fundraiser-id="${f.fundraiserId}" data-description="${encodeURIComponent(f.description)}" style="flex: 1; background: #64748b; color: white; min-width: 120px;">Edit Description</button>
            <button class="btn toggle-status-btn" data-fundraiser-id="${f.fundraiserId}" data-status="${f.status}" style="flex: 1; background: ${f.status === 'closed' ? '#10b981' : '#ef4444'}; color: white; min-width: 120px;">
              ${f.status === "closed" ? "Re-open" : "Close"}
            </button>
          </div>
        </div>
      `;
    });

    wireCampaignActions();

  } catch (err) {
    console.error(err);
    container.innerHTML = "<p>Error loading fundraisers.</p>";
  }
}

function wireCampaignActions() {
  // View Details
  document.querySelectorAll(".view-details-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-fundraiser-id");
      window.location.href = `fundraiser-detail.html?id=${id}`;
    });
  });

  // Edit Description
  document.querySelectorAll(".edit-desc-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      currentEditCampaignId = btn.getAttribute("data-fundraiser-id");
      const desc = decodeURIComponent(btn.getAttribute("data-description"));
      document.getElementById("editDescTextarea").value = desc;
      document.getElementById("editDescriptionModal").style.display = "flex";
    });
  });

  // Toggle Status (Close / Re-open)
  document.querySelectorAll(".toggle-status-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-fundraiser-id");
      const currentStatus = btn.getAttribute("data-status");
      const nextStatus = currentStatus === "closed" ? "active" : "closed";
      const token = localStorage.getItem("token");

      if (confirm(`Are you sure you want to change this campaign's status to ${nextStatus}?`)) {
        try {
          const res = await fetch(`${API_BASE}/api/fundraiser/${id}/status`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ status: nextStatus })
          });
          if (res.ok) {
            loadMyFundraisers();
          } else {
            const errData = await res.json();
            alert("Failed to change status: " + errData.message);
          }
        } catch (err) {
          console.error("Error toggling campaign status:", err);
        }
      }
    });
  });
}

// Connect MetaMask
async function connectMetaMask() {
  const status = document.getElementById("walletStatus");

  if (!window.ethereum) {
    window.open("https://metamask.io/download/", "_blank");
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

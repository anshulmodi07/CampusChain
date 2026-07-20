// =============================
// 🔒 Protect Donor Dashboard
// =============================
import API_BASE from "./config/api.js";
import { initNavbar } from "./navbar.js";
import { formatTimestamp } from "./utils/date.js";

window.onload = () => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token || role !== "donor") {
    alert("Access Denied! Please login as a Donor.");
    window.location.href = "login.html";
    return;
  }

  initNavbar();
  loadDonations();
  loadWatchlist();

  // If wallet already connected earlier
  const wallet = localStorage.getItem("wallet");
  if (wallet && /^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    showWalletStatus(`Connected: ${wallet}`, true);
  }

  // Wire up event listeners
  const editProfileBtn = document.getElementById("editProfileBtn");
  if (editProfileBtn) {
    editProfileBtn.addEventListener("click", () => {
      window.location.href = "edit-profile.html";
    });
  }

  const exploreCampaignsBtn = document.getElementById("exploreCampaignsBtn");
  if (exploreCampaignsBtn) {
    exploreCampaignsBtn.addEventListener("click", () => {
      window.location.href = "fundraiser.html";
    });
  }

  const viewContributionsBtn = document.getElementById("viewContributionsBtn");
  if (viewContributionsBtn) {
    viewContributionsBtn.addEventListener("click", () => {
      loadDonations();
    });
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

  // Event delegation for dynamic buttons
  const donationsList = document.getElementById("donationsList");
  if (donationsList) {
    donationsList.addEventListener("click", (e) => {
      if (e.target.classList.contains("retry-btn")) {
        loadDonations();
      }
    });
  }

  // Proof Modal Close events
  const closeProofModalBtn = document.getElementById("closeProofModalBtn");
  if (closeProofModalBtn) {
    closeProofModalBtn.addEventListener("click", () => {
      document.getElementById("proofModal").style.display = "none";
    });
  }
};

// =============================
// 📦 Load My Donations
// =============================
async function loadDonations() {
  const token = localStorage.getItem("token");
  const container = document.getElementById("donationsList");

  container.innerHTML = '<div class="loading">Loading your donations...</div>';

  try {
    const res = await fetch(`${API_BASE}/api/my-donations`, {
      headers: { "Authorization": token }
    });

    if (!res.ok) {
      throw new Error("Failed to fetch donations");
    }

    const donations = await res.json();

    if (donations.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">💸</div>
          <h3>No donations yet</h3>
          <p>Start supporting causes that matter to you!</p>
          <button class="btn" onclick="window.location.href='fundraiser.html'">
            Browse Fundraisers
          </button>
        </div>
      `;
      updateStats(0, 0);
      return;
    }

    // 👉 Stats (calculate ETH and INR separately)
    let totalEth = 0;
    let totalInr = 0;
    donations.forEach(d => {
      const amt = parseFloat(d.amount || 0);
      if (d.currency === "INR") {
        totalInr += amt;
      } else {
        totalEth += amt;
      }
    });

    const uniqueCampaigns = new Set(donations.map(d => d.fundraiser_id));
    updateStats(totalEth, totalInr, uniqueCampaigns.size);

    // 👉 Display cards
    container.innerHTML = "";

    donations.forEach(d => {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.display = "flex";
      card.style.flexDirection = "column";
      card.style.gap = "15px";
      
      const currency = d.currency || "ETH";
      const displayAmount = currency === "INR"
        ? `₹${parseFloat(d.amount).toLocaleString('en-IN')} INR`
        : `${parseFloat(d.amount).toFixed(4)} ETH <small style="color: #64748b; font-size: 13px; display: block;">(~₹${(parseFloat(d.amount) * 300000).toLocaleString('en-IN')} INR)</small>`;

      // Render Verify Proof action button if anchor_tx_hash is present
      const verifyProofBtn = d.anchor_tx_hash
        ? `<button class="btn btn-secondary verify-proof-btn" data-id="${d.donation_id}" data-hash="${d.anchor_tx_hash}" style="width: auto; padding: 8px 16px; border-radius: 8px; border: none; font-weight: 700; cursor: pointer; transition: all 0.2s; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; display: inline-flex; align-items: center; gap: 5px;">🔒 Verify Proof</button>`
        : `<span style="font-size: 13px; color: #64748b; font-style: italic;">Proof anchoring...</span>`;

      card.innerHTML = `
        <h3>${d.title || 'Untitled Campaign'}</h3>

        <div class="card-info">
          <div class="info-item">
            <span class="info-label">Amount</span>
            <span class="info-value">${displayAmount}</span>
          </div>

          <div class="info-item">
            <span class="info-label">Date</span>
            <span class="info-value">
              ${formatTimestamp(d.donated_at)}
            </span>
          </div>

          <div class="info-item">
            <span class="info-label">Transaction Hash</span>
            <span class="tx-hash" style="font-family: monospace; font-size: 12px; word-break: break-all;">${d.tx_hash || 'N/A'}</span>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; align-items: center; margin-top: 5px;">
          ${verifyProofBtn}
        </div>
      `;
      container.appendChild(card);
    });

    // Wire verify proof buttons
    document.querySelectorAll(".verify-proof-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const hash = btn.getAttribute("data-hash");
        const donationId = btn.getAttribute("data-id");
        const token = localStorage.getItem("token");

        const statusEl = document.getElementById("proofStatus");
        statusEl.textContent = "Verifying cryptographic proof on Sepolia...";
        statusEl.style.color = "#64748b";

        document.getElementById("proofTxHash").textContent = hash;
        document.getElementById("proofEtherscanLink").href = `https://sepolia.etherscan.io/tx/${hash}`;
        document.getElementById("proofModal").style.display = "flex";

        try {
          const res = await fetch(`${API_BASE}/api/donation/${donationId}/verify`, {
            headers: {
              "Authorization": "Bearer " + token
            }
          });
          const data = await res.json();
          if (res.ok && data.verified) {
            statusEl.textContent = "Anchored & Verified ✓";
            statusEl.style.color = "#15803d";
          } else {
            statusEl.textContent = "Tampered / Unverified ❌";
            statusEl.style.color = "#b91c1c";
          }
        } catch (err) {
          console.error("Verification failed:", err);
          statusEl.textContent = "Verification Failed (Network Error) ⚠️";
          statusEl.style.color = "#d97706";
        }
      });
    });

  } catch (err) {
    console.error("Error loading donations:", err);
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">❌</div>
        <h3>Failed to load donations</h3>
        <p>Please check your connection and try again.</p>
        <button class="btn retry-btn">Retry</button>
      </div>
    `;
  }
}

// =============================
// 📂 Load Watchlist
// =============================
async function loadWatchlist() {
  const watchlist = JSON.parse(localStorage.getItem("watchlist") || "[]");
  const titleEl = document.getElementById("watchlistTitle");
  const gridEl = document.getElementById("watchlistGrid");

  if (watchlist.length === 0) {
    titleEl.style.display = "none";
    gridEl.style.display = "none";
    return;
  }

  titleEl.style.display = "block";
  gridEl.style.display = "grid";
  gridEl.innerHTML = "<p>Loading watchlist campaigns...</p>";

  try {
    const res = await fetch(`${API_BASE}/api/fundraisers`);
    if (!res.ok) throw new Error("Failed to load fundraisers list");
    const data = await res.json();

    const bookmarked = data.filter(f => watchlist.includes(f.fundraiserId));

    if (bookmarked.length === 0) {
      titleEl.style.display = "none";
      gridEl.style.display = "none";
      return;
    }

    gridEl.innerHTML = "";
    bookmarked.forEach(f => {
      const raised = parseFloat(f.raised || 0);
      const goal = parseFloat(f.goal);
      const percent = goal > 0 ? Math.min((raised / goal) * 100, 100) : 0;

      const card = document.createElement("div");
      card.className = "card";
      card.style.display = "flex";
      card.style.flexDirection = "column";
      card.style.justifyContent = "space-between";
      card.style.boxShadow = "0 4px 15px rgba(0,0,0,0.04)";
      card.style.borderRadius = "12px";
      card.style.border = "1px solid #e2e8f0";
      card.style.padding = "20px";

      card.innerHTML = `
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
            <h4 style="margin: 0 0 10px 0; font-size: 18px; font-weight: 800; color: #1e293b;">${f.title}</h4>
            <button class="remove-fav-btn" data-fundraiser-id="${f.fundraiserId}" style="background: none; border: none; cursor: pointer; color: #ef4444; font-size: 18px; padding: 0;">❤️</button>
          </div>
          <p style="font-size: 13px; color: #64748b; margin-bottom: 15px;">${f.description.substring(0, 80)}...</p>
        </div>
        <div>
          <div style="font-size: 12px; font-weight: 600; color: #1e293b; margin-bottom: 5px;">
            Raised: ${raised.toFixed(4)} ETH / ${goal.toFixed(4)} ETH
          </div>
          <div class="progress-bar" style="width: 100%; height: 6px; background: #e2e8f0; border-radius: 10px; overflow: hidden; margin-bottom: 15px;">
            <div class="progress-fill" style="height: 100%; width: ${percent}%; background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);"></div>
          </div>
          <button class="btn view-fav-btn" data-fundraiser-id="${f.fundraiserId}" style="width: 100%; font-size: 13px; font-weight: 600; padding: 8px 12px; border-radius: 8px;">View Details</button>
        </div>
      `;
      gridEl.appendChild(card);
    });

    // Wire clicks
    document.querySelectorAll(".view-fav-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-fundraiser-id");
        window.location.href = `fundraiser-detail.html?id=${id}`;
      });
    });

    document.querySelectorAll(".remove-fav-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = parseInt(btn.getAttribute("data-fundraiser-id"));
        let wl = JSON.parse(localStorage.getItem("watchlist") || "[]");
        wl = wl.filter(item => item !== id);
        localStorage.setItem("watchlist", JSON.stringify(wl));
        loadWatchlist();
      });
    });

  } catch (err) {
    console.error("Error loading watchlist:", err);
    gridEl.innerHTML = "<p>Failed to load watchlist campaigns.</p>";
  }
}

// =============================
// 📌 Update Stats
// =============================
function updateStats(totalEth, totalInr, count) {
  document.getElementById('totalDonated').innerHTML = `${totalEth.toFixed(4)} ETH <span style="font-size: 16px; font-weight: normal; color: #64748b; display: block; margin-top: 5px;">+ ₹${totalInr.toLocaleString('en-IN')} INR</span>`;
  document.getElementById('donationCount').textContent = count;
}

// =============================
// 🦊 Connect MetaMask
// =============================
async function connectMetaMask() {
  if (!window.ethereum) {
    window.open("https://metamask.io/download/", "_blank");
    return;
  }

  try {
    const accounts = await ethereum.request({ method: "eth_requestAccounts" });
    const wallet = accounts[0];
    
    localStorage.setItem("wallet", wallet);
    showWalletStatus(`✓ Connected: ${wallet}`, true);

  } catch (err) {
    console.error("MetaMask connection error:", err);
    showWalletStatus("❌ Failed to connect MetaMask. Please try again.", false);
  }
}

// =============================
// 🎯 Wallet Status Display
// =============================
function showWalletStatus(message, isConnected) {
  const status = document.getElementById("walletStatus");
  
  status.textContent = message;
  status.className = `wallet-status show ${isConnected ? 'connected' : 'error'}`;

  // Auto-hide only when error
  if (!isConnected) {
    setTimeout(() => status.classList.remove('show'), 5000);
  }
}

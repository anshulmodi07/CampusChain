// =============================
// 🔒 Protect Donor Dashboard
// =============================
const API_BASE = "https://campuschain.online";

window.onload = () => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token || role !== "donor") {
    alert("Access Denied! Please login as a Donor.");
    window.location.href = "login.html";
    return;
  }

  // If wallet already connected earlier
  const wallet = localStorage.getItem("wallet");
  if (wallet) {
    showWalletStatus(`Connected: ${wallet}`, true);
  }
};

// =============================
// 🚪 LOGOUT
// =============================
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.onclick = (e) => {
    e.preventDefault();
    localStorage.clear();
    window.location.href = "index.html";
  };
}

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

    // 👉 Stats (only two now)
    let totalAmount = 0;
    donations.forEach(d => {
      totalAmount += parseFloat(d.amount || 0);
    });

    updateStats(totalAmount, donations.length);

    // 👉 Display cards
    container.innerHTML = "";

    donations.forEach(d => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <h3>${d.title || 'Untitled Campaign'}</h3>

        <div class="card-info">
          <div class="info-item">
            <span class="info-label">Amount</span>
            <span class="info-value">₹${parseFloat(d.amount).toLocaleString()}</span>
          </div>

          <div class="info-item">
            <span class="info-label">Date</span>
            <span class="info-value">
              ${new Date(d.donated_at).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>

          <div class="info-item">
            <span class="info-label">Transaction Hash</span>
            <span class="tx-hash">${d.tx_hash || 'N/A'}</span>
          </div>
        </div>
      `;
      container.appendChild(card);
    });

  } catch (err) {
    console.error("Error loading donations:", err);
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">❌</div>
        <h3>Failed to load donations</h3>
        <p>Please check your connection and try again.</p>
        <button class="btn" onclick="loadDonations()">Retry</button>
      </div>
    `;
  }
}

// =============================
// 📌 Update Stats (Only 2)
// =============================
function updateStats(totalAmount, count) {
  document.getElementById('totalDonated').textContent = `₹${totalAmount.toLocaleString()}`;
  document.getElementById('donationCount').textContent = count;
}

// =============================
// 🦊 Connect MetaMask
// =============================
async function connectMetaMask() {
  if (!window.ethereum) {
    showWalletStatus("❌ MetaMask not installed! Please install MetaMask.", false);
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

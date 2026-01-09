const API_BASE = "https://campuschain-bqul.onrender.com";

let web3;
let contract;
let userAccount;

// ---------------- PROTECT NGO ROUTE ----------------
window.onload = () => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token || role !== "ngo") {
    alert("Access denied! Login as NGO.");
    window.location.href = "login.html";
  }
};

// ---------------- LOGOUT ----------------
document.getElementById("logoutBtn").onclick = () => {
  localStorage.clear();
  window.location.href = "index.html";
};

// ---------------- CONNECT WALLET ----------------
async function connectWallet() {
  if (!window.ethereum) return alert("Please install MetaMask");

  try {
    await ethereum.request({ method: "eth_requestAccounts" });
    web3 = new Web3(window.ethereum);
    const accounts = await web3.eth.getAccounts();
    userAccount = accounts[0];

    contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);

    document.getElementById("connectWalletBtn").innerText =
      "Connected: " + userAccount.slice(0, 6) + "..." + userAccount.slice(-4);
  } catch {
    alert("MetaMask connection failed");
  }
}

document.getElementById("connectWalletBtn").onclick = connectWallet;

// Reload on account change
if (window.ethereum) {
  ethereum.on("accountsChanged", () => location.reload());
}

// ---------------- FORM SUBMIT ----------------
document.getElementById("fundraiserForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  await createFundraiser();
});

// ---------------- CREATE FUNDRAISER ----------------
async function createFundraiser() {
  const msg = document.getElementById("msg");
  const bcMsg = document.getElementById("bcMsg");
  const submitBtn = document.getElementById("submitBtn");

  const title = titleInput.value.trim();
  const description = descriptionInput.value.trim();
  const goal = goalInput.value.trim();
  const category = categoryInput.value.trim();
  const people = peopleInput.value.trim();
  const type = typeSelect.value;

  const token = localStorage.getItem("token");

  if (!title || !description || !goal || !category || !people) {
    return showMessage("Fill all fields.", "error");
  }

  if (!token) {
    return showMessage("Session expired. Please login again.", "error");
  }

  if (!userAccount) {
    return alert("Connect MetaMask to continue");
  }

  submitBtn.disabled = true;
  showMessage("Creating fundraiser on blockchain...", "info");

  try {
    // 1️⃣ Blockchain
    const tx = await contract.methods
      .createFundraiser(title, description, type, category, people)
      .send({ from: userAccount });

    bcMsg.innerHTML = `
      Blockchain Tx Success<br>
      <a href="https://sepolia.etherscan.io/tx/${tx.transactionHash}" target="_blank">
        View on Etherscan
      </a>
    `;
    bcMsg.classList.add("show");

    // 2️⃣ Backend
    const res = await fetch(`${API_BASE}/api/fundraiser/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({
        title,
        description,
        goal: parseFloat(goal),
        category,
        people_affected: parseInt(people),
        fundraiser_type: type,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      submitBtn.disabled = false;
      return showMessage(data.error || "Backend failed", "error");
    }

    showMessage("Success! Redirecting...", "success");

    setTimeout(() => {
      window.location.href = "ngo-dashboard.html";
    }, 1500);

  } catch (err) {
    console.error(err);
    submitBtn.disabled = false;
    showMessage("Transaction failed.", "error");
  }
}

// ---------------- MESSAGE HELPER ----------------
function showMessage(text, type) {
  const msg = document.getElementById("msg");
  msg.innerText = text;
  msg.className = `msg show ${type}`;
}

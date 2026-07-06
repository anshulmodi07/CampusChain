import API_BASE from "./config/api.js";
import { initNavbar } from "./navbar.js";
import { formatTimestamp } from "./utils/date.js";

// ------- Get fundraiser ID from URL -------
const urlParams = new URLSearchParams(window.location.search);
const fundraiserId = urlParams.get("id");

// ------- Convert to readable ETH/amount -------
function formatAmount(value) {
  if (!value || isNaN(value)) return "0.0000";
  return parseFloat(value).toFixed(4);
}

// ------- Load Fundraiser Full Details -------
let isCampaignOwner = false;

async function loadFundraiser() {
  try {
    const res = await fetch(`${API_BASE}/api/fundraiser/${fundraiserId}`);
    const data = await res.json();

    document.getElementById("title").innerText = data.title;
    document.getElementById("description").innerText = data.description;
    document.getElementById("category").innerText = data.category;
    document.getElementById("people").innerText = data.peopleAffected;

    const raisedAmount = await loadRaisedAmount();

    const raisedEth = parseFloat(raisedAmount || 0);
    const goalEth = parseFloat(data.goal || 0);
    const raisedInr = raisedEth * 300000;
    const goalInr = goalEth * 300000;

    document.getElementById("raised").innerHTML = `${raisedEth.toFixed(4)} ETH <span style="font-size: 14px; opacity: 0.85;">(~₹${raisedInr.toLocaleString('en-IN')})</span>`;
    document.getElementById("goal").innerHTML = `${goalEth.toFixed(4)} ETH <span style="font-size: 14px; opacity: 0.85;">(~₹${goalInr.toLocaleString('en-IN')})</span>`;

    const percentage = goalEth > 0 ? (raisedEth / goalEth) * 100 : 0;
    document.getElementById("progressFill").style.width = Math.min(percentage, 100) + "%";

    // 🏆 Goal Achieved Badge check
    if (raisedEth >= goalEth) {
      const badge = document.getElementById("goalAchievedBadge");
      if (badge) badge.style.display = "inline-flex";
    }

    // 🔒 Campaign Status check
    const isClosed = data.status === "closed";
    if (isClosed) {
      const banner = document.getElementById("closedCampaignBanner");
      if (banner) banner.style.display = "block";
      const payContainer = document.getElementById("paymentContainer");
      if (payContainer) payContainer.style.display = "none";
    }

    // 🚦 Role & Owner check
    const role = localStorage.getItem("role");
    const userWallet = localStorage.getItem("wallet");
    
    // Hide payment container for any NGO account
    if (role === "ngo") {
      const payContainer = document.getElementById("paymentContainer");
      if (payContainer) payContainer.style.display = "none";
      
      // If NGO owns the campaign, enable Contributors and delete Comment capabilities
      if (userWallet && userWallet.toLowerCase() === data.ownerWallet.toLowerCase()) {
        isCampaignOwner = true;
        const contribSec = document.getElementById("contributorsSection");
        if (contribSec) contribSec.style.display = "block";
        loadContributors();
        loadComments(); // reload to show delete button
      }
    }
  } catch (err) {
    console.error("Error loading fundraiser:", err);
  }
}

// ------- Load total raised amount from SQL -------
async function loadRaisedAmount() {
  try {
    const res = await fetch(`${API_BASE}/api/raised/${fundraiserId}`);
    const result = await res.json();
    return result.totalRaised || 0;
  } catch (error) {
    console.error("Error fetching raised:", error);
    return 0;
  }
}

async function loadComments() {
  const res = await fetch(`${API_BASE}/api/comments/${fundraiserId}`);
  const data = await res.json();

  const comments = Array.isArray(data)
    ? data
    : Array.isArray(data?.comments)
      ? data.comments
      : [];

  const commentsList = document.getElementById("commentsList");
  commentsList.innerHTML = "";

  comments.forEach((c) => {
    const div = document.createElement("div");
    
    // Add delete button only if logged in user is the owner NGO of this campaign
    const deleteBtn = isCampaignOwner
      ? `<button class="delete-comment-btn" data-comment-id="${c.comment_id}" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 13px; font-weight: 600; padding: 0; margin-left: 15px;">🗑️ Delete</button>`
      : "";

    div.innerHTML = `<strong>${c.name}</strong>: ${c.comment_text} ${deleteBtn} <br>
    <small>${formatTimestamp(c.created_at)}</small>
    <hr>`;
    commentsList.appendChild(div);
  });

  // Wire delete comment buttons
  document.querySelectorAll(".delete-comment-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const commentId = e.target.getAttribute("data-comment-id");
      if (confirm("Are you sure you want to delete this comment?")) {
        const token = localStorage.getItem("token");
        try {
          const res = await fetch(`${API_BASE}/api/comments/${commentId}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          if (res.ok) {
            loadComments();
          } else {
            const errData = await res.json();
            alert("Failed to delete comment: " + errData.message);
          }
        } catch (err) {
          console.error("Error deleting comment:", err);
        }
      }
    });
  });
}

async function loadContributors() {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${API_BASE}/api/fundraiser/${fundraiserId}/donations`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (!res.ok) throw new Error("Failed to fetch contributors");
    const donations = await res.json();
    const listEl = document.getElementById("contributorsList");
    if (donations.length === 0) {
      listEl.innerHTML = '<p style="color: #64748b; text-align: center; padding: 10px; margin: 0;">No contributions recorded yet.</p>';
      return;
    }
    listEl.innerHTML = "";
    donations.forEach(d => {
      const name = d.donor_name || "Anonymous Contributor";
      const currency = d.currency || "ETH";
      const amount = parseFloat(d.amount);
      const amountStr = currency === "INR" 
        ? `₹${amount.toLocaleString('en-IN')} INR` 
        : `${amount.toFixed(4)} ETH`;
      
      const div = document.createElement("div");
      div.style.padding = "10px 0";
      div.style.borderBottom = "1px solid #f1f5f9";
      div.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <strong>${name}</strong>
          <span style="font-weight: 700; color: #0f172a;">${amountStr}</span>
        </div>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
          <span>Date: ${formatTimestamp(d.donated_at)}</span>
          ${d.tx_hash ? `<br><span>Tx Hash: <span style="font-family: monospace; font-size: 11px; word-break: break-all;">${d.tx_hash}</span></span>` : ""}
        </div>
      `;
      listEl.appendChild(div);
    });
  } catch (err) {
    console.error("Error loading contributors:", err);
  }
}

// ===================== Donation - MetaMask =====================
let web3;
let contract;
let userAccount;

async function connectMetaMask() {
  if (!window.ethereum) {
    window.open("https://metamask.io/download/", "_blank");
    return;
  }

  try {
    await window.ethereum.request({ method: "eth_requestAccounts" });

    web3 = new Web3(window.ethereum);
    const accounts = await web3.eth.getAccounts();
    userAccount = accounts[0];

    document.getElementById("walletStatus").innerText =
      "Connected: " + userAccount.slice(0, 6) + "..." + userAccount.slice(-4);

    // Contract present globally from contractConfig.js
    contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
  } catch (error) {
    console.error("MetaMask connection failed:", error);
    alert("Failed to connect MetaMask.");
  }
}

const connectMetaMaskBtn = document.getElementById("connectMetaMaskBtn");
if (connectMetaMaskBtn) {
  connectMetaMaskBtn.addEventListener("click", () => connectMetaMask());
}

async function donateEth() {
  const amountInput = document.getElementById("ethAmount");
  const amount = amountInput.value.trim();
  const donateEthBtn = document.getElementById("donateEthBtn");

  if (!userAccount) return alert("Please connect MetaMask first!");
  if (!amount || isNaN(amount) || parseFloat(amount) <= 0) return alert("Enter valid ETH amount");

  const token = localStorage.getItem("token");
  if (!token) return alert("Please login to record your donation.");

  const msgEl = document.getElementById("donationMsg");
  donateEthBtn.disabled = true;
  const originalText = donateEthBtn.innerText;
  donateEthBtn.innerText = "Processing MetaMask Payment...";
  msgEl.className = "pending show";
  msgEl.innerHTML = "Confirming MetaMask transaction... Please check your wallet.";

  try {
    const tx = await contract.methods.donate(fundraiserId).send({
      from: userAccount,
      value: web3.utils.toWei(amount.toString(), "ether"),
    });

    msgEl.innerHTML = "Transaction confirmed on-chain! Registering donation record on backend...";

    const res = await fetch(`${API_BASE}/api/donate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify({
        fundraiser_id: fundraiserId,
        amount: parseFloat(amount),
        tx_hash: tx.transactionHash,
        payment_method: "crypto",
        payment_reference: null,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || "Failed to record donation on backend.");
    }

    msgEl.className = "success show";
    msgEl.innerHTML = `
      Donation successful! 🚀 <br>
      <a href="https://sepolia.etherscan.io/tx/${tx.transactionHash}" target="_blank" style="color: #15803d; text-decoration: underline; font-weight: 700;">
        View on Etherscan
      </a>
    `;
    amountInput.value = "";

    loadFundraiser();
    loadComments();
  } catch (err) {
    console.error("Donation error:", err);
    msgEl.className = "error show";
    msgEl.innerHTML = `❌ Donation failed: ${err.message || "Transaction failed or rejected."}`;
  } finally {
    donateEthBtn.disabled = false;
    donateEthBtn.innerText = originalText;
  }
}

// ===================== Donation - Razorpay =====================
let razorpaySdkLoadPromise = null;

function loadRazorpayCheckoutSdk() {
  if (window.Razorpay) return Promise.resolve();
  if (razorpaySdkLoadPromise) return razorpaySdkLoadPromise;

  razorpaySdkLoadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById("razorpay-checkout-js");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load Razorpay SDK."))
      );
      return;
    }

    const script = document.createElement("script");
    script.id = "razorpay-checkout-js";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay SDK."));
    document.head.appendChild(script);
  });

  return razorpaySdkLoadPromise;
}

async function donateRazorpay() {
  const amountInput = document.getElementById("inrAmount");
  const amount = amountInput.value.trim();
  const donateRazorpayBtn = document.getElementById("donateRazorpayBtn");
  const msgEl = document.getElementById("donationMsg");

  const token = localStorage.getItem("token");
  if (!token) return alert("Please login to donate.");
  if (!fundraiserId) return alert("Fundraiser id missing from URL.");
  if (!amount || isNaN(amount) || parseFloat(amount) <= 0) return alert("Enter valid donation amount.");

  donateRazorpayBtn.disabled = true;
  const originalText = donateRazorpayBtn.innerText;
  donateRazorpayBtn.innerText = "Initializing Razorpay...";
  msgEl.className = "pending show";
  msgEl.innerHTML = "Loading payment SDK and initializing order transaction...";

  try {
    await loadRazorpayCheckoutSdk();

    const res = await fetch(`${API_BASE}/api/razorpay/create-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ fundraiser_id: fundraiserId, amount: parseFloat(amount) }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to create Razorpay order (${res.status}).`);
    }

    const order = await res.json();

    // Re-enable button when modal opens so user can retry on dismiss
    donateRazorpayBtn.disabled = false;
    donateRazorpayBtn.innerText = originalText;
    msgEl.innerHTML = "Checkout modal open. Please complete the payment steps.";

    const options = {
      key: order.key_id,
      amount: order.amount,
      currency: order.currency,
      name: "CampusChain",
      description: "Donation",
      order_id: order.order_id,
      handler: async function (response) {
        donateRazorpayBtn.disabled = true;
        donateRazorpayBtn.innerText = "Verifying payment...";
        msgEl.className = "pending show";
        msgEl.innerHTML = "Verifying payment signature with the backend...";

        try {
          const payload = {
            fundraiser_id: fundraiserId,
            amount: parseFloat(amount),
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          };

          const verifyRes = await fetch(`${API_BASE}/api/razorpay/verify`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          });

          if (!verifyRes.ok) {
            const verifyErr = await verifyRes.json().catch(() => ({}));
            throw new Error(verifyErr.message || "Payment verification failed.");
          }

          msgEl.className = "success show";
          msgEl.innerHTML = `
            Donation successful! 🚀 <br>
            Payment ID: <strong>${response.razorpay_payment_id}</strong>
          `;
          amountInput.value = "";

          loadFundraiser();
          loadComments();
        } catch (e) {
          console.error("Razorpay verification failed:", e);
          msgEl.className = "error show";
          msgEl.innerHTML = `❌ Payment verification failed: ${e.message || "Verification server error."}`;
        } finally {
          donateRazorpayBtn.disabled = false;
          donateRazorpayBtn.innerText = originalText;
        }
      },
      modal: {
        ondismiss: function () {
          console.log("Razorpay popup dismissed");
          msgEl.className = "error show";
          msgEl.innerHTML = "❌ Payment cancelled or modal closed.";
          donateRazorpayBtn.disabled = false;
          donateRazorpayBtn.innerText = originalText;
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  } catch (err) {
    console.error("Razorpay donation error:", err);
    msgEl.className = "error show";
    msgEl.innerHTML = `❌ Razorpay payment failed: ${err.message || "Initialization error."}`;
    donateRazorpayBtn.disabled = false;
    donateRazorpayBtn.innerText = originalText;
  }
}

// ===================== Wire remaining UI events =====================
const postCommentBtn = document.getElementById("postCommentBtn");
if (postCommentBtn) {
  postCommentBtn.addEventListener("click", async () => {
    const commentText = document.getElementById("commentInput").value.trim();
    const token = localStorage.getItem("token");

    await fetch(`${API_BASE}/api/comment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fundraiser_id: fundraiserId,
        comment_text: commentText,
      }),
    });

    document.getElementById("commentInput").value = "";
    loadComments();
  });
}

// Donation action buttons (were previously inline onclick handlers)
const donateEthBtn = document.getElementById("donateEthBtn");
const donateRazorpayBtn = document.getElementById("donateRazorpayBtn");
if (donateEthBtn) donateEthBtn.addEventListener("click", () => donateEth());
if (donateRazorpayBtn) donateRazorpayBtn.addEventListener("click", () => donateRazorpay());


// Initial render
initNavbar();
loadComments();
loadFundraiser();

// Update connect button text if MetaMask is missing
if (connectMetaMaskBtn && !window.ethereum) {
  connectMetaMaskBtn.innerText = "Install MetaMask 🦊";
}


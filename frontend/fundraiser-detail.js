// ------- Get fundraiser ID from URL -------
const urlParams = new URLSearchParams(window.location.search);
const fundraiserId = urlParams.get("id");

const API_BASE = window.API_BASE;


// ------- Convert to readable ETH/amount -------
function formatAmount(value) {

  // Keep numeric formatting consistent across both payment methods.


  if (!value || isNaN(value)) return "0.0000";
  return parseFloat(value).toFixed(4);
}

// ------- Load Fundraiser Full Details -------
async function loadFundraiser() {
  try {
    const res = await fetch(`${API_BASE}/api/fundraiser/${fundraiserId}`);
    const data = await res.json();

    document.getElementById("title").innerText = data.title;
    document.getElementById("description").innerText = data.description;
    document.getElementById("category").innerText = data.category;
    document.getElementById("people").innerText = data.peopleAffected;

    const raisedAmount = await loadRaisedAmount();

    document.getElementById("raised").innerText = formatAmount(raisedAmount);


    document.getElementById("goal").innerText = formatAmount(data.goal);


    const percentage = data.goal > 0 ? (raisedAmount / data.goal) * 100 : 0;
    document.getElementById("progressFill").style.width = percentage + "%";

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
  const fundraiserId = new URLSearchParams(window.location.search).get("id");

  const res = await fetch(`${API_BASE}/api/comments/${fundraiserId}`);
  const comments = await res.json();

  const commentsList = document.getElementById("commentsList");
  commentsList.innerHTML = "";

  comments.forEach(c => {
    const div = document.createElement("div");
    div.innerHTML = `<strong>${c.name}</strong>: ${c.comment_text} <br>
    <small>${new Date(c.created_at).toLocaleString()}</small>
    <hr>`;
    commentsList.appendChild(div);
  });
}

loadComments();

document.getElementById("postCommentBtn").addEventListener("click", async () => {
  const commentText = document.getElementById("commentInput").value.trim();
  const fundraiserId = new URLSearchParams(window.location.search).get("id");
  const token = localStorage.getItem("token");

  await fetch(`${API_BASE}/api/comment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      fundraiser_id: fundraiserId,
      comment_text: commentText
    })
  });

  document.getElementById("commentInput").value = "";
  loadComments();
});


loadFundraiser();   // initial load

// ===================== BLOCKCHAIN PART =====================

let web3;
let contract;
let userAccount;

// ------- Connect MetaMask -------
async function connectMetaMask() {
  if (!window.ethereum) {
    return alert("MetaMask not detected! Install MetaMask extension.");
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

// ------- Donate using ETH + Save in SQL -------
function updateAmountLabel(method) {
  const label = document.getElementById("amountLabel");
  if (!label) return;

  if (method === "metamask") {
    label.innerText = "Contribution Amount (ETH)";
    return;
  }

  if (method === "razorpay") {
    label.innerText = "Donation Amount (₹ INR)";
    return;
  }
}

async function donateEth() {

  const amount = document.getElementById("donationAmount").value;

  // WHY: Update label and message area to match the active payment method.
  updateAmountLabel("metamask");


  if (!userAccount) return alert("Please connect MetaMask first!");

  if (!amount || amount <= 0) return alert("Enter valid ETH amount");

  const token = localStorage.getItem("token");
  if (!token) {
    return alert("Please login to record your donation.");
  }

  try {
    // Send ETH transaction
    const tx = await contract.methods.donate(fundraiserId).send({
      from: userAccount,
      value: web3.utils.toWei(amount.toString(), "ether")
    });

    // Save into SQL
    await fetch(`${API_BASE}/api/donate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token
      },
      body: JSON.stringify({
        fundraiser_id: fundraiserId,
        amount: amount,
        tx_hash: tx.transactionHash,
        payment_method: "crypto",
        payment_reference: null
      })
    });

    document.getElementById("donationMsg").innerHTML = `

      Donation successful! 🚀 <br>
      <a href="https://sepolia.etherscan.io/tx/${tx.transactionHash}" target="_blank">
        View on Etherscan
      </a>
    `;

    loadFundraiser();  // update raised

  } catch (err) {
    console.error("Donation error:", err);
    alert("Transaction failed or rejected.");
  }
}

// ===================== RAZORPAY PART (DONATION OPTION) =====================

// Cache Razorpay Checkout SDK load so we only inject the script once.
let razorpaySdkLoadPromise = null;

function loadRazorpayCheckoutSdk() {
  // WHY: The HTML page doesn't include Razorpay SDK. Injecting it dynamically
  // keeps MetaMask flow untouched and avoids global script changes.
  if (window.Razorpay) return Promise.resolve();
  if (razorpaySdkLoadPromise) return razorpaySdkLoadPromise;

  razorpaySdkLoadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById("razorpay-checkout-js");
    if (existing) {
      // If script tag exists but SDK not ready yet, wait for onload.
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Razorpay SDK.")));
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

// Donate via Razorpay (frontend-only). This intentionally does NOT verify payment
// and does NOT call donation.controller or blockchain logic.
//
// WHY: Only frontend checkout is implemented; backend verification + donation recording remain separate.
async function donateRazorpay() {

  // WHY: Keep UX consistent—use the existing contribution amount input.
  const amount = document.getElementById("donationAmount").value;

  // WHY: Update label and message area to match the active payment method.
  updateAmountLabel("razorpay");


  const fundraiserId = new URLSearchParams(window.location.search).get("id");

  if (!amount || amount <= 0) return alert("Enter valid donation amount.");

  const token = localStorage.getItem("token");
  if (!token) return alert("Please login to donate.");

  if (!fundraiserId) return alert("Fundraiser id missing from URL.");

  try {
    // WHY: Ensure Razorpay JS SDK is available before creating Checkout.
    await loadRazorpayCheckoutSdk();

    // WHY: backend must create an order so Razorpay can render a valid checkout.
    const res = await fetch(`${API_BASE}/api/razorpay/create-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        
        fundraiser_id: fundraiserId,
        amount: amount,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Failed to create Razorpay order (${res.status}). ${errText}`);
    }

    const order = await res.json();

    const options = {
      key: order.key_id,
      amount: order.amount,
      currency: order.currency,
      name: "CampusChain",
      description: "Donation",
      order_id: order.order_id,
      // WHY: Frontend must only verify payment status with the backend.
      handler: async function (response) {
        try {
          const payload = {
            fundraiser_id: new URLSearchParams(window.location.search).get("id"),
            amount: document.getElementById("donationAmount")?.value ?? document.getElementById("ethAmount").value,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          };

          const verifyRes = await fetch(`${API_BASE}/api/razorpay/verify`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify(payload),
          });

          // WHY: Success path should only log verification result from backend.
          const verifyJson = await verifyRes.json().catch(() => ({}));
          console.log(verifyJson);

        } catch (e) {
          console.error("Razorpay verify call failed:", e);
        }
      },

      // WHY: Provide a clear error path when user closes/cancels or checkout fails.
      modal: {
        ondismiss: function () {
          console.log("Razorpay popup dismissed");
        },
      },
      // Optional: capture checkout-level errors.
      // Razorpay passes error to the provided callback when available.
      // (We keep it minimal and non-invasive.)
    };

    const rzp = new window.Razorpay(options);

    // WHY: This opens Razorpay's hosted payment popup.
    rzp.open();
  } catch (err) {
    console.error("Razorpay donation error:", err);
    alert(err.message || "Razorpay payment failed.");
  }
}


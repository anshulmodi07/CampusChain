import API_BASE from "./config/api.js";
import { initNavbar } from "./navbar.js";

const token = localStorage.getItem("token");
const role = localStorage.getItem("role");

if (!token) {
  alert("Access Denied! Please login.");
  window.location.href = "login.html";
} else {
  initNavbar();
}

window.onload = async () => {
  if (!token) return;

  // Toggle visibility of sections based on role
  if (role === "donor") {
    document.querySelectorAll(".ngo").forEach(el => el.style.display = "none");
    document.querySelectorAll(".input-group:has(#organization_name), .input-group:has(#registration_number), .input-grid:has(#contact_person), .input-group:has(#address)").forEach(el => {
      el.style.display = "none";
    });
  } else if (role === "ngo") {
    document.querySelectorAll(".donor").forEach(el => el.style.display = "none");
    document.querySelectorAll(".input-group:has(#phone), .input-grid:has(#city), .input-group:has(#country), .input-group:has(#donation_preference)").forEach(el => {
      el.style.display = "none";
    });
  }

  // Load existing profile details
  try {
    const res = await fetch(`${API_BASE}/api/profile`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (res.ok) {
      const data = await res.json();
      document.getElementById("name").value = data.name || "";
      document.getElementById("walletAddress").value = data.wallet_address || "";

      if (role === "donor") {
        document.getElementById("phone").value = data.phone || "";
        document.getElementById("city").value = data.city || "";
        document.getElementById("state").value = data.state || "";
        document.getElementById("country").value = data.country || "";
        document.getElementById("donation_preference").value = data.donation_preference || "";
      } else {
        document.getElementById("organization_name").value = data.organization_name || "";
        document.getElementById("registration_number").value = data.registration_number || "";
        document.getElementById("contact_person").value = data.contact_person || "";
        document.getElementById("contact_phone").value = data.contact_phone || "";
        document.getElementById("address").value = data.address || "";
      }
    }
  } catch (err) {
    console.error("Error loading profile:", err);
  }

  // Handle Link Wallet
  const linkWalletBtn = document.getElementById("linkWalletBtn");
  if (linkWalletBtn) {
    if (!window.ethereum) {
      linkWalletBtn.innerText = "Install MetaMask 🦊";
    }
    linkWalletBtn.addEventListener("click", async () => {
      if (!window.ethereum) {
        window.open("https://metamask.io/download/", "_blank");
        return;
      }

      try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        const wallet = accounts[0];
        document.getElementById("walletAddress").value = wallet;
      } catch (err) {
        console.error("MetaMask connection failed:", err);
        alert("Failed to connect MetaMask.");
      }
    });
  }
};

// Handle Save
document.getElementById("saveBtn").addEventListener("click", async () => {
  if (!token) return;

  const walletVal = document.getElementById("walletAddress").value.trim();

  const body = {
    name: document.getElementById("name").value.trim(),
    wallet_address: walletVal || null,
    phone: document.getElementById("phone").value.trim(),
    city: document.getElementById("city").value.trim(),
    state: document.getElementById("state").value.trim(),
    country: document.getElementById("country").value.trim(),
    donation_preference: document.getElementById("donation_preference").value,
    organization_name: document.getElementById("organization_name").value.trim(),
    registration_number: document.getElementById("registration_number").value.trim(),
    contact_person: document.getElementById("contact_person").value.trim(),
    contact_phone: document.getElementById("contact_phone").value.trim(),
    address: document.getElementById("address").value.trim()
  };

  try {
    const res = await fetch(`${API_BASE}/api/profile/update`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      alert("Failed to update profile.");
      return;
    }

    // Save linked wallet to localStorage to update dashboard immediately
    if (walletVal) {
      localStorage.setItem("wallet", walletVal);
    } else {
      localStorage.removeItem("wallet");
    }

    // Show success message
    const successMsg = document.getElementById("successMessage");
    if (successMsg) {
      successMsg.classList.add("show");
      setTimeout(() => {
        successMsg.classList.remove("show");
      }, 3000);
    } else {
      alert("Profile updated successfully!");
    }
  } catch (error) {
    console.error("Error saving profile:", error);
    alert("Failed to save profile. Please try again.");
  }
});

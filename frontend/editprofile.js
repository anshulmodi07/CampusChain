import API_BASE from "./config/api.js";
import { initNavbar } from "./navbar.js";

// Protect route
const token = localStorage.getItem("token");
if (!token) {
  alert("Access Denied! Please login.");
  window.location.href = "login.html";
} else {
  initNavbar();
}

document.getElementById("saveBtn").addEventListener("click", async () => {
  const token = localStorage.getItem("token");
  if (!token) return;

  const body = {
    name: document.getElementById("name").value.trim(),
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

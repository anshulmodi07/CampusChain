const API_BASE = "https://campuschain-bqul.onrender.com";

document.getElementById("saveBtn").addEventListener("click", async () => {
  const token = localStorage.getItem("token");

  const body = {
    name: document.getElementById("name").value,
    phone: document.getElementById("phone").value,
    city: document.getElementById("city").value,
    state: document.getElementById("state").value,
    country: document.getElementById("country").value,
    donation_preference: document.getElementById("donation_preference").value,
    organization_name: document.getElementById("organization_name").value,
    registration_number: document.getElementById("registration_number").value,
    contact_person: document.getElementById("contact_person").value,
    contact_phone: document.getElementById("contact_phone").value,
    address: document.getElementById("address").value
  };

  await fetch(`{API_BASE}/api/profile/update`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });

  alert("Profile Updated Successfully!");
});

// Centralized navbar management for CampusChain
export function initNavbar() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  const loginLink = document.getElementById("loginLink");
  const signupLink = document.getElementById("signupLink");
  const dashboardLink = document.getElementById("dashboardLink");
  const logoutBtn = document.getElementById("logoutBtn");

  if (token && role) {
    if (loginLink) loginLink.style.display = "none";
    if (signupLink) signupLink.style.display = "none";
    if (dashboardLink) {
      dashboardLink.style.display = "inline-block";
      dashboardLink.href = role === "ngo" ? "ngo-dashboard.html" : "donor-dashboard.html";
    }
    if (logoutBtn) {
      logoutBtn.style.display = "inline-block";
    }
  } else {
    if (loginLink) loginLink.style.display = "inline-block";
    if (signupLink) signupLink.style.display = "inline-block";
    if (dashboardLink) dashboardLink.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "none";
  }

  // Common logout behavior
  if (logoutBtn) {
    logoutBtn.onclick = null;
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.clear();
      window.location.href = "index.html";
    });
  }

  // Wire up logo click if present
  const logo = document.querySelector(".logo");
  if (logo) {
    logo.style.cursor = "pointer";
    logo.onclick = null;
    logo.addEventListener("click", () => {
      window.location.href = "index.html";
    });
  }
}

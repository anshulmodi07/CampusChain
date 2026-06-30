// Shared frontend configuration
// WHY: Avoid hardcoding API base URLs in every JS file.
// This keeps the app working both locally and in production.

(function () {
  const isLocalHost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  const API_BASE = isLocalHost
    ? "http://localhost:5000"
    : "https://campuschain-bqul.onrender.com";

  // Expose globally for all existing (non-ESM) scripts.
  window.API_BASE = API_BASE;
})();


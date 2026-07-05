// Centralized API configuration
// Selects backend URL based on where the frontend is running.

const API_BASE =
  ["localhost", "127.0.0.1"].includes(window.location.hostname) ||
  window.location.protocol === "file:"
    ? "http://localhost:5000"
    : "https://campuschain.online";

export default API_BASE;


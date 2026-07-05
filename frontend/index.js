import { initNavbar } from "./navbar.js";

// Ensures Dashboard button works correctly after back navigation
window.onpageshow = function (event) {
  //➡️ The page was NOT reloaded from server.
// ➡️ It was restored from browser’s cache.
  if (event.persisted) {
    window.location.reload();
  }
};


window.onload = () => {
  initNavbar();
};

// Navbar scroll effect
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (navbar) {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }
});

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (href === "#") return;
    e.preventDefault();
    try {
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (err) {
      console.warn("Invalid smooth scroll target:", href, err);
    }
  });
});
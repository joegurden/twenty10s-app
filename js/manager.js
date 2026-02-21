console.log("Manager Mode Loaded");

// js/manager.js

const DIFFICULTY = {
  easy:   { transfer: 1200000000, wages: 3000000, optionsPerPos: 8, squadSize: 15, captainFirst: false },
  medium: { transfer:  750000000, wages: 1800000, optionsPerPos: 5, squadSize: 15, captainFirst: false },
  hard:   { transfer:  450000000, wages: 1200000, optionsPerPos: 3, squadSize: 15, captainFirst: true  },
};

function formatMoney(n) {
  return "£" + n.toLocaleString("en-GB");
}

document.querySelectorAll("[data-diff]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const key = btn.dataset.diff;
    const config = DIFFICULTY[key];

    // Store your run settings for later pages
    localStorage.setItem("managerDifficulty", key);
    localStorage.setItem("managerConfig", JSON.stringify(config));

    // Next step: go to squad builder page
    // (We’ll create this next)
    window.location.href = "manager-squad.html";
  });
});

// Dropdown behaviour (same vibe as your main site)
const dropBtn = document.getElementById("navMinigames");
const dropMenu = document.getElementById("navMinigamesMenu");

dropBtn?.addEventListener("click", () => {
  dropMenu?.classList.toggle("hidden");
});

document.addEventListener("click", (e) => {
  if (!dropBtn || !dropMenu) return;
  if (!dropBtn.contains(e.target) && !dropMenu.contains(e.target)) {
    dropMenu.classList.add("hidden");
  }
});
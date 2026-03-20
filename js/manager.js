console.log("Manager Mode Loaded");

// js/manager.js

const DIFFICULTY = {
  easy:   { transfer: 2500000000, wages: 4600000, optionsPerPos: 8, squadSize: 15, captainFirst: false },
  medium: { transfer: 2000000000, wages: 3900000, optionsPerPos: 5, squadSize: 15, captainFirst: false },
  hard:   { transfer: 1500000000, wages: 3500000, optionsPerPos: 3, squadSize: 15, captainFirst: true  },
};

function formatMoney(n) {
  return "£" + n.toLocaleString("en-GB");
}

document.querySelectorAll("[data-diff]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const key = btn.dataset.diff;
    const config = DIFFICULTY[key];

    // 1️⃣ Remove selection from all cards
    document.querySelectorAll("[data-diff]").forEach(card =>
      card.classList.remove("is-selected")
    );

    // 2️⃣ Add selection to clicked one
    btn.classList.add("is-selected");

    // 3️⃣ Save difficulty
    localStorage.setItem("managerDifficulty", key);
    localStorage.setItem("managerConfig", JSON.stringify(config));

    // 4️⃣ Small delay so user sees selection effect
    setTimeout(() => {
      window.location.href = "manager-squad.html";
    }, 150);
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
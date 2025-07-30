function logAction(message) {
  const timestamp = new Date().toISOString();
  chrome.storage.local.get("log", ({ log = [] }) => {
    log.push({ message, timestamp });
    chrome.storage.local.set({ log });
  });
}

function loadWhitelist() {
  chrome.storage.sync.get("whitelist", ({ whitelist = [] }) => {
    const ul = document.getElementById("whitelistDisplay");
    ul.innerHTML = "";
    whitelist.forEach(item => {
      const li = document.createElement("li");
      li.textContent = item;
      const btn = document.createElement("button");
      btn.textContent = "Remove";
      btn.onclick = () => {
        chrome.storage.sync.set({
          whitelist: whitelist.filter(x => x !== item)
        }, () => {
          loadWhitelist();
          logAction(`Removed from whitelist: ${item}`);
        });
      };
      li.appendChild(btn);
      ul.appendChild(li);
    });
  });
}

function loadSiteRules() {
  chrome.storage.sync.get("siteRules", ({ siteRules = [] }) => {
    const ul = document.getElementById("siteRuleDisplay");
    ul.innerHTML = "";
    siteRules.forEach(site => {
      const li = document.createElement("li");
      li.textContent = site;
      const btn = document.createElement("button");
      btn.textContent = "Remove";
      btn.onclick = () => {
        chrome.storage.sync.set({
          siteRules: siteRules.filter(x => x !== site)
        }, () => {
          loadSiteRules();
          logAction(`Removed site rule: ${site}`);
        });
      };
      li.appendChild(btn);
      ul.appendChild(li);
    });
  });
}

function loadLogs() {
  chrome.storage.local.get("log", ({ log = [] }) => {
    const ul = document.getElementById("logDisplay");
    ul.innerHTML = "";
    log.forEach(entry => {
      const li = document.createElement("li");
      li.textContent = `[${entry.timestamp}] ${entry.message}`;
      ul.appendChild(li);
    });
  });
}

document.getElementById("addToWhitelist").onclick = () => {
  const value = document.getElementById("whitelistInput").value.trim();
  if (!value) return;
  chrome.storage.sync.get("whitelist", ({ whitelist = [] }) => {
    if (!whitelist.includes(value)) {
      whitelist.push(value);
      chrome.storage.sync.set({ whitelist }, () => {
        loadWhitelist();
        logAction(`Added to whitelist: ${value}`);
      });
    }
  });
};

document.getElementById("addSiteRule").onclick = () => {
  const value = document.getElementById("siteRuleInput").value.trim();
  if (!value) return;
  chrome.storage.sync.get("siteRules", ({ siteRules = [] }) => {
    if (!siteRules.includes(value)) {
      siteRules.push(value);
      chrome.storage.sync.set({ siteRules }, () => {
        loadSiteRules();
        logAction(`Added site rule: ${value}`);
      });
    }
  });
};

document.getElementById("clearLogs").onclick = () => {
  chrome.storage.local.set({ log: [] }, () => {
    loadLogs();
    logAction("Cleared all logs");
  });
};

document.getElementById("exportSettings").onclick = () => {
  chrome.storage.sync.get(["whitelist", "siteRules"], (data) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "noai4me-settings.json";
    a.click();
    logAction("Exported settings");
  });
};

document.getElementById("importSettings").onclick = () => {
  const file = document.getElementById("importFile").files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      chrome.storage.sync.set(data, () => {
        loadWhitelist();
        loadSiteRules();
        logAction("Imported settings");
      });
    } catch (err) {
      alert("Invalid settings file");
    }
  };
  reader.readAsText(file);
};

// Handle Dark Mode
function loadDarkMode() {
  chrome.storage.sync.get("darkMode", ({ darkMode }) => {
    document.body.classList.toggle("dark", darkMode);
    document.getElementById("darkModeToggle").checked = darkMode;
  });
}

document.getElementById("darkModeToggle").onchange = (e) => {
  const enabled = e.target.checked;
  document.body.classList.toggle("dark", enabled);
  chrome.storage.sync.set({ darkMode: enabled });
  logAction(enabled ? "Enabled dark mode" : "Disabled dark mode");
};

// Init
loadWhitelist();
loadSiteRules();
loadLogs();
loadDarkMode();

document.addEventListener("DOMContentLoaded", () => {
  const statusBar = document.getElementById("statusBar");
  const toggleSwitch = document.getElementById("toggleSwitch");
  const filterInput = document.getElementById("filterInput");
  const whitelistSelect = document.getElementById("whitelistSelect");

  function updateBlockStatusUI(blockEnabled) {
    statusBar.textContent = blockEnabled ? "AI Blocking is ON" : "AI Blocking is OFF";
    statusBar.style.backgroundColor = blockEnabled ? "#27ae60" : "#c0392b";
    toggleSwitch.checked = blockEnabled;
  }

  toggleSwitch.addEventListener("change", () => {
    chrome.runtime.sendMessage({ type: "TOGGLE_BLOCK_STATUS" }, res => {
      updateBlockStatusUI(res.blockEnabled);
    });
  });

  function populateExtensions(filter = "") {
    chrome.management.getAll(extensions => {
      whitelistSelect.innerHTML = "";
      extensions
        .filter(ext => ext.name.toLowerCase().includes("ai") || ext.name.toLowerCase().includes("gpt"))
        .filter(ext => ext.name.toLowerCase().includes(filter.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach(ext => {
          const opt = document.createElement("option");
          opt.value = ext.id;
          opt.textContent = `${ext.name} (${ext.enabled ? "Enabled" : "Disabled"})`;
          whitelistSelect.appendChild(opt);
        });
    });
  }

  filterInput.addEventListener("input", e => {
    populateExtensions(e.target.value);
  });

  document.getElementById("addWhitelist").addEventListener("click", () => {
    const id = whitelistSelect.value;
    if (!id) return;
    chrome.storage.sync.get("whitelist", ({ whitelist = [] }) => {
      if (!whitelist.includes(id)) {
        whitelist.push(id);
        chrome.storage.sync.set({ whitelist }, refreshWhitelistUI);
      }
    });
  });

  function refreshWhitelistUI() {
    const ul = document.getElementById("whitelist");
    chrome.management.getAll(extensions => {
      chrome.storage.sync.get("whitelist", ({ whitelist = [] }) => {
        ul.innerHTML = "";
        whitelist.forEach(id => {
          const ext = extensions.find(e => e.id === id);
          const li = document.createElement("li");
          li.textContent = ext ? `${ext.name} (${ext.enabled ? "Enabled" : "Disabled"})` : id;
          const btn = document.createElement("button");
          btn.textContent = "Remove";
          btn.onclick = () => {
            chrome.storage.sync.set({ whitelist: whitelist.filter(x => x !== id) }, refreshWhitelistUI);
          };
          li.appendChild(btn);
          ul.appendChild(li);
        });
      });
    });
  }

  document.getElementById("addSiteRule").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) return;
      const url = new URL(tabs[0].url);
      const domain = url.hostname;
      chrome.storage.sync.get("siteRules", ({ siteRules = [] }) => {
        if (!siteRules.includes(domain)) {
          siteRules.push(domain);
          chrome.storage.sync.set({ siteRules }, () => {
            loadSiteRules();
            appendLog(`Added ${domain} to site rules`);
          });
        }
      });
    });
  });

  function loadSiteRules() {
    chrome.storage.sync.get("siteRules", ({ siteRules = [] }) => {
      const container = document.getElementById("siteRules");
      container.innerHTML = "";
      siteRules.forEach(site => {
        const div = document.createElement("div");
        div.textContent = site;
        const remove = document.createElement("button");
        remove.textContent = "Remove";
        remove.onclick = () => {
          chrome.storage.sync.set({
            siteRules: siteRules.filter(x => x !== site)
          }, () => {
            loadSiteRules();
            appendLog(`Removed ${site} from site rules`);
          });
        };
        div.appendChild(remove);
        container.appendChild(div);
      });
    });
  }

  function appendLog(message) {
    chrome.storage.local.get("log", ({ log = [] }) => {
      log.unshift({ message, timestamp: new Date().toLocaleString() });
      chrome.storage.local.set({ log: log.slice(0, 100) }, loadLogs);
    });
  }

  document.getElementById("clearLogs").addEventListener("click", () => {
    chrome.storage.local.set({ log: [] }, loadLogs);
    appendLog("Cleared logs");
  });

  function loadLogs() {
    const logList = document.getElementById("logList");
    chrome.storage.local.get("log", ({ log = [] }) => {
      logList.innerHTML = "";
      log.forEach(entry => {
        const li = document.createElement("li");
        li.textContent = `[${entry.timestamp}] ${entry.message}`;
        logList.appendChild(li);
      });
    });
  }

  chrome.runtime.sendMessage({ type: "GET_BLOCK_STATUS" }, res => {
    updateBlockStatusUI(res.blockEnabled);
  });

  populateExtensions();
  refreshWhitelistUI();
  loadSiteRules();
  loadLogs();
});

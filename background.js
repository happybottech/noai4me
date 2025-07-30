chrome.runtime.onInstalled.addListener(() => {
  console.log("NoAI4Me extension installed.");

  // Set default values
  chrome.storage.sync.get(["blockEnabled", "whitelist", "siteRules"], (data) => {
    if (data.blockEnabled === undefined) {
      chrome.storage.sync.set({ blockEnabled: true });
    }
    if (!Array.isArray(data.whitelist)) {
      chrome.storage.sync.set({ whitelist: [] });
    }
    if (!Array.isArray(data.siteRules)) {
      chrome.storage.sync.set({
        siteRules: [
          "bard.google.com",
          "chat.openai.com",
          "gemini.google.com",
          "copilot.microsoft.com",
          "you.com",
          "chatgpt",
          "gpt",
          "ai"
        ]
      });
    }
  });
});

// Handle messages from popup or options
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "getStatus") {
    chrome.storage.sync.get("blockEnabled", ({ blockEnabled }) => {
      sendResponse({ blockEnabled });
    });
    return true; // Keep message channel open
  } else if (request.type === "setStatus") {
    chrome.storage.sync.set({ blockEnabled: request.blockEnabled }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

//  Register blocking listener ONLY if webRequest is supported
if (chrome.webRequest?.onBeforeRequest) {
  chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
      return new Promise((resolve) => {
        chrome.storage.sync.get(["blockEnabled", "whitelist", "siteRules"], ({ blockEnabled, whitelist = [], siteRules = [] }) => {
          if (!blockEnabled) return resolve({ cancel: false });

          const url = details.url;

          const isWhitelisted = whitelist.some((allowed) => url.includes(allowed));
          const isBlocked = siteRules.some((rule) => url.toLowerCase().includes(rule.toLowerCase()));

          resolve({ cancel: isBlocked && !isWhitelisted });
        });
      });
    },
    { urls: ["<all_urls>"] },
    ["blocking"]
  );
} else {
  console.warn("webRequest API not available. Blocking functionality disabled.");
}

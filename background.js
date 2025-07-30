let blockEnabled = true;

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ blockEnabled: true, whitelist: [], siteRules: [] });
  chrome.storage.local.set({ log: [] });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "TOGGLE_BLOCK_STATUS") {
    blockEnabled = !blockEnabled;
    chrome.storage.sync.set({ blockEnabled });
    sendResponse({ blockEnabled });
  } else if (request.type === "GET_BLOCK_STATUS") {
    sendResponse({ blockEnabled });
  }
});

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    return new Promise((resolve) => {
      chrome.storage.sync.get(["blockEnabled", "whitelist", "siteRules"], ({ blockEnabled, whitelist, siteRules }) => {
        if (!blockEnabled) return resolve({ cancel: false });

        const isWhitelisted = whitelist.some(id => details.initiator && details.initiator.includes(id));
        const isBlockedDomain = siteRules.some(site => details.url.includes(site));

        const isAIRequest = /ai|gpt|bard|chatbot/i.test(details.url);

        if (!isWhitelisted && (isAIRequest || isBlockedDomain)) {
          chrome.storage.local.get("log", ({ log = [] }) => {
            log.unshift({
              message: `Blocked: ${details.url}`,
              timestamp: new Date().toLocaleString()
            });
            chrome.storage.local.set({ log: log.slice(0, 100) });
          });

          return resolve({ cancel: true });
        }
        return resolve({ cancel: false });
      });
    });
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);

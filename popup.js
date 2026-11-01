const DEFAULTS = { enabled: true };

const enabledInput = document.getElementById("enabled");

chrome.storage.sync.get(DEFAULTS, (stored) => {
  enabledInput.checked = stored.enabled;
});

// 1.0.0 stored a fixed interval; advancing is now end-of-reel driven.
chrome.storage.sync.remove("intervalSec");

enabledInput.addEventListener("change", () => {
  chrome.storage.sync.set({ enabled: enabledInput.checked });
});

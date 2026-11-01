const DEFAULTS = { enabled: true, scrollWithComments: false };
const REELS_URL = /^https:\/\/www\.instagram\.com\/reels(?:[/?#]|$)/;
const IG_URL = /^https:\/\/www\.instagram\.com\//;

const enabledInput = document.getElementById("enabled");
const commentsInput = document.getElementById("scrollWithComments");
const commentsRow = document.getElementById("commentsRow");
const statusEl = document.getElementById("status");
const statusText = document.getElementById("statusText");
const reloadButton = document.getElementById("reloadTab");

document.getElementById("version").textContent = `v${chrome.runtime.getManifest().version}`;

let activeTab = null;

function paintDependents() {
  const on = enabledInput.checked;
  commentsRow.dataset.disabled = String(!on);
  commentsInput.disabled = !on;
}

function paintStatus() {
  const url = activeTab?.url ?? "";

  if (REELS_URL.test(url)) {
    statusEl.dataset.state = "on";
    statusText.textContent = "Active on this tab";
  } else if (IG_URL.test(url)) {
    statusEl.dataset.state = "idle";
    statusText.textContent = "Instagram — open a Reel to activate";
  } else {
    statusEl.dataset.state = "off";
    statusText.textContent = "Not on Instagram";
  }

  reloadButton.hidden = !IG_URL.test(url);
}

async function init() {
  const stored = await chrome.storage.sync.get(DEFAULTS);
  enabledInput.checked = stored.enabled;
  commentsInput.checked = stored.scrollWithComments;
  paintDependents();

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTab = tab ?? null;
  paintStatus();
}

// 1.0.0 stored a fixed interval; advancing is end-of-reel driven now.
chrome.storage.sync.remove("intervalSec");

enabledInput.addEventListener("change", () => {
  paintDependents();
  chrome.storage.sync.set({ enabled: enabledInput.checked });
});

commentsInput.addEventListener("change", () => {
  chrome.storage.sync.set({ scrollWithComments: commentsInput.checked });
});

// Escape hatch for the classic trap: a tab that still runs an old content
// script after the extension was reloaded.
reloadButton.addEventListener("click", () => {
  if (activeTab) chrome.tabs.reload(activeTab.id);
});

init();

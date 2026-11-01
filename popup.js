const DEFAULTS = { enabled: true, scrollWithComments: false };

const enabledInput = document.getElementById("enabled");
const commentsInput = document.getElementById("scrollWithComments");
const commentsRow = document.getElementById("commentsRow");

function paintDependents() {
  const on = enabledInput.checked;
  commentsRow.dataset.disabled = String(!on);
  commentsInput.disabled = !on;
}

chrome.storage.sync.get(DEFAULTS, (stored) => {
  enabledInput.checked = stored.enabled;
  commentsInput.checked = stored.scrollWithComments;
  paintDependents();
});

// 1.0.0 stored a fixed interval; advancing is end-of-reel driven now.
chrome.storage.sync.remove("intervalSec");

enabledInput.addEventListener("change", () => {
  paintDependents();
  chrome.storage.sync.set({ enabled: enabledInput.checked });
});

commentsInput.addEventListener("change", () => {
  chrome.storage.sync.set({ scrollWithComments: commentsInput.checked });
});

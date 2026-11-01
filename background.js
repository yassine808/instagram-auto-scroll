/*
 * Instagram Auto-Scroll — service worker.
 *
 * The content script is no longer declared in the manifest: it is injected only
 * when the tab URL is a Reels page, which keeps the extension completely inert
 * on the rest of instagram.com. Injection is repeated on every navigation
 * because Instagram is a SPA and history changes do not reload the document;
 * content.js guards against double initialisation.
 */
const REELS_URL = /^https:\/\/www\.instagram\.com\/reels(?:[/?#]|$)/;
const DEFAULTS = { enabled: true };

const isReels = (url) => typeof url === "string" && REELS_URL.test(url);

async function inject(tabId) {
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
  } catch {
    // Tab closed, still loading, or not injectable — the next navigation retries.
  }
}

async function paintBadge(tabId, url) {
  try {
    if (!isReels(url)) {
      await chrome.action.setBadgeText({ tabId, text: "" });
      return;
    }
    const { enabled } = await chrome.storage.sync.get(DEFAULTS);
    await chrome.action.setBadgeBackgroundColor({
      tabId,
      color: enabled ? "#1c9658" : "#3a3a41",
    });
    await chrome.action.setBadgeText({ tabId, text: enabled ? "ON" : "OFF" });
  } catch {
    // Tab gone between events; nothing to paint.
  }
}

chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  const url = info.url ?? (info.status === "complete" ? tab.url : undefined);
  if (url === undefined) return;

  paintBadge(tabId, url);
  if (isReels(url)) inject(tabId);
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (tab) paintBadge(tabId, tab.url);
});

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== "sync" || !changes.enabled) return;
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (tab) paintBadge(tab.id, tab.url);
});

// Fresh install / update: catch Reels tabs that are already open.
chrome.runtime.onInstalled.addListener(async () => {
  const tabs = await chrome.tabs
    .query({ url: "https://www.instagram.com/reels*" })
    .catch(() => []);
  for (const tab of tabs) inject(tab.id);
});

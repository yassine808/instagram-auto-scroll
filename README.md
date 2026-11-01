# Instagram Auto-Scroll

A small Manifest V3 extension for Chrome / Edge / Brave that advances Instagram
Reels **when the current reel finishes**. It is active **only on
`instagram.com/reels`** — nothing runs on the rest of the site.

## Install (unpacked)

1. Open `chrome://extensions` (Brave: `brave://extensions`, Edge: `edge://extensions`).
2. Turn on **Developer mode**.
3. Click **Load unpacked** and pick this folder.
4. Open <https://www.instagram.com/reels/>.

> Reloading an unpacked extension does **not** re-inject content scripts into
> tabs that are already open. After updating, reload the extension **and** the
> tab — the popup's **Reload tab** button does the second part for you.

## How it works

- **Reels only.** `background.js` injects `content.js` through
  `chrome.scripting` when a tab URL matches `/reels`, and never otherwise. The
  manifest declares no content scripts at all, so the extension is completely
  inert on the home feed, profiles, DMs and every other site. Injection repeats
  on each navigation (Instagram is a SPA) and `content.js` guards against double
  initialisation.
- **Badge** — the toolbar icon shows `ON` / `OFF` while the active tab is a Reels
  page, and nothing anywhere else.
- **End-of-reel trigger, no timer.** The script watches the `<video>` closest to
  the viewport centre and advances on the first of:
  - `duration - currentTime <= 0.25 s` (reel played to the end),
  - `currentTime` jumping backwards (Instagram looped the reel to 0), or
  - the video's `ended` event.
  A 1.5 s cooldown means one advance per reel — never a burst.
- **Page pill** — fixed 168 × 34, anchored to the **top-right of the reel,
  outside the card** (right edge + 12 px, top-aligned), so Instagram's own
  overlays never sit under it. Falls back to outside-left, then inside the card,
  then clamps to the viewport. Reads `Auto-scroll ON`, turns `PAUSED` (amber)
  while deliberately holding back, `OFF` when disabled. Click to toggle.
- **Comments setting** — Instagram splits the reel card when the comment drawer
  opens, narrowing the video. The script remembers each reel's widest width; if
  the video drops below 72 % of it, comments count as open. With **Scroll with
  comments open** off (default), advancing waits until the drawer closes.
- **Popup** — live status for the current tab, the two switches, and a **Reload
  tab** escape hatch for stale content scripts.

## Files

| File | Role |
| --- | --- |
| `manifest.json` | MV3 manifest, `storage` + `scripting`, host permission for instagram.com |
| `background.js` | injects the content script on `/reels` only, paints the badge |
| `content.js` | reel detection, end detection, scrolling, page pill |
| `popup.html` / `popup.js` | settings UI, tab status, reload action |

## Storage keys

| Key | Type | Default | Meaning |
| --- | --- | --- | --- |
| `enabled` | boolean | `true` | master switch, shared with the page pill |
| `scrollWithComments` | boolean | `false` | advance while the comment drawer is open |

## Notes / limits

- No icons yet; the browser shows the default puzzle-piece icon.
- Comments detection is geometric, not DOM-name based, so it survives Instagram
  class-name churn. A window resize while the drawer is open resets the baseline.
- If a future layout defeats `findScroller()`, `advance()` falls back to
  dispatching `ArrowDown`, Instagram's own next-reel shortcut.
- Injection depends on `tabs.onUpdated` firing. If a tab was opened before the
  extension loaded, use **Reload tab** in the popup.

## Test checklist

- [ ] Load unpacked, open `/reels` → badge reads `ON`, pill sits top-right outside the card.
- [ ] Open the home feed → no pill, no badge, no scrolling.
- [ ] Let a reel play to the end → next reel appears immediately.
- [ ] Looping reel → advances once, at the loop point, not twice.
- [ ] Click the pill → `OFF`; reels stop advancing.
- [ ] Open the comment drawer → pill turns `PAUSED`, feed holds.
- [ ] Enable "Scroll with comments open" → pill returns to `ON`, feed advances.
- [ ] Popup shows "Active on this tab" on `/reels`, "Instagram — open a Reel" elsewhere.

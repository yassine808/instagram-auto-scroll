# Instagram Auto-Scroll

A small Manifest V3 extension for Chrome / Edge / Brave that advances Instagram
Reels **when the current reel finishes**, with a control next to the reel and
persistent settings.

## Install (unpacked)

1. Open `chrome://extensions` (Brave: `brave://extensions`, Edge: `edge://extensions`).
2. Turn on **Developer mode**.
3. Click **Load unpacked** and pick this folder.
4. Open <https://www.instagram.com/reels/>.

> Reloading an unpacked extension does **not** re-inject content scripts into
> tabs that are already open. After updating, reload the extension **and** the
> Instagram tab (a hard refresh), otherwise the old script keeps running.

## How it works

- **End-of-reel trigger, no timer.** The script watches the `<video>` closest to
  the viewport centre and advances on the first of:
  - `duration - currentTime <= 0.25 s` (reel played to the end),
  - `currentTime` jumping backwards (Instagram looped the reel to 0), or
  - the video's `ended` event.
  A 1.5 s cooldown means one advance per reel — never a burst.
- **Page control** — a pill anchored **outside the reel**, on its left edge when
  there is room (right edge otherwise, and only inside the card if the window is
  too narrow for both). It reads `Auto-scroll ON`, turns `PAUSED` (amber) while
  it is deliberately holding back, and `OFF` when disabled. Click to toggle.
- **Comments setting** — Instagram splits the reel card when the comment drawer
  opens, narrowing the video. The script remembers each reel's widest width; if
  the video drops below 72 % of it, comments count as open. With
  **Scroll with comments open** off (default), advancing waits until the drawer
  closes. On, it keeps going regardless.
- **Popup settings** — master switch + the comments switch. Both write the same
  `chrome.storage.sync` values the page button writes, so they cannot disagree.
- **Paused / hidden tab** — handlers bail out when the video is paused, so
  nothing advances while you are reading.

## Files

| File | Role |
| --- | --- |
| `manifest.json` | MV3 manifest, `storage` permission, content script on `instagram.com/*` |
| `content.js` | reel detection, end detection, scrolling, page pill |
| `popup.html` / `popup.js` | settings UI bound to `chrome.storage.sync` |

## Storage keys

| Key | Type | Default | Meaning |
| --- | --- | --- | --- |
| `enabled` | boolean | `true` | master switch, shared with the page pill |
| `scrollWithComments` | boolean | `false` | advance while the comment drawer is open |

## Notes / limits

- No icons yet; the browser shows the default puzzle-piece icon.
- The content script is injected on all of `instagram.com` and stays idle until
  `location.pathname` matches `/reels`.
- Comments detection is geometric, not DOM-name based, so it survives Instagram
  class-name churn. A window resize while the drawer is open resets the baseline.
- If a future layout defeats `findScroller()`, `advance()` falls back to
  dispatching `ArrowDown`, Instagram's own next-reel shortcut.

## Test checklist

- [ ] Load unpacked, open `/reels` → pill sits left of the reel, reads `ON`.
- [ ] Let a reel play to the end → next reel appears immediately.
- [ ] Looping reel → advances once, at the loop point, not twice.
- [ ] Click the pill → `OFF`; reels stop advancing.
- [ ] Open the comment drawer → pill turns `PAUSED`, feed holds.
- [ ] Enable "Scroll with comments open" → pill returns to `ON`, feed advances.
- [ ] Resize the window → pill stays beside the reel.
- [ ] Navigate to the home feed → pill hidden.

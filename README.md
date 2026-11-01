# Instagram Auto-Scroll

A tiny Manifest V3 extension for Chrome / Edge / Brave that advances Instagram
Reels **when the current reel finishes**, with a toggle on the page and
persistent settings.

## Install (unpacked)

1. Open `chrome://extensions` (Brave: `brave://extensions`, Edge: `edge://extensions`).
2. Turn on **Developer mode**.
3. Click **Load unpacked** and pick this folder.
4. Open <https://www.instagram.com/reels/>.

## How it works

- **End-of-reel trigger, no timer.** The script watches the `<video>` closest to
  the centre of the viewport and advances on the first of:
  - `duration - currentTime <= 0.25 s` (reel played to the end), or
  - `currentTime` jumping backwards (Instagram looped the reel to 0), or
  - the video's `ended` event.
  A 1.5 s cooldown means one advance per reel — never a burst.
- **On-page button** — pinned to the reel's **top-right corner**, `Auto-scroll ON`.
  Click to pause/resume; it follows the reel if the window resizes or Instagram
  re-lays out the card. Hidden on every page that is not `/reels`.
- **Popup settings** — a single master switch. It writes the same
  `chrome.storage.sync` value the on-page button writes, so the two can never
  disagree.
- **Persistence** — the stored value is read on every Reels load and on every
  `storage.onChanged` event. Behaviour is identical whether or not you ever
  opened the popup; a fresh install defaults to **ON**.
- **Paused / hidden tab** — the handlers bail out when the video is paused, so
  nothing advances while you are away or reading comments.

## Files

| File | Role |
| --- | --- |
| `manifest.json` | MV3 manifest, `storage` permission, content script on `instagram.com/*` |
| `content.js` | reel detection, end detection, scrolling, on-page button |
| `popup.html` / `popup.js` | settings UI bound to `chrome.storage.sync` |

## Notes / limits

- No icons yet; the browser shows the default puzzle-piece icon.
- Instagram is a SPA, so the content script is injected on all of
  `instagram.com` and stays idle until `location.pathname` matches `/reels`.
- Reels that are paused at the end by Instagram itself: `ended` may not fire,
  but the `duration - currentTime` check still does.
- If a future layout defeats `findScroller()`, `advance()` falls back to
  dispatching `ArrowDown`, Instagram's own next-reel shortcut.

## Test checklist

- [ ] Load unpacked, open `/reels` → button sits at the reel's top-right, `ON`.
- [ ] Let a reel play to the end → next reel appears with no 6 s wait.
- [ ] On a looping reel → still advances once, at the loop point, not twice.
- [ ] Click the button → `OFF`; reels stop advancing even at the end.
- [ ] Reload the page → still `OFF` (persisted).
- [ ] Open the popup, flip the switch → on-page button follows immediately.
- [ ] Resize the window → button stays attached to the reel corner.
- [ ] Navigate to the home feed → button hidden, no scrolling.

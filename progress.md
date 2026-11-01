# Progress — instagram-auto-scroll

## Plan
- [x] Create GitHub repo `yassine808/instagram-auto-scroll` (public, empty)
- [x] Create local folder `D:\Projects\instagram-auto-scroll`
- [x] Build MV3 extension: manifest, content script, popup settings
- [x] v1.1.0: end-of-reel trigger (no fixed timer) + button anchored to the reel
- [ ] Load unpacked in Brave/Chrome and run the manual test checklist
- [ ] Fix scroll strategy if Instagram's DOM defeats `findScroller()`
- [ ] Optional: icons, git init + push to origin

## Log

### 2026-11-01 — repo + folder + first version
- Goal: auto-scroll Instagram Reels with an on-page toggle and persistent settings.
- Done: public repo created; folder created; MV3 extension written
  (`manifest.json`, `content.js`, `popup.html`, `popup.js`, `README.md`, `AGENTS.md`).
  Settings stored in `chrome.storage.sync` (`enabled`, `intervalSec`), default ON / 6 s.
- Verified: `node --check` clean on both scripts; `manifest.json` parses as JSON.
  Not yet loaded in a browser — scroll behaviour unconfirmed.
- Next: load unpacked and run the README checklist; adjust `advance()` if needed.

### 2026-11-01 — v1.1.0: end-of-reel trigger, reel-anchored button
- Goal: stop advancing on a fixed 6 s clock; keep the toggle next to the reel.
- Done: removed `intervalSec` entirely. `content.js` now watches the video
  closest to the viewport centre and advances when `duration - currentTime <=
  0.25 s`, when `currentTime` wraps backwards (IG loop), or on `ended`, with a
  1.5 s cooldown. Button is positioned from the video's `getBoundingClientRect()`
  (top-right corner, 10 px inset, viewport-clamped) and re-synced every 400 ms.
  Popup reduced to the master switch; stale `intervalSec` key removed on load.
- Verified: `node --check` clean on both scripts; no fixed-interval advancing
  remains (only the 400 ms `sync()` loop). Not yet tested in a browser.
- Next: reload the extension in `brave://extensions`, walk the README checklist.

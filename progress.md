# Progress — instagram-auto-scroll

## Plan
- [x] Create GitHub repo `yassine808/instagram-auto-scroll` (public, empty)
- [x] Create local folder `D:\Projects\instagram-auto-scroll`
- [x] Build MV3 extension: manifest, content script, popup settings
- [x] v1.1.0: end-of-reel trigger (no fixed timer) + button anchored to the reel
- [x] v1.2.0: popup redesign, pill outside the reel, comments gating toggle
- [x] v1.2.1: pill moved to the reel's bottom-right, outside it, fixed 168×34
- [x] v1.2.2: pill moved to the reel's top-right — bottom-right covered the audio avatar
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

### 2026-11-01 — pushed v1.1.0 to GitHub
- Goal: get the repo on GitHub; diagnose "button still shows 6s".
- Done: `git init -b main`, files added individually, commit `0d8da94`, remote
  `origin` → `https://github.com/yassine808/instagram-auto-scroll.git`, pushed
  `main`. Added a version badge to the popup header so a stale build is visible.
- Verified: `git status -sb` shows `main...origin/main` in sync; `gh repo view`
  reports `isEmpty: false`, default branch `main`. Only one copy of the extension
  exists on disk (`D:\Projects\instagram-auto-scroll`).
- Diagnosis: the "6s" button is the **old content script still running in an open
  tab**. `content.js` v1.1.0 contains no interval code. Fix = reload the
  extension in `brave://extensions`, then hard-refresh the Instagram tab.
- Next: user confirms on-page label reads `Auto-scroll ON` (no seconds).

### 2026-11-01 — stale content script: proven and cleared
- Goal: explain why the page still showed `Auto-scroll ON · 6s` after v1.1.0.
- Done: inspected Brave's `Secure Preferences` — extension is `location: 4`
  (unpacked) at `D:\Projects\instagram-auto-scroll`, only one copy on disk, Edge
  has no copy. Brave process start 03:55:16 predates the fix; the open tab kept
  executing v1.0.0 because reloading an unpacked extension does not re-inject
  content scripts into existing tabs. Hard-killed Brave and relaunched it so the
  extension service reloaded from disk and tabs got a fresh page context.
- Verified: 0 → 14 brave processes after relaunch; extension entry still present
  and pointing at the project folder. Session URL backup produced 0 entries
  (Brave encrypts session files) — tab restore relies on Brave's prompt or
  Ctrl+Shift+T.
- Next: confirm popup shows `v1.1.0` and the pill reads `Auto-scroll ON` pinned
  to the reel's top-right corner. If the reel still does not advance, the next
  suspect is `advance()` (synthetic ArrowDown / scroll container), not staleness.

### 2026-11-01 — v1.2.0: frontend pass, pill outside the reel, comments toggle
- Goal: nicer popup + page control, control outside the video, and a setting for
  what happens while the comment drawer is open.
- Done: popup rebuilt (gradient mark, two switch rows, dependent row dims when
  the master is off). Page pill restyled (dot + label + state) with styles
  injected through `adoptedStyleSheets` and re-attached if Instagram drops them.
  Placement is now left-outside → right-outside → inside, clamped to viewport.
  New setting `scrollWithComments` (default `false`): comments are detected by
  the reel card narrowing below 72 % of its widest observed width, and the pill
  shows amber `PAUSED` while it holds back.
- Verified: `node --check` clean on both scripts, manifest parses at 1.2.0, no
  `6s`/interval code left. Not yet exercised in a browser.
- Next: reload extension + hard-refresh `/reels`; check pill position, PAUSED
  state when opening comments, and that the second switch changes it.

### 2026-11-01 — v1.2.1: pill bottom-right of the reel, fixed size
- Goal: put the control at the reel's bottom-right, outside the card, and stop it
  from resizing with its label.
- Done: `positionButton()` now anchors to `rect.right + 12` and
  `rect.bottom - height - 12`, falling back inside the card's bottom-right when
  the window has no room, then clamping to the viewport. Pill is a fixed
  `168 × 34` (`box-sizing: border-box`, `justify-content: space-between`) with the
  label ellipsised so `ON` / `PAUSED` / `OFF` never change its size. Popup version
  string now comes from `chrome.runtime.getManifest()` instead of being hardcoded.
- Verified: `node --check` clean, manifest parses at 1.2.1, fixed dimensions and
  bottom anchoring present in `content.js`.
- Next: reload extension + hard-refresh the tab; confirm the pill sits outside
  the card's bottom-right and does not move when the state changes.

### 2026-11-01 — v1.2.2: pill moved to the reel's top-right
- Goal: stop the pill covering the audio-attribution avatar at the card's
  bottom-right.
- Done: `positionButton()` anchors to `rect.right + 12` / `rect.top + 12`
  (outside, top-aligned). Fallback order: outside-right → outside-left → inside
  the card, then viewport clamp. Size stays fixed at 168 × 34.
- Verified: `node --check` clean, manifest at 1.2.2, README/AGENTS updated to the
  new anchor and to the reason the bottom edge is off-limits.
- Next: reload extension + hard-refresh; confirm nothing sits under the pill at
  the reel's top-right in both normal and comments-open layouts.

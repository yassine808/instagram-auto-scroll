# AGENTS.md — instagram-auto-scroll

## What this is
Manifest V3 browser extension (Chrome / Edge / Brave) that advances Instagram
Reels when the current reel ends. No build step, no dependencies — the folder is
the extension.

## Layout
- `manifest.json` — MV3 manifest. `storage` permission only.
- `content.js` — runs on `instagram.com/*`, acts only on `/reels`.
- `popup.html`, `popup.js` — settings UI.

## Rules
- Keep it dependency-free and build-free; it must stay loadable via "Load unpacked".
- Advancing is **end-of-reel driven**. Do not reintroduce a fixed timer; the only
  interval allowed is the 400 ms DOM/geometry `sync()` loop.
- All settings live in `chrome.storage.sync` under `DEFAULTS` in `content.js`.
  The popup and the page pill must never hold separate state; add a new key to
  both `DEFAULTS` objects and to the README table.
- Only touch the DOM while `location.pathname` matches `/reels`. Instagram is a
  SPA, so re-check the path on navigation instead of relying on page loads.
- The page pill sits **outside** the reel: left edge, right edge, then inside as
  a last resort. Keep the viewport clamp in `positionButton()`.
- Comments state is detected geometrically (`COMMENT_SHRINK_RATIO`), not by
  Instagram class names.
- Pick the reel by proximity to the viewport centre — Instagram keeps
  preloaded/offscreen `<video>` elements in the DOM.
- Styles are injected via `document.adoptedStyleSheets`, falling back to a
  `<style>` tag; do not rely on page CSP allowing inline styles.
- No `eval`, no remote code — MV3 forbids it and store review rejects it.

## Verify before saying done
`node --check content.js && node --check popup.js`, then reload the extension in
`chrome://extensions`, **reload the Instagram tab**, and walk the checklist in
`README.md`. A stale content script in an open tab is the number one false alarm:
reloading the extension alone never replaces it.

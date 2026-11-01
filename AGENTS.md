# AGENTS.md — instagram-auto-scroll

## What this is
Manifest V3 browser extension (Chrome / Edge / Brave) that advances Instagram
Reels when the current reel ends. No build step, no dependencies — the folder
is the extension.

## Layout
- `manifest.json` — MV3 manifest. `storage` permission only.
- `content.js` — runs on `instagram.com/*`, acts only on `/reels`.
- `popup.html`, `popup.js` — settings UI.

## Rules
- Keep it dependency-free and build-free; it must stay loadable via "Load unpacked".
- Advancing is **end-of-reel driven**. Do not reintroduce a fixed timer; the
  only interval allowed is the 400 ms DOM/geometry `sync()` loop.
- Settings go through `chrome.storage.sync`; the popup and the on-page button
  must never hold separate state.
- Only touch the DOM while `location.pathname` matches `/reels`. Instagram is a
  SPA, so re-check the path on navigation instead of relying on page loads.
- The button is anchored to the playing video's rect, not to the window corner.
  Keep the viewport clamp in `positionButton()`.
- Pick the reel by proximity to the viewport centre — Instagram keeps
  preloaded/offscreen `<video>` elements in the DOM.
- No `eval`, no remote code — MV3 forbids it and store review rejects it.

## Verify before saying done
`node --check content.js && node --check popup.js`, then reload the extension in
`chrome://extensions` and walk the checklist in `README.md`.

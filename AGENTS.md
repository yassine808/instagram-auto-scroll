# AGENTS.md — instagram-auto-scroll

## What this is
Manifest V3 browser extension (Chrome / Edge / Brave) that advances Instagram
Reels when the current reel ends. No build step, no dependencies — the folder is
the extension.

## Layout
- `manifest.json` — MV3 manifest. `storage` + `scripting`, host permission for
  `instagram.com`. **No `content_scripts` entry** — injection is explicit.
- `background.js` — injects `content.js` only when the tab URL matches `/reels`,
  and paints the `ON` / `OFF` badge.
- `content.js` — runs on `/reels` only: reel detection, end detection, scrolling,
  page pill.
- `popup.html`, `popup.js` — settings UI, tab status, reload action.

## Rules
- **Reels only.** Never widen the URL match in `background.js`, and never add a
  manifest `content_scripts` entry that injects on all of `instagram.com`.
  Instagram is a SPA, so injection must be repeated on `tabs.onUpdated` and
  guarded by `window.__igAutoScrollLoaded`.
- Keep it dependency-free and build-free; it must stay loadable via "Load unpacked".
- Advancing is **end-of-reel driven**. Do not reintroduce a fixed timer; the only
  interval allowed is the 400 ms DOM/geometry `sync()` loop.
- All settings live in `chrome.storage.sync` under `DEFAULTS`. `content.js`,
  `background.js` and the popup must never hold separate state; add a new key to
  every `DEFAULTS` object and to the README table.
- The page pill is a **fixed 168 × 34** element at the **top-right of the reel,
  outside it** (right edge + 12 px, top-aligned), falling back outside-left then
  inside the card. Keep the viewport clamp in `positionButton()`; never let the
  label change the pill's size.
- Do not anchor the pill to the card's bottom edge: the action column's audio
  attribution avatar lives there and the pill covers it.
- Comments state is detected geometrically (`COMMENT_SHRINK_RATIO`), not by
  Instagram class names.
- Pick the reel by proximity to the viewport centre — Instagram keeps
  preloaded/offscreen `<video>` elements in the DOM.
- Styles are injected via `document.adoptedStyleSheets`, falling back to a
  `<style>` tag; do not rely on page CSP allowing inline styles.
- No `eval`, no remote code — MV3 forbids it and store review rejects it.

## Verify before saying done
`node --check background.js && node --check content.js && node --check popup.js`,
then reload the extension in `chrome://extensions`, **reload the Instagram tab**,
and walk the checklist in `README.md`. A stale content script in an open tab is
the number one false alarm: reloading the extension alone never replaces it.

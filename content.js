/*
 * Instagram Auto-Scroll — content script.
 * Loaded on instagram.com, acts only on /reels.
 *
 * Advancing is driven by the reel itself: the watched <video> (closest to the
 * viewport centre) is advanced when it ends or loops back to 0.
 * The control is anchored outside the reel, on its left edge when there is room.
 */
(() => {
  if (window.__igAutoScrollLoaded) return;
  window.__igAutoScrollLoaded = true;

  const DEFAULTS = { enabled: true, scrollWithComments: false };
  const ADVANCE_COOLDOWN_MS = 1500;
  const SYNC_MS = 400;
  // Opening the comment drawer splits the card and narrows the video.
  // Below this fraction of its widest observed width, comments are open.
  const COMMENT_SHRINK_RATIO = 0.72;

  let settings = { ...DEFAULTS };
  let button = null;
  let boundVideo = null;
  let lastTime = 0;
  let lastAdvanceAt = 0;
  let baselineWidth = 0;

  const isReelsPage = () => /^\/reels(\/|$)/.test(location.pathname);

  function pickVideo() {
    const videos = document.querySelectorAll("video");
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;

    let best = null;
    let bestDist = Infinity;

    for (const video of videos) {
      const rect = video.getBoundingClientRect();
      if (rect.width < 120 || rect.height < 120) continue;
      if (rect.bottom < 0 || rect.top > window.innerHeight) continue;

      const dist = Math.hypot(
        rect.left + rect.width / 2 - cx,
        rect.top + rect.height / 2 - cy
      );
      if (dist < bestDist) {
        bestDist = dist;
        best = video;
      }
    }
    return best;
  }

  function commentsOpen() {
    if (!boundVideo || !baselineWidth) return false;
    const width = boundVideo.getBoundingClientRect().width;
    return width > 0 && width < baselineWidth * COMMENT_SHRINK_RATIO;
  }

  function findScroller(video) {
    let el = video ? video.parentElement : null;
    while (el && el !== document.body && el !== document.documentElement) {
      const overflowY = getComputedStyle(el).overflowY;
      const scrollable = overflowY === "auto" || overflowY === "scroll";
      if (scrollable && el.scrollHeight - el.clientHeight > 20) return el;
      el = el.parentElement;
    }
    return null;
  }

  function advance() {
    const video = boundVideo || pickVideo();
    const scroller = findScroller(video);

    if (scroller) {
      scroller.scrollBy({ top: scroller.clientHeight, behavior: "smooth" });
      return;
    }

    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowDown",
        code: "ArrowDown",
        keyCode: 40,
        which: 40,
        bubbles: true,
        cancelable: true,
      })
    );
  }

  function queueAdvance() {
    if (!settings.enabled || !isReelsPage()) return;
    if (!settings.scrollWithComments && commentsOpen()) return;

    const now = Date.now();
    if (now - lastAdvanceAt < ADVANCE_COOLDOWN_MS) return;
    lastAdvanceAt = now;
    advance();
  }

  // timeupdate fires ~4x/second while playing. Two end signals:
  // duration reached (no loop), or currentTime jumping back to 0 (IG loops).
  function onTimeUpdate(event) {
    const video = event.currentTarget;
    if (!settings.enabled || !isReelsPage()) return;
    if (video.paused || video.seeking) return;

    const { currentTime, duration } = video;
    if (!Number.isFinite(duration) || duration <= 0) return;

    const looped = lastTime > 1 && currentTime + 0.5 < lastTime;
    lastTime = currentTime;

    if (looped || duration - currentTime <= 0.25) queueAdvance();
  }

  function onEnded() {
    queueAdvance();
  }

  function bindVideo(video) {
    if (video === boundVideo) return;

    if (boundVideo) {
      boundVideo.removeEventListener("timeupdate", onTimeUpdate);
      boundVideo.removeEventListener("ended", onEnded);
    }

    boundVideo = video;
    lastTime = 0;
    baselineWidth = 0;
    measureBaseline();

    if (!video) return;
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("ended", onEnded);
  }

  function measureBaseline() {
    if (!boundVideo) return;
    const width = boundVideo.getBoundingClientRect().width;
    if (width > 0) baselineWidth = Math.max(baselineWidth, width);
  }

  const STYLE_TEXT = `
    #ig-auto-scroll-toggle {
      position: fixed;
      z-index: 2147483000;
      display: inline-flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      box-sizing: border-box;
      width: 168px;
      height: 34px;
      padding: 0 12px;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 999px;
      background: rgba(18, 18, 20, 0.82);
      color: #f5f5f7;
      font: 600 12px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      letter-spacing: 0.2px;
      cursor: pointer;
      backdrop-filter: blur(12px) saturate(140%);
      -webkit-backdrop-filter: blur(12px) saturate(140%);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.06);
      transition: transform 0.14s ease, background 0.18s ease, border-color 0.18s ease;
      user-select: none;
      -webkit-user-select: none;
    }
    #ig-auto-scroll-toggle:hover {
      background: rgba(32, 32, 36, 0.92);
      border-color: rgba(255, 255, 255, 0.24);
      transform: translateY(-1px);
    }
    #ig-auto-scroll-toggle:active {
      transform: translateY(0) scale(0.98);
    }
    #ig-auto-scroll-toggle:focus-visible {
      outline: 2px solid #59b0ff;
      outline-offset: 2px;
    }
    #ig-auto-scroll-toggle .ig-as-dot {
      flex: 0 0 auto;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #6b6b73;
      transition: background 0.18s ease, box-shadow 0.18s ease;
    }
    #ig-auto-scroll-toggle .ig-as-label {
      flex: 1 1 auto;
      min-width: 0;
      text-align: left;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    #ig-auto-scroll-toggle .ig-as-state {
      flex: 0 0 auto;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.6px;
      opacity: 0.72;
    }
    #ig-auto-scroll-toggle[data-state="on"] {
      border-color: rgba(52, 211, 153, 0.38);
    }
    #ig-auto-scroll-toggle[data-state="on"] .ig-as-dot {
      background: #34d399;
      box-shadow: 0 0 10px rgba(52, 211, 153, 0.65);
    }
    #ig-auto-scroll-toggle[data-state="paused"] {
      border-color: rgba(251, 191, 36, 0.38);
    }
    #ig-auto-scroll-toggle[data-state="paused"] .ig-as-dot {
      background: #fbbf24;
      box-shadow: 0 0 10px rgba(251, 191, 36, 0.6);
    }
  `;

  let adoptedSheet = null;
  let styleElement = null;

  function injectStyles() {
    try {
      if (!adoptedSheet) {
        adoptedSheet = new CSSStyleSheet();
        adoptedSheet.replaceSync(STYLE_TEXT);
      }
      // Instagram can rewrite adoptedStyleSheets; re-attach if ours was dropped.
      if (!document.adoptedStyleSheets.includes(adoptedSheet)) {
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, adoptedSheet];
      }
      return;
    } catch {
      // Older engines: fall back to a plain <style> tag.
    }

    if (!styleElement) {
      styleElement = document.createElement("style");
      styleElement.textContent = STYLE_TEXT;
      (document.head || document.documentElement).appendChild(styleElement);
    }
  }

  function ensureButton() {
    if (button) return button;

    injectStyles();

    button = document.createElement("button");
    button.type = "button";
    button.id = "ig-auto-scroll-toggle";
    button.setAttribute("aria-pressed", "true");

    const dot = document.createElement("span");
    dot.className = "ig-as-dot";

    const label = document.createElement("span");
    label.className = "ig-as-label";
    label.textContent = "Auto-scroll";

    const state = document.createElement("span");
    state.className = "ig-as-state";
    state.textContent = "ON";

    button.append(dot, label, state);

    // Keep the click away from Instagram's own video/overlay handlers.
    const swallow = (event) => {
      event.preventDefault();
      event.stopPropagation();
    };
    button.addEventListener("pointerdown", swallow);
    button.addEventListener("click", (event) => {
      swallow(event);
      setEnabled(!settings.enabled);
    });

    document.body.appendChild(button);
    return button;
  }

  // Bottom-right of the reel, outside it. Falls back to inside the card's
  // bottom-right when the window leaves no room, then clamps to the viewport.
  function positionButton() {
    const el = ensureButton();
    const onPage = isReelsPage();
    el.style.display = onPage ? "inline-flex" : "none";
    if (!onPage) return;

    const pad = 10;
    const gap = 12;
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    const rect = boundVideo ? boundVideo.getBoundingClientRect() : null;

    let left = window.innerWidth - width - pad;
    let top = window.innerHeight - height - pad;

    if (rect && rect.width > 0) {
      const outsideLeft = rect.right + gap;

      if (outsideLeft + width <= window.innerWidth - pad) {
        left = outsideLeft;
      } else {
        left = rect.right - width - pad;
      }
      top = rect.bottom - height - 12;
    }

    left = Math.min(Math.max(left, pad), window.innerWidth - width - pad);
    top = Math.min(Math.max(top, pad), window.innerHeight - height - pad);

    el.style.left = `${Math.round(left)}px`;
    el.style.top = `${Math.round(top)}px`;
  }

  function render() {
    const el = ensureButton();
    const paused = settings.enabled && !settings.scrollWithComments && commentsOpen();

    el.dataset.state = !settings.enabled ? "off" : paused ? "paused" : "on";
    el.querySelector(".ig-as-state").textContent = !settings.enabled ? "OFF" : paused ? "PAUSED" : "ON";
    el.setAttribute("aria-pressed", String(settings.enabled));
    el.title = !settings.enabled
      ? "Auto-scroll is off. Click to start."
      : paused
        ? "Paused while the comments are open. Click to turn off."
        : "Advances when the reel ends. Click to pause.";
  }

  function setEnabled(value) {
    settings.enabled = value;
    render();
    positionButton();
    chrome.storage.sync.set({ enabled: value });
  }

  function sync() {
    if (!isReelsPage()) {
      bindVideo(null);
      if (button) button.style.display = "none";
      return;
    }
    bindVideo(pickVideo());
    measureBaseline();
    injectStyles();
    render();
    positionButton();
  }

  chrome.storage.sync.get(DEFAULTS, (stored) => {
    settings = { ...DEFAULTS, ...stored };
    sync();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    for (const key of Object.keys(DEFAULTS)) {
      if (changes[key]) settings[key] = changes[key].newValue ?? DEFAULTS[key];
    }
    render();
  });

  // Instagram is a SPA and re-renders the reel card freely; resync geometry
  // and the watched <video> on a cheap loop instead of chasing mutations.
  setInterval(sync, SYNC_MS);

  window.addEventListener("resize", () => {
    baselineWidth = 0;
    measureBaseline();
    positionButton();
  });
})();

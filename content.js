/*
 * Instagram Auto-Scroll — content script.
 * Loaded on instagram.com, but only acts while the URL is /reels.
 *
 * Advancing is driven by the reel itself, not a clock: we watch the reel
 * that is playing and advance when it ends (or when it loops back to 0).
 * The on-page button is anchored to the reel's top-right corner.
 */
(() => {
  if (window.__igAutoScrollLoaded) return;
  window.__igAutoScrollLoaded = true;

  const DEFAULTS = { enabled: true };
  const ADVANCE_COOLDOWN_MS = 1500; // one advance per reel, never a burst
  const SYNC_MS = 400; // DOM/geometry resync

  let settings = { ...DEFAULTS };
  let button = null;
  let boundVideo = null;
  let lastTime = 0;
  let lastAdvanceAt = 0;

  const isReelsPage = () => /^\/reels(\/|$)/.test(location.pathname);

  // The reel on screen is the video closest to the viewport centre.
  // Instagram keeps preload/offscreen <video> elements around, so "first" is wrong.
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

  // Reels advance inside a snapping scroll container. Walk up from the
  // playing video until we find it; fall back to IG's own keyboard nav.
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
    const now = Date.now();
    if (now - lastAdvanceAt < ADVANCE_COOLDOWN_MS) return;
    lastAdvanceAt = now;
    advance();
  }

  // Fires ~4x/second while playing. Two end signals:
  //  - duration reached (video does not loop),
  //  - currentTime jumped backwards (IG looped the reel to 0).
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
    if (!video) return;
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("ended", onEnded);
  }

  const BUTTON_STYLE = {
    position: "fixed",
    display: "flex",
    alignItems: "center",
    padding: "7px 13px",
    borderRadius: "999px",
    border: "1px solid",
    color: "#fff",
    font: '600 12px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    cursor: "pointer",
    boxShadow: "0 4px 18px rgba(0, 0, 0, 0.45)",
    backdropFilter: "blur(8px)",
    transition: "background 0.15s ease, border-color 0.15s ease",
    userSelect: "none",
    zIndex: "2147483000",
  };

  function ensureButton() {
    if (button) return button;

    button = document.createElement("button");
    button.type = "button";
    button.id = "ig-auto-scroll-toggle";
    Object.assign(button.style, BUTTON_STYLE);

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

  // Anchored to the reel's top-right corner, clamped to the viewport.
  function positionButton() {
    const el = ensureButton();
    el.style.display = isReelsPage() ? "flex" : "none";
    if (!isReelsPage()) return;

    const pad = 10;
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    const rect = boundVideo ? boundVideo.getBoundingClientRect() : null;

    let left = window.innerWidth - width - pad;
    let top = pad;

    if (rect && rect.width > 0) {
      left = rect.right - width - pad;
      top = rect.top + pad;
    }

    left = Math.min(Math.max(left, pad), window.innerWidth - width - pad);
    top = Math.min(Math.max(top, pad), window.innerHeight - height - pad);

    el.style.left = `${Math.round(left)}px`;
    el.style.top = `${Math.round(top)}px`;
  }

  function render() {
    const el = ensureButton();
    const on = settings.enabled;
    el.textContent = `Auto-scroll ${on ? "ON" : "OFF"}`;
    el.style.background = on ? "rgba(28, 150, 88, 0.92)" : "rgba(20, 20, 22, 0.82)";
    el.style.borderColor = on ? "rgba(120, 255, 180, 0.55)" : "rgba(255, 255, 255, 0.25)";
    el.title = on
      ? "Advances when the reel ends. Click to pause."
      : "Click to start auto-scrolling.";
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
    positionButton();
  }

  chrome.storage.sync.get(DEFAULTS, (stored) => {
    settings = { ...DEFAULTS, ...stored };
    render();
    sync();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync" || !changes.enabled) return;
    settings.enabled = changes.enabled.newValue ?? DEFAULTS.enabled;
    render();
  });

  // Instagram is a SPA and re-renders the reel card freely; resync geometry
  // and the watched <video> on a cheap loop instead of chasing mutations.
  setInterval(sync, SYNC_MS);
  window.addEventListener("resize", positionButton);
})();

document.addEventListener("DOMContentLoaded", async function () {
  // Centralized application state
  const appState = {
    selectedBubble: null,
    audioContext: null,
    selectSoundBuffer: null,
    siteData: {},
    timeouts: {
      click: null,
      typewriter: null,
      modelLoad: null,
    },
  };

  // Cached DOM elements
  const elements = {
    urlDisplay: document.getElementById("url-display"),
    linksGrid: document.getElementById("links-grid"),
    bubbles: null,
  };

  await initializeApplication();

  async function initializeApplication() {
    await loadSiteData();
    initializeAudioOnFirstInteraction();
    setupBubbleElements();
    setupEventListeners();
    setTimeout(() => {
      document.getElementById("gpu-container").classList.add("loaded");
    }, 100);
  }

  async function loadSiteData() {
    try {
      const response = await fetch("SITELIST.json");
      appState.siteData = await response.json();
    } catch (error) {
      console.error("Failed to load site data:", error);
    }
  }

  // Lazy audio initialization for autoplay compliance
  function initializeAudioOnFirstInteraction() {
    document.addEventListener(
      "click",
      () => {
        if (!appState.audioContext) {
          appState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
      },
      { once: true }
    );
  }

  function setupBubbleElements() {
    elements.bubbles = document.querySelectorAll(".bubble:has(div)");
    elements.bubbles.forEach((bubble) => {
      bubble.style.cursor = "inherit";
      bubble.addEventListener("click", handleBubbleClick);
      bubble.dataset.href = bubble.href;
    });
  }

  function setupEventListeners() {
    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("keydown", handleKeyDown);

    // Prevent white flash during page navigation
    function handleNavigationStart() {
      document.body.classList.add("navigating");
    }

    function handleNavigationEnd() {
      document.body.classList.remove("navigating");
    }

    window.addEventListener("beforeunload", handleNavigationStart);
    window.addEventListener("pagehide", handleNavigationStart);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        handleNavigationStart();
      } else if (document.visibilityState === "visible") {
        handleNavigationEnd();
      }
    });
  }

  async function initializeAudioContext() {
    if (!appState.audioContext) {
      appState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (appState.audioContext.state === "suspended") {
      await appState.audioContext.resume();
    }
  }

  // Load audio once and reuse
  async function loadSelectSound() {
    if (appState.selectSoundBuffer) return;

    try {
      const response = await fetch("static/ui_select.ogg");
      const arrayBuffer = await response.arrayBuffer();
      appState.selectSoundBuffer = await appState.audioContext.decodeAudioData(arrayBuffer);
    } catch (error) {
      throw new Error("Failed to load select sound");
    }
  }

  async function playSelectSound() {
    try {
      await initializeAudioContext();
      await loadSelectSound();

      // Create new nodes for each play
      const source = appState.audioContext.createBufferSource();
      const gainNode = appState.audioContext.createGain();

      source.buffer = appState.selectSoundBuffer;
      gainNode.gain.value = 0.8;
      source.connect(gainNode);
      gainNode.connect(appState.audioContext.destination);
      source.start();
    } catch (err) {
      console.log("Audio playback failed:", err);
    }
  }

  // Match bubble links to site data
  function getSiteKeyFromBubble(bubble) {
    if (bubble.dataset.siteKey) return bubble.dataset.siteKey;

    const href = bubble.href || bubble.dataset.href;
    if (!href) return null;

    const cleanUrl = href.replace(/^https?:\/\//, "");
    return (
      Object.entries(appState.siteData).find(([key, url]) => cleanUrl.includes(url) || url.includes(cleanUrl.split("/")[0]))?.[0] || null
    );
  }

  // Check for 3D model, fallback to 2D
  async function checkModelExists(siteKey) {
    try {
      const modelPath = `/static/links/${siteKey}_model.gltf`;
      const response = await fetch(modelPath, { method: "HEAD" });
      return response.ok ? modelPath : `/static/links/${siteKey}.png`;
    } catch {
      return `/static/links/${siteKey}.png`;
    }
  }

  // Centralized timeout management
  function clearAllTimeouts() {
    Object.values(appState.timeouts).forEach((timeout) => {
      if (timeout) clearTimeout(timeout);
    });
    appState.timeouts = { click: null, typewriter: null, modelLoad: null };
  }

  function clearTypewriterEffect(shouldHide = true) {
    if (elements.urlDisplay) {
      if (shouldHide) {
        elements.urlDisplay.classList.remove("visible");
      }
      elements.urlDisplay.textContent = "";
    }
    if (appState.timeouts.typewriter) {
      clearTimeout(appState.timeouts.typewriter);
      appState.timeouts.typewriter = null;
    }
  }

  function clearAllPendingOperations(shouldHideUrlDisplay = true) {
    clearTypewriterEffect(shouldHideUrlDisplay);
    clearAllTimeouts();
    if (window.faviconDisplay) window.faviconDisplay.hide();
  }

  // Load and display 3D model with URL
  async function showModelForBubble(bubble) {
    const iconImg = bubble.querySelector(".icon img");
    if (!iconImg || !window.faviconDisplay) return;

    const siteKey = getSiteKeyFromBubble(bubble);

    if (siteKey) {
      // Small delay for cleanup
      appState.timeouts.modelLoad = setTimeout(async () => {
        if (appState.selectedBubble === bubble) {
          const modelPath = await checkModelExists(siteKey);
          window.faviconDisplay.show(modelPath);

          const url = appState.siteData[siteKey];
          if (url && appState.selectedBubble === bubble) {
            startTypewriterEffect(url, 60);
          }
        }
      }, 50);
    } else {
      // Fallback to favicon
      appState.timeouts.modelLoad = setTimeout(() => {
        if (appState.selectedBubble === bubble) {
          const faviconPath = iconImg.src;
          const relativePath = faviconPath.includes("/static/") ? faviconPath.substring(faviconPath.indexOf("/static/") + 1) : faviconPath;
          window.faviconDisplay.show(relativePath);
        }
      }, 50);
    }
  }

  async function selectBubble(bubble, hadPreviousSelection = false) {
    clearAllPendingOperations(!hadPreviousSelection);

    appState.selectedBubble = bubble;
    bubble.focus();
    playSelectSound();

    await showModelForBubble(bubble);
  }

  function clearSelection(shouldHideUrlDisplay = true) {
    if (appState.selectedBubble) {
      appState.selectedBubble.blur();
      appState.selectedBubble = null;
    }
    clearAllPendingOperations(shouldHideUrlDisplay);
  }

  function openBubbleLink(bubble) {
    const href = bubble.href || bubble.dataset.href;
    if (href && href !== "#") {
      window.open(href, "_blank", "noopener,noreferrer");
    }
  }

  // Dual-click: select then open
  function handleBubbleClick(event) {
    event.preventDefault();
    const bubble = this;

    if (appState.selectedBubble === bubble) {
      openBubbleLink(bubble);
      clearSelection();
      return;
    }

    const hadPreviousSelection = appState.selectedBubble !== null;
    clearSelection(!hadPreviousSelection);
    selectBubble(bubble, hadPreviousSelection);
  }

  function getBubblesArray() {
    if (!elements.bubbles) {
      elements.bubbles = document.querySelectorAll(".bubble:has(div)");
    }
    return Array.from(elements.bubbles);
  }

  function calculateGridColumns() {
    if (!elements.linksGrid) return 1;
    return getComputedStyle(elements.linksGrid).gridTemplateColumns.split(" ").length;
  }

  // Calculate next position in grid
  function getNextBubbleIndex(currentIndex, direction, bubblesCount, cols) {
    switch (direction) {
      case "ArrowLeft":
        return currentIndex > 0 ? currentIndex - 1 : bubblesCount - 1;
      case "ArrowRight":
        return currentIndex < bubblesCount - 1 ? currentIndex + 1 : 0;
      case "ArrowUp":
        let upIndex = currentIndex - cols;
        if (upIndex < 0) {
          upIndex = currentIndex + Math.floor((bubblesCount - 1) / cols) * cols;
          if (upIndex >= bubblesCount) upIndex -= cols;
        }
        return upIndex;
      case "ArrowDown":
        let downIndex = currentIndex + cols;
        return downIndex >= bubblesCount ? currentIndex % cols : downIndex;
      default:
        return currentIndex;
    }
  }

  // Keyboard navigation respecting grid layout
  function navigateGrid(direction) {
    const bubblesArray = getBubblesArray();
    const currentIndex = bubblesArray.indexOf(document.activeElement);

    if (currentIndex === -1) {
      if (bubblesArray[0]) selectBubble(bubblesArray[0]);
      return;
    }

    const cols = calculateGridColumns();
    const newIndex = getNextBubbleIndex(currentIndex, direction, bubblesArray.length, cols);
    const newElement = bubblesArray[newIndex];

    if (newElement) {
      const hadPreviousSelection = appState.selectedBubble !== null;
      clearSelection(!hadPreviousSelection);
      selectBubble(newElement, hadPreviousSelection);
    }
  }

  function handleDocumentClick(event) {
    if (!event.target.closest(".bubble:has(div)")) {
      clearSelection();
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      clearSelection();
    } else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
      event.preventDefault();
      navigateGrid(event.key);
    }
  }

  // Character-by-character text animation
  function startTypewriterEffect(text, speed = 50) {
    if (!elements.urlDisplay) return;

    const wasVisible = elements.urlDisplay.classList.contains("visible");
    clearTypewriterEffect(!wasVisible);

    elements.urlDisplay.textContent = "";
    elements.urlDisplay.classList.add("visible");

    let charIndex = 0;

    function typeNextCharacter() {
      if (charIndex < text.length) {
        elements.urlDisplay.textContent += text.charAt(charIndex);
        charIndex++;
        appState.timeouts.typewriter = setTimeout(typeNextCharacter, speed);
      }
    }

    // Initial delay
    appState.timeouts.typewriter = setTimeout(typeNextCharacter, 200);
  }
});

document.addEventListener("DOMContentLoaded", function () {
  let selectedBubble = null;
  let clickTimeout = null;
  let audioContext = null;

  // Audio Context
  function initAudioContext() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
  }

  // Cache for selection sound
  let selectSoundBuffer = null;
  let soundLoadingPromise = null;

  // Load and cache selection sound from file
  async function cacheSelectSound() {
    if (selectSoundBuffer) return;
    if (soundLoadingPromise) return soundLoadingPromise;

    // Start loading
    soundLoadingPromise = (async () => {
      try {
        const ctx = initAudioContext();

        // Fetch the audio file
        const response = await fetch("static/ui_select.ogg");
        const arrayBuffer = await response.arrayBuffer();

        // Decode the audio data
        selectSoundBuffer = await ctx.decodeAudioData(arrayBuffer);
      } catch (err) {
        console.log("Failed to load select sound:", err);
      } finally {
        soundLoadingPromise = null;
      }
    })();

    return soundLoadingPromise;
  }

  // Play cached selection sound
  async function playSelectSound() {
    try {
      const ctx = initAudioContext();

      // Resume audio context on first user interaction
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      // Cache sound if not already cached
      if (!selectSoundBuffer) {
        await cacheSelectSound();
      }

      // If still no buffer, skip
      if (!selectSoundBuffer) return;

      const source = ctx.createBufferSource();
      const gainNode = ctx.createGain();

      source.buffer = selectSoundBuffer;
      gainNode.gain.value = 0.8; // Set volume to 80%

      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start();
    } catch (err) {
      console.log("Audio playback failed:", err);
    }
  }

  // Get all bubbles that have content
  const bubbles = document.querySelectorAll(".bubble:has(div)");

  bubbles.forEach((bubble) => {
    // Store the original href
    const originalHref = bubble.href;

    // Keep href for accessibility and default keyboard navigation
    bubble.style.cursor = "inherit";

    bubble.addEventListener("click", function (event) {
      // Prevent default link behavior
      event.preventDefault();

      // Clear any existing timeout
      if (clickTimeout) {
        clearTimeout(clickTimeout);
        clickTimeout = null;
      }

      // If this bubble is already selected, open the link
      if (selectedBubble === this) {
        // Second click - open the link
        if (originalHref && originalHref !== "#") {
          window.open(originalHref, "_blank", "noopener,noreferrer");
        }
        // Clear selection after opening
        clearSelection();
        return;
      }

      // First click - select this bubble
      clearSelection();
      selectBubble(this);

      // Auto-deselect after 3 seconds if no second click
      clickTimeout = setTimeout(() => {
        clearSelection();
        clickTimeout = null;
      }, 3000);
    });

    // Store the original href for later use
    bubble.dataset.href = originalHref;
  });

  // Clear selection when clicking elsewhere
  document.addEventListener("click", function (event) {
    if (!event.target.closest(".bubble:has(div)")) {
      clearSelection();
    }
  });

  // Initialize audio on first user interaction
  function ensureAudioInit() {
    initAudioContext();
    document.removeEventListener("click", ensureAudioInit);
    document.removeEventListener("keydown", ensureAudioInit);
  }

  document.addEventListener("click", ensureAudioInit, { once: true });
  document.addEventListener("keydown", ensureAudioInit, { once: true });

  function selectBubble(bubble) {
    selectedBubble = bubble;
    bubble.focus();

    // Play selection sound effect
    playSelectSound().catch((err) => console.log("Sound playback failed:", err));
  }

  function clearSelection() {
    if (selectedBubble) {
      selectedBubble.blur();
      selectedBubble = null;
    }
    if (clickTimeout) {
      clearTimeout(clickTimeout);
      clickTimeout = null;
    }
  }

  // Arrow key navigation
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      clearSelection();
    } else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
      event.preventDefault();
      navigateGrid(event.key);
    }
  });

  function navigateGrid(direction) {
    const focused = document.activeElement;
    const bubblesArray = Array.from(bubbles);
    const currentIndex = bubblesArray.indexOf(focused);

    if (currentIndex === -1) {
      if (bubblesArray[0]) {
        selectBubble(bubblesArray[0]);
      }
      return;
    }

    const gridElement = document.getElementById("links-grid");
    const style = getComputedStyle(gridElement);
    const cols = style.gridTemplateColumns.split(" ").length;

    let newIndex = currentIndex;

    switch (direction) {
      case "ArrowLeft":
        newIndex = currentIndex > 0 ? currentIndex - 1 : bubblesArray.length - 1;
        break;
      case "ArrowRight":
        newIndex = currentIndex < bubblesArray.length - 1 ? currentIndex + 1 : 0;
        break;
      case "ArrowUp":
        newIndex = currentIndex - cols;
        if (newIndex < 0) newIndex = currentIndex + Math.floor((bubblesArray.length - 1) / cols) * cols;
        if (newIndex >= bubblesArray.length) newIndex -= cols;
        break;
      case "ArrowDown":
        newIndex = currentIndex + cols;
        if (newIndex >= bubblesArray.length) newIndex = currentIndex % cols;
        break;
    }

    const newElement = bubblesArray[newIndex];
    if (newElement) {
      clearSelection();
      selectBubble(newElement);
    }
  }
});

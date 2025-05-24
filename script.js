document.addEventListener("DOMContentLoaded", async function () {
  let selectedBubble = null;
  let clickTimeout = null;
  let audioContext = null;
  let selectSoundBuffer = null;
  let siteData = {};

  // Load site data and initialize
  try {
    const response = await fetch("SITELIST.json");
    siteData = await response.json();
  } catch (error) {
    console.error("Failed to load site data:", error);
  }

  // Audio setup
  async function playSelectSound() {
    try {
      if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === "suspended") await audioContext.resume();

      if (!selectSoundBuffer) {
        const response = await fetch("static/ui_select.ogg");
        const arrayBuffer = await response.arrayBuffer();
        selectSoundBuffer = await audioContext.decodeAudioData(arrayBuffer);
      }

      const source = audioContext.createBufferSource();
      const gainNode = audioContext.createGain();
      source.buffer = selectSoundBuffer;
      gainNode.gain.value = 0.8;
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      source.start();
    } catch (err) {
      console.log("Audio playback failed:", err);
    }
  }

  // Get site key from bubble
  function getSiteKey(bubble) {
    if (bubble.dataset.siteKey) return bubble.dataset.siteKey;

    const href = bubble.href || bubble.dataset.href;
    if (href) {
      const cleanUrl = href.replace(/^https?:\/\//, "");
      for (const [key, url] of Object.entries(siteData)) {
        if (cleanUrl.includes(url) || url.includes(cleanUrl.split("/")[0])) {
          return key;
        }
      }
    }
    return null;
  }

  // Check if 3D model exists and get appropriate path
  async function getModelPath(siteKey) {
    try {
      const modelPath = `/static/links/${siteKey}_model.gltf`;
      const response = await fetch(modelPath, { method: "HEAD" });
      return response.ok ? modelPath : `/static/links/${siteKey}.png`;
    } catch {
      return `/static/links/${siteKey}.png`;
    }
  }

  // Select bubble and show 3D model
  async function selectBubble(bubble) {
    selectedBubble = bubble;
    bubble.focus();
    playSelectSound();

    const iconImg = bubble.querySelector(".icon img");
    if (iconImg && window.faviconDisplay) {
      const siteKey = getSiteKey(bubble);
      if (siteKey) {
        const modelPath = await getModelPath(siteKey);
        window.faviconDisplay.show(modelPath);
      } else {
        const faviconPath = iconImg.src;
        const relativePath = faviconPath.includes("/static/") ? faviconPath.substring(faviconPath.indexOf("/static/") + 1) : faviconPath;
        window.faviconDisplay.show(relativePath);
      }
    }
  }

  // Clear selection
  function clearSelection() {
    if (selectedBubble) {
      selectedBubble.blur();
      selectedBubble = null;
    }
    if (clickTimeout) {
      clearTimeout(clickTimeout);
      clickTimeout = null;
    }
    if (window.faviconDisplay) window.faviconDisplay.hide();
  }

  // Handle bubble clicks
  function handleBubbleClick(event) {
    event.preventDefault();
    const bubble = this;

    if (selectedBubble === bubble) {
      // Second click - open link
      const href = bubble.href || bubble.dataset.href;
      if (href && href !== "#") window.open(href, "_blank", "noopener,noreferrer");
      clearSelection();
      return;
    }

    // First click - select bubble
    clearSelection();
    selectBubble(bubble);
  }

  // Grid navigation
  function navigateGrid(direction) {
    const bubbles = document.querySelectorAll(".bubble:has(div)");
    const bubblesArray = Array.from(bubbles);
    const currentIndex = bubblesArray.indexOf(document.activeElement);

    if (currentIndex === -1) {
      if (bubblesArray[0]) selectBubble(bubblesArray[0]);
      return;
    }

    const gridElement = document.getElementById("links-grid");
    const cols = getComputedStyle(gridElement).gridTemplateColumns.split(" ").length;
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

  // Event listeners
  document.querySelectorAll(".bubble:has(div)").forEach((bubble) => {
    bubble.style.cursor = "inherit";
    bubble.addEventListener("click", handleBubbleClick);
    bubble.dataset.href = bubble.href;
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".bubble:has(div)")) clearSelection();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      clearSelection();
    } else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
      event.preventDefault();
      navigateGrid(event.key);
    }
  });

  // Initialize audio context on first interaction
  document.addEventListener(
    "click",
    () => {
      if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    },
    { once: true }
  );
});

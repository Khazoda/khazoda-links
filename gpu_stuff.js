import * as THREE from "three";

const containerRef = document.getElementById("gpu-container");
const linksContainerRef = document.getElementById("links-container");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(linksContainerRef.clientWidth, linksContainerRef.clientHeight);
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
containerRef.appendChild(renderer.domElement);

let currentModel = null;

camera.position.z = 6;

function createGeometryFromImage(imagePath) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = img.width;
      canvas.height = img.height;

      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      const getAlpha = (x, y) => {
        if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return 0;
        return data[(y * canvas.width + x) * 4 + 3];
      };

      const getSmoothPosition = (x, y, baseX, baseY) => {
        const centerAlpha = getAlpha(x, y);
        if (centerAlpha <= 64) return [baseX, baseY];

        const samples = [
          [-1, -1],
          [0, -1],
          [1, -1],
          [-1, 0],
          [1, 0],
          [-1, 1],
          [0, 1],
          [1, 1],
        ];

        let weightedX = 0;
        let weightedY = 0;
        let totalWeight = 0;

        for (const [dx, dy] of samples) {
          const sampleAlpha = getAlpha(x + dx, y + dy);
          const weight = sampleAlpha / 255.0;

          if (weight > 0.25) {
            weightedX += (x + dx) * weight;
            weightedY += (y + dy) * weight;
            totalWeight += weight;
          }
        }

        if (totalWeight > 0) {
          const smoothingFactor = 0.4;
          const smoothX = (x + (weightedX / totalWeight - x) * smoothingFactor - canvas.width / 2) * scale;
          const smoothY = (canvas.height - 1 - (y + (weightedY / totalWeight - y) * smoothingFactor) - canvas.height / 2) * scale;
          return [smoothX, smoothY];
        }

        return [baseX, baseY];
      };

      const geometry = new THREE.BufferGeometry();
      const vertices = [];
      const indices = [];
      const colors = [];

      const scale = 0.08;
      const depth = 0.4;

      let vertexIndex = 0;

      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const pixelIndex = (y * canvas.width + x) * 4;
          const alpha = data[pixelIndex + 3];

          if (alpha > 64) {
            const r = data[pixelIndex] / 255;
            const g = data[pixelIndex + 1] / 255;
            const b = data[pixelIndex + 2] / 255;

            const px = (x - canvas.width / 2) * scale;
            const py = (canvas.height - 1 - y - canvas.height / 2) * scale;

            const [smoothX, smoothY] = getSmoothPosition(x, y, px, py);

            const halfScale = scale / 2;
            const halfDepth = depth / 2;

            const cubeVertices = [
              smoothX - halfScale,
              smoothY + halfScale,
              halfDepth,
              smoothX + halfScale,
              smoothY + halfScale,
              halfDepth,
              smoothX + halfScale,
              smoothY - halfScale,
              halfDepth,
              smoothX - halfScale,
              smoothY - halfScale,
              halfDepth,

              smoothX - halfScale,
              smoothY + halfScale,
              -halfDepth,
              smoothX + halfScale,
              smoothY + halfScale,
              -halfDepth,
              smoothX + halfScale,
              smoothY - halfScale,
              -halfDepth,
              smoothX - halfScale,
              smoothY - halfScale,
              -halfDepth,
            ];

            vertices.push(...cubeVertices);

            for (let i = 0; i < 8; i++) {
              colors.push(r, g, b);
            }

            const baseIdx = vertexIndex * 8;

            indices.push(baseIdx + 0, baseIdx + 1, baseIdx + 2, baseIdx + 0, baseIdx + 2, baseIdx + 3);
            indices.push(baseIdx + 4, baseIdx + 6, baseIdx + 5, baseIdx + 4, baseIdx + 7, baseIdx + 6);
            indices.push(baseIdx + 0, baseIdx + 4, baseIdx + 5, baseIdx + 0, baseIdx + 5, baseIdx + 1);
            indices.push(baseIdx + 3, baseIdx + 2, baseIdx + 6, baseIdx + 3, baseIdx + 6, baseIdx + 7);
            indices.push(baseIdx + 0, baseIdx + 3, baseIdx + 7, baseIdx + 0, baseIdx + 7, baseIdx + 4);
            indices.push(baseIdx + 1, baseIdx + 5, baseIdx + 6, baseIdx + 1, baseIdx + 6, baseIdx + 2);

            vertexIndex++;
          }
        }
      }

      geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();

      resolve(geometry);
    };

    img.src = imagePath;
  });
}

let isVisible = false;
let targetScale = 0;
let currentScale = 0;

function animate() {
  requestAnimationFrame(animate);
  const time = Date.now() * 0.001;

  currentScale += (targetScale - currentScale) * 0.1;

  if (currentModel) {
    currentModel.scale.setScalar(currentScale);

    if (isVisible) {
      currentModel.rotation.x = Math.sin(time * 0.5) * 0.1;
      currentModel.rotation.y += 0.01;
      currentModel.rotation.z = Math.cos(time * 0.7) * 0.05;
    }
  }

  renderer.render(scene, camera);
}

async function showFavicon(imagePath = "static/bluesky.png") {
  if (currentModel) {
    scene.remove(currentModel);
    currentModel.geometry?.dispose();
    currentModel.material?.dispose();
  }

  try {
    const geometry = await createGeometryFromImage(imagePath);

    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: false,
    });

    currentModel = new THREE.Mesh(geometry, material);
    scene.add(currentModel);

    isVisible = true;
    targetScale = 1;
  } catch (error) {
    console.error("Failed to create 3D favicon:", error);
  }
}

function hideFavicon() {
  isVisible = false;
  targetScale = 0;
}

window.faviconDisplay = {
  show: showFavicon,
  hide: hideFavicon,
};

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();

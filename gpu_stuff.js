import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { TAARenderPass } from "three/addons/postprocessing/TAARenderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const containerRef = document.getElementById("gpu-container");
const linksContainerRef = document.getElementById("links-container");

requestAnimationFrame(() => {
  initScene();
});

function initScene() {
  const scene = new THREE.Scene();

  const containerWidth = containerRef.clientWidth || linksContainerRef.clientWidth;
  const containerHeight = containerRef.clientHeight || linksContainerRef.clientHeight;
  const camera = new THREE.PerspectiveCamera(75, containerWidth / containerHeight, 0.1, 1000);

  const renderer = new THREE.WebGLRenderer({
    antialias: false, // TRAA handles all antialiasing
    alpha: true,
    powerPreference: "high-performance",
    stencil: false,
    depth: true,
  });
  renderer.setSize(containerWidth, containerHeight);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

  containerRef.appendChild(renderer.domElement);

  // Setup post-processing
  const composer = new EffectComposer(renderer);
  composer.setSize(containerWidth, containerHeight);

  // Basic render pass
  const renderPass = new RenderPass(scene, camera);
  renderPass.clearAlpha = 0; // Ensure transparent background
  composer.addPass(renderPass);

  // TRAA - Temporal Reprojection Anti-Aliasing
  const taaRenderPass = new TAARenderPass(scene, camera);
  taaRenderPass.sampleLevel = 2;
  taaRenderPass.unbiased = false;
  composer.addPass(taaRenderPass);

  // Output pass for proper color space
  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  const ambientLight = new THREE.AmbientLight(0xf4f1eb, 2.8);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xfff4e6, 2.2);
  directionalLight.position.set(-3, 4, 5);
  scene.add(directionalLight);
  const directionalLight2 = new THREE.DirectionalLight(0xe6f3ff, 1.0);
  directionalLight2.position.set(3, -2, 4);
  scene.add(directionalLight2);
  const rimLight = new THREE.DirectionalLight(0xd6e8ff, 0.6);
  rimLight.position.set(2, -3, -4);
  scene.add(rimLight);

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

  function loadGLTFModel(modelPath) {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();

      loader.load(
        modelPath,
        (gltf) => {
          const model = gltf.scene;

          // Create a group to properly handle pivot issues
          const group = new THREE.Group();

          // Scale and center the model appropriately
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDimension = Math.max(size.x, size.y, size.z);
          const scale = 1 / maxDimension;
          model.scale.setScalar(scale);

          // Center the model within the group
          model.position.sub(center.multiplyScalar(scale));

          // Rotate model 90 degrees around Y axis as gltfs are loaded backwards, so it rotates into view, not out
          model.rotation.y = -Math.PI / 1.5;

          group.add(model);

          resolve(group);
        },
        (progress) => {},
        (error) => {
          console.error("Error loading GLTF model:", error);
          reject(error);
        }
      );
    });
  }

  let isVisible = false;
  let targetScale = 0;
  let currentScale = 0;
  let rotationSpeed = 0.005;

  // Simple easing function
  function easeOut(t) {
    return 1 - (1 - t) * (1 - t) * (1 - t);
  }

  function animate() {
    requestAnimationFrame(animate);
    const time = Date.now() * 0.001;

    // Smooth scale transition with easing
    const scaleDiff = targetScale - currentScale;
    const easingSpeed = Math.abs(scaleDiff) > 0.1 ? 0.08 : 0.05;
    currentScale += scaleDiff * easeOut(easingSpeed);

    if (currentModel) {
      currentModel.scale.setScalar(currentScale);

      if (isVisible) {
        // Get current Y rotation to determine camera facing
        const normalizedY = ((currentModel.rotation.y % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

        // Calculate speed based on angle - gradual transition using cosine
        // When facing camera (0 or 2π), cos = 1, when back to camera (π), cos = -1
        const facingFactor = Math.cos(normalizedY);
        // Map from [-1, 1] to [0.007, 0.002] - slow when facing, fast when back is turned
        const targetSpeed = 0.0045 + facingFactor * -0.0025;

        // Very smooth speed transition
        rotationSpeed += (targetSpeed - rotationSpeed) * 0.03;

        // Enhanced pitch with multiple wave layers
        currentModel.rotation.x = Math.sin(time * 0.3) * 0.06 + Math.cos(time * 0.8) * 0.03 + Math.sin(time * 1.2) * 0.015;

        // Main rotation with smooth speed and subtle variation
        currentModel.rotation.y -= rotationSpeed + Math.sin(time * 0.4) * 0.0005;

        // Enhanced roll with multiple wave layers
        currentModel.rotation.z = Math.cos(time * 0.5) * 0.035 + Math.sin(time * 0.9) * 0.02 + Math.cos(time * 1.1) * 0.01;
      }
    }

    composer.render();
  }

  async function showModel(modelPath = "static/bluesky.png") {
    let currentRotation = currentModel?.rotation || { x: 0, y: 0, z: 0 };

    if (currentModel) {
      scene.remove(currentModel);
      if (currentModel.geometry?.dispose) {
        currentModel.geometry.dispose();
      }
      if (currentModel.material?.dispose) {
        currentModel.material.dispose();
      }
      // Clean up GLTF models
      if (currentModel.traverse) {
        currentModel.traverse((child) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((material) => material.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      }
    }

    try {
      // Determine file type and handle accordingly
      const isGLTF = modelPath.toLowerCase().endsWith(".gltf") || modelPath.toLowerCase().endsWith(".glb");

      if (isGLTF) {
        // Load GLTF model
        currentModel = await loadGLTFModel(modelPath);
        scene.add(currentModel);
      } else {
        // Handle PNG files (convert to cube geometry)
        const geometry = await createGeometryFromImage(modelPath);
        const material = new THREE.MeshBasicMaterial({
          vertexColors: true,
          transparent: false,
        });
        currentModel = new THREE.Mesh(geometry, material);
        scene.add(currentModel);
      }

      isVisible = true;
      targetScale = isGLTF ? 7 : 1; // Bigger scale only for GLTF models
      currentScale = 0; // Start from 0 to animate scale-in
      currentModel.rotation.set(currentRotation.x, currentRotation.y, currentRotation.z);
      rotationSpeed = 0.005; // Reset rotation speed for smooth start
    } catch (error) {
      console.error("Failed to create 3D model:", error);
    }
  }

  function hideModel() {
    isVisible = false;
    targetScale = 0;
  }

  window.faviconDisplay = {
    show: showModel,
    hide: hideModel,
  };

  animate();
}

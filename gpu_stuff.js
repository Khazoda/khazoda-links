import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { TAARenderPass } from "three/addons/postprocessing/TAARenderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const containerRef = document.getElementById("gpu-container");
const linksContainerRef = document.getElementById("links-container");

requestAnimationFrame(initScene);

function initScene() {
  const sceneConfig = createSceneConfiguration();
  const { scene, camera, renderer, composer } = sceneConfig;

  setupLighting(scene);

  // Centralized model state
  const modelState = {
    current: null,
    isVisible: false,
    targetScale: 0,
    currentScale: 0,
    rotationSpeed: 0.005,
    gltfLoader: new GLTFLoader(), // Reuse loader instance
  };

  camera.position.z = 6;

  function createSceneConfiguration() {
    const scene = new THREE.Scene();
    const containerWidth = containerRef.clientWidth || linksContainerRef.clientWidth;
    const containerHeight = containerRef.clientHeight || linksContainerRef.clientHeight;
    const camera = new THREE.PerspectiveCamera(75, containerWidth / containerHeight, 0.1, 1000);

    // High-performance renderer settings
    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      powerPreference: "high-performance",
      stencil: false,
      depth: true,
    });

    renderer.setSize(containerWidth, containerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    containerRef.appendChild(renderer.domElement);

    // Post-processing pipeline
    const composer = new EffectComposer(renderer);
    composer.setSize(containerWidth, containerHeight);

    const renderPass = new RenderPass(scene, camera);
    renderPass.clearAlpha = 0;
    composer.addPass(renderPass);

    // Temporal Anti-Aliasing
    const taaRenderPass = new TAARenderPass(scene, camera);
    taaRenderPass.sampleLevel = 2;
    taaRenderPass.unbiased = false;
    composer.addPass(taaRenderPass);

    composer.addPass(new OutputPass());

    return { scene, camera, renderer, composer };
  }

  function setupLighting(scene) {
    // Warm ambient lighting
    scene.add(new THREE.AmbientLight(0xf4f1eb, 2.8));

    // Main directional light with shadows
    const directionalLight = new THREE.DirectionalLight(0xfff4e6, 2.5);
    directionalLight.position.set(-3, 4, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.setScalar(1024);
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 20;
    directionalLight.shadow.camera.left = directionalLight.shadow.camera.bottom = -5;
    directionalLight.shadow.camera.right = directionalLight.shadow.camera.top = 5;
    directionalLight.shadow.bias = -0.0001;
    directionalLight.shadow.radius = 4;
    scene.add(directionalLight);
  }

  function enableShadowsForModel(object) {
    object.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = child.receiveShadow = true;
      }
    });
  }

  // Resource cleanup to prevent memory leaks
  function disposeModelResources(model) {
    if (!model) return;

    const disposeResource = (resource) => {
      if (resource?.dispose) resource.dispose();
    };

    if (model.traverse) {
      model.traverse((child) => {
        disposeResource(child.geometry);
        if (Array.isArray(child.material)) {
          child.material.forEach(disposeResource);
        } else {
          disposeResource(child.material);
        }
      });
    } else {
      disposeResource(model.geometry);
      disposeResource(model.material);
    }
  }

  // Convert 2D images into 3D voxel art
  function createVoxelGeometryFromImage(imagePath) {
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
        const geometry = processImageDataToGeometry(imageData, canvas.width, canvas.height);
        resolve(geometry);
      };

      img.src = imagePath;
    });
  }

  // Generate cube geometry for each visible pixel
  function processImageDataToGeometry(imageData, width, height) {
    const data = imageData.data;
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const indices = [];
    const colors = [];
    const scale = 0.08;
    const depth = 0.4;
    let vertexIndex = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixelIndex = (y * width + x) * 4;
        const alpha = data[pixelIndex + 3];

        // Only create geometry for non-transparent pixels
        if (alpha > 64) {
          const voxelData = createVoxelAtPosition(x, y, width, height, scale, depth, data, pixelIndex);
          vertices.push(...voxelData.vertices);
          colors.push(...voxelData.colors);

          const baseIdx = vertexIndex * 8;
          const cubeIndices = generateCubeIndices(baseIdx);
          indices.push(...cubeIndices);

          vertexIndex++;
        }
      }
    }

    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  // Create cube at image coordinate
  function createVoxelAtPosition(x, y, width, height, scale, depth, data, pixelIndex) {
    const r = data[pixelIndex] / 255;
    const g = data[pixelIndex + 1] / 255;
    const b = data[pixelIndex + 2] / 255;

    // Convert 2D coordinates to 3D space
    const px = (x - width / 2) * scale;
    const py = (height - 1 - y - height / 2) * scale;
    const halfScale = scale / 2;
    const halfDepth = depth / 2;

    // 8 vertices for cube
    const vertices = [
      px - halfScale,
      py + halfScale,
      halfDepth,
      px + halfScale,
      py + halfScale,
      halfDepth,
      px + halfScale,
      py - halfScale,
      halfDepth,
      px - halfScale,
      py - halfScale,
      halfDepth,
      px - halfScale,
      py + halfScale,
      -halfDepth,
      px + halfScale,
      py + halfScale,
      -halfDepth,
      px + halfScale,
      py - halfScale,
      -halfDepth,
      px - halfScale,
      py - halfScale,
      -halfDepth,
    ];

    const colors = Array(8)
      .fill()
      .flatMap(() => [r, g, b]);

    return { vertices, colors };
  }

  // Triangle indices for cube faces
  function generateCubeIndices(baseIdx) {
    const faces = [
      [0, 1, 2, 0, 2, 3], // front
      [4, 6, 5, 4, 7, 6], // back
      [0, 4, 5, 0, 5, 1], // top
      [3, 2, 6, 3, 6, 7], // bottom
      [0, 3, 7, 0, 7, 4], // left
      [1, 5, 6, 1, 6, 2], // right
    ];

    return faces.flat().map((v) => baseIdx + v);
  }

  function loadGLTFModel(modelPath) {
    return new Promise((resolve, reject) => {
      modelState.gltfLoader.load(
        modelPath,
        (gltf) => {
          const model = gltf.scene;
          const group = new THREE.Group();

          // Normalize model size and center
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const scale = 1 / Math.max(size.x, size.y, size.z);

          model.scale.setScalar(scale);
          model.position.sub(center.multiplyScalar(scale));
          model.rotation.y = -Math.PI / 1.5;

          group.add(model);
          enableShadowsForModel(group);
          resolve(group);
        },
        undefined,
        reject
      );
    });
  }

  // Dynamic rotation based on current orientation
  function updateModelAnimation(time) {
    if (!modelState.current || !modelState.isVisible) return;

    // Adjust rotation speed based on facing direction
    const normalizedY = ((modelState.current.rotation.y % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const facingFactor = Math.cos(normalizedY);
    const targetSpeed = 0.0045 + facingFactor * -0.0025;
    modelState.rotationSpeed += (targetSpeed - modelState.rotationSpeed) * 0.03;

    // Floating animation with multiple sine waves
    modelState.current.rotation.x = Math.sin(time * 0.3) * 0.06 + Math.cos(time * 0.8) * 0.03;
    modelState.current.rotation.y -= modelState.rotationSpeed + Math.sin(time * 0.4) * 0.0005;
    modelState.current.rotation.z = Math.cos(time * 0.5) * 0.035 + Math.sin(time * 0.9) * 0.02;
  }

  // Smooth scale transitions with easing
  function updateModelScale() {
    const scaleDiff = modelState.targetScale - modelState.currentScale;
    const easingSpeed = Math.abs(scaleDiff) > 0.1 ? 0.08 : 0.05;
    const easeOut = (t) => 1 - (1 - t) ** 3;

    modelState.currentScale += scaleDiff * easeOut(easingSpeed);

    if (modelState.current) {
      modelState.current.scale.setScalar(modelState.currentScale);
    }
  }

  function animate() {
    requestAnimationFrame(animate);
    const time = Date.now() * 0.001;

    updateModelScale();
    updateModelAnimation(time);
    composer.render();
  }

  // Display GLTF models or voxel art from images
  async function showModel(modelPath = "static/bluesky.png") {
    const currentRotation = modelState.current?.rotation || { x: 0, y: 0, z: 0 };

    // Clean up previous model
    if (modelState.current) {
      scene.remove(modelState.current);
      disposeModelResources(modelState.current);
    }

    try {
      const isGLTF = /\.(gltf|glb)$/i.test(modelPath);

      if (isGLTF) {
        modelState.current = await loadGLTFModel(modelPath);
      } else {
        // Convert 2D image to 3D voxels
        const geometry = await createVoxelGeometryFromImage(modelPath);
        const material = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: false });
        modelState.current = new THREE.Mesh(geometry, material);
      }

      scene.add(modelState.current);
      modelState.isVisible = true;
      modelState.targetScale = isGLTF ? 7 : 1;
      modelState.currentScale = 0;
      modelState.current.rotation.set(currentRotation.x, currentRotation.y, currentRotation.z);
      modelState.rotationSpeed = 0.005;
    } catch (error) {
      console.error("Failed to create 3D model:", error);
    }
  }

  function hideModel() {
    modelState.isVisible = false;
    modelState.targetScale = 0;
  }

  // External API
  window.faviconDisplay = { show: showModel, hide: hideModel };
  animate();
}

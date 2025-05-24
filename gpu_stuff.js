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
  const scene = new THREE.Scene();
  const containerWidth = containerRef.clientWidth || linksContainerRef.clientWidth;
  const containerHeight = containerRef.clientHeight || linksContainerRef.clientHeight;
  const camera = new THREE.PerspectiveCamera(75, containerWidth / containerHeight, 0.1, 1000);

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

  // Post-processing setup
  const composer = new EffectComposer(renderer);
  composer.setSize(containerWidth, containerHeight);

  const renderPass = new RenderPass(scene, camera);
  renderPass.clearAlpha = 0;
  composer.addPass(renderPass);

  const taaRenderPass = new TAARenderPass(scene, camera);
  taaRenderPass.sampleLevel = 2;
  taaRenderPass.unbiased = false;
  composer.addPass(taaRenderPass);

  composer.addPass(new OutputPass());

  // Simplified lighting - just 2 lights instead of 4
  scene.add(new THREE.AmbientLight(0xf4f1eb, 2.8));

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

  // Configure shadows for GLTF models
  function configureSelfShadows(object) {
    object.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = child.receiveShadow = true;
      }
    });
  }

  let currentModel = null;
  let isVisible = false;
  let targetScale = 0;
  let currentScale = 0;
  let rotationSpeed = 0.005;

  camera.position.z = 6;

  // Simplified image to geometry conversion
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
              const halfScale = scale / 2;
              const halfDepth = depth / 2;

              // Simplified cube vertices
              const cubeVertices = [
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

              vertices.push(...cubeVertices);
              for (let i = 0; i < 8; i++) colors.push(r, g, b);

              const baseIdx = vertexIndex * 8;
              // Cube faces
              const faces = [
                [0, 1, 2, 0, 2, 3], // front
                [4, 6, 5, 4, 7, 6], // back
                [0, 4, 5, 0, 5, 1], // top
                [3, 2, 6, 3, 6, 7], // bottom
                [0, 3, 7, 0, 7, 4], // left
                [1, 5, 6, 1, 6, 2], // right
              ];

              for (const face of faces) {
                indices.push(...face.map((v) => baseIdx + v));
              }

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
          const group = new THREE.Group();

          // Scale and center the model
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const scale = 1 / Math.max(size.x, size.y, size.z);

          model.scale.setScalar(scale);
          model.position.sub(center.multiplyScalar(scale));
          model.rotation.y = -Math.PI / 1.5;

          group.add(model);
          configureSelfShadows(group);
          resolve(group);
        },
        undefined,
        (error) => {
          console.error("Error loading GLTF model:", error);
          reject(error);
        }
      );
    });
  }

  // Simplified easing
  const easeOut = (t) => 1 - (1 - t) ** 3;

  function animate() {
    requestAnimationFrame(animate);
    const time = Date.now() * 0.001;

    // Smooth scale transition
    const scaleDiff = targetScale - currentScale;
    const easingSpeed = Math.abs(scaleDiff) > 0.1 ? 0.08 : 0.05;
    currentScale += scaleDiff * easeOut(easingSpeed);

    if (currentModel) {
      currentModel.scale.setScalar(currentScale);

      if (isVisible) {
        // Simplified rotation speed calculation
        const normalizedY = ((currentModel.rotation.y % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const facingFactor = Math.cos(normalizedY);
        const targetSpeed = 0.0045 + facingFactor * -0.0025;
        rotationSpeed += (targetSpeed - rotationSpeed) * 0.03;

        // Simplified floating animation
        currentModel.rotation.x = Math.sin(time * 0.3) * 0.06 + Math.cos(time * 0.8) * 0.03;
        currentModel.rotation.y -= rotationSpeed + Math.sin(time * 0.4) * 0.0005;
        currentModel.rotation.z = Math.cos(time * 0.5) * 0.035 + Math.sin(time * 0.9) * 0.02;
      }
    }

    composer.render();
  }

  async function showModel(modelPath = "static/bluesky.png") {
    const currentRotation = currentModel?.rotation || { x: 0, y: 0, z: 0 };

    // Clean up previous model
    if (currentModel) {
      scene.remove(currentModel);
      if (currentModel.geometry?.dispose) currentModel.geometry.dispose();
      if (currentModel.material?.dispose) currentModel.material.dispose();
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
      const isGLTF = /\.(gltf|glb)$/i.test(modelPath);

      if (isGLTF) {
        currentModel = await loadGLTFModel(modelPath);
      } else {
        const geometry = await createGeometryFromImage(modelPath);
        const material = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: false });
        currentModel = new THREE.Mesh(geometry, material);
      }

      scene.add(currentModel);
      isVisible = true;
      targetScale = isGLTF ? 7 : 1;
      currentScale = 0;
      currentModel.rotation.set(currentRotation.x, currentRotation.y, currentRotation.z);
      rotationSpeed = 0.005;
    } catch (error) {
      console.error("Failed to create 3D model:", error);
    }
  }

  function hideModel() {
    isVisible = false;
    targetScale = 0;
  }

  window.faviconDisplay = { show: showModel, hide: hideModel };
  animate();
}

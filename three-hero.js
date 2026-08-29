// Three.js 3D Hero Scene for CoPC Website
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!prefersReducedMotion) {
  initThreeHero();
}

function initThreeHero() {
  const container = document.getElementById('three-container');
  if (!container) return;

  // Scene setup
  const scene = new THREE.Scene();
  
  // Camera
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 5;

  // Renderer
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
  } catch (err) {
    console.warn('WebGL not supported, skipping 3D hero.', err);
    return;
  }
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  // ============================================
  // 3D Objects
  // ============================================

  // Main floating geometric shape - Torus Knot (code-like, infinite loop)
  const knotGeometry = new THREE.TorusKnotGeometry(1.2, 0.35, 120, 16);
  const knotMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x00f0ff,
    metalness: 0.8,
    roughness: 0.2,
    transmission: 0.3,
    thickness: 0.5,
    ior: 1.5,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    side: THREE.DoubleSide
  });
  const torusKnot = new THREE.Mesh(knotGeometry, knotMaterial);
  scene.add(torusKnot);

  // Inner glow core
  const coreGeometry = new THREE.SphereGeometry(0.5, 32, 32);
  const coreMaterial = new THREE.MeshBasicMaterial({
    color: 0x8b5cf6,
    transparent: true,
    opacity: 0.4,
    side: THREE.BackSide
  });
  const core = new THREE.Mesh(coreGeometry, coreMaterial);
  scene.add(core);

  // Floating code particles around the knot
  const particleCount = 300;
  const particleGeometry = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particleCount * 3);
  const particleColors = new Float32Array(particleCount * 3);
  const particleVelocities = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    const radius = 2 + Math.random() * 3;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    particlePositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    particlePositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    particlePositions[i * 3 + 2] = radius * Math.cos(phi);
    
    // Cyan to purple gradient
    const color = new THREE.Color();
    color.setHSL(0.55 + Math.random() * 0.15, 1, 0.5 + Math.random() * 0.3);
    particleColors[i * 3] = color.r;
    particleColors[i * 3 + 1] = color.g;
    particleColors[i * 3 + 2] = color.b;

    // Random velocity for floating
    particleVelocities[i * 3] = (Math.random() - 0.5) * 0.002;
    particleVelocities[i * 3 + 1] = (Math.random() - 0.5) * 0.002;
    particleVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.002;
  }

  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

  const particleMaterial = new THREE.PointsMaterial({
    size: 0.04,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);

  // Wireframe cube grid (background structure)
  const gridGroup = new THREE.Group();
  const gridSize = 8;
  const gridDivisions = 8;
  const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x00f0ff, 0x8b5cf6);
  gridHelper.material.opacity = 0.1;
  gridHelper.material.transparent = true;
  gridHelper.material.depthWrite = false;
  gridHelper.position.y = -3;
  gridGroup.add(gridHelper);
  
  // Rotating wireframe cubes
  const cubeCount = 5;
  const cubes = [];
  for (let i = 0; i < cubeCount; i++) {
    const size = 0.3 + Math.random() * 0.4;
    const cubeGeo = new THREE.BoxGeometry(size, size, size);
    const cubeMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(0.55 + Math.random() * 0.15, 1, 0.5),
      wireframe: true,
      transparent: true,
      opacity: 0.3
    });
    const cube = new THREE.Mesh(cubeGeo, cubeMat);
    cube.position.set(
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10
    );
    cube.userData = {
      baseX: cube.position.x,
      baseY: cube.position.y,
      rotSpeed: {
        x: (Math.random() - 0.5) * 0.01,
        y: (Math.random() - 0.5) * 0.01,
        z: (Math.random() - 0.5) * 0.01
      },
      floatOffset: Math.random() * Math.PI * 2,
      floatSpeed: 0.4 + Math.random() * 0.8
    };
    cubes.push(cube);
    gridGroup.add(cube);
  }
  scene.add(gridGroup);

  // ============================================
  // Lighting
  // ============================================
  // Environment map so the metallic knot has something to reflect
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const pointLight1 = new THREE.PointLight(0x00f0ff, 6, 30);
  pointLight1.position.set(3, 3, 3);
  scene.add(pointLight1);

  const pointLight2 = new THREE.PointLight(0x8b5cf6, 6, 30);
  pointLight2.position.set(-3, -2, 2);
  scene.add(pointLight2);

  const pointLight3 = new THREE.PointLight(0xff00ff, 3, 30);
  pointLight3.position.set(0, 4, -3);
  scene.add(pointLight3);

  // ============================================
  // Mouse Interaction
  // ============================================
  let mouseX = 0;
  let mouseY = 0;
  let targetX = 0;
  let targetY = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
  }, { passive: true });

  // Touch support
  document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      mouseX = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
      mouseY = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
    }
  }, { passive: true });

  // ============================================
  // Scroll Parallax
  // ============================================
  let scrollY = 0;
  window.addEventListener('scroll', () => {
    scrollY = window.scrollY;
  }, { passive: true });

  // ============================================
  // Animation Loop
  // ============================================
  let time = 0;
  let heroVisible = true;

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      heroVisible = entries[0].isIntersecting;
    }, { threshold: 0 }).observe(container);
  }

  function animate() {
    requestAnimationFrame(animate);

    // Skip all work (and rendering) when the hero is off-screen or the tab is hidden
    if (!heroVisible || document.hidden) return;

    time += 0.01;

    // Smooth mouse follow
    targetX += (mouseX - targetX) * 0.05;
    targetY += (mouseY - targetY) * 0.05;

    // Torus knot rotation
    torusKnot.rotation.x += 0.003;
    torusKnot.rotation.y += 0.005;
    torusKnot.rotation.z += 0.002;

    // Mouse influence on knot
    torusKnot.rotation.x += targetY * 0.1;
    torusKnot.rotation.y += targetX * 0.1;

    // Core pulse
    const pulseScale = 1 + Math.sin(time * 2) * 0.1;
    core.scale.setScalar(pulseScale);
    core.rotation.y += 0.002;

    // Particles floating
    const positions = particleGeometry.attributes.position.array;
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] += particleVelocities[i * 3];
      positions[i * 3 + 1] += particleVelocities[i * 3 + 1];
      positions[i * 3 + 2] += particleVelocities[i * 3 + 2];

      // Wrap around
      const dist = Math.sqrt(
        positions[i * 3] ** 2 + 
        positions[i * 3 + 1] ** 2 + 
        positions[i * 3 + 2] ** 2
      );
      if (dist > 6) {
        // Reset to opposite side
        positions[i * 3] *= -0.5;
        positions[i * 3 + 1] *= -0.5;
        positions[i * 3 + 2] *= -0.5;
      }
    }
    particleGeometry.attributes.position.needsUpdate = true;

    // Rotate particle system slowly
    particles.rotation.y += 0.0002;
    particles.rotation.x += 0.0001;

    // Floating cubes (oscillate around their stored start position, no drift)
    cubes.forEach((cube) => {
      cube.rotation.x += cube.userData.rotSpeed.x;
      cube.rotation.y += cube.userData.rotSpeed.y;
      cube.rotation.z += cube.userData.rotSpeed.z;

      const floatPhase = time * cube.userData.floatSpeed + cube.userData.floatOffset;
      cube.position.y = cube.userData.baseY + Math.sin(floatPhase) * 0.5;
      cube.position.x = cube.userData.baseX + Math.cos(floatPhase) * 0.3;
    });

    // Grid group slow rotation
    gridGroup.rotation.y += 0.0001;

    // Camera parallax based on mouse
    camera.position.x += (targetX * 0.5 - camera.position.x) * 0.02;
    camera.position.y += (targetY * 0.5 - camera.position.y) * 0.02;

    // Scroll parallax
    camera.position.z = 5 + scrollY * 0.0005;

    // Camera always looks at center
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }

  animate();

  // ============================================
  // Resize Handler
  // ============================================
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }, { passive: true });

  // ============================================
  // Cleanup on page unload
  // ============================================
  window.addEventListener('beforeunload', () => {
    renderer.dispose();
    knotGeometry.dispose();
    knotMaterial.dispose();
    coreGeometry.dispose();
    coreMaterial.dispose();
    particleGeometry.dispose();
    particleMaterial.dispose();
    gridHelper.geometry.dispose();
    gridHelper.material.dispose();
    cubes.forEach(cube => {
      cube.geometry.dispose();
      cube.material.dispose();
    });
  });
}
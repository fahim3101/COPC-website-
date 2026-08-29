// Global 3D background scene for the entire CoPC site (navbar -> footer)
// Renders a fixed, full-viewport WebGL canvas behind all content, giving the
// whole page consistent depth: a hero "crystal" focal object, real extruded
// 3D text, plus an ambient field of drifting shapes and particles that react
// to scroll & pointer.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!prefersReducedMotion) initGlobalScene();

function initGlobalScene() {
  const canvas = document.getElementById('bg-3d');
  if (!canvas) return;

  // ----------------------------------------------------------------
  // Renderer (uses the existing fixed canvas)
  // ----------------------------------------------------------------
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
  } catch (err) {
    console.warn('WebGL not supported, skipping 3D background.', err);
    return;
  }
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  // ----------------------------------------------------------------
  // Scene & Camera
  // ----------------------------------------------------------------
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0a0f, 0.035);

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 0, 12);

  // Soft reflections for the glassy materials
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  // ----------------------------------------------------------------
  // Lighting — clean two-tone cyan / violet
  // ----------------------------------------------------------------
  scene.add(new THREE.AmbientLight(0xffffff, 0.45));

  const keyLight = new THREE.PointLight(0x00f0ff, 60, 80);
  keyLight.position.set(6, 6, 10);
  scene.add(keyLight);

  const fillLight = new THREE.PointLight(0x8b5cf6, 45, 80);
  fillLight.position.set(-8, -4, 6);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffffff, 1.0);
  rimLight.position.set(0, 3, -8);
  scene.add(rimLight);

  // ----------------------------------------------------------------
  // Theme adaptation (day / night)
  // ----------------------------------------------------------------
  function applySceneTheme(theme) {
    const light = theme === 'light';
    scene.fog.color.set(light ? 0xf4f6fb : 0x0a0a0f);
    // Dark navy crystal + slate shapes read clearly on a light background
    coreMaterial.color.set(light ? 0x1b2740 : 0x0a0e1a);
    coreMaterial.attenuationColor.set(light ? 0x0ea5b7 : 0x00f0ff);
    coreMaterial.emissive.set(light ? 0x0a1a1f : 0x031b1f);
    keyLight.intensity = light ? 42 : 60;
    fillLight.intensity = light ? 32 : 45;
    ambientShapes.forEach((m) => {
      if (m.material.wireframe) {
        m.material.color.set(light ? 0x0ea5b7 : 0x00f0ff);
      } else if (m.material.isMeshPhysicalMaterial) {
        m.material.color.set(light ? 0x2a3656 : 0x0a0e1a);
        m.material.attenuationColor.set(light ? 0x0ea5b7 : 0x00f0ff);
      }
    });
    // Additive blending vanishes on a light bg — switch to normal so particles show
    particleMaterial.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
    particleMaterial.opacity = light ? 0.6 : 0.6;
  }

  const initialTheme =
    (typeof localStorage !== 'undefined' && localStorage.getItem('copc-theme')) ||
    document.documentElement.getAttribute('data-theme') ||
    'dark';

  window.addEventListener('themechange', (e) => {
    if (e.detail && e.detail.theme) applySceneTheme(e.detail.theme);
  });

  // ----------------------------------------------------------------
  // Hero focal crystal (prominent at top, fades as you scroll)
  // ----------------------------------------------------------------
  const heroGroup = new THREE.Group();
  scene.add(heroGroup);

  const coreGeometry = new THREE.IcosahedronGeometry(1.6, 0);
  const coreMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x0a0e1a,
    metalness: 0.1,
    roughness: 0.05,
    transmission: 0.9,
    thickness: 1.8,
    ior: 1.6,
    iridescence: 1,
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [100, 600],
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    attenuationColor: 0x00f0ff,
    attenuationDistance: 3,
    transparent: true,
    opacity: 1
  });
  const core = new THREE.Mesh(coreGeometry, coreMaterial);
  heroGroup.add(core);

  const shellGeometry = new THREE.IcosahedronGeometry(2.5, 1);
  const shellMaterial = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    wireframe: true,
    transparent: true,
    opacity: 0.12,
    depthWrite: false
  });
  const shell = new THREE.Mesh(shellGeometry, shellMaterial);
  heroGroup.add(shell);

  function makeRing(radius, tube, color, tilt) {
    const geo = new THREE.TorusGeometry(radius, tube, 16, 140);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4, depthWrite: false });
    const ring = new THREE.Mesh(geo, mat);
    ring.rotation.set(tilt.x, tilt.y, tilt.z);
    return ring;
  }
  const ringA = makeRing(3.1, 0.012, 0x00f0ff, { x: Math.PI / 2.4, y: 0, z: 0.3 });
  const ringB = makeRing(3.5, 0.012, 0x8b5cf6, { x: Math.PI / 3, y: 0.5, z: 0 });
  heroGroup.add(ringA, ringB);

  // ----------------------------------------------------------------
  // Real extruded 3D text — the hero wordmark, rendered in WebGL
  // ----------------------------------------------------------------
  let heroText = null;
  let heroTextMat = null;
  let heroTextGeo = null;
  const fontLoader = new FontLoader();
  fontLoader.load(
    'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json',
    (font) => {
      heroTextGeo = new TextGeometry('CoPC', {
        font,
        size: 2.4,
        height: 0.7,
        curveSegments: 14,
        bevelEnabled: true,
        bevelThickness: 0.08,
        bevelSize: 0.05,
        bevelOffset: 0,
        bevelSegments: 5
      });
      heroTextGeo.center();
      heroTextMat = new THREE.MeshPhysicalMaterial({
        color: 0x00f0ff,
        metalness: 0.9,
        roughness: 0.15,
        iridescence: 1,
        iridescenceIOR: 1.3,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
        emissive: 0x031b1f,
        emissiveIntensity: 0.4
      });
      heroText = new THREE.Mesh(heroTextGeo, heroTextMat);
      heroText.position.set(0, 0.2, 2.2); // in front of the crystal
      scene.add(heroText);
    },
    undefined,
    (err) => console.warn('3D font failed to load, skipping 3D text.', err)
  );

  // ----------------------------------------------------------------
  // Ambient drifting shapes — fills the whole page with quiet 3D depth
  // ----------------------------------------------------------------
  const ambientGroup = new THREE.Group();
  scene.add(ambientGroup);

  const shapeGeometries = [
    new THREE.IcosahedronGeometry(0.5, 0),
    new THREE.OctahedronGeometry(0.5, 0),
    new THREE.TetrahedronGeometry(0.6, 0),
    new THREE.TorusGeometry(0.4, 0.14, 12, 24)
  ];

  const ambientShapes = [];
  const shapeCount = 42;
  for (let i = 0; i < shapeCount; i++) {
    const geo = shapeGeometries[i % shapeGeometries.length];
    const isWire = Math.random() > 0.5;
    const mat = isWire
      ? new THREE.MeshBasicMaterial({
          color: new THREE.Color().setHSL(0.55 + Math.random() * 0.2, 0.9, 0.6),
          wireframe: true,
          transparent: true,
          opacity: 0.18,
          depthWrite: false
        })
      : new THREE.MeshPhysicalMaterial({
          color: 0x0a0e1a,
          metalness: 0.2,
          roughness: 0.1,
          transmission: 0.6,
          transparent: true,
          opacity: 0.5,
          clearcoat: 1,
          clearcoatRoughness: 0.15
        });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(
      (Math.random() - 0.5) * 26,
      (Math.random() - 0.5) * 40,
      -2 - Math.random() * 16
    );
    const s = 0.5 + Math.random() * 1.4;
    mesh.scale.setScalar(s);
    mesh.userData = {
      rotSpeed: new THREE.Vector3(
        (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.01
      ),
      floatPhase: Math.random() * Math.PI * 2,
      floatSpeed: 0.3 + Math.random() * 0.5,
      baseY: mesh.position.y
    };
    ambientShapes.push(mesh);
    ambientGroup.add(mesh);
  }

  // ----------------------------------------------------------------
  // Particle field (clean, sparse)
  // ----------------------------------------------------------------
  const particleCount = 220;
  const particleGeometry = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particleCount * 3);
  const particleColors = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    const r = 4 + Math.random() * 18;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    particlePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 50;
    particlePositions[i * 3 + 2] = -Math.random() * 20;
    const color = new THREE.Color().setHSL(0.55 + Math.random() * 0.2, 0.9, 0.6);
    particleColors[i * 3] = color.r;
    particleColors[i * 3 + 1] = color.g;
    particleColors[i * 3 + 2] = color.b;
  }
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
  const particleMaterial = new THREE.PointsMaterial({
    size: 0.05,
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);

  // Apply the saved theme now that all materials exist
  applySceneTheme(initialTheme);

  // ----------------------------------------------------------------
  // Interaction — pointer parallax + scroll travel
  // ----------------------------------------------------------------
  let mouseX = 0, mouseY = 0, targetX = 0, targetY = 0;
  const onPointer = (cx, cy) => {
    mouseX = (cx / window.innerWidth) * 2 - 1;
    mouseY = -(cy / window.innerHeight) * 2 + 1;
  };
  document.addEventListener('mousemove', (e) => onPointer(e.clientX, e.clientY), { passive: true });
  document.addEventListener('touchmove', (e) => {
    if (e.touches.length) onPointer(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  let scrollNorm = 0;
  const updateScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    scrollNorm = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
  };
  window.addEventListener('scroll', updateScroll, { passive: true });
  updateScroll();

  // ----------------------------------------------------------------
  // Animation loop
  // ----------------------------------------------------------------
  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    if (document.hidden) return;

    const t = clock.getElapsedTime();

    // Smooth pointer follow
    targetX += (mouseX - targetX) * 0.04;
    targetY += (mouseY - targetY) * 0.04;

    // Hero crystal: calm rotation, fades out as you leave the hero
    core.rotation.x = t * 0.15;
    core.rotation.y = t * 0.2;
    shell.rotation.y = -t * 0.08;
    shell.rotation.z = t * 0.05;
    ringA.rotation.z = t * 0.3;
    ringB.rotation.z = -t * 0.22;
    ringGroupRotate(heroGroup, t);
    const heroFade = Math.max(0, 1 - window.scrollY / 600);
    const heroVisible = heroFade > 0.02;
    core.visible = heroVisible;
    shell.visible = heroVisible;
    ringA.visible = heroVisible;
    ringB.visible = heroVisible;
    coreMaterial.opacity = heroFade;
    shellMaterial.opacity = 0.12 * heroFade;
    ringA.material.opacity = 0.4 * heroFade;
    ringB.material.opacity = 0.4 * heroFade;

    // Real 3D text: tilt toward the pointer, gentle float, fade with scroll
    if (heroText) {
      heroText.visible = heroVisible;
      heroText.rotation.y = targetX * 0.5 + Math.sin(t * 0.6) * 0.06;
      heroText.rotation.x = -targetY * 0.35 + Math.sin(t * 0.5) * 0.04;
      heroText.position.y = 0.2 + Math.sin(t * 0.8) * 0.12;
      heroTextMat.opacity = heroFade;
      heroTextMat.transparent = true;
    }

    // Ambient shapes: slow spin + float, gentle parallax travel with scroll
    ambientGroup.position.y = scrollNorm * 8;
    ambientShapes.forEach((m) => {
      const u = m.userData;
      m.rotation.x += u.rotSpeed.x;
      m.rotation.y += u.rotSpeed.y;
      m.rotation.z += u.rotSpeed.z;
      m.position.y = u.baseY + Math.sin(t * u.floatSpeed + u.floatPhase) * 0.6;
    });

    // Particles drift
    particles.rotation.y = t * 0.02;

    // Camera parallax + subtle scroll dolly
    camera.position.x += (targetX * 1.6 - camera.position.x) * 0.03;
    camera.position.y += (targetY * 1.6 - camera.position.y) * 0.03;
    camera.position.z = 12 - scrollNorm * 2;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }
  animate();

  function ringGroupRotate(g, t) {
    g.rotation.y = t * 0.1;
  }

  // ----------------------------------------------------------------
  // Resize
  // ----------------------------------------------------------------
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    updateScroll();
  }, { passive: true });

  // ----------------------------------------------------------------
  // Cleanup
  // ----------------------------------------------------------------
  window.addEventListener('beforeunload', () => {
    renderer.dispose();
    coreGeometry.dispose(); coreMaterial.dispose();
    shellGeometry.dispose(); shellMaterial.dispose();
    ringA.geometry.dispose(); ringA.material.dispose();
    ringB.geometry.dispose(); ringB.material.dispose();
    shapeGeometries.forEach(g => g.dispose());
    ambientShapes.forEach(m => m.material.dispose());
    particleGeometry.dispose(); particleMaterial.dispose();
    if (heroTextGeo) heroTextGeo.dispose();
    if (heroTextMat) heroTextMat.dispose();
  });
}

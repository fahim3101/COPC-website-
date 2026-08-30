// Premium clean global 3D backdrop — CoPC
// Fixed WebGL canvas behind all content: hero crystal + soft ambient field
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!prefersReducedMotion) initGlobalScene();

function initGlobalScene() {
  const canvas = document.getElementById('bg-3d');
  if (!canvas) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  } catch (err) {
    console.warn('WebGL not supported, skipping 3D background.', err);
    return;
  }
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.9));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x06080f, 0.028);

  const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 0.35, 11.5);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  // Lights — soft two-tone
  scene.add(new THREE.AmbientLight(0xffffff, 0.42));
  const keyLight = new THREE.PointLight(0x00e5ff, 62, 90);
  keyLight.position.set(7, 6.5, 10);
  scene.add(keyLight);
  const fillLight = new THREE.PointLight(0x7c3aed, 46, 90);
  fillLight.position.set(-8.5, -4.2, 6.5);
  scene.add(fillLight);
  const rimLight = new THREE.DirectionalLight(0xffffff, 0.95);
  rimLight.position.set(0, 4, -9);
  scene.add(rimLight);

  // Hero crystal group — hero focal
  const heroGroup = new THREE.Group();
  heroGroup.position.set(0, 0.6, 0);
  scene.add(heroGroup);

  const coreGeometry = new THREE.IcosahedronGeometry(1.55, 0);
  const coreMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x0a0e1a, metalness: 0.08, roughness: 0.06,
    transmission: 0.92, thickness: 1.9, ior: 1.62,
    iridescence: 1, iridescenceIOR: 1.32, iridescenceThicknessRange: [120, 620],
    clearcoat: 1, clearcoatRoughness: 0.08,
    attenuationColor: 0x00e5ff, attenuationDistance: 3.2,
    transparent: true, opacity: 1
  });
  const core = new THREE.Mesh(coreGeometry, coreMaterial);
  heroGroup.add(core);

  const shellGeometry = new THREE.IcosahedronGeometry(2.42, 1);
  const shellMaterial = new THREE.MeshBasicMaterial({
    color: 0x00e5ff, wireframe: true, transparent: true, opacity: 0.10, depthWrite: false
  });
  const shell = new THREE.Mesh(shellGeometry, shellMaterial);
  heroGroup.add(shell);

  const makeRing = (radius, tube, color, tilt) => {
    const geo = new THREE.TorusGeometry(radius, tube, 16, 160);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.38, depthWrite: false });
    const ring = new THREE.Mesh(geo, mat);
    ring.rotation.set(tilt.x, tilt.y, tilt.z);
    return ring;
  };
  const ringA = makeRing(3.05, 0.011, 0x00e5ff, { x: Math.PI / 2.35, y: 0, z: 0.22 });
  const ringB = makeRing(3.45, 0.011, 0x7c3aed, { x: Math.PI / 2.95, y: 0.48, z: 0 });
  heroGroup.add(ringA, ringB);

  // Extruded wordmark
  let heroText = null; let heroTextMat = null; let heroTextGeo = null;
  const fontLoader = new FontLoader();
  fontLoader.load(
    'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json',
    (font) => {
      heroTextGeo = new TextGeometry('CoPC', {
        font, size: 2.35, height: 0.62, curveSegments: 12,
        bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.045, bevelOffset: 0, bevelSegments: 4
      });
      heroTextGeo.center();
      heroTextMat = new THREE.MeshPhysicalMaterial({
        color: 0x00e5ff, metalness: 0.88, roughness: 0.14,
        iridescence: 1, iridescenceIOR: 1.28, clearcoat: 1, clearcoatRoughness: 0.1,
        emissive: 0x031b1f, emissiveIntensity: 0.38, transparent: true, opacity: 0.96
      });
      heroText = new THREE.Mesh(heroTextGeo, heroTextMat);
      heroText.position.set(0, 0.18, 2.35); // last commit er age jemon chilo — size same, kintu golla er samne render
      heroText.renderOrder = 20;
      heroTextMat.depthTest = false;
      heroTextMat.depthWrite = false;
      scene.add(heroText);
      applySceneTheme(document.documentElement.getAttribute('data-theme') || initialTheme);
    },
    undefined,
    (err) => console.warn('3D font failed to load, skipping 3D text.', err)
  );

  // Ambient shapes — quiet depth, layered in Z for parallax
  const ambientGroup = new THREE.Group();
  scene.add(ambientGroup);

  const shapeGeometries = [
    new THREE.IcosahedronGeometry(0.52, 0),
    new THREE.OctahedronGeometry(0.52, 0),
    new THREE.TetrahedronGeometry(0.62, 0),
    new THREE.TorusGeometry(0.40, 0.135, 12, 24)
  ];
  const ambientShapes = [];
  const shapeCount = window.innerWidth < 768 ? 18 : 32;
  for (let i = 0; i < shapeCount; i++) {
    const geo = shapeGeometries[i % shapeGeometries.length];
    const isWire = Math.random() > 0.56;
    const mat = isWire
      ? new THREE.MeshBasicMaterial({
          color: new THREE.Color().setHSL(0.54 + Math.random() * 0.18, 0.88, 0.62),
          wireframe: true, transparent: true, opacity: 0.16, depthWrite: false
        })
      : new THREE.MeshPhysicalMaterial({
          color: 0x0b1020, metalness: 0.18, roughness: 0.12, transmission: 0.62,
          transparent: true, opacity: 0.46, clearcoat: 1, clearcoatRoughness: 0.14
        });
    const mesh = new THREE.Mesh(geo, mat);
    // Distribute in depth layers for parallax illusion
    const layer = i % 3; // 0 near, 1 mid, 2 far
    const z = -3.5 - layer * 5.5 - Math.random() * 4.5;
    const spreadX = 13 + layer * 4;
    const spreadY = 22 + layer * 6;
    mesh.position.set(
      (Math.random() - 0.5) * spreadX * 2,
      (Math.random() - 0.5) * spreadY,
      z
    );
    const s = 0.55 + Math.random() * 1.15 - layer * 0.08;
    mesh.scale.setScalar(Math.max(0.35, s));
    mesh.userData = {
      rotSpeed: new THREE.Vector3((Math.random() - 0.5) * 0.008, (Math.random() - 0.5) * 0.008, (Math.random() - 0.5) * 0.007),
      floatPhase: Math.random() * Math.PI * 2,
      floatSpeed: 0.22 + Math.random() * 0.38,
      baseY: mesh.position.y,
      baseX: mesh.position.x,
      layer
    };
    ambientShapes.push(mesh);
    ambientGroup.add(mesh);
  }

  // Particles — sparser, more premium
  const particleCount = window.innerWidth < 768 ? 120 : 190;
  const particleGeometry = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particleCount * 3);
  const particleColors = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    const r = 4.2 + Math.random() * 16;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    particlePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 52;
    particlePositions[i * 3 + 2] = -Math.random() * 18 - 1.5;
    const c = new THREE.Color().setHSL(0.54 + Math.random() * 0.18, 0.88, 0.62);
    particleColors[i * 3] = c.r; particleColors[i * 3 + 1] = c.g; particleColors[i * 3 + 2] = c.b;
  }
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
  const particleMaterial = new THREE.PointsMaterial({
    size: 0.048, vertexColors: true, transparent: true, opacity: 0.58,
    sizeAttenuation: true, blending: THREE.AdditiveBlending, depthWrite: false
  });
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);

  // Theme adaptation
  const initialTheme = (typeof localStorage !== 'undefined' && localStorage.getItem('copc-theme')) || document.documentElement.getAttribute('data-theme') || 'dark';
  function applySceneTheme(theme) {
    const light = theme === 'light';
    scene.fog.color.set(light ? 0xfbfcfe : 0x06080f);
    scene.fog.near = 0; scene.fog.far = 0;
    scene.fog = new THREE.FogExp2(light ? 0xfbfcfe : 0x06080f, light ? 0.017 : 0.028);
    coreMaterial.color.set(light ? 0x1e293b : 0x0a0e1a);
    coreMaterial.attenuationColor.set(light ? 0x0e7490 : 0x00e5ff);
    coreMaterial.emissive.set(light ? 0x0d2329 : 0x031b1f);
    keyLight.intensity = light ? 34 : 62;
    fillLight.intensity = light ? 24 : 46;
    keyLight.color.set(light ? 0x0e7490 : 0x00e5ff);
    fillLight.color.set(light ? 0x6d28d9 : 0x7c3aed);
    ambientShapes.forEach((m) => {
      if (m.material.wireframe) m.material.color.set(light ? 0x0e7490 : 0x00e5ff);
      else if (m.material.isMeshPhysicalMaterial) {
        m.material.color.set(light ? 0x334155 : 0x0b1020);
        m.material.attenuationColor?.set?.(light ? 0x0e7490 : 0x00e5ff);
      }
    });
    particleMaterial.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
    particleMaterial.opacity = light ? 0.38 : 0.58;
    shellMaterial.color.set(light ? 0x0e7490 : 0x00e5ff);
    shellMaterial.opacity = light ? 0.055 : 0.10;
    ringA.material.color.set(light ? 0x0e7490 : 0x00e5ff);
    ringB.material.color.set(light ? 0x6d28d9 : 0x7c3aed);
    if (heroTextMat) {
      heroTextMat.color.set(light ? 0x0e7490 : 0x00e5ff);
      heroTextMat.emissive.set(light ? 0x07343a : 0x031b1f);
      heroTextMat.emissiveIntensity = light ? 0.14 : 0.38;
      heroTextMat.roughness = light ? 0.30 : 0.14;
      heroTextMat.transparent = true;
      heroTextMat.depthTest = false;
      heroTextMat.depthWrite = false;
    }
  }
  applySceneTheme(initialTheme);
  window.addEventListener('themechange', (e) => { if (e.detail?.theme) applySceneTheme(e.detail.theme); });

  // Interaction — pointer parallax + scroll
  let mouseX = 0, mouseY = 0, targetX = 0, targetY = 0;
  const onPointer = (cx, cy) => { mouseX = (cx / window.innerWidth) * 2 - 1; mouseY = -(cy / window.innerHeight) * 2 + 1; };
  document.addEventListener('mousemove', (e) => onPointer(e.clientX, e.clientY), { passive: true });
  document.addEventListener('touchmove', (e) => { if (e.touches.length) onPointer(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });

  let scrollNorm = 0;
  const updateScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    scrollNorm = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
  };
  window.addEventListener('scroll', updateScroll, { passive: true });
  updateScroll();

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    if (document.hidden) return;
    const t = clock.getElapsedTime();

    targetX += (mouseX - targetX) * 0.035;
    targetY += (mouseY - targetY) * 0.035;

    // Hero crystal — calm, premium rotation
    core.rotation.x = t * 0.12;
    core.rotation.y = t * 0.16;
    shell.rotation.y = -t * 0.06;
    shell.rotation.z = t * 0.035;
    ringA.rotation.z = t * 0.26;
    ringB.rotation.z = -t * 0.19;
    heroGroup.rotation.y = t * 0.07 + targetX * 0.15;
    heroGroup.rotation.x = targetY * 0.08;

    const heroFade = Math.max(0, 1 - window.scrollY / 620);
    const heroVisible = heroFade > 0.015;
    core.visible = heroVisible; shell.visible = heroVisible; ringA.visible = heroVisible; ringB.visible = heroVisible;
    if (heroText) heroText.visible = heroVisible;
    coreMaterial.opacity = heroFade;
    shellMaterial.opacity = (document.documentElement.getAttribute('data-theme') === 'light' ? 0.07 : 0.10) * heroFade;
    ringA.material.opacity = 0.38 * heroFade;
    ringB.material.opacity = 0.38 * heroFade;

    if (heroText && heroTextMat) {
      heroText.rotation.y = targetX * 0.42 + Math.sin(t * 0.55) * 0.05;
      heroText.rotation.x = -targetY * 0.28 + Math.sin(t * 0.45) * 0.03;
      heroText.position.y = 0.18 + Math.sin(t * 0.72) * 0.10;
      heroTextMat.opacity = heroFade; heroTextMat.transparent = true;
      heroTextMat.depthTest = false;
      heroTextMat.depthWrite = false;
      heroText.renderOrder = 20;
    }

    // Ambient — layer-aware parallax
    ambientGroup.position.y = scrollNorm * 7.5;
    ambientGroup.rotation.y = targetX * 0.06;
    ambientGroup.rotation.x = -targetY * 0.04;
    ambientShapes.forEach((m) => {
      const u = m.userData;
      m.rotation.x += u.rotSpeed.x;
      m.rotation.y += u.rotSpeed.y;
      m.rotation.z += u.rotSpeed.z;
      // Depth-aware float + parallax drift
      const parallaxFactor = 1 - u.layer * 0.22;
      m.position.y = u.baseY + Math.sin(t * u.floatSpeed + u.floatPhase) * 0.55 * parallaxFactor;
      m.position.x = u.baseX + Math.sin(t * 0.22 + u.floatPhase * 0.7) * 0.22 * parallaxFactor;
    });

    particles.rotation.y = t * 0.015;
    particles.rotation.x = targetY * 0.04;
    particles.position.y = scrollNorm * 1.2;

    // Camera — gentle dolly + parallax
    camera.position.x += (targetX * 1.25 - camera.position.x) * 0.025;
    camera.position.y += (targetY * 1.05 + 0.35 - camera.position.y) * 0.025;
    camera.position.z = 11.5 - scrollNorm * 1.4;
    camera.lookAt(0, 0.15, 0);

    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.9));
    updateScroll();
  }, { passive: true });

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

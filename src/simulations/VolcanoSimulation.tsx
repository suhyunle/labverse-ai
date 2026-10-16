import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  createVolcanoStrataTexture,
  createMagmaGlowTexture,
  createVolcanoRockTexture,
  createSmokeParticleTexture,
  createLavaEmberTexture,
  createCraterGlowTexture,
} from '../lib/textures';
import { sound } from '../lib/audio';

interface VolcanoSimulationProps {
  variables: Record<string, number>;
  cameraPreset: string;
  showCrossSection: boolean;
  onUpdateMetrics?: (metrics: Record<string, number | string>) => void;
}

export const VolcanoSimulation: React.FC<VolcanoSimulationProps> = ({
  variables,
  cameraPreset,
  showCrossSection,
  onUpdateMetrics,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const varsRef = useRef(variables);
  varsRef.current = variables;

  const crossSectionRef = useRef(showCrossSection);
  crossSectionRef.current = showCrossSection;

  const presetRef = useRef(cameraPreset);
  presetRef.current = cameraPreset;

  const prevEruptingRef = useRef(false);
  const hasUserTriggeredRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene & Atmospheric Fog
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030712); // Midnight charcoal-navy
    scene.fog = new THREE.FogExp2(0x030712, 0.010);

    // 2. Camera Setup: generous distance & positioned so the crater & plume have clear headroom below top header
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(0, 16, 54);

    // 3. WebGL Renderer with PCFShadowMap
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap; // PCFShadowMap as requested

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. OrbitControls with strict distance and angle constraints
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 22; // Strict min distance
    controls.maxDistance = 86; // Strict max distance
    controls.minPolarAngle = 0.22; // Prevent camera looking straight down
    controls.maxPolarAngle = Math.PI / 2 - 0.04; // Never clip beneath the terrain
    controls.target.set(0, 1.2, 0); // Aim at mountain center to guarantee crater headroom
    controls.update();

    // 5. Cinematic Lighting Rig: Key, Rim Light for Silhouette, Hemisphere & Volcanic Lights
    const hemiLight = new THREE.HemisphereLight(0x38557a, 0x0c121e, 0.95);
    scene.add(hemiLight);

    // Key directional light with soft PCF shadows
    const keySunLight = new THREE.DirectionalLight(0xffedd5, 1.4);
    keySunLight.position.set(28, 48, 28);
    keySunLight.castShadow = true;
    keySunLight.shadow.mapSize.width = 1024;
    keySunLight.shadow.mapSize.height = 1024;
    keySunLight.shadow.camera.near = 10;
    keySunLight.shadow.camera.far = 130;
    keySunLight.shadow.camera.left = -32;
    keySunLight.shadow.camera.right = 32;
    keySunLight.shadow.camera.top = 32;
    keySunLight.shadow.camera.bottom = -32;
    keySunLight.shadow.bias = -0.0005;
    scene.add(keySunLight);

    // Bright Rim Light 1: catches mountain silhouette against deep dark void
    const rimLightBack = new THREE.DirectionalLight(0x70bbff, 3.2);
    rimLightBack.position.set(-32, 26, -34);
    scene.add(rimLightBack);

    // Secondary Accent Rim Light 2
    const rimLightRight = new THREE.DirectionalLight(0xa5c8ff, 1.6);
    rimLightRight.position.set(34, 18, -26);
    scene.add(rimLightRight);

    // Subterranean Magma Chamber Point Light
    const magmaChamberLight = new THREE.PointLight(0xff3300, 4.0, 30);
    magmaChamberLight.position.set(0, -3.4, 0);
    scene.add(magmaChamberLight);

    // Summit Crater Dynamic Point Light
    const craterPointLight = new THREE.PointLight(0xff6600, 3.5, 40);
    craterPointLight.position.set(0, 7.3, 0);
    scene.add(craterPointLight);

    // 6. Geological Base Terrain & Tech Grid
    const groundGeo = new THREE.PlaneGeometry(180, 180, 32, 32);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0b111e,
      roughness: 0.92,
      metalness: 0.08,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -6.0;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(130, 52, 0x00f0ff, 0x182436);
    grid.position.y = -5.96;
    if (grid.material && !Array.isArray(grid.material)) {
      grid.material.transparent = true;
      grid.material.opacity = 0.22;
    }
    scene.add(grid);

    // 7. Volcano Composite Construction
    const volcanoGroup = new THREE.Group();
    scene.add(volcanoGroup);

    // Procedural textures
    const strataTexture = createVolcanoStrataTexture();
    const magmaTexture = createMagmaGlowTexture();
    const rockTexture = createVolcanoRockTexture();
    const smokeTexture = createSmokeParticleTexture();
    const emberTexture = createLavaEmberTexture();
    const craterGlowTexture = createCraterGlowTexture();

    // Geometric Parameters:
    // Mountain height = 13.0, centered at y = 0.5 (Base at y = -6.0, Crater summit at y = +7.0)
    const coneRadiusTop = 1.35;
    const coneRadiusBottom = 15.0;
    const coneHeight = 13.0;
    const conduitRadius = 0.85;

    // Rock Material for Stratovolcano Slope
    const coneMat = new THREE.MeshStandardMaterial({
      map: rockTexture,
      bumpMap: rockTexture,
      bumpScale: 0.3,
      color: 0x3d3530,
      roughness: 0.88,
      metalness: 0.12,
      side: THREE.DoubleSide,
    });

    // Mesh A: Full 360-degree cone (used when cross-section is OFF)
    const coneGeoFull = new THREE.CylinderGeometry(
      coneRadiusTop,
      coneRadiusBottom,
      coneHeight,
      48,
      12,
      true,
      0,
      Math.PI * 2
    );
    const mountainMeshFull = new THREE.Mesh(coneGeoFull, coneMat);
    mountainMeshFull.position.y = 0.5;
    mountainMeshFull.castShadow = true;
    mountainMeshFull.receiveShadow = true;
    mountainMeshFull.visible = !showCrossSection;
    volcanoGroup.add(mountainMeshFull);

    // Mesh B: Cutaway 270-degree cone (used when cross-section is ON)
    // Avoids mutating .geometry on the fly to eliminate shadow buffer WebGL errors!
    const coneGeoCut = new THREE.CylinderGeometry(
      coneRadiusTop,
      coneRadiusBottom,
      coneHeight,
      48,
      12,
      true,
      0,
      Math.PI * 1.5
    );
    const mountainMeshCut = new THREE.Mesh(coneGeoCut, coneMat);
    mountainMeshCut.position.y = 0.5;
    mountainMeshCut.castShadow = true;
    mountainMeshCut.receiveShadow = true;
    mountainMeshCut.visible = showCrossSection;
    volcanoGroup.add(mountainMeshCut);

    // 8. Geological Cross-Section Cutaway Slice Faces (Accurate Slope Trapezoids)
    const sliceGroup = new THREE.Group();
    sliceGroup.visible = showCrossSection;
    volcanoGroup.add(sliceGroup);

    // Trapezoid Cut Face 1 (along Positive X-Axis at angle 0)
    // Vertices strictly match the cone slope from y = -6 (r=15) to y = +7 (r=1.35)
    const cutShape1 = new THREE.Shape();
    cutShape1.moveTo(conduitRadius, -6.0);
    cutShape1.lineTo(coneRadiusBottom, -6.0);
    cutShape1.lineTo(coneRadiusTop, 7.0);
    cutShape1.lineTo(conduitRadius, 7.0);
    cutShape1.closePath();

    const sliceGeo1 = new THREE.ShapeGeometry(cutShape1);
    const sliceMat = new THREE.MeshStandardMaterial({
      map: strataTexture,
      roughness: 0.72,
      metalness: 0.18,
      side: THREE.DoubleSide,
    });
    const sliceMesh1 = new THREE.Mesh(sliceGeo1, sliceMat);
    sliceMesh1.castShadow = true;
    sliceMesh1.receiveShadow = true;
    sliceGroup.add(sliceMesh1);

    // Trapezoid Cut Face 2 (along Negative Z-Axis at angle 270 deg / -90 deg)
    const cutShape2 = new THREE.Shape();
    cutShape2.moveTo(conduitRadius, -6.0);
    cutShape2.lineTo(coneRadiusBottom, -6.0);
    cutShape2.lineTo(coneRadiusTop, 7.0);
    cutShape2.lineTo(conduitRadius, 7.0);
    cutShape2.closePath();

    const sliceGeo2 = new THREE.ShapeGeometry(cutShape2);
    const sliceMesh2 = new THREE.Mesh(sliceGeo2, sliceMat);
    sliceMesh2.rotation.y = Math.PI / 2;
    sliceMesh2.castShadow = true;
    sliceMesh2.receiveShadow = true;
    sliceGroup.add(sliceMesh2);

    // 9. Subterranean Magma Chamber (Prominent glowing pulsating reservoir)
    const chamberGeo = new THREE.SphereGeometry(3.4, 36, 36);
    const chamberMat = new THREE.MeshStandardMaterial({
      map: magmaTexture,
      color: 0xff3300,
      emissive: 0xff2200,
      emissiveIntensity: 1.8,
      roughness: 0.25,
      metalness: 0.1,
    });
    const magmaChamber = new THREE.Mesh(chamberGeo, chamberMat);
    magmaChamber.position.set(0, -3.4, 0);
    volcanoGroup.add(magmaChamber);

    // Chamber Crust Stress Cage (Shows internal geodetic pressure lines)
    const chamberCageGeo = new THREE.SphereGeometry(3.55, 20, 20);
    const chamberCageMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
    });
    const chamberCage = new THREE.Mesh(chamberCageGeo, chamberCageMat);
    chamberCage.position.copy(magmaChamber.position);
    volcanoGroup.add(chamberCage);

    // 10. Central Conduit (Vertical Magma Pipe connecting chamber to crater summit)
    const conduitGeo = new THREE.CylinderGeometry(conduitRadius, conduitRadius * 1.15, 10.6, 32);
    const conduitMat = new THREE.MeshStandardMaterial({
      map: magmaTexture,
      color: 0xff4400,
      emissive: 0xff2200,
      emissiveIntensity: 1.6,
      roughness: 0.3,
    });
    const conduit = new THREE.Mesh(conduitGeo, conduitMat);
    conduit.position.set(0, 1.9, 0);
    volcanoGroup.add(conduit);

    // 11. Summit Crater & Lava Lake (Molten bubbling surface pool)
    const lavaLakeGeo = new THREE.CylinderGeometry(coneRadiusTop * 0.95, coneRadiusTop * 0.65, 0.45, 32);
    const lavaLakeMat = new THREE.MeshStandardMaterial({
      map: magmaTexture,
      color: 0xff7700,
      emissive: 0xff5500,
      emissiveIntensity: 2.2,
      roughness: 0.2,
    });
    const lavaLake = new THREE.Mesh(lavaLakeGeo, lavaLakeMat);
    lavaLake.position.set(0, 7.02, 0);
    volcanoGroup.add(lavaLake);

    // Summit Crater Glowing Halo Ring (Additive Blending)
    const craterGlowGeo = new THREE.TorusGeometry(coneRadiusTop * 1.05, 0.22, 16, 36);
    const craterGlowMat = new THREE.MeshBasicMaterial({
      color: 0xff7700,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const craterGlow = new THREE.Mesh(craterGlowGeo, craterGlowMat);
    craterGlow.rotation.x = Math.PI / 2;
    craterGlow.position.set(0, 7.08, 0);
    volcanoGroup.add(craterGlow);

    // Summit Crater Radial Glow Billboard
    const craterBillboardGeo = new THREE.PlaneGeometry(5.0, 5.0);
    const craterBillboardMat = new THREE.MeshBasicMaterial({
      map: craterGlowTexture,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const craterBillboard = new THREE.Mesh(craterBillboardGeo, craterBillboardMat);
    craterBillboard.rotation.x = -Math.PI / 2;
    craterBillboard.position.set(0, 7.15, 0);
    volcanoGroup.add(craterBillboard);

    // 12. Eruption Particle Systems (High-Quality Additive Embers & Soft Ash Column)
    // System A: Volumetric Expanding Ash & Smoke Plume (Zero Grey Boxes!)
    const plumeCount = 750;
    const plumeGeo = new THREE.BufferGeometry();
    const plumePositions = new Float32Array(plumeCount * 3);
    const plumeLifes = new Float32Array(plumeCount);
    const plumeSpeeds = new Float32Array(plumeCount);
    const plumeAngles = new Float32Array(plumeCount);

    for (let i = 0; i < plumeCount; i++) {
      plumeLifes[i] = Math.random();
      plumeSpeeds[i] = 4.5 + Math.random() * 8.5;
      plumeAngles[i] = Math.random() * Math.PI * 2;

      plumePositions[i * 3 + 0] = (Math.random() - 0.5) * 0.4;
      plumePositions[i * 3 + 1] = 7.1;
      plumePositions[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
    }

    plumeGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(plumePositions, 3).setUsage(THREE.DynamicDrawUsage)
    );

    const plumeMat = new THREE.PointsMaterial({
      map: smokeTexture,
      color: 0x6e6878,
      size: 4.2,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const plumeParticles = new THREE.Points(plumeGeo, plumeMat);
    scene.add(plumeParticles);

    // System B: Incandescent Glowing Lava Bombs & Fire Embers (Additive Blending)
    const emberCount = 450;
    const emberGeo = new THREE.BufferGeometry();
    const emberPositions = new Float32Array(emberCount * 3);
    const emberVels = new Float32Array(emberCount * 3);
    const emberLifes = new Float32Array(emberCount);

    for (let i = 0; i < emberCount; i++) {
      emberLifes[i] = Math.random();
      emberPositions[i * 3 + 0] = 0;
      emberPositions[i * 3 + 1] = 7.1;
      emberPositions[i * 3 + 2] = 0;

      const theta = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 9;
      emberVels[i * 3 + 0] = Math.cos(theta) * speed;
      emberVels[i * 3 + 1] = 10 + Math.random() * 15;
      emberVels[i * 3 + 2] = Math.sin(theta) * speed;
    }

    emberGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(emberPositions, 3).setUsage(THREE.DynamicDrawUsage)
    );

    const emberMat = new THREE.PointsMaterial({
      map: emberTexture,
      color: 0xffaa22,
      size: 2.2,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending, // Strict additive blending for incandescent glow
      depthWrite: false,
    });
    const emberParticles = new THREE.Points(emberGeo, emberMat);
    scene.add(emberParticles);

    // System C: Ambient atmospheric volcanic dust stars
    const starCount = 380;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3 + 0] = (Math.random() - 0.5) * 110;
      starPos[i * 3 + 1] = Math.random() * 65 - 5;
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 110;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0x88bbff,
      size: 0.45,
      transparent: true,
      opacity: 0.4,
    });
    const starParticles = new THREE.Points(starGeo, starMat);
    scene.add(starParticles);

    // 13. Physics & Animation Loop
    let animId: number;
    const clock = new THREE.Clock();
    let lastMetricUpdate = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Controls damping update
      controls.update();

      const currentVars = varsRef.current;
      const pressure = currentVars.pressure ?? 55;
      const gas = currentVars.gasContent ?? 45;
      const resistance = currentVars.ventResistance ?? 50;
      const viscosity = currentVars.magmaViscosity ?? 40;

      // Cross-section cutaway visibility toggle without buffer reallocation
      const isCut = crossSectionRef.current;
      mountainMeshCut.visible = isCut;
      mountainMeshFull.visible = !isCut;
      sliceGroup.visible = isCut;

      // Handle Camera Presets smoothly
      const preset = presetRef.current;
      if (preset === 'cross_section') {
        camera.position.lerp(new THREE.Vector3(26, 15, 38), 0.04);
        controls.target.lerp(new THREE.Vector3(0, 1.2, 0), 0.04);
      } else if (preset === 'crater_top') {
        camera.position.lerp(new THREE.Vector3(0, 24, 18), 0.04);
        controls.target.lerp(new THREE.Vector3(0, 7.0, 0), 0.04);
      } else if (preset === 'magma_core') {
        camera.position.lerp(new THREE.Vector3(18, 5, 20), 0.04);
        controls.target.lerp(new THREE.Vector3(0, -3.4, 0), 0.04);
      } else if (preset === 'panorama') {
        camera.position.lerp(new THREE.Vector3(0, 22, 68), 0.04);
        controls.target.lerp(new THREE.Vector3(0, 1.5, 0), 0.04);
      }

      // Dynamic Magma Chamber Expansion & Pulsation with Pressure
      const pressureExpansion = 1.0 + (pressure / 100) * 0.45;
      const pulseRate = 2.2 + (pressure / 100) * 5.5; // Pulsates faster as pressure builds
      const pulseAmp = 0.07 * (pressure / 100);
      const chamberPulse = Math.sin(elapsed * pulseRate) * pulseAmp;
      const totalChamberScale = pressureExpansion + chamberPulse;

      magmaChamber.scale.set(totalChamberScale, totalChamberScale, totalChamberScale);
      chamberCage.scale.set(totalChamberScale * 1.05, totalChamberScale * 1.05, totalChamberScale * 1.05);
      chamberCage.rotation.y = elapsed * 0.35;
      chamberCage.rotation.x = elapsed * 0.18;

      // Magma Emissive Glow: shines bright red/orange and pulses with chamber stress
      const emissiveIntensity = 1.4 + (pressure / 100) * 2.6 + Math.sin(elapsed * pulseRate) * 0.35;
      (magmaChamber.material as THREE.MeshStandardMaterial).emissiveIntensity = emissiveIntensity;
      (conduit.material as THREE.MeshStandardMaterial).emissiveIntensity = emissiveIntensity * 0.85;
      (lavaLake.material as THREE.MeshStandardMaterial).emissiveIntensity = emissiveIntensity * 1.2;

      // Color shift with pressure: deep red -> fiery orange -> intense gold
      const magmaColorHex = pressure > 75 ? 0xff6600 : pressure > 45 ? 0xff3300 : 0xcc1100;
      (magmaChamber.material as THREE.MeshStandardMaterial).emissive.setHex(magmaColorHex);
      magmaChamberLight.color.setHex(magmaColorHex);
      magmaChamberLight.intensity = 2.5 + (pressure / 100) * 7.0;

      // Physical Threshold Eruption Logic
      const effectiveDrive = pressure * (1 + (gas / 100) * 0.6);
      const isErupting = effectiveDrive > resistance * 0.85;

      // Play sound only on user interaction, never during frame 0
      if (hasUserTriggeredRef.current && isErupting && !prevEruptingRef.current) {
        sound.playRumble(effectiveDrive / 100);
      }
      prevEruptingRef.current = isErupting;
      hasUserTriggeredRef.current = true;

      // Calculate Physical Metrics
      const plumeHeightKm = isErupting
        ? (2.0 + Math.pow((pressure * gas) / 100, 0.7) * 0.42).toFixed(1)
        : '0.0';
      const vei = isErupting
        ? Math.min(6, Math.floor((effectiveDrive / 140) * 5 + (gas > 75 ? 1 : 0)))
        : 0;
      const conduitSpeed = isErupting
        ? ((effectiveDrive / 100) * 210 + (100 - viscosity) * 0.9).toFixed(0)
        : '0';

      let eruptionType = '휴면 상태 (Dormant)';
      if (isErupting) {
        if (vei <= 1) eruptionType = '하와이식 유출 (Hawaiian)';
        else if (vei === 2) eruptionType = '스트롬볼리식 간헐 (Strombolian)';
        else if (vei <= 4) eruptionType = '불카니식 폭발 (Vulcanian)';
        else eruptionType = '플리니식 초거대 대분출 (Plinian)';
      }

      // Throttle metric updates to ~8Hz to eliminate React state cascades
      if (onUpdateMetrics && elapsed - lastMetricUpdate > 0.12) {
        lastMetricUpdate = elapsed;
        onUpdateMetrics({
          chamberStress: `${(pressure * 1.8).toFixed(0)} MPa`, // Korean: 마그마 방 응력
          plumeHeight: `${plumeHeightKm} km`, // Korean: 화산재 분연주 고도
          veiScale: `VEI-${vei} (${eruptionType.split(' ')[0]})`, // Korean: 화산 폭발 지수
          conduitVelocity: `${conduitSpeed} m/s`, // Korean: 화도 분출 속도
          eruptionType, // Korean: 분화 양식
        });
      }

      // Crater Summit Dynamic Lighting & Glow Flicker
      const craterFlicker = Math.sin(elapsed * 28) * 1.4;
      craterPointLight.intensity = isErupting
        ? 5.0 + (pressure / 100) * 9.0 + craterFlicker
        : 1.0;
      craterPointLight.color.setHex(pressure > 75 ? 0xffaa33 : 0xff5500);

      const glowPulse = 1.0 + (pressure / 100) * 0.4 + Math.sin(elapsed * 8) * 0.08;
      craterGlow.scale.set(glowPulse, glowPulse, glowPulse);
      craterGlowMat.opacity = isErupting ? 0.92 : 0.35;
      craterBillboardMat.opacity = isErupting ? 0.85 : 0.2;

      // Volumetric Ash Plume Particles Animation
      const plumePosArr = plumePositions;
      const plumeSpeedFactor = isErupting ? (effectiveDrive / 100) * 2.4 : 0.25;
      const heightMax = isErupting ? 10 + Number(plumeHeightKm) * 0.95 : 3.0;
      const umbrellaSpread = 2.0 + (gas / 100) * 9.5;

      for (let i = 0; i < plumeCount; i++) {
        plumeLifes[i] += dt * 0.32 * plumeSpeedFactor;
        if (plumeLifes[i] > 1.0) {
          plumeLifes[i] = 0;
          plumePosArr[i * 3 + 0] = (Math.random() - 0.5) * 0.4;
          plumePosArr[i * 3 + 1] = 7.1;
          plumePosArr[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
        }

        const t = plumeLifes[i];
        plumePosArr[i * 3 + 1] = 7.1 + t * heightMax;

        const spread = Math.pow(t, 1.3) * umbrellaSpread;
        const ang = plumeAngles[i] + t * 2.0;
        plumePosArr[i * 3 + 0] = Math.cos(ang) * spread;
        plumePosArr[i * 3 + 2] = Math.sin(ang) * spread;
      }
      plumeGeo.attributes.position.needsUpdate = true;
      plumeMat.opacity = isErupting ? 0.78 : 0.18;
      plumeMat.size = 3.8 + (gas / 100) * 2.4;

      // Incandescent Lava Bombs & Fire Embers Animation
      const emberPosArr = emberPositions;
      const activeEmberCount = isErupting
        ? Math.floor(emberCount * (0.3 + (pressure / 100) * 0.7))
        : 20;

      for (let i = 0; i < emberCount; i++) {
        if (i >= activeEmberCount) {
          emberPosArr[i * 3 + 1] = -100;
          continue;
        }

        emberLifes[i] += dt * 0.8;
        if (emberLifes[i] > 1.0) {
          emberLifes[i] = 0;
          emberPosArr[i * 3 + 0] = (Math.random() - 0.5) * 0.3;
          emberPosArr[i * 3 + 1] = 7.15;
          emberPosArr[i * 3 + 2] = (Math.random() - 0.5) * 0.3;

          const theta = Math.random() * Math.PI * 2;
          const launchPower = isErupting ? (effectiveDrive / 100) * 18 + 6 : 2;
          emberVels[i * 3 + 0] = Math.cos(theta) * launchPower * (0.35 + Math.random() * 0.65);
          emberVels[i * 3 + 1] = launchPower * (0.85 + Math.random() * 0.95);
          emberVels[i * 3 + 2] = Math.sin(theta) * launchPower * (0.35 + Math.random() * 0.65);
        }

        if (isErupting) {
          emberPosArr[i * 3 + 0] += emberVels[i * 3 + 0] * dt;
          emberPosArr[i * 3 + 1] += emberVels[i * 3 + 1] * dt - 9.8 * dt * dt * 0.5;
          emberPosArr[i * 3 + 2] += emberVels[i * 3 + 2] * dt;
          emberVels[i * 3 + 1] -= 16.5 * dt; // Gravity
        } else {
          emberPosArr[i * 3 + 1] = -100;
        }
      }
      emberGeo.attributes.position.needsUpdate = true;
      emberMat.opacity = isErupting ? 0.98 : 0.0;

      // Color and size shift based on pressure & gas
      if (pressure > 75) {
        emberMat.color.setHex(0xfff5cc); // Incandescent white-yellow
        emberMat.size = 2.6;
      } else if (pressure > 45) {
        emberMat.color.setHex(0xffaa22); // Fiery orange
        emberMat.size = 2.2;
      } else {
        emberMat.color.setHex(0xff4400); // Deep red
        emberMat.size = 1.8;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Window Resize Handling with safe non-zero dimension check
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      if (w === 0 || h === 0) return;

      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();

      groundGeo.dispose();
      groundMat.dispose();
      coneGeoFull.dispose();
      coneGeoCut.dispose();
      coneMat.dispose();
      sliceGeo1.dispose();
      sliceGeo2.dispose();
      sliceMat.dispose();
      chamberGeo.dispose();
      chamberMat.dispose();
      chamberCageGeo.dispose();
      chamberCageMat.dispose();
      conduitGeo.dispose();
      conduitMat.dispose();
      lavaLakeGeo.dispose();
      lavaLakeMat.dispose();
      craterGlowGeo.dispose();
      craterGlowMat.dispose();
      craterBillboardGeo.dispose();
      craterBillboardMat.dispose();
      plumeGeo.dispose();
      plumeMat.dispose();
      emberGeo.dispose();
      emberMat.dispose();
      starGeo.dispose();
      starMat.dispose();

      strataTexture.dispose();
      magmaTexture.dispose();
      rockTexture.dispose();
      smokeTexture.dispose();
      emberTexture.dispose();
      craterGlowTexture.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-slate-950">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};

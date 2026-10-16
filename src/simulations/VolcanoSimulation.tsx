import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createVolcanoStrataTexture, createMagmaGlowTexture } from '../lib/textures';
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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040814); // Deep space/night atmosphere
    scene.fog = new THREE.FogExp2(0x040814, 0.015);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 15, 32);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Lighting Rig
    const ambientLight = new THREE.AmbientLight(0x334466, 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.4);
    sunLight.position.set(20, 40, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 100;
    sunLight.shadow.camera.left = -25;
    sunLight.shadow.camera.right = 25;
    sunLight.shadow.camera.top = 25;
    sunLight.shadow.camera.bottom = -25;
    scene.add(sunLight);

    // Magma chamber internal warm point light
    const magmaChamberLight = new THREE.PointLight(0xff4400, 3, 20);
    magmaChamberLight.position.set(0, -3, 0);
    scene.add(magmaChamberLight);

    // Crater eruption glow light
    const craterLight = new THREE.PointLight(0xff7700, 2, 25);
    craterLight.position.set(0, 7.5, 0);
    scene.add(craterLight);

    // Ground plane
    const groundGeo = new THREE.PlaneGeometry(120, 120, 32, 32);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x111622,
      roughness: 0.9,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -6;
    ground.receiveShadow = true;
    scene.add(ground);

    // Ground grid overlay
    const grid = new THREE.GridHelper(100, 50, 0x00f0ff, 0x1b2838);
    grid.position.y = -5.98;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.25;
    scene.add(grid);

    // 5. Volcano Composite Group (3-12 parts)
    const volcanoGroup = new THREE.Group();
    scene.add(volcanoGroup);

    const strataTexture = createVolcanoStrataTexture();
    const magmaTexture = createMagmaGlowTexture();

    // Part A: Mountain Body (Cutaway Stratovolcano Cone)
    // We create a cylinder/cone with thetaLength depending on crossSection
    const coneRadiusTop = 1.2;
    const coneRadiusBottom = 14;
    const coneHeight = 13;
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

    const coneMat = new THREE.MeshStandardMaterial({
      color: 0x3d352e,
      roughness: 0.85,
      metalness: 0.15,
      side: THREE.DoubleSide,
    });
    const mountainMesh = new THREE.Mesh(coneGeoCut, coneMat);
    mountainMesh.position.y = 0.5;
    mountainMesh.castShadow = true;
    mountainMesh.receiveShadow = true;
    volcanoGroup.add(mountainMesh);

    // Part B: Geological Cross Section Slices (Strata layers visible inside cutaway)
    const sliceGeo1 = new THREE.PlaneGeometry(coneRadiusBottom, coneHeight);
    const sliceMat = new THREE.MeshStandardMaterial({
      map: strataTexture,
      roughness: 0.7,
      metalness: 0.2,
      side: THREE.DoubleSide,
    });
    const sliceMesh1 = new THREE.Mesh(sliceGeo1, sliceMat);
    sliceMesh1.position.set(coneRadiusBottom / 2, 0.5, 0);
    volcanoGroup.add(sliceMesh1);

    const sliceGeo2 = new THREE.PlaneGeometry(coneRadiusBottom, coneHeight);
    const sliceMesh2 = new THREE.Mesh(sliceGeo2, sliceMat);
    sliceMesh2.rotation.y = Math.PI / 2;
    sliceMesh2.position.set(0, 0.5, coneRadiusBottom / 2);
    volcanoGroup.add(sliceMesh2);

    // Part C: Magma Chamber (Subterranean pulsating reservoir)
    const chamberGeo = new THREE.SphereGeometry(2.4, 32, 32);
    const chamberMat = new THREE.MeshStandardMaterial({
      map: magmaTexture,
      emissive: 0xff3300,
      emissiveIntensity: 0.8,
      roughness: 0.3,
    });
    const magmaChamber = new THREE.Mesh(chamberGeo, chamberMat);
    magmaChamber.position.set(0, -3.2, 0);
    volcanoGroup.add(magmaChamber);

    // Magma Chamber wireframe / pressure gauge cage
    const chamberCageGeo = new THREE.SphereGeometry(2.6, 16, 16);
    const chamberCageMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      wireframe: true,
      transparent: true,
      opacity: 0.4,
    });
    const chamberCage = new THREE.Mesh(chamberCageGeo, chamberCageMat);
    chamberCage.position.copy(magmaChamber.position);
    volcanoGroup.add(chamberCage);

    // Part D: Central Conduit (Magma Pipe rising up to crater)
    const conduitGeo = new THREE.CylinderGeometry(0.55, 0.7, 10.5, 24);
    const conduitMat = new THREE.MeshStandardMaterial({
      map: magmaTexture,
      emissive: 0xff2200,
      emissiveIntensity: 0.7,
      roughness: 0.4,
    });
    const conduit = new THREE.Mesh(conduitGeo, conduitMat);
    conduit.position.set(0, 2.1, 0);
    volcanoGroup.add(conduit);

    // Part E: Crater Lava Lake (Molten surface pool)
    const lavaLakeGeo = new THREE.CylinderGeometry(1.15, 0.5, 0.4, 24);
    const lavaLakeMat = new THREE.MeshStandardMaterial({
      map: magmaTexture,
      emissive: 0xff5500,
      emissiveIntensity: 1.0,
      roughness: 0.2,
    });
    const lavaLake = new THREE.Mesh(lavaLakeGeo, lavaLakeMat);
    lavaLake.position.set(0, 6.9, 0);
    volcanoGroup.add(lavaLake);

    // 6. Particle Systems for Eruption
    // System A: Ash Plume (Expanding dark billowing cloud particles)
    const plumeCount = 600;
    const plumeGeo = new THREE.BufferGeometry();
    const plumePositions = new Float32Array(plumeCount * 3);
    const plumeSizes = new Float32Array(plumeCount);
    const plumeLifes = new Float32Array(plumeCount); // 0 to 1 life ratio
    const plumeSpeeds = new Float32Array(plumeCount);
    const plumeAngles = new Float32Array(plumeCount);

    for (let i = 0; i < plumeCount; i++) {
      plumeLifes[i] = Math.random();
      plumeSpeeds[i] = 4 + Math.random() * 8;
      plumeAngles[i] = Math.random() * Math.PI * 2;
      plumeSizes[i] = 0.5 + Math.random() * 2.5;

      plumePositions[i * 3 + 0] = 0;
      plumePositions[i * 3 + 1] = 7;
      plumePositions[i * 3 + 2] = 0;
    }

    plumeGeo.setAttribute('position', new THREE.BufferAttribute(plumePositions, 3));
    plumeGeo.setAttribute('size', new THREE.BufferAttribute(plumeSizes, 1));

    const plumeMat = new THREE.PointsMaterial({
      color: 0x4a4a55,
      size: 1.8,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const plumeParticles = new THREE.Points(plumeGeo, plumeMat);
    scene.add(plumeParticles);

    // System B: Incandescent Lava Bombs & Fire Embers
    const emberCount = 350;
    const emberGeo = new THREE.BufferGeometry();
    const emberPositions = new Float32Array(emberCount * 3);
    const emberVels = new Float32Array(emberCount * 3);
    const emberLifes = new Float32Array(emberCount);

    for (let i = 0; i < emberCount; i++) {
      emberLifes[i] = Math.random();
      emberPositions[i * 3 + 0] = 0;
      emberPositions[i * 3 + 1] = 7;
      emberPositions[i * 3 + 2] = 0;

      // Parabolic velocity outwards
      const theta = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 8;
      emberVels[i * 3 + 0] = Math.cos(theta) * speed;
      emberVels[i * 3 + 1] = 8 + Math.random() * 12;
      emberVels[i * 3 + 2] = Math.sin(theta) * speed;
    }

    emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPositions, 3));
    const emberMat = new THREE.PointsMaterial({
      color: 0xffaa22,
      size: 0.8,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const emberParticles = new THREE.Points(emberGeo, emberMat);
    scene.add(emberParticles);

    // System C: Ambient atmospheric ash / stars
    const starCount = 300;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3 + 0] = (Math.random() - 0.5) * 80;
      starPos[i * 3 + 1] = Math.random() * 50 - 5;
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0x88bbff,
      size: 0.35,
      transparent: true,
      opacity: 0.4,
    });
    const starParticles = new THREE.Points(starGeo, starMat);
    scene.add(starParticles);

    // 7. Interactive Orbit Controls (Zero-dependency mouse drag/zoom/pan)
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let spherical = {
      radius: 35,
      theta: Math.PI / 4,
      phi: Math.PI / 3,
    };
    let targetLookAt = new THREE.Vector3(0, 2, 0);

    const updateCameraFromSpherical = () => {
      spherical.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, spherical.phi));
      spherical.radius = Math.max(10, Math.min(70, spherical.radius));

      camera.position.x =
        targetLookAt.x +
        spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
      camera.position.y =
        targetLookAt.y + spherical.radius * Math.cos(spherical.phi);
      camera.position.z =
        targetLookAt.z +
        spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);

      camera.lookAt(targetLookAt);
    };
    updateCameraFromSpherical();

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouseX;
      const dy = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      spherical.theta -= dx * 0.008;
      spherical.phi -= dy * 0.008;
      updateCameraFromSpherical();
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      spherical.radius += e.deltaY * 0.03;
      updateCameraFromSpherical();
    };

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    container.addEventListener('wheel', onWheel, { passive: false });

    // 8. Animation & Physics Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      const currentVars = varsRef.current;
      const pressure = currentVars.pressure ?? 50;
      const gas = currentVars.gasContent ?? 45;
      const resistance = currentVars.ventResistance ?? 50;
      const viscosity = currentVars.magmaViscosity ?? 40;

      // Check Cross Section toggle change
      const isCut = crossSectionRef.current;
      mountainMesh.geometry = isCut ? coneGeoCut : coneGeoFull;
      sliceMesh1.visible = isCut;
      sliceMesh2.visible = isCut;

      // Handle Camera Presets with smooth exponential damping
      const preset = presetRef.current;
      let targetSphericalRadius = spherical.radius;
      let targetSphericalTheta = spherical.theta;
      let targetSphericalPhi = spherical.phi;
      let targetTargetY = 2;

      if (preset === 'cross_section') {
        targetSphericalRadius = 26;
        targetSphericalTheta = 0.8;
        targetSphericalPhi = 1.35;
        targetTargetY = 0;
      } else if (preset === 'crater_top') {
        targetSphericalRadius = 16;
        targetSphericalTheta = 0;
        targetSphericalPhi = 0.3;
        targetTargetY = 7;
      } else if (preset === 'magma_core') {
        targetSphericalRadius = 14;
        targetSphericalTheta = 0.75;
        targetSphericalPhi = 1.45;
        targetTargetY = -2.5;
      } else if (preset === 'panorama') {
        targetSphericalRadius = 45;
        targetSphericalTheta = Math.PI / 4;
        targetSphericalPhi = 1.1;
        targetTargetY = 3;
      }

      // Smooth interpolation
      spherical.radius = THREE.MathUtils.damp(spherical.radius, targetSphericalRadius, 4, dt);
      spherical.theta = THREE.MathUtils.damp(spherical.theta, targetSphericalTheta, 4, dt);
      spherical.phi = THREE.MathUtils.damp(spherical.phi, targetSphericalPhi, 4, dt);
      targetLookAt.y = THREE.MathUtils.damp(targetLookAt.y, targetTargetY, 4, dt);
      updateCameraFromSpherical();

      // Dynamic Magma Chamber Expansion with Pressure
      const pressureScale = 1.0 + (pressure / 100) * 0.45;
      const pulseRate = 1.5 + (pressure / 100) * 4.0;
      const pulse = Math.sin(elapsed * pulseRate) * 0.05 * (pressure / 100);
      magmaChamber.scale.set(
        pressureScale + pulse,
        pressureScale + pulse,
        pressureScale + pulse
      );
      chamberCage.scale.set(
        (pressureScale + pulse) * 1.08,
        (pressureScale + pulse) * 1.08,
        (pressureScale + pulse) * 1.08
      );
      chamberCage.rotation.y = elapsed * 0.4;
      chamberCage.rotation.x = elapsed * 0.2;

      // Color/Emissive Intensity based on pressure and viscosity
      const emissiveIntensity = 0.4 + (pressure / 100) * 1.6;
      (magmaChamber.material as THREE.MeshStandardMaterial).emissiveIntensity = emissiveIntensity;
      (conduit.material as THREE.MeshStandardMaterial).emissiveIntensity = emissiveIntensity * 0.8;
      magmaChamberLight.intensity = 1.5 + (pressure / 100) * 5.0;

      // Threshold Physics calculation:
      // Critical threshold = resistance * 1.15. If pressure * (1 + gas*0.5) > threshold -> Eruption!
      const effectiveDrive = pressure * (1 + (gas / 100) * 0.55);
      const isErupting = effectiveDrive > resistance * 0.9;

      // Audio feedback when transitioning into explosive eruption
      if (isErupting && !prevEruptingRef.current) {
        sound.playRumble(effectiveDrive / 100);
      }
      prevEruptingRef.current = isErupting;

      // Metrics calculation
      const plumeHeightKm = isErupting
        ? (2.0 + Math.pow((pressure * gas) / 100, 0.68) * 0.35).toFixed(1)
        : '0.0';
      const vei = isErupting
        ? Math.min(6, Math.floor((effectiveDrive / 150) * 5 + (gas > 75 ? 1 : 0)))
        : 0;
      const conduitSpeed = isErupting
        ? ((effectiveDrive / 100) * 180 + (100 - viscosity) * 0.8).toFixed(0)
        : '0';

      let eruptionType = '휴면 (Dormant)';
      if (isErupting) {
        if (vei <= 1) eruptionType = '하와이식 유출 (Hawaiian Effusive)';
        else if (vei === 2) eruptionType = '스트롬볼리식 간헐 분출 (Strombolian)';
        else if (vei <= 4) eruptionType = '불카니식 폭발 (Vulcanian)';
        else eruptionType = '플리니식 초거대 대폭발 (Plinian Cataclysm)';
      }

      if (onUpdateMetrics) {
        onUpdateMetrics({
          plumeHeight: `${plumeHeightKm} km`,
          veiScale: `VEI-${vei} (${eruptionType.split(' ')[0]})`,
          conduitVelocity: `${conduitSpeed} m/s`,
          eruptionType,
          chamberStress: `${(pressure * 1.8).toFixed(0)} MPa`,
        });
      }

      // Eruption visual effects
      craterLight.intensity = isErupting ? 3 + (pressure / 100) * 6 : 0.5;

      // Update Ash Plume Particles
      const plumePosArr = plumePositions;
      const plumeSpeedFactor = isErupting ? (effectiveDrive / 100) * 1.8 : 0.2;
      for (let i = 0; i < plumeCount; i++) {
        plumeLifes[i] += dt * 0.35 * plumeSpeedFactor;
        if (plumeLifes[i] > 1.0) {
          plumeLifes[i] = 0;
          plumePositions[i * 3 + 0] = (Math.random() - 0.5) * 0.6;
          plumePositions[i * 3 + 1] = 7.0;
          plumePositions[i * 3 + 2] = (Math.random() - 0.5) * 0.6;
        }

        const t = plumeLifes[i];
        const heightMax = isErupting ? 8 + Number(plumeHeightKm) * 0.8 : 3;
        plumePositions[i * 3 + 1] = 7.0 + t * heightMax;

        // Radial expansion of the ash umbrella head
        const spread = Math.pow(t, 1.4) * (2.0 + (gas / 100) * 7.0);
        const ang = plumeAngles[i] + t * 2.0;
        plumePositions[i * 3 + 0] = Math.cos(ang) * spread;
        plumePositions[i * 3 + 2] = Math.sin(ang) * spread;
      }
      plumeGeo.attributes.position.needsUpdate = true;
      plumeMat.opacity = isErupting ? 0.75 : 0.2;

      // Update Lava Bombs
      const emberPosArr = emberPositions;
      for (let i = 0; i < emberCount; i++) {
        emberLifes[i] += dt * 0.8;
        if (emberLifes[i] > 1.0) {
          emberLifes[i] = 0;
          emberPositions[i * 3 + 0] = (Math.random() - 0.5) * 0.4;
          emberPositions[i * 3 + 1] = 7.0;
          emberPositions[i * 3 + 2] = (Math.random() - 0.5) * 0.4;

          const theta = Math.random() * Math.PI * 2;
          const launchP = isErupting ? (effectiveDrive / 100) * 14 + 4 : 2;
          emberVels[i * 3 + 0] = Math.cos(theta) * launchP * (0.3 + Math.random() * 0.7);
          emberVels[i * 3 + 1] = launchP * (0.8 + Math.random() * 0.8);
          emberVels[i * 3 + 2] = Math.sin(theta) * launchP * (0.3 + Math.random() * 0.7);
        }

        // Projectile physics: x += vx*dt, y += vy*dt - 0.5*g*dt^2
        if (isErupting) {
          emberPositions[i * 3 + 0] += emberVels[i * 3 + 0] * dt;
          emberPositions[i * 3 + 1] += emberVels[i * 3 + 1] * dt - 9.8 * dt * dt * 0.5;
          emberPositions[i * 3 + 2] += emberVels[i * 3 + 2] * dt;
          emberVels[i * 3 + 1] -= 15.0 * dt; // gravity
        } else {
          emberPositions[i * 3 + 1] = -100; // hide below
        }
      }
      emberGeo.attributes.position.needsUpdate = true;
      emberMat.opacity = isErupting ? 0.95 : 0.0;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('wheel', onWheel);

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
      plumeGeo.dispose();
      plumeMat.dispose();
      emberGeo.dispose();
      emberMat.dispose();
      starGeo.dispose();
      starMat.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-full select-none overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createSunTexture, createEarthTexture, createMoonTexture } from '../lib/textures';
import { sound } from '../lib/audio';

interface SolarSystemSimulationProps {
  variables: Record<string, number>;
  cameraPreset: string;
  showOrbits?: boolean;
  onUpdateMetrics?: (metrics: Record<string, number | string>) => void;
}

export const SolarSystemSimulation: React.FC<SolarSystemSimulationProps> = ({
  variables,
  cameraPreset,
  showOrbits = true,
  onUpdateMetrics,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const varsRef = useRef(variables);
  varsRef.current = variables;

  const presetRef = useRef(cameraPreset);
  presetRef.current = cameraPreset;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x02040a);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      2000
    );
    camera.position.set(0, 30, 45);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Starfield background
    const starCount = 1500;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 350 + Math.random() * 200;
      const sinPhi = Math.sin(phi);

      starPositions[i * 3 + 0] = r * sinPhi * Math.cos(theta);
      starPositions[i * 3 + 1] = r * sinPhi * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);

      // Star color temperatures (blue, white, warm yellow)
      const colorType = Math.random();
      if (colorType > 0.8) {
        starColors[i * 3 + 0] = 0.7;
        starColors[i * 3 + 1] = 0.85;
        starColors[i * 3 + 2] = 1.0; // Blue star
      } else if (colorType > 0.4) {
        starColors[i * 3 + 0] = 1.0;
        starColors[i * 3 + 1] = 1.0;
        starColors[i * 3 + 2] = 1.0; // White star
      } else {
        starColors[i * 3 + 0] = 1.0;
        starColors[i * 3 + 1] = 0.8;
        starColors[i * 3 + 2] = 0.5; // Yellow/orange star
      }
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({
      size: 1.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // 5. Lighting
    // Sun emits light omnidirectionally
    const sunLight = new THREE.PointLight(0xffffff, 3.5, 400, 0.4);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);

    // Ambient space illumination so dark sides of planets have subtle rim depth
    const ambientLight = new THREE.AmbientLight(0x1a2638, 0.35);
    scene.add(ambientLight);

    // 6. Celestial Bodies
    // Sun
    const sunTexture = createSunTexture();
    const sunGeo = new THREE.SphereGeometry(4.2, 48, 48);
    const sunMat = new THREE.MeshBasicMaterial({
      map: sunTexture,
    });
    const sun = new THREE.Mesh(sunGeo, sunMat);
    scene.add(sun);

    // Solar Corona Glow Halo (Outer shell with additive blending)
    const coronaGeo = new THREE.SphereGeometry(4.8, 32, 32);
    const coronaMat = new THREE.MeshBasicMaterial({
      color: 0xffaa33,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    });
    const sunCorona = new THREE.Mesh(coronaGeo, coronaMat);
    scene.add(sunCorona);

    // Solar Granulation Outer Flux
    const flareCount = 150;
    const flareGeo = new THREE.BufferGeometry();
    const flarePos = new Float32Array(flareCount * 3);
    for (let i = 0; i < flareCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;
      const r = 4.3 + Math.random() * 0.8;
      flarePos[i * 3 + 0] = r * Math.cos(phi) * Math.cos(theta);
      flarePos[i * 3 + 1] = r * Math.sin(phi);
      flarePos[i * 3 + 2] = r * Math.cos(phi) * Math.sin(theta);
    }
    flareGeo.setAttribute('position', new THREE.BufferAttribute(flarePos, 3));
    const flareMat = new THREE.PointsMaterial({
      color: 0xff8800,
      size: 0.8,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });
    const solarFlares = new THREE.Points(flareGeo, flareMat);
    scene.add(solarFlares);

    // Earth System Group (Pivot & Tilts)
    const earthOrbitRadiusBase = 22;
    const earthSystem = new THREE.Group();
    scene.add(earthSystem);

    // Earth Axial Tilt (23.44 degrees = 0.409 rad)
    const earthTiltGroup = new THREE.Group();
    earthTiltGroup.rotation.z = 0.409;
    earthSystem.add(earthTiltGroup);

    // Earth Mesh
    const earthTexture = createEarthTexture();
    const earthGeo = new THREE.SphereGeometry(1.6, 48, 48);
    const earthMat = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 0.7,
      metalness: 0.1,
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    earthTiltGroup.add(earth);

    // Earth Atmosphere Rim
    const atmoGeo = new THREE.SphereGeometry(1.68, 32, 32);
    const atmoMat = new THREE.MeshBasicMaterial({
      color: 0x4cc9f0,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    });
    const earthAtmo = new THREE.Mesh(atmoGeo, atmoMat);
    earthTiltGroup.add(earthAtmo);

    // Moon System (Orbiting around Earth)
    const moonTexture = createMoonTexture();
    const moonGeo = new THREE.SphereGeometry(0.55, 32, 32);
    const moonMat = new THREE.MeshStandardMaterial({
      map: moonTexture,
      roughness: 0.85,
      metalness: 0.05,
    });
    const moon = new THREE.Mesh(moonGeo, moonMat);
    earthSystem.add(moon);

    // Tidal Bulge Vector Arrow (pointing towards Moon)
    const tidalArrowGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.8, 12);
    const tidalArrowMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.7,
    });
    const tidalArrow = new THREE.Mesh(tidalArrowGeo, tidalArrowMat);
    tidalArrow.rotation.z = Math.PI / 2;
    earthSystem.add(tidalArrow);

    // Orbit Lines
    // Earth Orbit Path
    const earthOrbitPts: THREE.Vector3[] = [];
    const orbitSegments = 120;
    for (let i = 0; i <= orbitSegments; i++) {
      const angle = (i / orbitSegments) * Math.PI * 2;
      earthOrbitPts.push(
        new THREE.Vector3(
          Math.cos(angle) * earthOrbitRadiusBase,
          0,
          Math.sin(angle) * earthOrbitRadiusBase
        )
      );
    }
    const earthOrbitGeo = new THREE.BufferGeometry().setFromPoints(earthOrbitPts);
    const earthOrbitMat = new THREE.LineBasicMaterial({
      color: 0x225588,
      transparent: true,
      opacity: 0.45,
    });
    const earthOrbitLine = new THREE.Line(earthOrbitGeo, earthOrbitMat);
    scene.add(earthOrbitLine);

    // Moon Orbit Trail Line
    const moonOrbitPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 64; i++) {
      const angle = (i / 64) * Math.PI * 2;
      moonOrbitPts.push(new THREE.Vector3(Math.cos(angle) * 4.8, 0, Math.sin(angle) * 4.8));
    }
    const moonOrbitGeo = new THREE.BufferGeometry().setFromPoints(moonOrbitPts);
    const moonOrbitMat = new THREE.LineBasicMaterial({
      color: 0x667799,
      transparent: true,
      opacity: 0.4,
    });
    const moonOrbitLine = new THREE.Line(moonOrbitGeo, moonOrbitMat);
    earthSystem.add(moonOrbitLine);

    // 7. Interactive Orbit Controls
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let spherical = {
      radius: 50,
      theta: Math.PI / 3,
      phi: Math.PI / 3.5,
    };
    let targetLookAt = new THREE.Vector3(0, 0, 0);

    const updateCamera = () => {
      spherical.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.02, spherical.phi));
      spherical.radius = Math.max(8, Math.min(180, spherical.radius));

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
    updateCamera();

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

      spherical.theta -= dx * 0.007;
      spherical.phi -= dy * 0.007;
      updateCamera();
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      spherical.radius += e.deltaY * 0.04;
      updateCamera();
    };

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    container.addEventListener('wheel', onWheel, { passive: false });

    // 8. Animation & Physics Simulation Loop
    let animId: number;
    const clock = new THREE.Clock();
    let simTime = 0;
    let earthOrbitAngle = 0;
    let moonOrbitAngle = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const dt = clock.getDelta();

      const currentVars = varsRef.current;
      const timeScale = currentVars.timeScale ?? 1.5;
      const gravity = currentVars.gravityMultiplier ?? 1.0;
      const moonDistMult = currentVars.moonDistanceMultiplier ?? 1.0;
      const earthVelMult = currentVars.earthOrbitalSpeed ?? 1.0;

      // Celestial Dynamics:
      // Kepler's Third Law: v ~ sqrt(G / r), Period ~ r^(3/2) / sqrt(G)
      const baseEarthSpeed = 0.28 * Math.sqrt(gravity) * earthVelMult;
      const simDelta = dt * timeScale;
      simTime += simDelta;

      earthOrbitAngle += baseEarthSpeed * simDelta;
      // Moon orbits Earth ~13.3 times faster than Earth orbits Sun
      const moonOrbitSpeed = (3.2 / Math.sqrt(moonDistMult)) * Math.sqrt(gravity);
      moonOrbitAngle += moonOrbitSpeed * simDelta;

      // Dynamic Earth Orbit Radius (if earth speed is varied, eccentricity changes!)
      // r = r0 / (2 - (v/v0)^2) approximately near perihelion
      const orbitalRadius = earthOrbitRadiusBase * Math.max(0.6, Math.min(2.5, (earthVelMult * earthVelMult) / gravity));

      // Earth position in heliocentric space
      const earthX = Math.cos(earthOrbitAngle) * orbitalRadius;
      const earthZ = Math.sin(earthOrbitAngle) * orbitalRadius;
      earthSystem.position.set(earthX, 0, earthZ);

      // Earth self-rotation (Day / Night cycle)
      earth.rotation.y += 1.8 * simDelta;

      // Sun self-rotation & coronal flare movement
      sun.rotation.y += 0.15 * simDelta;
      solarFlares.rotation.y += 0.25 * simDelta;
      sunCorona.scale.setScalar(1.0 + Math.sin(simTime * 3.0) * 0.03);

      // Moon position relative to Earth
      const moonOrbitRadius = 4.8 * moonDistMult;
      const moonX = Math.cos(moonOrbitAngle) * moonOrbitRadius;
      const moonY = Math.sin(moonOrbitAngle * 0.5) * 0.4; // 5 degree lunar inclination
      const moonZ = Math.sin(moonOrbitAngle) * moonOrbitRadius;
      moon.position.set(moonX, moonY, moonZ);

      // Tidal Bulge alignment: tidal arrow points directly towards the moon
      tidalArrow.lookAt(moon.position);
      tidalArrow.rotateY(Math.PI / 2);
      const tidalStrength = Math.min(4.0, 1.0 / Math.pow(moonDistMult, 3));
      tidalArrow.scale.set(tidalStrength, tidalStrength, tidalStrength);

      // Moon orbit line radius update
      moonOrbitLine.scale.set(moonDistMult, moonDistMult, moonDistMult);

      // Handle Camera Presets
      const preset = presetRef.current;
      let targetCenter = new THREE.Vector3(0, 0, 0);
      let targetRadius = spherical.radius;

      if (preset === 'heliocentric') {
        targetCenter.set(0, 0, 0);
        targetRadius = 60;
      } else if (preset === 'earth_moon') {
        targetCenter.copy(earthSystem.position);
        targetRadius = 14;
      } else if (preset === 'sun_focus') {
        targetCenter.set(0, 0, 0);
        targetRadius = 12;
      } else if (preset === 'lunar_plane') {
        targetCenter.copy(earthSystem.position);
        targetRadius = 8;
        spherical.phi = THREE.MathUtils.damp(spherical.phi, 1.5, 4, dt);
      }

      // Smooth camera target tracking
      targetLookAt.lerp(targetCenter, 0.08);
      spherical.radius = THREE.MathUtils.damp(spherical.radius, targetRadius, 3, dt);
      updateCamera();

      // Telemetry Calculations
      const periodDays = (365.25 / (Math.sqrt(gravity) * earthVelMult)).toFixed(1);
      const moonPeriodDays = (27.3 * Math.sqrt(Math.pow(moonDistMult, 3) / gravity)).toFixed(1);
      const tidalIndex = (1.0 / Math.pow(moonDistMult, 3)).toFixed(2);
      const orbitalVelocity = (29.78 * Math.sqrt(gravity) * earthVelMult).toFixed(1);

      let eccentricity = Math.abs(1.0 - earthVelMult).toFixed(2);
      if (earthVelMult > 1.41) eccentricity = '> 1.0 (탈출 쌍곡선)';

      if (onUpdateMetrics) {
        onUpdateMetrics({
          orbitalPeriod: `${periodDays} 일 (지구년)`,
          moonPeriod: `${moonPeriodDays} 일 (항성월)`,
          tidalForceIndex: `${tidalIndex}x (기준 1.0)`,
          orbitalVelocity: `${orbitalVelocity} km/s`,
          orbitEccentricity: eccentricity,
          currentSeason:
            Math.sin(earthOrbitAngle) > 0.5
              ? '북반구 여름 (Summer Solstice)'
              : Math.sin(earthOrbitAngle) < -0.5
              ? '북반구 겨울 (Winter Solstice)'
              : '춘분/추분 (Equinox)',
        });
      }

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
      starGeo.dispose();
      starMat.dispose();
      sunGeo.dispose();
      sunMat.dispose();
      coronaGeo.dispose();
      coronaMat.dispose();
      flareGeo.dispose();
      flareMat.dispose();
      earthGeo.dispose();
      earthMat.dispose();
      atmoGeo.dispose();
      atmoMat.dispose();
      moonGeo.dispose();
      moonMat.dispose();
      tidalArrowGeo.dispose();
      tidalArrowMat.dispose();
      earthOrbitGeo.dispose();
      earthOrbitMat.dispose();
      moonOrbitGeo.dispose();
      moonOrbitMat.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-full select-none overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};

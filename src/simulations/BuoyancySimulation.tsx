import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface BuoyancySimulationProps {
  variables: Record<string, number>;
  cameraPreset: string;
  onUpdateMetrics?: (metrics: Record<string, number | string>) => void;
}

export const BuoyancySimulation: React.FC<BuoyancySimulationProps> = ({
  variables,
  cameraPreset,
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
    scene.background = new THREE.Color(0x060b14);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 8, 22);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Lighting Rig
    const ambientLight = new THREE.AmbientLight(0x2a3d54, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(10, 20, 15);
    scene.add(dirLight);

    const rimLight = new THREE.PointLight(0x00f0ff, 1.5, 30);
    rimLight.position.set(-10, 5, -10);
    scene.add(rimLight);

    // 5. Laboratory Table & Tank Structure
    const tableGeo = new THREE.BoxGeometry(24, 0.8, 18);
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x141a26,
      roughness: 0.8,
      metalness: 0.2,
    });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.y = -5.4;
    scene.add(table);

    // Glass Tank (Outer Shell)
    const tankWidth = 10;
    const tankHeight = 10;
    const tankDepth = 10;
    const tankGeo = new THREE.BoxGeometry(tankWidth, tankHeight, tankDepth);
    const tankMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.92,
      opacity: 1,
      transparent: true,
      roughness: 0.05,
      ior: 1.5,
      thickness: 0.4,
      depthWrite: false,
    });
    const tank = new THREE.Mesh(tankGeo, tankMat);
    tank.position.y = 0;
    scene.add(tank);

    // Fluid Body inside tank
    const fluidGeo = new THREE.BoxGeometry(tankWidth - 0.2, 7.5, tankDepth - 0.2);
    const fluidMat = new THREE.MeshPhysicalMaterial({
      color: 0x0099ff,
      transmission: 0.82,
      roughness: 0.1,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });
    const fluid = new THREE.Mesh(fluidGeo, fluidMat);
    fluid.position.y = -1.25; // Surface at y = 2.5
    scene.add(fluid);

    // Floating Test Object (Block)
    const blockBaseSize = 2.4;
    const blockGeo = new THREE.BoxGeometry(blockBaseSize, blockBaseSize, blockBaseSize);
    const blockMat = new THREE.MeshStandardMaterial({
      color: 0xd4a373,
      roughness: 0.4,
      metalness: 0.3,
    });
    const block = new THREE.Mesh(blockGeo, blockMat);
    scene.add(block);

    // Force Vector Arrows (Procedural 3D arrow meshes)
    // 1. Buoyant Force (Green arrow pointing UP from submerged center)
    const buoyArrowGroup = new THREE.Group();
    const arrowShaftGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.0, 12);
    const arrowHeadGeo = new THREE.ConeGeometry(0.25, 0.6, 12);

    const buoyMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
    const buoyShaft = new THREE.Mesh(arrowShaftGeo, buoyMat);
    buoyShaft.position.y = 1.0;
    const buoyHead = new THREE.Mesh(arrowHeadGeo, buoyMat);
    buoyHead.position.y = 2.3;
    buoyArrowGroup.add(buoyShaft);
    buoyArrowGroup.add(buoyHead);
    scene.add(buoyArrowGroup);

    // 2. Gravitational Weight Force (Red arrow pointing DOWN from center of mass)
    const gravArrowGroup = new THREE.Group();
    const gravMat = new THREE.MeshBasicMaterial({ color: 0xff3355 });
    const gravShaft = new THREE.Mesh(arrowShaftGeo, gravMat);
    gravShaft.position.y = -1.0;
    const gravHead = new THREE.Mesh(arrowHeadGeo, gravMat);
    gravHead.position.y = -2.3;
    gravHead.rotation.x = Math.PI;
    gravArrowGroup.add(gravShaft);
    gravArrowGroup.add(gravHead);
    scene.add(gravArrowGroup);

    // Calibration measurement grid lines on glass
    const gridLines = new THREE.GridHelper(tankWidth, 10, 0x00f0ff, 0x224466);
    gridLines.position.set(0, -5.0 + tankHeight / 2, tankDepth / 2 + 0.02);
    gridLines.rotation.x = Math.PI / 2;
    scene.add(gridLines);

    // 6. Interactive Orbit Controls
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let spherical = {
      radius: 24,
      theta: 0.4,
      phi: 1.25,
    };
    let targetLookAt = new THREE.Vector3(0, 0.5, 0);

    const updateCamera = () => {
      spherical.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.02, spherical.phi));
      spherical.radius = Math.max(8, Math.min(60, spherical.radius));

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

      spherical.theta -= dx * 0.008;
      spherical.phi -= dy * 0.008;
      updateCamera();
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      spherical.radius += e.deltaY * 0.03;
      updateCamera();
    };

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    container.addEventListener('wheel', onWheel, { passive: false });

    // 7. Animation Loop with Hydrostatic Physics
    let animId: number;
    const clock = new THREE.Clock();
    let currentBlockY = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      const currentVars = varsRef.current;
      const fluidDensity = currentVars.fluidDensity ?? 1000;
      const objectDensity = currentVars.objectDensity ?? 700;
      const volume = currentVars.objectVolume ?? 1.0;
      const gravity = currentVars.gravity ?? 9.8;

      // Adjust fluid visual appearance according to density
      // Water: blue; Mercury: shiny silver mirror; Oil: amber yellow
      if (fluidDensity > 10000) {
        fluidMat.color.setHex(0xb0b7bd); // Mercury silver
        fluidMat.roughness = 0.05;
        fluidMat.metalness = 0.9;
        fluidMat.transmission = 0.1;
      } else if (fluidDensity < 850) {
        fluidMat.color.setHex(0xe9c46a); // Oil amber
        fluidMat.metalness = 0.0;
        fluidMat.transmission = 0.85;
      } else {
        fluidMat.color.setHex(0x0099ff); // Water blue
        fluidMat.metalness = 0.0;
        fluidMat.transmission = 0.82;
      }

      // Physics: Archimedes Principle
      // Water level is at Y = 2.5
      const waterSurfaceY = 2.5;
      const tankBottomY = -5.0;

      // Object dimensions based on volume
      const side = Math.cbrt(volume) * 2.0;
      block.scale.set(side / blockBaseSize, side / blockBaseSize, side / blockBaseSize);

      // Mass = Density * Volume
      const mass = objectDensity * volume;
      const weightForce = mass * gravity; // N

      // Density ratio
      const densityRatio = objectDensity / fluidDensity;
      let submergedFraction = Math.min(1.0, densityRatio);
      let targetY: number;
      let actualBuoyancyForce: number;

      if (densityRatio < 1.0) {
        // Floating: submerged fraction = densityRatio
        // Submerged height = side * densityRatio
        // Bottom of block is at (waterSurfaceY - side * densityRatio)
        // Center of block is at (waterSurfaceY - side * densityRatio + side / 2)
        targetY = waterSurfaceY - side * densityRatio + side / 2;
        actualBuoyancyForce = weightForce; // In equilibrium
      } else {
        // Sinking: hits tank bottom
        targetY = tankBottomY + side / 2;
        actualBuoyancyForce = fluidDensity * volume * gravity;
      }

      // Small buoyancy wave bobbing if floating
      const bobbing = densityRatio < 1.0 ? Math.sin(elapsed * 2.5) * 0.04 : 0;
      currentBlockY = THREE.MathUtils.damp(currentBlockY, targetY + bobbing, 6, dt);
      block.position.set(0, currentBlockY, 0);

      // Update Force Vector arrows
      buoyArrowGroup.position.set(0.6, currentBlockY, 0);
      gravArrowGroup.position.set(-0.6, currentBlockY, 0);

      const forceScale = 0.0003;
      const buoyArrowScale = Math.max(0.4, Math.min(2.5, actualBuoyancyForce * forceScale));
      const gravArrowScale = Math.max(0.4, Math.min(2.5, weightForce * forceScale));
      buoyArrowGroup.scale.set(1, buoyArrowScale, 1);
      gravArrowGroup.scale.set(1, gravArrowScale, 1);

      // Camera presets
      const preset = presetRef.current;
      let targetCenter = new THREE.Vector3(0, 0.5, 0);
      let targetRadius = spherical.radius;

      if (preset === 'waterline') {
        targetCenter.set(0, 2.5, 0);
        targetRadius = 14;
        spherical.phi = THREE.MathUtils.damp(spherical.phi, 1.45, 4, dt);
      } else if (preset === 'force_vectors') {
        targetCenter.set(0, currentBlockY, 0);
        targetRadius = 10;
      } else if (preset === 'top_view') {
        targetCenter.set(0, 0, 0);
        targetRadius = 18;
        spherical.phi = THREE.MathUtils.damp(spherical.phi, 0.2, 4, dt);
      } else {
        targetRadius = 24;
      }

      targetLookAt.lerp(targetCenter, 0.08);
      spherical.radius = THREE.MathUtils.damp(spherical.radius, targetRadius, 3, dt);
      updateCamera();

      // Telemetry update
      if (onUpdateMetrics) {
        let stateStr = '완전 부유 (Floating)';
        if (densityRatio >= 0.98 && densityRatio <= 1.02) {
          stateStr = '중성 부력 (Neutral Equilibrium)';
        } else if (densityRatio > 1.0) {
          stateStr = '바닥 침강 (Sunken to Bottom)';
        }

        onUpdateMetrics({
          buoyantForce: `${actualBuoyancyForce.toFixed(1)} N`,
          gravitationalForce: `${weightForce.toFixed(1)} N`,
          submergedRatio: `${(submergedFraction * 100).toFixed(1)} %`,
          netState: stateStr,
          densityRatio: densityRatio.toFixed(3),
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
      tableGeo.dispose();
      tableMat.dispose();
      tankGeo.dispose();
      tankMat.dispose();
      fluidGeo.dispose();
      fluidMat.dispose();
      blockGeo.dispose();
      blockMat.dispose();
      arrowShaftGeo.dispose();
      arrowHeadGeo.dispose();
      buoyMat.dispose();
      gravMat.dispose();
      gridLines.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-full select-none overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};

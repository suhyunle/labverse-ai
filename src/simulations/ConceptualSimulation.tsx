import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ConceptualSimulationProps {
  variables: Record<string, number>;
  cameraPreset: string;
  onUpdateMetrics?: (metrics: Record<string, number | string>) => void;
}

export const ConceptualSimulation: React.FC<ConceptualSimulationProps> = ({
  variables,
  cameraPreset,
  onUpdateMetrics,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const varsRef = useRef(variables);
  varsRef.current = variables;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050814);

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 12, 28);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0x223355, 0.8);
    scene.add(ambientLight);

    const light1 = new THREE.PointLight(0x00f0ff, 2.5, 40);
    light1.position.set(10, 15, 10);
    scene.add(light1);

    const light2 = new THREE.PointLight(0xa855f7, 2.5, 40);
    light2.position.set(-10, -10, -10);
    scene.add(light2);

    // Central Core System (Holographic Reactor / Molecular Network)
    const nodeGroup = new THREE.Group();
    scene.add(nodeGroup);

    const nodeCount = 7;
    const nodes: THREE.Mesh[] = [];
    const nodeGeo = new THREE.SphereGeometry(1.0, 32, 32);

    for (let i = 0; i < nodeCount; i++) {
      const nodeMat = new THREE.MeshStandardMaterial({
        color: i === 0 ? 0x00f0ff : 0x818cf8,
        emissive: i === 0 ? 0x0099bb : 0x4f46e5,
        emissiveIntensity: 0.6,
        roughness: 0.2,
        metalness: 0.5,
      });
      const node = new THREE.Mesh(nodeGeo, nodeMat);
      if (i === 0) {
        node.scale.set(1.8, 1.8, 1.8);
        node.position.set(0, 0, 0);
      } else {
        const angle = ((i - 1) / (nodeCount - 1)) * Math.PI * 2;
        node.position.set(Math.cos(angle) * 7.0, Math.sin(angle * 2) * 1.5, Math.sin(angle) * 7.0);
      }
      nodeGroup.add(node);
      nodes.push(node);
    }

    // Interconnecting Energy Bonds
    const linesGroup = new THREE.Group();
    scene.add(linesGroup);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.5,
    });

    const updateLines = () => {
      linesGroup.clear();
      for (let i = 1; i < nodeCount; i++) {
        const pts = [nodes[0].position, nodes[i].position];
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const line = new THREE.Line(geo, lineMat);
        linesGroup.add(line);
      }
    };
    updateLines();

    // Orbital Flux Particles
    const particleCount = 400;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(particleCount * 3);
    const pAngles = new Float32Array(particleCount);
    const pRadii = new Float32Array(particleCount);
    const pSpeeds = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      pAngles[i] = Math.random() * Math.PI * 2;
      pRadii[i] = 3.5 + Math.random() * 8.0;
      pSpeeds[i] = 0.5 + Math.random() * 2.0;

      pPos[i * 3 + 0] = Math.cos(pAngles[i]) * pRadii[i];
      pPos[i * 3 + 1] = (Math.random() - 0.5) * 4.0;
      pPos[i * 3 + 2] = Math.sin(pAngles[i]) * pRadii[i];
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 0.45,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // Orbit Controls
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let spherical = { radius: 30, theta: 0.5, phi: 1.1 };
    let targetLookAt = new THREE.Vector3(0, 0, 0);

    const updateCamera = () => {
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
    updateCamera();

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      spherical.theta -= (e.clientX - prevMouseX) * 0.007;
      spherical.phi -= (e.clientY - prevMouseY) * 0.007;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
      updateCamera();
    };
    const onPointerUp = () => (isDragging = false);
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      spherical.radius += e.deltaY * 0.03;
      updateCamera();
    };

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    container.addEventListener('wheel', onWheel, { passive: false });

    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      const currentVars = varsRef.current;
      const intensity = (currentVars.intensity ?? 50) / 100;
      const rate = (currentVars.reactionRate ?? 45) / 50;

      nodeGroup.rotation.y = elapsed * 0.3 * rate;

      // Pulse nodes with energy
      for (let i = 1; i < nodeCount; i++) {
        const baseRadius = 6.0 + intensity * 3.0;
        const angle = ((i - 1) / (nodeCount - 1)) * Math.PI * 2 + elapsed * 0.4 * rate;
        nodes[i].position.set(
          Math.cos(angle) * baseRadius,
          Math.sin(angle * 2) * (1.0 + intensity * 2.0),
          Math.sin(angle) * baseRadius
        );
      }
      updateLines();

      // Particle circulation
      const posArr = pPos;
      for (let i = 0; i < particleCount; i++) {
        pAngles[i] += dt * pSpeeds[i] * rate * (1.0 + intensity);
        posArr[i * 3 + 0] = Math.cos(pAngles[i]) * (pRadii[i] + Math.sin(elapsed * 2 + i) * 0.5);
        posArr[i * 3 + 2] = Math.sin(pAngles[i]) * (pRadii[i] + Math.sin(elapsed * 2 + i) * 0.5);
      }
      pGeo.attributes.position.needsUpdate = true;

      if (onUpdateMetrics) {
        onUpdateMetrics({
          energyYield: `${(intensity * 1450).toFixed(0)} kJ`,
          equilibriumIndex: `${(85 - intensity * 25).toFixed(1)} %`,
          systemResonance: `${(rate * 12.4).toFixed(1)} Hz`,
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
      nodeGeo.dispose();
      pGeo.dispose();
      pMat.dispose();
      lineMat.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-full select-none overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};

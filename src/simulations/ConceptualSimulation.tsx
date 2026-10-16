import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { ExperimentDomain, ObservableOutput, VariableSpec } from '../types';
import { compileFormula, formatObservableValue, type CompiledFormula } from '../lib/formulaEval';

interface ConceptualSimulationProps {
  variables: Record<string, number>;
  variableSpecs: VariableSpec[];
  observables: ObservableOutput[];
  domain: ExperimentDomain;
  cameraPreset: string;
  onUpdateMetrics?: (metrics: Record<string, number | string>) => void;
}

/** Visual families. A chemistry lab should not look like an orbital-mechanics lab. */
type SceneMode = 'vessel' | 'cells' | 'strata' | 'lattice';

const MODE_BY_DOMAIN: Partial<Record<ExperimentDomain, SceneMode>> = {
  chemistry: 'vessel',
  fluid_dynamics: 'vessel',
  biology: 'cells',
  earth_science: 'strata',
};

const PALETTE: Record<SceneMode, { key: number; accent: number; bg: number }> = {
  vessel: { key: 0x38bdf8, accent: 0xf472b6, bg: 0x060a16 },
  cells: { key: 0x4ade80, accent: 0x22d3ee, bg: 0x04120c },
  strata: { key: 0xfbbf24, accent: 0xf97316, bg: 0x140d05 },
  lattice: { key: 0x00f0ff, accent: 0xa855f7, bg: 0x050814 },
};

const METRIC_INTERVAL_MS = 100;

/** Normalised 0..1 position of each slider inside its own range, in spec order. */
function normalizedDrive(specs: VariableSpec[], values: Record<string, number>): number[] {
  return specs.map((s) => {
    const v = values[s.id];
    if (typeof v !== 'number' || !Number.isFinite(v) || s.max === s.min) return 0.5;
    return Math.min(1, Math.max(0, (v - s.min) / (s.max - s.min)));
  });
}

export const ConceptualSimulation: React.FC<ConceptualSimulationProps> = ({
  variables,
  variableSpecs,
  observables,
  domain,
  cameraPreset,
  onUpdateMetrics,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const varsRef = useRef(variables);
  varsRef.current = variables;
  const specsRef = useRef(variableSpecs);
  specsRef.current = variableSpecs;

  // Compile each observable's formula once; evaluation then runs cheaply inside the render loop.
  const compiled = useMemo(() => {
    return (observables ?? []).map((o) => {
      const res = o.formula ? compileFormula(o.formula) : null;
      return { observable: o, formula: res && res.ok ? res.formula : null } as {
        observable: ObservableOutput;
        formula: CompiledFormula | null;
      };
    });
  }, [observables]);
  const compiledRef = useRef(compiled);
  compiledRef.current = compiled;

  const metricsCbRef = useRef(onUpdateMetrics);
  metricsCbRef.current = onUpdateMetrics;

  const mode: SceneMode = MODE_BY_DOMAIN[domain] ?? 'lattice';

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const colors = PALETTE[mode];
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(colors.bg);

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0x223355, 0.9));
    const keyLight = new THREE.PointLight(colors.key, 2.5, 60);
    keyLight.position.set(10, 15, 10);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(colors.accent, 2.2, 60);
    rimLight.position.set(-10, -8, -10);
    scene.add(rimLight);

    const disposables: { dispose: () => void }[] = [];
    const track = <T extends { dispose: () => void }>(x: T): T => {
      disposables.push(x);
      return x;
    };

    // ---- scene bodies, per visual family -------------------------------------------------
    const root = new THREE.Group();
    scene.add(root);

    let liquid: THREE.Mesh | null = null;
    let bubbles: THREE.Points | null = null;
    let bubbleY: Float32Array | null = null;
    const cells: THREE.Mesh[] = [];
    const layers: THREE.Mesh[] = [];
    const nodes: THREE.Mesh[] = [];
    let linesGroup: THREE.Group | null = null;
    let lineMat: THREE.LineBasicMaterial | null = null;

    const BUBBLES = 320;
    const VESSEL_H = 12;
    const VESSEL_R = 5;

    if (mode === 'vessel') {
      const glass = track(new THREE.MeshPhysicalMaterial({
        color: 0xdde8ff, transparent: true, opacity: 0.14, roughness: 0.05, metalness: 0,
        side: THREE.DoubleSide,
      }));
      const wall = new THREE.Mesh(track(new THREE.CylinderGeometry(VESSEL_R, VESSEL_R, VESSEL_H, 48, 1, true)), glass);
      root.add(wall);
      const base = new THREE.Mesh(track(new THREE.CircleGeometry(VESSEL_R, 48)), glass);
      base.rotation.x = -Math.PI / 2;
      base.position.y = -VESSEL_H / 2;
      root.add(base);

      liquid = new THREE.Mesh(
        track(new THREE.CylinderGeometry(VESSEL_R * 0.97, VESSEL_R * 0.97, 1, 48)),
        track(new THREE.MeshStandardMaterial({
          color: colors.key, emissive: colors.key, emissiveIntensity: 0.35, transparent: true,
          opacity: 0.6, roughness: 0.25,
        })),
      );
      root.add(liquid);

      const geo = track(new THREE.BufferGeometry());
      const pos = new Float32Array(BUBBLES * 3);
      bubbleY = new Float32Array(BUBBLES);
      for (let i = 0; i < BUBBLES; i++) {
        const r = Math.sqrt(Math.random()) * VESSEL_R * 0.9;
        const a = Math.random() * Math.PI * 2;
        pos[i * 3] = Math.cos(a) * r;
        pos[i * 3 + 2] = Math.sin(a) * r;
        bubbleY[i] = Math.random();
        pos[i * 3 + 1] = -VESSEL_H / 2 + bubbleY[i] * VESSEL_H;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      bubbles = new THREE.Points(geo, track(new THREE.PointsMaterial({
        color: 0xffffff, size: 0.22, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending,
      })));
      root.add(bubbles);
    } else if (mode === 'cells') {
      const geo = track(new THREE.SphereGeometry(1, 24, 24));
      for (let i = 0; i < 14; i++) {
        const mat = track(new THREE.MeshStandardMaterial({
          color: i % 3 === 0 ? colors.accent : colors.key,
          emissive: i % 3 === 0 ? colors.accent : colors.key,
          emissiveIntensity: 0.4, roughness: 0.35, transparent: true, opacity: 0.85,
        }));
        const m = new THREE.Mesh(geo, mat);
        const a = (i / 14) * Math.PI * 2;
        const r = 3 + (i % 4) * 1.6;
        m.position.set(Math.cos(a) * r, Math.sin(a * 1.7) * 2.2, Math.sin(a) * r);
        cells.push(m);
        root.add(m);
      }
    } else if (mode === 'strata') {
      const COUNT = 6;
      for (let i = 0; i < COUNT; i++) {
        const t = i / (COUNT - 1);
        const mat = track(new THREE.MeshStandardMaterial({
          color: new THREE.Color(colors.accent).lerp(new THREE.Color(colors.key), t),
          roughness: 0.75, metalness: 0.1,
        }));
        const m = new THREE.Mesh(track(new THREE.BoxGeometry(16, 1, 10)), mat);
        m.position.y = -5 + i * 1.8;
        layers.push(m);
        root.add(m);
      }
    } else {
      const nodeGeo = track(new THREE.SphereGeometry(1, 32, 32));
      for (let i = 0; i < 7; i++) {
        const mat = track(new THREE.MeshStandardMaterial({
          color: i === 0 ? colors.key : colors.accent,
          emissive: i === 0 ? colors.key : colors.accent,
          emissiveIntensity: 0.6, roughness: 0.2, metalness: 0.5,
        }));
        const m = new THREE.Mesh(nodeGeo, mat);
        if (i === 0) m.scale.setScalar(1.8);
        nodes.push(m);
        root.add(m);
      }
      linesGroup = new THREE.Group();
      root.add(linesGroup);
      lineMat = track(new THREE.LineBasicMaterial({ color: colors.key, transparent: true, opacity: 0.45 }));
    }

    // ---- camera + orbit ------------------------------------------------------------------
    const spherical = { radius: mode === 'vessel' ? 26 : 30, theta: 0.5, phi: mode === 'strata' ? 1.35 : 1.1 };
    const lookAt = new THREE.Vector3(0, 0, 0);
    const updateCamera = () => {
      spherical.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, spherical.phi));
      spherical.radius = Math.max(10, Math.min(70, spherical.radius));
      camera.position.set(
        lookAt.x + spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta),
        lookAt.y + spherical.radius * Math.cos(spherical.phi),
        lookAt.z + spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta),
      );
      camera.lookAt(lookAt);
    };
    updateCamera();

    let dragging = false;
    let px = 0;
    let py = 0;
    const onPointerDown = (e: PointerEvent) => { dragging = true; px = e.clientX; py = e.clientY; };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      spherical.theta -= (e.clientX - px) * 0.007;
      spherical.phi -= (e.clientY - py) * 0.007;
      px = e.clientX;
      py = e.clientY;
      updateCamera();
    };
    const onPointerUp = () => { dragging = false; };
    const onWheel = (e: WheelEvent) => { e.preventDefault(); spherical.radius += e.deltaY * 0.03; updateCamera(); };
    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    container.addEventListener('wheel', onWheel, { passive: false });

    // ---- loop ----------------------------------------------------------------------------
    const clock = new THREE.Clock();
    let animId = 0;
    let lastMetrics = -Infinity;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();

      // Every visual parameter comes from this spec's own sliders, so any control visibly matters.
      const drive = normalizedDrive(specsRef.current ?? [], varsRef.current ?? {});
      const rate = 0.25 + 1.75 * (drive[0] ?? 0.5);
      const amp = drive[1] ?? 0.5;
      const dens = drive[2] ?? 0.5;
      const activity = drive.length ? drive.reduce((a, b) => a + b, 0) / drive.length : 0.5;

      root.rotation.y += dt * 0.25 * rate;

      if (mode === 'vessel' && liquid && bubbles && bubbleY) {
        const level = 1.5 + amp * (VESSEL_H - 2.5);
        liquid.scale.y = level;
        liquid.position.y = -VESSEL_H / 2 + level / 2;
        (liquid.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.2 + activity * 0.8;
        const pos = bubbles.geometry.attributes.position as THREE.BufferAttribute;
        const arr = pos.array as Float32Array;
        const visible = Math.floor(40 + dens * (BUBBLES - 40));
        for (let i = 0; i < BUBBLES; i++) {
          if (i < visible) {
            bubbleY[i] += dt * (0.12 + rate * 0.22);
            if (bubbleY[i] > 1) bubbleY[i] -= 1;
            const h = Math.min(bubbleY[i] * VESSEL_H, level);
            arr[i * 3 + 1] = -VESSEL_H / 2 + h;
            arr[i * 3] += Math.sin(elapsed * 2 + i) * 0.004;
          } else {
            arr[i * 3 + 1] = -VESSEL_H / 2 - 5; // parked below the vessel
          }
        }
        pos.needsUpdate = true;
      } else if (mode === 'cells') {
        cells.forEach((m, i) => {
          const a = (i / cells.length) * Math.PI * 2 + elapsed * 0.3 * rate;
          const r = 3 + (i % 4) * 1.6 * (0.6 + amp);
          m.position.set(Math.cos(a) * r, Math.sin(a * 1.7) * (1 + amp * 2.5), Math.sin(a) * r);
          const pulse = 0.55 + 0.45 * Math.sin(elapsed * (1.5 + rate) + i);
          m.scale.setScalar(0.5 + dens * 1.1 * pulse);
        });
      } else if (mode === 'strata') {
        layers.forEach((m, i) => {
          const t = i / Math.max(1, layers.length - 1);
          m.scale.y = 0.4 + (1 - t) * (0.6 + amp * 1.8);
          m.position.y = -5 + i * (1.4 + dens * 1.2);
          m.rotation.z = Math.sin(elapsed * 0.4 * rate + i) * 0.02 * (0.3 + activity);
        });
      } else if (linesGroup && lineMat) {
        for (let i = 1; i < nodes.length; i++) {
          const a = ((i - 1) / (nodes.length - 1)) * Math.PI * 2 + elapsed * 0.4 * rate;
          const r = 6 + amp * 3.5;
          nodes[i].position.set(Math.cos(a) * r, Math.sin(a * 2) * (1 + dens * 2.4), Math.sin(a) * r);
        }
        linesGroup.clear();
        for (let i = 1; i < nodes.length; i++) {
          const g = new THREE.BufferGeometry().setFromPoints([nodes[0].position, nodes[i].position]);
          linesGroup.add(new THREE.Line(g, lineMat));
        }
      }

      // Telemetry: evaluate each observable's formula against the live slider values.
      const now = elapsed * 1000;
      if (metricsCbRef.current && now - lastMetrics >= METRIC_INTERVAL_MS) {
        lastMetrics = now;
        const scope = varsRef.current ?? {};
        const out: Record<string, number | string> = {};
        for (const { observable, formula } of compiledRef.current) {
          if (!formula) {
            out[observable.id] = '수식 없음';
            continue;
          }
          try {
            const value = formula.evaluate(scope);
            const text = formatObservableValue(value, observable.decimals);
            out[observable.id] = observable.unit ? `${text} ${observable.unit}` : text;
          } catch {
            out[observable.id] = '계산 불가';
          }
        }
        if (Object.keys(out).length) metricsCbRef.current(out);
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
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
      linesGroup?.traverse((o) => {
        if (o instanceof THREE.Line) o.geometry.dispose();
      });
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
    };
  }, [mode]);

  return (
    <div className="relative w-full h-full select-none overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};

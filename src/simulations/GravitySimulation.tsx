import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Play, Pause, RotateCcw, Wind, ShieldCheck } from 'lucide-react';
import {
  analyticFall,
  bodyFromVariables,
  FallSimulation,
  paramsFromVariables,
  sampleAt,
  simulateFall,
} from '../engines/gravity';
import { UiComponent, VariableSpec } from '../types';
import { DynamicControls, defaultUiFor } from '../components/DynamicControls';
import { sound } from '../lib/audio';
import { VerificationPanel } from '../components/VerificationPanel';
import type { VerificationReport } from '../verification';

export interface GravityRunResult {
  variables: Record<string, number>;
  bodies: {
    label: 'A' | 'B';
    simLandingTime: number;
    theoryLandingTime: number;
    impactVelocity: number;
    terminalVelocity: number | null;
  }[];
  vacuumLandingTime: number;
}

interface GravitySimulationProps {
  variableSpecs: VariableSpec[];
  uiComponents?: UiComponent[];
  notice?: string | null;
  variables: Record<string, number>;
  verification?: VerificationReport | null;
  onChangeVariable: (id: string, value: number) => void;
  /** Called once per finished run (never per frame). */
  onRunComplete?: (result: GravityRunResult) => void;
}

const VIEW_HEIGHT = 10; // scene units for the full drop height
const VIEW_MIN = -0.8;
const VIEW_SPAN = 12;
const COLOR_A = '#22d3ee';
const COLOR_B = '#fb7185';
const SPEEDS = [1, 0.5, 0.25];

const radiusFromArea = (areaM2: number) => {
  const r = Math.sqrt(areaM2 / Math.PI);
  return Math.min(0.55, Math.max(0.14, 0.14 + (r - 0.04) * 2.2));
};

const fmt = (n: number, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : '—');

/** Scene-space centre of a body given its height above ground. */
const toSceneY = (y: number, height: number, radius: number) => radius + (y / height) * (VIEW_HEIGHT - radius);

const Fit: React.FC = () => {
  const { size, camera } = useThree();
  useEffect(() => {
    const cam = camera as THREE.OrthographicCamera;
    cam.zoom = size.height / VIEW_SPAN;
    cam.position.set(0, VIEW_MIN + VIEW_SPAN / 2, 20);
    cam.lookAt(0, VIEW_MIN + VIEW_SPAN / 2, 0);
    cam.updateProjectionMatrix();
  }, [size.height, camera]);
  return null;
};

interface BallProps {
  x: number;
  color: string;
  radius: number;
  sim: FallSimulation;
  height: number;
  timeRef: React.MutableRefObject<number>;
}

const Ball: React.FC<BallProps> = ({ x, color, radius, sim, height, timeRef }) => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!ref.current) return;
    const s = sampleAt(sim, timeRef.current);
    ref.current.position.set(x, toSceneY(s.y, height, radius), 0);
  });
  return (
    <mesh ref={ref} position={[x, toSceneY(height, height, radius), 0]}>
      <sphereGeometry args={[radius, 32, 32]} />
      <meshStandardMaterial color={color} roughness={0.35} metalness={0.2} />
    </mesh>
  );
};

const Scene: React.FC<{
  simA: FallSimulation;
  simB: FallSimulation;
  radiusA: number;
  radiusB: number;
  height: number;
  airDensity: number;
  timeRef: React.MutableRefObject<number>;
}> = ({ simA, simB, radiusA, radiusB, height, airDensity, timeRef }) => (
  <>
    <Fit />
    <color attach="background" args={[airDensity > 0 ? '#0b1422' : '#050a14']} />
    <ambientLight intensity={0.7} />
    <directionalLight position={[4, 12, 10]} intensity={1.6} />
    {/* ground */}
    <mesh position={[0, -0.4, 0]}>
      <boxGeometry args={[9, 0.8, 3]} />
      <meshStandardMaterial color="#14283f" />
    </mesh>
    {/* drop columns */}
    {[-2, 2].map((x) => (
      <mesh key={x} position={[x, VIEW_HEIGHT / 2, -0.6]}>
        <boxGeometry args={[0.03, VIEW_HEIGHT + 0.6, 0.03]} />
        <meshBasicMaterial color="#1e3a5f" />
      </mesh>
    ))}
    {[0, 0.25, 0.5, 0.75, 1].map((f) => (
      <mesh key={f} position={[0, f * VIEW_HEIGHT, -0.8]}>
        <boxGeometry args={[8, 0.012, 0.01]} />
        <meshBasicMaterial color="#1e3a5f" />
      </mesh>
    ))}
    <Ball x={-2} color={COLOR_A} radius={radiusA} sim={simA} height={height} timeRef={timeRef} />
    <Ball x={2} color={COLOR_B} radius={radiusB} sim={simB} height={height} timeRef={timeRef} />
  </>
);

const VelocityGraph: React.FC<{ simA: FallSimulation; simB: FallSimulation; time: number }> = ({ simA, simB, time }) => {
  const W = 320;
  const H = 130;
  const P = { l: 34, r: 8, t: 8, b: 22 };
  const tMax = Math.max(simA.landingTime, simB.landingTime);
  const vMax = Math.max(simA.impactVelocity, simB.impactVelocity, 1) * 1.08;
  const x = (t: number) => P.l + (t / tMax) * (W - P.l - P.r);
  const y = (v: number) => H - P.b - (v / vMax) * (H - P.t - P.b);
  const path = (sim: FallSimulation, until: number) => {
    const stride = Math.max(1, Math.floor(sim.samples.length / 200));
    const pts: string[] = [];
    for (let i = 0; i < sim.samples.length; i += stride) {
      const s = sim.samples[i];
      if (s.t > until) break;
      pts.push(`${x(s.t).toFixed(1)},${y(s.v).toFixed(1)}`);
    }
    const cur = sampleAt(sim, until);
    pts.push(`${x(cur.t).toFixed(1)},${y(cur.v).toFixed(1)}`);
    return pts.join(' ');
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="속도-시간 그래프">
      <line x1={P.l} y1={H - P.b} x2={W - P.r} y2={H - P.b} stroke="#334155" />
      <line x1={P.l} y1={P.t} x2={P.l} y2={H - P.b} stroke="#334155" />
      <text x={P.l - 4} y={P.t + 8} fontSize="9" fill="#94a3b8" textAnchor="end">{fmt(vMax, 0)}</text>
      <text x={P.l - 4} y={H - P.b} fontSize="9" fill="#94a3b8" textAnchor="end">0</text>
      <text x={W - P.r} y={H - 6} fontSize="9" fill="#94a3b8" textAnchor="end">{fmt(tMax, 1)} s</text>
      <text x={P.l + 4} y={P.t + 8} fontSize="9" fill="#64748b">속도 (m/s)</text>
      <polyline points={path(simA, time)} fill="none" stroke={COLOR_A} strokeWidth="2" />
      <polyline points={path(simB, time)} fill="none" stroke={COLOR_B} strokeWidth="2" strokeDasharray="5 3" />
    </svg>
  );
};

export const GravitySimulation: React.FC<GravitySimulationProps> = ({
  variableSpecs,
  uiComponents,
  notice = null,
  variables,
  verification = null,
  onChangeVariable,
  onRunComplete,
}) => {
  const params = paramsFromVariables(variables);
  const bodyA = bodyFromVariables(variables, 'A');
  const bodyB = bodyFromVariables(variables, 'B');

  // Memoise on primitive inputs so React re-renders never re-run the integrator.
  const simA = useMemo(
    () => simulateFall(params, bodyA),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params.heightM, params.gravity, params.airDensity, bodyA.massKg, bodyA.areaM2, bodyA.dragCoefficient],
  );
  const simB = useMemo(
    () => simulateFall(params, bodyB),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params.heightM, params.gravity, params.airDensity, bodyB.massKg, bodyB.areaM2, bodyB.dragCoefficient],
  );
  const theoryA = useMemo(
    () => analyticFall(params, bodyA),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params.heightM, params.gravity, params.airDensity, bodyA.massKg, bodyA.areaM2, bodyA.dragCoefficient],
  );
  const theoryB = useMemo(
    () => analyticFall(params, bodyB),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params.heightM, params.gravity, params.airDensity, bodyB.massKg, bodyB.areaM2, bodyB.dragCoefficient],
  );
  const vacuumTime = Math.sqrt((2 * params.heightM) / params.gravity);
  const endTime = Math.max(simA.landingTime, simB.landingTime);

  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timeRef = useRef(0);
  const completedRef = useRef(false);
  const onRunCompleteRef = useRef(onRunComplete);
  onRunCompleteRef.current = onRunComplete;
  const variablesRef = useRef(variables);
  variablesRef.current = variables;

  const reset = () => {
    timeRef.current = 0;
    completedRef.current = false;
    setTime(0);
    setPlaying(false);
  };

  // Any change to the experiment conditions invalidates the current run.
  const conditionKey = [
    params.heightM, params.gravity, params.airDensity,
    bodyA.massKg, bodyA.areaM2, bodyA.dragCoefficient,
    bodyB.massKg, bodyB.areaM2, bodyB.dragCoefficient,
  ].join('|');
  useEffect(() => {
    reset();
  }, [conditionKey]);

  // Real-time clock: advances by wall-clock delta, never by render count.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000) * speed;
      last = now;
      const next = Math.min(endTime, timeRef.current + dt);
      timeRef.current = next;
      setTime(next);
      if (next >= endTime) {
        setPlaying(false);
        if (!completedRef.current) {
          completedRef.current = true;
          sound.playRumble(0.4);
          onRunCompleteRef.current?.({
            variables: { ...variablesRef.current },
            bodies: [
              { label: 'A', simLandingTime: simA.landingTime, theoryLandingTime: theoryA.landingTime, impactVelocity: simA.impactVelocity, terminalVelocity: Number.isFinite(simA.terminalVelocity) ? simA.terminalVelocity : null },
              { label: 'B', simLandingTime: simB.landingTime, theoryLandingTime: theoryB.landingTime, impactVelocity: simB.impactVelocity, terminalVelocity: Number.isFinite(simB.terminalVelocity) ? simB.terminalVelocity : null },
            ],
            vacuumLandingTime: vacuumTime,
          });
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, endTime, simA, simB, theoryA, theoryB, vacuumTime]);

  const togglePlay = () => {
    sound.playClick();
    if (!playing && timeRef.current >= endTime) reset();
    setPlaying((p) => !p);
  };

  const stA = sampleAt(simA, time);
  const stB = sampleAt(simB, time);
  const radiusA = radiusFromArea(bodyA.areaM2);
  const radiusB = radiusFromArea(bodyB.areaM2);
  const isVacuum = params.airDensity === 0;
  const rowErr = (sim: number, theory: number) => (theory > 0 ? ((sim - theory) / theory) * 100 : 0);

  return (
    <div className="absolute inset-0 flex flex-col lg:flex-row bg-slate-950 text-white">
      {/* 3D chamber + playback */}
      <div className="flex flex-col min-h-0 h-[55%] lg:h-full lg:flex-1">
        <div className="flex items-center justify-between px-4 pt-3 pb-2 text-xs">
          <div>
            <div className="font-bold text-sm">자유 낙하 실험 챔버</div>
            <div className="text-slate-400">
              {isVacuum ? '진공: 질량과 형상에 관계없이 같은 가속도로 낙하' : '공기 저항 작용: F = ½ρv²C_dA'}
            </div>
          </div>
          <div className={`px-2.5 py-1 rounded-lg border font-mono flex items-center gap-1.5 ${isVacuum ? 'border-emerald-500/50 text-emerald-300 bg-emerald-950/60' : 'border-amber-500/50 text-amber-300 bg-amber-950/60'}`}>
            {isVacuum ? <ShieldCheck className="w-3.5 h-3.5" /> : <Wind className="w-3.5 h-3.5" />}
            <span>{isVacuum ? '진공' : `공기 밀도 ${params.airDensity} kg/m³`}</span>
          </div>
        </div>

        <div className="relative flex-1 min-h-0 mx-4 rounded-xl overflow-hidden border border-slate-800">
          <Canvas orthographic dpr={[1, 2]} gl={{ antialias: true }}>
            <Scene
              simA={simA}
              simB={simB}
              radiusA={radiusA}
              radiusB={radiusB}
              height={params.heightM}
              airDensity={params.airDensity}
              timeRef={timeRef}
            />
          </Canvas>
          {/* height ruler (orthographic camera => exact alignment) */}
          {[1, 0.75, 0.5, 0.25, 0].map((f) => (
            <div
              key={f}
              className="absolute left-0 pointer-events-none text-[10px] font-mono text-slate-400 bg-slate-950/70 px-1 rounded-r"
              style={{ top: `${((VIEW_MIN + VIEW_SPAN - f * VIEW_HEIGHT) / VIEW_SPAN) * 100}%`, transform: 'translateY(-50%)' }}
            >
              {fmt(f * params.heightM, 1)} m
            </div>
          ))}
          <div className="absolute top-2 left-1/2 -translate-x-[calc(50%+7rem)] text-[11px] font-bold" style={{ color: COLOR_A }}>물체 A</div>
          <div className="absolute top-2 left-1/2 translate-x-[calc(-50%+7rem)] text-[11px] font-bold" style={{ color: COLOR_B }}>물체 B</div>
        </div>

        <div className="flex items-center gap-2 px-4 py-3 text-xs">
          <button
            onClick={togglePlay}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold flex items-center gap-1.5 cursor-pointer"
          >
            {playing ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            <span>{playing ? '일시정지' : time > 0 && time < endTime ? '계속' : '낙하 시작'}</span>
          </button>
          <button
            onClick={() => { sound.playClick(); reset(); }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
            title="리셋"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1 ml-2">
            <span className="text-slate-500">배속</span>
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2 py-1 rounded font-mono cursor-pointer ${speed === s ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'}`}
              >
                {s}×
              </button>
            ))}
          </div>
          <div className="ml-auto font-mono text-slate-300">경과 시간 <span className="text-cyan-300 font-bold">{fmt(time)} s</span></div>
        </div>
      </div>

      {/* Side panel: never overlaps the chamber */}
      <aside className="lg:w-[380px] shrink-0 overflow-y-auto border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-950/90 p-3 space-y-3 text-xs">
        {notice && <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-[11px] leading-snug">{notice}</div>}
        <VerificationPanel report={verification} />
        <DynamicControls
          components={uiComponents ?? defaultUiFor(variableSpecs)}
          specs={variableSpecs}
          values={variables}
          onChange={onChangeVariable}
        />

        <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1.5">
          <div className="font-bold text-slate-200">실시간 측정</div>
          <table className="w-full font-mono text-[11px]">
            <thead>
              <tr className="text-slate-500">
                <th className="text-left font-normal"></th>
                <th className="text-right font-normal" style={{ color: COLOR_A }}>물체 A</th>
                <th className="text-right font-normal" style={{ color: COLOR_B }}>물체 B</th>
              </tr>
            </thead>
            <tbody className="text-slate-200">
              <tr><td className="text-slate-400">현재 높이</td><td className="text-right">{fmt(stA.y, 2)} m</td><td className="text-right">{fmt(stB.y, 2)} m</td></tr>
              <tr><td className="text-slate-400">현재 속도</td><td className="text-right">{fmt(stA.v, 2)} m/s</td><td className="text-right">{fmt(stB.v, 2)} m/s</td></tr>
              <tr><td className="text-slate-400">착지 시간(시뮬)</td><td className="text-right">{fmt(simA.landingTime, 3)} s</td><td className="text-right">{fmt(simB.landingTime, 3)} s</td></tr>
              <tr><td className="text-slate-400">착지 시간(이론)</td><td className="text-right">{fmt(theoryA.landingTime, 3)} s</td><td className="text-right">{fmt(theoryB.landingTime, 3)} s</td></tr>
              <tr><td className="text-slate-400">시뮬-이론 오차</td><td className="text-right">{fmt(rowErr(simA.landingTime, theoryA.landingTime), 3)} %</td><td className="text-right">{fmt(rowErr(simB.landingTime, theoryB.landingTime), 3)} %</td></tr>
              <tr><td className="text-slate-400">착지 속도</td><td className="text-right">{fmt(simA.impactVelocity, 2)} m/s</td><td className="text-right">{fmt(simB.impactVelocity, 2)} m/s</td></tr>
              <tr><td className="text-slate-400">종단 속도</td><td className="text-right">{Number.isFinite(simA.terminalVelocity) ? `${fmt(simA.terminalVelocity, 1)} m/s` : '없음'}</td><td className="text-right">{Number.isFinite(simB.terminalVelocity) ? `${fmt(simB.terminalVelocity, 1)} m/s` : '없음'}</td></tr>
            </tbody>
          </table>
          <div className="text-[11px] text-slate-400 pt-1">
            진공 이론 낙하 시간 t = √(2h/g) = <span className="font-mono text-slate-200">{fmt(vacuumTime, 3)} s</span>
          </div>
          <div className="text-[11px] text-slate-500">
            이론값은 이차 항력 모델의 해석해이며, 시뮬레이션은 Δt = 1 ms RK4 적분입니다.
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
          <div className="font-bold text-slate-200 mb-1">속도–시간 그래프</div>
          <VelocityGraph simA={simA} simB={simB} time={time} />
          <div className="flex gap-3 text-[10px] text-slate-400 mt-1">
            <span><span style={{ color: COLOR_A }}>━</span> 물체 A</span>
            <span><span style={{ color: COLOR_B }}>╍</span> 물체 B</span>
          </div>
        </div>
      </aside>
    </div>
  );
};

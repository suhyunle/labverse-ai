import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Wind, ShieldCheck, Gauge } from 'lucide-react';
import {
  calculateFreeFall,
  GRAVITY_OBJECT_PRESETS,
  CELESTIAL_GRAVITY_PRESETS,
  GravityObjectSpec,
} from '../engines/gravity';
import { sound } from '../lib/audio';

interface GravitySimulationProps {
  variables: Record<string, number>;
  onUpdateMetrics?: (metrics: Record<string, number | string>) => void;
}

export const GravitySimulation: React.FC<GravitySimulationProps> = ({
  variables,
  onUpdateMetrics,
}) => {
  const [objectAId, setObjectAId] = useState<string>('bowling_ball');
  const [objectBId, setObjectBId] = useState<string>('feather');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simTime, setSimTime] = useState<number>(0);

  const height = variables.dropHeight ?? 25; // meters
  const gravity = variables.gravity ?? 9.80665; // m/s^2
  const airDensity = variables.airDensity ?? 0.0; // 0 for vacuum

  const objA: GravityObjectSpec = GRAVITY_OBJECT_PRESETS[objectAId] || GRAVITY_OBJECT_PRESETS.bowling_ball;
  const objB: GravityObjectSpec = GRAVITY_OBJECT_PRESETS[objectBId] || GRAVITY_OBJECT_PRESETS.feather;

  // Compute deterministic trajectory solutions
  const resA = calculateFreeFall(height, gravity, objA, airDensity);
  const resB = calculateFreeFall(height, gravity, objB, airDensity);

  const maxFallTime = Math.max(resA.fallTimeAir, resB.fallTimeAir);

  // Animation frame loop
  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isSimulating) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    lastTimeRef.current = performance.now();

    const loop = (now: number) => {
      const dt = (now - (lastTimeRef.current || now)) / 1000;
      lastTimeRef.current = now;

      setSimTime((prev) => {
        const next = prev + dt;
        if (next >= maxFallTime + 0.5) {
          setIsSimulating(false);
          sound.playRumble(0.4);
          return maxFallTime;
        }
        return next;
      });

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isSimulating, maxFallTime]);

  // Compute current positions based on simTime
  const getCurrentY = (traj: { t: number; y: number; v: number }[]) => {
    if (simTime <= 0) return height;
    if (simTime >= traj[traj.length - 1].t) return 0;
    for (let i = 0; i < traj.length - 1; i++) {
      if (simTime >= traj[i].t && simTime <= traj[i + 1].t) {
        const frac = (simTime - traj[i].t) / (traj[i + 1].t - traj[i].t);
        return traj[i].y + frac * (traj[i + 1].y - traj[i].y);
      }
    }
    return 0;
  };

  const currentYA = getCurrentY(resA.trajectoryAir);
  const currentYB = getCurrentY(resB.trajectoryAir);

  // Sync metrics to parent
  useEffect(() => {
    if (onUpdateMetrics) {
      onUpdateMetrics({
        fallTimeA: `${resA.fallTimeAir.toFixed(2)} 초`,
        fallTimeB: `${resB.fallTimeAir.toFixed(2)} 초`,
        impactVelocityA: `${resA.impactVelocityAir.toFixed(1)} m/s`,
        impactVelocityB: `${resB.impactVelocityAir.toFixed(1)} m/s`,
        vacuumFallTime: `${resA.fallTimeVacuum.toFixed(2)} 초 (진공 이론값)`,
        environment: airDensity === 0 ? '완전 진공 (Vacuum Chamber)' : `대기 환경 (ρ = ${airDensity} kg/m³)`,
      });
    }
  }, [resA, resB, airDensity, onUpdateMetrics]);

  const handleStart = () => {
    sound.playClick();
    if (simTime >= maxFallTime) {
      setSimTime(0);
    }
    setIsSimulating(true);
  };

  const handleReset = () => {
    sound.playClick();
    setIsSimulating(false);
    setSimTime(0);
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between p-4 sm:p-6 bg-slate-950 text-white select-none overflow-hidden">
      {/* Top Chamber Header & Atmosphere Badge */}
      <div className="w-full max-w-4xl flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-400">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <span>뉴턴-갈릴레오 자유 낙하 실험 체임버</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-900/60 border border-cyan-500/30 text-cyan-300 font-mono">
                h = {height}m
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              {airDensity === 0 ? '진공 상태: 질량과 형상에 무관하게 동일한 가속도 g로 낙하' : '공기 저항 환경: 단면적과 항력 계수에 따른 종단 속도 발생'}
            </p>
          </div>
        </div>

        {/* Vacuum Status Pill */}
        <div className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-semibold flex items-center gap-1.5 shadow-lg ${
          airDensity === 0
            ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
            : 'bg-amber-950/80 border-amber-500/50 text-amber-300'
        }`}>
          {airDensity === 0 ? <ShieldCheck className="w-4 h-4 text-emerald-400" /> : <Wind className="w-4 h-4 text-amber-400" />}
          <span>{airDensity === 0 ? '진공 체임버 (VACUUM)' : `공기 저항 ON (ρ=${airDensity})`}</span>
        </div>
      </div>

      {/* Main Chamber Visualization Canvas & Tower */}
      <div className="relative w-full max-w-3xl flex-1 my-3 flex items-center justify-center">
        {/* Height Meter Ruler on Left */}
        <div className="relative h-full w-12 flex flex-col justify-between items-end pr-2 text-[10px] font-mono text-slate-500 border-r border-slate-800">
          <span>{height}m</span>
          <span>{(height * 0.75).toFixed(0)}m</span>
          <span>{(height * 0.5).toFixed(0)}m</span>
          <span>{(height * 0.25).toFixed(0)}m</span>
          <span className="text-cyan-400 font-bold">0m (지면)</span>
        </div>

        {/* Dual Drop Channels */}
        <div className="relative flex-1 h-full mx-4 rounded-2xl bg-slate-900/40 border border-slate-800 backdrop-blur-md overflow-hidden grid grid-cols-2 divide-x divide-slate-800/80 shadow-2xl">
          {/* Channel A */}
          <div className="relative h-full flex flex-col justify-between p-3">
            <div className="flex items-center justify-between text-xs z-10">
              <select
                value={objectAId}
                onChange={(e) => {
                  sound.playClick();
                  setObjectAId(e.target.value);
                  handleReset();
                }}
                className="bg-slate-950 border border-slate-700 text-cyan-300 rounded-lg px-2 py-1 text-xs outline-none cursor-pointer"
              >
                {Object.values(GRAVITY_OBJECT_PRESETS).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.massKg}kg)
                  </option>
                ))}
              </select>
              <span className="font-mono text-xs text-slate-400">
                {currentYA.toFixed(1)}m
              </span>
            </div>

            {/* Falling Body A */}
            <div
              className="absolute left-1/2 -translate-x-1/2 transition-all duration-75 flex flex-col items-center"
              style={{
                top: `${((height - currentYA) / height) * 82 + 10}%`,
              }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg border border-cyan-400/40 font-mono text-[10px] font-bold text-slate-950"
                style={{ backgroundColor: objA.color }}
              >
                {objA.massKg}kg
              </div>
              <span className="text-[10px] text-cyan-300 font-mono mt-1 bg-slate-950/80 px-1 rounded">
                v: {((resA.trajectoryAir.find((t) => t.t >= simTime)?.v || 0)).toFixed(1)} m/s
              </span>
            </div>

            {/* Impact Base Indicator */}
            <div className="w-full h-2 rounded bg-cyan-500/20 border-t border-cyan-500/40 mt-auto" />
          </div>

          {/* Channel B */}
          <div className="relative h-full flex flex-col justify-between p-3">
            <div className="flex items-center justify-between text-xs z-10">
              <select
                value={objectBId}
                onChange={(e) => {
                  sound.playClick();
                  setObjectBId(e.target.value);
                  handleReset();
                }}
                className="bg-slate-950 border border-slate-700 text-rose-300 rounded-lg px-2 py-1 text-xs outline-none cursor-pointer"
              >
                {Object.values(GRAVITY_OBJECT_PRESETS).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.massKg}kg)
                  </option>
                ))}
              </select>
              <span className="font-mono text-xs text-slate-400">
                {currentYB.toFixed(1)}m
              </span>
            </div>

            {/* Falling Body B */}
            <div
              className="absolute left-1/2 -translate-x-1/2 transition-all duration-75 flex flex-col items-center"
              style={{
                top: `${((height - currentYB) / height) * 82 + 10}%`,
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg border border-rose-400/40 font-mono text-[10px] font-bold text-slate-950"
                style={{ backgroundColor: objB.color }}
              >
                {objB.massKg}kg
              </div>
              <span className="text-[10px] text-rose-300 font-mono mt-1 bg-slate-950/80 px-1 rounded">
                v: {((resB.trajectoryAir.find((t) => t.t >= simTime)?.v || 0)).toFixed(1)} m/s
              </span>
            </div>

            {/* Impact Base Indicator */}
            <div className="w-full h-2 rounded bg-rose-500/20 border-t border-rose-500/40 mt-auto" />
          </div>
        </div>
      </div>

      {/* Control Bar & Simulation Playback */}
      <div className="w-full max-w-2xl bg-slate-900/80 border border-slate-800 rounded-2xl p-3 backdrop-blur-xl flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {!isSimulating ? (
            <button
              onClick={handleStart}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-cyan-500/20"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>동시 낙하 시작</span>
            </button>
          ) : (
            <button
              onClick={() => setIsSimulating(false)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Pause className="w-4 h-4 fill-current" />
              <span>일시 정지</span>
            </button>
          )}

          <button
            onClick={handleReset}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            title="초기화"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Fall Time Comparative Readout */}
        <div className="flex items-center gap-4 font-mono text-xs">
          <div>
            <span className="text-slate-400 mr-1.5">진행 시간:</span>
            <span className="text-cyan-300 font-bold">{simTime.toFixed(2)}s</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-800 text-[11px]">
            <span className="text-cyan-400">{objA.name.split(' ')[0]}: {resA.fallTimeAir}s</span>
            <span className="text-slate-500">vs</span>
            <span className="text-rose-400">{objB.name.split(' ')[0]}: {resB.fallTimeAir}s</span>
          </div>
        </div>
      </div>
    </div>
  );
};

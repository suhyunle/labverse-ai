import React, { useState, useEffect, useRef } from 'react';
import { Zap, Sparkles, AlertTriangle, ArrowRight, Compass } from 'lucide-react';
import { calculateOptics, OPTICAL_MEDIA_PRESETS, OpticalMedium } from '../engines/optics';
import { sound } from '../lib/audio';

interface OpticsSimulationProps {
  variables: Record<string, number>;
  onUpdateMetrics?: (metrics: Record<string, number | string>) => void;
}

export const OpticsSimulation: React.FC<OpticsSimulationProps> = ({
  variables,
  onUpdateMetrics,
}) => {
  const [medium1Id, setMedium1Id] = useState<string>('crown_glass');
  const [medium2Id, setMedium2Id] = useState<string>('air');

  const theta1 = variables.incidentAngle ?? 45; // degrees

  const m1: OpticalMedium = OPTICAL_MEDIA_PRESETS[medium1Id] || OPTICAL_MEDIA_PRESETS.crown_glass;
  const m2: OpticalMedium = OPTICAL_MEDIA_PRESETS[medium2Id] || OPTICAL_MEDIA_PRESETS.air;

  const result = calculateOptics(theta1, m1.refractiveIndex, m2.refractiveIndex);

  // Sync metrics to parent HUD
  useEffect(() => {
    if (onUpdateMetrics) {
      onUpdateMetrics({
        incidentAngle: `${result.thetaIncidentDeg.toFixed(1)}°`,
        reflectedAngle: `${result.thetaReflectedDeg.toFixed(1)}°`,
        refractedAngle: result.thetaRefractedDeg !== null ? `${result.thetaRefractedDeg.toFixed(1)}°` : '전반사 (TIR) - 없음',
        criticalAngle: result.criticalAngleDeg !== null ? `${result.criticalAngleDeg.toFixed(1)}°` : '임계각 없음 (n₁ ≤ n₂)',
        reflectancePower: `${(result.reflectance * 100).toFixed(1)}%`,
        transmittancePower: `${(result.transmittance * 100).toFixed(1)}%`,
        speedRatio: `${(result.speedMedium1KmS / result.speedMedium2KmS).toFixed(2)}x`,
      });
    }
  }, [result, onUpdateMetrics]);

  // Canvas Ray Tracing Geometry (Center at x=300, y=200)
  const cx = 320;
  const cy = 220;
  const beamLength = 220;

  // Incident beam arrives from Medium 1 (top half):
  // Angle measured from the normal line (vertical y-axis pointing up).
  // theta1 is to the left of normal.
  const rad1 = (result.thetaIncidentDeg * Math.PI) / 180;
  const laserOriginX = cx - Math.sin(rad1) * beamLength;
  const laserOriginY = cy - Math.cos(rad1) * beamLength;

  // Reflected beam goes back into Medium 1 (top half, to the right of normal):
  const reflectedEndX = cx + Math.sin(rad1) * beamLength;
  const reflectedEndY = cy - Math.cos(rad1) * beamLength;

  // Refracted beam enters Medium 2 (bottom half, to the right of normal pointing down):
  let refractedEndX = cx;
  let refractedEndY = cy + beamLength;
  if (result.thetaRefractedDeg !== null) {
    const rad2 = (result.thetaRefractedDeg * Math.PI) / 180;
    refractedEndX = cx + Math.sin(rad2) * beamLength;
    refractedEndY = cy + Math.cos(rad2) * beamLength;
  }

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between p-4 sm:p-6 bg-slate-950 text-white select-none overflow-hidden">
      {/* Top Header & Medium Selection Bar */}
      <div className="w-full max-w-4xl flex flex-wrap items-center justify-between gap-3 z-20">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-950 border border-indigo-500/40 text-indigo-400">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <span>스넬의 법칙 & 전반사 광학 벤치 (Snell&apos;s Law Lab)</span>
              {result.isTotalInternalReflection && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950 border border-rose-500/60 text-rose-300 font-bold flex items-center gap-1 animate-pulse">
                  <AlertTriangle className="w-3 h-3" />
                  <span>전반사 (TIR) 발생!</span>
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              n₁ · sin(θ₁) = n₂ · sin(θ₂) | 임계각: θ_c = arcsin(n₂/n₁)
            </p>
          </div>
        </div>

        {/* Medium Selectors */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-xl px-2.5 py-1.5">
            <span className="text-slate-400 font-mono text-[11px]">매질 1 (상단):</span>
            <select
              value={medium1Id}
              onChange={(e) => {
                sound.playClick();
                setMedium1Id(e.target.value);
              }}
              className="bg-transparent text-cyan-300 font-bold outline-none cursor-pointer"
            >
              {Object.values(OPTICAL_MEDIA_PRESETS).map((m) => (
                <option key={m.id} value={m.id} className="bg-slate-900 text-white">
                  {m.name.split(' ')[0]} (n={m.refractiveIndex})
                </option>
              ))}
            </select>
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />

          <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-xl px-2.5 py-1.5">
            <span className="text-slate-400 font-mono text-[11px]">매질 2 (하단):</span>
            <select
              value={medium2Id}
              onChange={(e) => {
                sound.playClick();
                setMedium2Id(e.target.value);
              }}
              className="bg-transparent text-indigo-300 font-bold outline-none cursor-pointer"
            >
              {Object.values(OPTICAL_MEDIA_PRESETS).map((m) => (
                <option key={m.id} value={m.id} className="bg-slate-900 text-white">
                  {m.name.split(' ')[0]} (n={m.refractiveIndex})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Optical Bench Raytracing SVG Canvas */}
      <div className="relative w-full max-w-3xl flex-1 my-2 flex items-center justify-center">
        <svg
          viewBox="0 0 640 440"
          className="w-full h-full max-h-[440px] rounded-2xl bg-slate-900/40 border border-slate-800 backdrop-blur-xl shadow-2xl"
        >
          {/* Top Half: Medium 1 Surface Area */}
          <rect x="0" y="0" width="640" height="220" fill={m1.color} />
          {/* Bottom Half: Medium 2 Surface Area */}
          <rect x="0" y="220" width="640" height="220" fill={m2.color} />

          {/* Boundary Interface Line */}
          <line
            x1="0"
            y1="220"
            x2="640"
            y2="220"
            stroke="#38bdf8"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
          <text x="20" y="210" fill="#94a3b8" fontSize="11" fontFamily="monospace">
            매질 1: {m1.name} (n₁ = {m1.refractiveIndex})
          </text>
          <text x="20" y="240" fill="#94a3b8" fontSize="11" fontFamily="monospace">
            매질 2: {m2.name} (n₂ = {m2.refractiveIndex})
          </text>

          {/* Normal Reference Line (Vertical Normal N) */}
          <line
            x1="320"
            y1="20"
            x2="320"
            y2="420"
            stroke="#64748b"
            strokeWidth="1.5"
            strokeDasharray="6 4"
          />
          <text x="325" y="35" fill="#64748b" fontSize="10" fontFamily="monospace">
            법선 (Normal N)
          </text>

          {/* Protractor Circular Angular Grid */}
          <circle cx="320" cy="220" r="180" fill="none" stroke="#1e293b" strokeWidth="1" />
          <circle cx="320" cy="220" r="100" fill="none" stroke="#1e293b" strokeWidth="1" />

          {/* Critical Angle Line (if applicable) */}
          {result.criticalAngleDeg !== null && (
            <>
              <line
                x1="320"
                y1="220"
                x2={cx - Math.sin((result.criticalAngleDeg * Math.PI) / 180) * 190}
                y2={cy - Math.cos((result.criticalAngleDeg * Math.PI) / 180) * 190}
                stroke="#f43f5e"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <text
                x={cx - Math.sin((result.criticalAngleDeg * Math.PI) / 180) * 200 - 40}
                y={cy - Math.cos((result.criticalAngleDeg * Math.PI) / 180) * 200}
                fill="#f43f5e"
                fontSize="10"
                fontFamily="monospace"
              >
                임계각 θc={result.criticalAngleDeg}°
              </text>
            </>
          )}

          {/* Incident Laser Beam */}
          <line
            x1={laserOriginX}
            y1={laserOriginY}
            x2={cx}
            y2={cy}
            stroke="#00f0ff"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Laser Emitter Head */}
          <circle cx={laserOriginX} cy={laserOriginY} r="7" fill="#00f0ff" />
          <text
            x={laserOriginX - 30}
            y={laserOriginY - 12}
            fill="#00f0ff"
            fontSize="11"
            fontWeight="bold"
            fontFamily="monospace"
          >
            입사각 θ₁={result.thetaIncidentDeg}°
          </text>

          {/* Reflected Beam (Intensity proportional to reflectance) */}
          <line
            x1={cx}
            y1={cy}
            x2={reflectedEndX}
            y2={reflectedEndY}
            stroke="#a855f7"
            strokeWidth={Math.max(1, result.reflectance * 3.5)}
            strokeOpacity={Math.max(0.2, result.reflectance)}
            strokeLinecap="round"
          />
          <text
            x={reflectedEndX + 10}
            y={reflectedEndY}
            fill="#a855f7"
            fontSize="10"
            fontFamily="monospace"
          >
            반사 광선 ({(result.reflectance * 100).toFixed(0)}%)
          </text>

          {/* Refracted Beam (Only if NOT TIR) */}
          {!result.isTotalInternalReflection && result.thetaRefractedDeg !== null && (
            <>
              <line
                x1={cx}
                y1={cy}
                x2={refractedEndX}
                y2={refractedEndY}
                stroke="#38bdf8"
                strokeWidth={Math.max(1, result.transmittance * 3.5)}
                strokeOpacity={Math.max(0.2, result.transmittance)}
                strokeLinecap="round"
              />
              <text
                x={refractedEndX + 10}
                y={refractedEndY}
                fill="#38bdf8"
                fontSize="11"
                fontWeight="bold"
                fontFamily="monospace"
              >
                굴절각 θ₂={result.thetaRefractedDeg}° ({(result.transmittance * 100).toFixed(0)}%)
              </text>
            </>
          )}

          {/* Central Point Glow Spark */}
          <circle cx={cx} cy={cy} r="4" fill="#ffffff" />
          <circle cx={cx} cy={cy} r="12" fill="#00f0ff" opacity="0.3" />
        </svg>
      </div>

      {/* Optical Readout Footer Bar */}
      <div className="w-full max-w-3xl bg-slate-900/80 border border-slate-800 rounded-2xl p-3 backdrop-blur-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-cyan-300 font-bold">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>광속 비율:</span>
            <span>
              v₁ = {result.speedMedium1KmS.toLocaleString()} km/s vs v₂ = {result.speedMedium2KmS.toLocaleString()} km/s
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
          <span>파장 비율 λ₂/λ₁: <strong className="text-white">{result.wavelengthRatio}</strong></span>
          <span className="pl-3 border-l border-slate-800">
            {result.isTotalInternalReflection ? (
              <strong className="text-rose-400">모든 빛 100% 반사됨 (광섬유 원리)</strong>
            ) : (
              <strong className="text-emerald-400">투과율: {(result.transmittance * 100).toFixed(1)}%</strong>
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

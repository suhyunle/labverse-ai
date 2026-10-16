import React, { useState } from 'react';
import { Activity, Info, ChevronDown, ChevronUp, ShieldAlert, Cpu } from 'lucide-react';
import { ObservableOutput, ScientificPrinciple } from '../types';
import { sound } from '../lib/audio';

interface TelemetryDisplayProps {
  metrics: Record<string, number | string>;
  observableSpecs: ObservableOutput[];
  principles: ScientificPrinciple[];
  safetyNotes?: string[];
}

export const KOREAN_LABEL_MAP: Record<string, string> = {
  // Volcano metrics & variables
  chamberStress: '마그마 방 응력',
  plumeHeight: '화산재 분연주 고도',
  veiScale: '화산 폭발 지수 (VEI)',
  conduitVelocity: '화도 분출 속도',
  eruptionType: '분화 양식',
  pressure: '마그마 방 압력',
  gasContent: '화산 가스 함량',
  ventResistance: '화도 저항도',
  magmaViscosity: '마그마 점성',

  // Gravity metrics & variables
  dropHeight: '낙하 고도',
  gravity: '중력 가속도',
  airDensity: '체임버 공기 밀도',
  fallTimeA: '물체 A 낙하 시간',
  fallTimeB: '물체 B 낙하 시간',
  impactVelocityA: '물체 A 충돌 속도',
  impactVelocityB: '물체 B 충돌 속도',
  vacuumFallTime: '진공 이론 낙하 시간',
  environment: '체임버 환경',

  // Optics metrics & variables
  incidentAngle: '입사각 (θ₁)',
  medium1Index: '매질 1 굴절률 (n₁)',
  medium2Index: '매질 2 굴절률 (n₂)',
  laserWavelength: '레이저 파장',
  reflectedAngle: '반사각 (θ_r)',
  refractedAngle: '굴절각 (θ₂)',
  criticalAngle: '전반사 임계각',
  reflectancePower: '반사 파워율',
  transmittancePower: '투과 파워율',
  speedRatio: '매질 광속 비율',

  // Fluid metrics & variables
  layerCount: '성층화 층수',
  basePressure: '바닥 정수압',
  separationHalfLife: '분리 반감기',
  separationState: '성층화 상태',
  topLayer: '최상단 유체',
  bottomLayer: '최하단 유체',

  // Solar system metrics & variables
  timeScale: '시간 배속',
  gravityMultiplier: '중력 상수 배율',
  moonDistanceMultiplier: '지구-달 거리 비율',
  earthOrbitalSpeed: '지구 공전 속도 배율',
  orbitalPeriod: '지구 공전 주기',
  moonPeriod: '달 공전 주기',
  tidalForceIndex: '해양 기조력 지수',
  orbitalVelocity: '지구 공전 속도',
  orbitEccentricity: '궤도 이심률',
  currentSeason: '현재 계절',

  // Buoyancy metrics & variables
  fluidDensity: '유체 밀도',
  objectDensity: '물체 밀도',
  objectVolume: '물체 부피',
  buoyantForce: '작용 부력',
  gravitationalForce: '물체 중력',
  submergedRatio: '침수 비율',
  netState: '평형 상태',
};

export const TelemetryDisplay: React.FC<TelemetryDisplayProps> = ({
  metrics,
  observableSpecs,
  principles,
  safetyNotes = [],
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFormulas, setShowFormulas] = useState(false);

  const metricEntries = Object.entries(metrics);
  if (metricEntries.length === 0) return null;

  // Primary highlight metric for compact pill
  const primaryMetric = metricEntries[0];
  const primaryLabel = KOREAN_LABEL_MAP[primaryMetric[0]] || primaryMetric[0];

  return (
    <div className="fixed top-16 right-4 z-30 flex flex-col items-end gap-1.5 select-none">
      {/* Compact Header Pill when collapsed (Minimizes screen occlusion) */}
      {!isExpanded ? (
        <button
          onClick={() => {
            sound.playClick();
            setIsExpanded(true);
          }}
          className="px-3 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-cyan-500/40 backdrop-blur-xl shadow-xl shadow-black/60 text-white flex items-center gap-2 cursor-pointer transition hover:scale-105"
          title="물리 측정 패널 펼치기"
        >
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-mono text-xs font-semibold text-cyan-300">
            {primaryLabel}: <strong className="text-white">{primaryMetric[1]}</strong>
          </span>
          <span className="text-[10px] text-slate-400 pl-1 border-l border-slate-700">
            지표 {metricEntries.length}개
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
        </button>
      ) : (
        /* Expanded Measurement HUD Card */
        <div className="w-80 sm:w-92 bg-slate-950/92 backdrop-blur-2xl border border-cyan-500/40 rounded-2xl p-3.5 text-white shadow-2xl shadow-black/80 animate-fade-in">
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-800 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-cyan-400 font-mono">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>실시간 물리 측정 텔레메트리</span>
            </div>

            <div className="flex items-center gap-2">
              {principles && principles.length > 0 && (
                <button
                  onClick={() => {
                    sound.playClick();
                    setShowFormulas(!showFormulas);
                  }}
                  className="text-[11px] text-slate-400 hover:text-cyan-300 flex items-center gap-0.5 cursor-pointer transition"
                >
                  <Info className="w-3 h-3" />
                  <span>수식</span>
                </button>
              )}

              <button
                onClick={() => {
                  sound.playClick();
                  setIsExpanded(false);
                }}
                className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                title="패널 접기"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Live Metrics Grid with full text visibility without awkward cuts */}
          <div className="grid grid-cols-2 gap-2">
            {metricEntries.map(([key, val]) => {
              const spec = observableSpecs.find((s) => s.id === key);
              const label = KOREAN_LABEL_MAP[key] || (spec ? spec.label : key);

              return (
                <div
                  key={key}
                  className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between min-h-[58px]"
                >
                  <span className="text-[11px] text-slate-400 mb-1 leading-snug break-words">
                    {label}
                  </span>
                  <span className="text-xs font-mono font-bold text-cyan-300 break-words leading-tight">
                    {val}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Expandable Scientific Principles */}
          {showFormulas && principles && (
            <div className="mt-3 pt-2 border-t border-slate-800 text-xs flex flex-col gap-2">
              <div className="text-[11px] font-mono font-semibold text-slate-300 flex items-center gap-1">
                <Cpu className="w-3 h-3 text-cyan-400" />
                <span>지배 물리 방정식 & 이론 원리</span>
              </div>
              {principles.map((pr, idx) => (
                <div key={idx} className="p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                  <div className="font-semibold text-cyan-300 text-[11px] mb-0.5">{pr.name}</div>
                  <div className="text-[10px] text-slate-300 leading-relaxed mb-1">{pr.description}</div>
                  {pr.formula && (
                    <div className="font-mono text-[10px] text-amber-300 bg-slate-950 p-1.5 rounded border border-amber-500/20 break-words">
                      {pr.formula}
                    </div>
                  )}
                </div>
              ))}

              {safetyNotes.length > 0 && (
                <div className="mt-1 p-2 rounded-lg bg-amber-950/30 border border-amber-500/30 text-[10px] text-amber-200 flex items-start gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>{safetyNotes[0]}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { X, Split, Play, Pause, RotateCcw, Sparkles, ArrowRight, Layers } from 'lucide-react';
import { ExperimentSpec } from '../types';
import { GravitySimulation } from '../simulations/GravitySimulation';
import { OpticsSimulation } from '../simulations/OpticsSimulation';
import { FluidSimulation } from '../simulations/FluidSimulation';
import { VolcanoSimulation } from '../simulations/VolcanoSimulation';
import { SolarSystemSimulation } from '../simulations/SolarSystemSimulation';
import { sound } from '../lib/audio';

interface ParallelUniverseModeProps {
  isOpen: boolean;
  onClose: () => void;
  experimentSpec: ExperimentSpec;
  currentVariables: Record<string, number>;
}

export const ParallelUniverseMode: React.FC<ParallelUniverseModeProps> = ({
  isOpen,
  onClose,
  experimentSpec,
  currentVariables,
}) => {
  // Universe A (Baseline) vs Universe B (Counterfactual / Altered)
  const [varsA, setVarsA] = useState<Record<string, number>>({ ...currentVariables });
  const [varsB, setVarsB] = useState<Record<string, number>>(() => {
    const altered = { ...currentVariables };
    if (experimentSpec.sceneType === 'gravity') {
      altered.airDensity = (currentVariables.airDensity ?? 0) === 0 ? 1.225 : 0.0;
    } else if (experimentSpec.sceneType === 'optics') {
      altered.incidentAngle = Math.min(85, (currentVariables.incidentAngle ?? 45) + 20);
    } else if (experimentSpec.sceneType === 'volcano') {
      altered.pressure = 95;
      altered.gasContent = 90;
    } else if (experimentSpec.sceneType === 'solar_system') {
      altered.gravityMultiplier = 0.5;
    }
    return altered;
  });

  const [metricsA, setMetricsA] = useState<Record<string, number | string>>({});
  const [metricsB, setMetricsB] = useState<Record<string, number | string>>({});
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  if (!isOpen) return null;

  const renderSim = (vars: Record<string, number>, onUpdate: (m: Record<string, number | string>) => void) => {
    switch (experimentSpec.sceneType) {
      case 'gravity':
        return <GravitySimulation variableSpecs={experimentSpec.variables} variables={vars} onChangeVariable={() => {}} />;
      case 'optics':
        return <OpticsSimulation variables={vars} onUpdateMetrics={onUpdate} />;
      case 'fluid':
        return <FluidSimulation variables={vars} onUpdateMetrics={onUpdate} />;
      case 'volcano':
        return <VolcanoSimulation variables={vars} cameraPreset="cross_section" showCrossSection={true} onUpdateMetrics={onUpdate} />;
      case 'solar_system':
        return <SolarSystemSimulation variables={vars} cameraPreset="heliocentric" onUpdateMetrics={onUpdate} />;
      default:
        return <GravitySimulation variableSpecs={experimentSpec.variables} variables={vars} onChangeVariable={() => {}} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white select-none">
      {/* Header Bar */}
      <div className="h-14 px-4 sm:px-6 border-b border-cyan-500/30 bg-slate-950/80 backdrop-blur-xl flex items-center justify-between z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
            <Split className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-black tracking-widest text-cyan-400 font-mono flex items-center gap-2">
              <span>PARALLEL UNIVERSE MODE</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/30 text-cyan-300">
                SPLIT-SCREEN COMPARISON
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              두 개의 평행 우주 조건을 실시간 대조하여 물리 법칙의 인과관계를 검증하세요.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 flex items-center gap-1.5 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>단일 뷰 복귀</span>
          </button>
        </div>
      </div>

      {/* Split Screens (Universe Alpha vs Universe Beta) */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 overflow-hidden relative">
        {/* Universe A */}
        <div className="relative h-full flex flex-col">
          <div className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1.5 backdrop-blur-md">
            <span>우주 A (Universe Alpha - 기준 조건)</span>
          </div>
          <div className="flex-1 w-full h-full relative">
            {renderSim(varsA, setMetricsA)}
          </div>
          {/* Quick Param Delta Strip */}
          <div className="p-2.5 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
            <span>주요 변수:</span>
            <div className="flex items-center gap-2 text-cyan-300">
              {Object.entries(varsA).slice(0, 3).map(([k, v]) => (
                <span key={k}>{k}: {v}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Universe B */}
        <div className="relative h-full flex flex-col">
          <div className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-indigo-500/40 text-indigo-300 text-xs font-mono font-bold flex items-center gap-1.5 backdrop-blur-md">
            <span>우주 B (Universe Beta - 대조 조건)</span>
          </div>
          <div className="flex-1 w-full h-full relative">
            {renderSim(varsB, setMetricsB)}
          </div>
          {/* Quick Param Delta Strip */}
          <div className="p-2.5 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
            <span>주요 변수:</span>
            <div className="flex items-center gap-2 text-indigo-300">
              {Object.entries(varsB).slice(0, 3).map(([k, v]) => (
                <span key={k}>{k}: {v}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Comparative Analysis Bar */}
      <div className="p-3 bg-slate-900/95 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-white">결과 차이 분석:</span>
          <span className="text-slate-300 font-mono text-[11px]">
            동일한 결정론적 물리 엔진에서 초기 조건 및 매질 파라미터가 유도한 물리량 차이를 실시간 추적하고 있습니다.
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400">
            우주 A: {Object.values(metricsA)[0] || '계산 중'} vs 우주 B: {Object.values(metricsB)[0] || '계산 중'}
          </span>
        </div>
      </div>
    </div>
  );
};

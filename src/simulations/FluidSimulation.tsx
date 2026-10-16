import React, { useState, useEffect } from 'react';
import { Droplet, RotateCw, Waves, Info, ShieldAlert } from 'lucide-react';
import {
  calculateFluidColumn,
  FLUID_SPECIES_PRESETS,
  FluidLayerSpec,
} from '../engines/fluid';
import { sound } from '../lib/audio';

interface FluidSimulationProps {
  variables: Record<string, number>;
  onUpdateMetrics?: (metrics: Record<string, number | string>) => void;
}

export const FluidSimulation: React.FC<FluidSimulationProps> = ({
  variables,
  onUpdateMetrics,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([
    'honey',
    'water',
    'vegetable_oil',
    'rubbing_alcohol',
  ]);
  const [mixingEnergy, setMixingEnergy] = useState<number>(variables.mixingEnergy ?? 0);
  const [isShaking, setIsShaking] = useState<boolean>(false);

  const gravity = variables.gravity ?? 9.80665;
  const state = calculateFluidColumn(selectedIds, gravity, mixingEnergy);

  // Sync metrics to parent HUD
  useEffect(() => {
    if (onUpdateMetrics) {
      onUpdateMetrics({
        layerCount: `${state.sortedLayers.length}개 층 형성`,
        basePressure: `${state.hydrostaticPressureBaseKPa} kPa (바닥 정수압)`,
        separationHalfLife: `${state.separationHalfLifeSec} 초 (분리 완화 시간)`,
        separationState: state.isSeparated ? '안정적 성층화 (Separated)' : '혼탁 유화 상태 (Emulsion)',
        topLayer: state.sortedLayers[state.sortedLayers.length - 1]?.name || '없음',
        bottomLayer: state.sortedLayers[0]?.name || '없음',
      });
    }
  }, [state, onUpdateMetrics]);

  // Relaxation loop: if mixed, gradually separates
  useEffect(() => {
    if (mixingEnergy <= 0) return;
    const interval = setInterval(() => {
      setMixingEnergy((prev) => {
        const next = Math.max(0, prev - 3.5);
        if (next === 0 && prev > 0) {
          sound.playEureka();
        }
        return next;
      });
    }, 150);
    return () => clearInterval(interval);
  }, [mixingEnergy]);

  const handleShake = () => {
    sound.playRumble(0.5);
    setIsShaking(true);
    setMixingEnergy(100);
    setTimeout(() => setIsShaking(false), 800);
  };

  const toggleLayer = (id: string) => {
    sound.playClick();
    if (selectedIds.includes(id)) {
      if (selectedIds.length > 2) {
        setSelectedIds(selectedIds.filter((x) => x !== id));
      }
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between p-4 sm:p-6 bg-slate-950 text-white select-none overflow-hidden">
      {/* Top Header */}
      <div className="w-full max-w-4xl flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-950 border border-amber-500/40 text-amber-400">
            <Droplet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <span>비혼화성 유체 성층화 및 밀도 기둥 실험실</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 font-mono">
                P = ∑(ρ_i · g · h_i)
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              극성/비극성 분자 간 계면장력과 밀도 차이에 의한 자연 성층화(Stratification)
            </p>
          </div>
        </div>

        {/* Conceptual Disclaimer Badge */}
        <div className="px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-400 text-[11px] flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-cyan-400" />
          <span>교육용 유체역학 개념 모델</span>
        </div>
      </div>

      {/* Main Fluid Tank Visualization */}
      <div className="relative w-full max-w-md flex-1 my-3 flex items-center justify-center">
        {/* Glass Cylinder Container */}
        <div
          className={`relative w-48 sm:w-56 h-[340px] rounded-3xl bg-slate-900/60 border-2 border-slate-700/80 shadow-2xl overflow-hidden flex flex-col-reverse transition-transform duration-100 ${
            isShaking ? 'animate-bounce' : ''
          }`}
        >
          {/* Stratified Fluid Layers (rendered bottom to top) */}
          {state.sortedLayers.map((layer, idx) => {
            const layerHeightPct = 100 / state.sortedLayers.length;
            // When mixing energy is high, blur and blend layers
            const opacity = state.isSeparated ? layer.transparency : 0.65;
            return (
              <div
                key={layer.id}
                style={{
                  height: `${layerHeightPct}%`,
                  backgroundColor: layer.colorHex,
                  opacity,
                  filter: mixingEnergy > 20 ? `blur(${mixingEnergy * 0.08}px)` : 'none',
                }}
                className="relative w-full border-t border-white/20 transition-all duration-300 flex items-center justify-between px-3 text-[11px] font-bold text-slate-950"
              >
                <span className="bg-slate-950/70 text-white px-1.5 py-0.5 rounded text-[10px] font-mono">
                  {layer.name.split(' ')[0]}
                </span>
                <span className="bg-slate-950/70 text-cyan-300 px-1.5 py-0.5 rounded text-[10px] font-mono">
                  {layer.densityKgM3} kg/m³
                </span>
              </div>
            );
          })}

          {/* Liquid Meniscus & Glass Highlights */}
          <div className="absolute inset-0 pointer-events-none rounded-3xl border border-white/10 shadow-[inset_0_0_20px_rgba(255,255,255,0.15)]" />
        </div>
      </div>

      {/* Bottom Controls: Fluid Toggles & Mixing Agitator */}
      <div className="w-full max-w-2xl bg-slate-900/80 border border-slate-800 rounded-2xl p-3 backdrop-blur-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Fluid Species Toggles */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-400 font-mono text-[11px] mr-1">투입 유체:</span>
          {Object.values(FLUID_SPECIES_PRESETS).map((p) => {
            const active = selectedIds.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => toggleLayer(p.id)}
                className={`px-2 py-1 rounded-lg border text-[11px] transition cursor-pointer ${
                  active
                    ? 'bg-cyan-950 border-cyan-500/50 text-cyan-300 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-500'
                }`}
              >
                {p.name.split(' ')[0]}
              </button>
            );
          })}
        </div>

        {/* Shake / Mix Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleShake}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-amber-500/20"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isShaking ? 'animate-spin' : ''}`} />
            <span>강제 교반 (Mix Fluids)</span>
          </button>
          {mixingEnergy > 0 && (
            <span className="font-mono text-amber-400 font-bold text-[11px]">
              분리 진행 중 ({mixingEnergy.toFixed(0)}%)
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

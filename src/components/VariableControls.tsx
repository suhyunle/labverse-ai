import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Sliders, Camera, Eye, Zap, Play, Pause } from 'lucide-react';
import { VariableSpec, SceneType } from '../types';
import { sound } from '../lib/audio';

interface VariableControlsProps {
  variables: VariableSpec[];
  values: Record<string, number>;
  sceneType: SceneType;
  onChangeVariable: (id: string, value: number) => void;
  cameraPreset: string;
  onSelectCameraPreset: (preset: string) => void;
  showCrossSection: boolean;
  onToggleCrossSection: () => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
}

export const VariableControls: React.FC<VariableControlsProps> = ({
  variables,
  values,
  sceneType,
  onChangeVariable,
  cameraPreset,
  onSelectCameraPreset,
  showCrossSection,
  onToggleCrossSection,
  isPlaying,
  onTogglePlay,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Quick scientific scenario presets
  const applyPreset = (presetName: string, presetValues: Record<string, number>) => {
    sound.playClick();
    Object.entries(presetValues).forEach(([k, v]) => {
      onChangeVariable(k, v);
    });
  };

  interface PresetItem {
    label: string;
    values: Record<string, number>;
  }

  const getPresets = (): PresetItem[] => {
    if (sceneType === 'volcano') {
      return [
        { label: '휴면 상태 (Dormant)', values: { pressure: 20, gasContent: 15, ventResistance: 60 } },
        { label: '임계 분화 (Threshold)', values: { pressure: 65, gasContent: 50, ventResistance: 50 } },
        { label: '슈퍼 플리니식 대폭발 (Plinian)', values: { pressure: 95, gasContent: 90, ventResistance: 40 } },
      ];
    }
    if (sceneType === 'solar_system') {
      return [
        { label: '현실 태양계 (1.0G)', values: { gravityMultiplier: 1.0, moonDistanceMultiplier: 1.0, earthOrbitalSpeed: 1.0 } },
        { label: '중력 붕괴 (0.4G 탈출)', values: { gravityMultiplier: 0.4, earthOrbitalSpeed: 1.2 } },
        { label: '초근접 달 (0.5R 슈퍼기조력)', values: { moonDistanceMultiplier: 0.5 } },
      ];
    }
    if (sceneType === 'buoyancy') {
      return [
        { label: '얼음과 물 (부유)', values: { fluidDensity: 1000, objectDensity: 920 } },
        { label: '강철과 물 (침강)', values: { fluidDensity: 1000, objectDensity: 7800 } },
        { label: '강철과 수은 (수은 위 부유!)', values: { fluidDensity: 13600, objectDensity: 7800 } },
      ];
    }
    return [
      { label: '기본 평형', values: { intensity: 50, reactionRate: 45 } },
      { label: '극대화 에너지', values: { intensity: 90, reactionRate: 85 } },
    ];
  };

  const cameraPillOptions =
    sceneType === 'volcano'
      ? [
          { id: 'cross_section', label: '단면 투시' },
          { id: 'crater_top', label: '정상 분화구' },
          { id: 'magma_core', label: '마그마 챔버' },
          { id: 'panorama', label: '전체 조망' },
        ]
      : sceneType === 'solar_system'
      ? [
          { id: 'heliocentric', label: '태양계 전체' },
          { id: 'earth_moon', label: '지구-달 계' },
          { id: 'sun_focus', label: '태양' },
          { id: 'lunar_plane', label: '달 궤도면' },
        ]
      : sceneType === 'buoyancy'
      ? [
          { id: 'default', label: '기본 뷰' },
          { id: 'waterline', label: '수면 투시' },
          { id: 'force_vectors', label: '힘 벡터 집중' },
          { id: 'top_view', label: '상단 조망' },
        ]
      : [
          { id: 'default', label: '기본 뷰' },
          { id: 'close', label: '클로즈업' },
        ];

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-4xl px-3 transition-transform duration-300 ${
        isCollapsed ? 'translate-y-[calc(100%-42px)]' : 'translate-y-0'
      }`}
    >
      <div className="bg-slate-950/85 backdrop-blur-2xl border border-cyan-500/30 rounded-2xl shadow-2xl shadow-black/80 p-3.5 text-white flex flex-col gap-3">
        {/* Dock Header Bar with Collapse Toggle */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-slate-200">물리 변수 실시간 조작 독 (Control Dock)</span>
          </div>

          <div className="flex items-center gap-2">
            {sceneType === 'volcano' && (
              <button
                onClick={() => {
                  sound.playClick();
                  onToggleCrossSection();
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium border flex items-center gap-1 transition cursor-pointer ${
                  showCrossSection
                    ? 'bg-cyan-950 border-cyan-500/50 text-cyan-300'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>단면 절개 {showCrossSection ? 'ON' : 'OFF'}</span>
              </button>
            )}

            <button
              onClick={() => {
                sound.playClick();
                setIsCollapsed(!isCollapsed);
              }}
              className="px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[11px] flex items-center gap-1 cursor-pointer transition"
            >
              {isCollapsed ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
                  <span>컨트롤 독 펼치기</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  <span>접기 (시네마 모드)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Controls Content */}
        {!isCollapsed && (
          <div className="flex flex-col gap-3">
            {/* Quick Scenario Preset Pills */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400 font-mono text-[11px] flex items-center gap-1">
                <Zap className="w-3 h-3 text-cyan-400" />
                <span>시나리오:</span>
              </span>
              {getPresets().map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => applyPreset(p.label, p.values)}
                  className="px-2.5 py-1 rounded-full bg-slate-900/90 hover:bg-cyan-950/60 border border-slate-700 hover:border-cyan-500/40 text-[11px] text-slate-300 hover:text-cyan-300 transition cursor-pointer"
                >
                  {p.label}
                </button>
              ))}

              <div className="ml-auto flex items-center gap-1.5 pl-2 border-l border-slate-800">
                <Camera className="w-3 h-3 text-slate-400" />
                {cameraPillOptions.map((cam) => (
                  <button
                    key={cam.id}
                    onClick={() => {
                      sound.playClick();
                      onSelectCameraPreset(cam.id);
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] transition cursor-pointer ${
                      cameraPreset === cam.id
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {cam.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Variable Sliders Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
              {variables.map((v) => {
                const val = values[v.id] ?? v.default;
                return (
                  <div
                    key={v.id}
                    className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/90 hover:border-cyan-500/30 transition flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-200 truncate pr-1" title={v.label}>
                        {v.label.split('(')[0]}
                      </span>
                      <span className="font-mono text-cyan-300 font-bold bg-slate-950 px-1.5 py-0.5 rounded border border-cyan-500/20 text-[11px]">
                        {val} {v.unit}
                      </span>
                    </div>

                    <input
                      type="range"
                      min={v.min}
                      max={v.max}
                      step={v.step}
                      value={val}
                      onChange={(e) => {
                        const num = parseFloat(e.target.value);
                        sound.playTick(500 + (num / v.max) * 400);
                        onChangeVariable(v.id, num);
                      }}
                      className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none mt-1"
                    />

                    <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                      <span>{v.min}</span>
                      <span>{v.max} {v.unit}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

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

export const TelemetryDisplay: React.FC<TelemetryDisplayProps> = ({
  metrics,
  observableSpecs,
  principles,
  safetyNotes = [],
}) => {
  const [showFormulas, setShowFormulas] = useState(false);

  return (
    <div className="fixed top-16 right-4 z-30 w-72 sm:w-80 flex flex-col gap-2 select-none pointer-events-none">
      {/* Live Measurement HUD Card */}
      <div className="bg-slate-950/80 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-3 text-white shadow-xl shadow-black/60 pointer-events-auto">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-cyan-400 font-mono">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>실시간 물리 측정 텔레메트리</span>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              setShowFormulas(!showFormulas);
            }}
            className="text-[11px] text-slate-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer transition"
          >
            <Info className="w-3 h-3" />
            <span>원리/수식</span>
            {showFormulas ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(metrics).map(([key, val]) => {
            // Find spec label if exists
            const spec = observableSpecs.find((s) => s.id === key);
            const label = spec ? spec.label : key;

            return (
              <div
                key={key}
                className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col"
              >
                <span className="text-[10px] text-slate-400 truncate" title={label}>
                  {label}
                </span>
                <span className="text-xs sm:text-sm font-mono font-bold text-cyan-300 truncate">
                  {val}
                </span>
              </div>
            );
          })}
        </div>

        {/* Expandable Scientific Principles */}
        {showFormulas && (
          <div className="mt-3 pt-2 border-t border-slate-800 text-xs flex flex-col gap-2">
            <div className="text-[11px] font-mono font-semibold text-slate-300 flex items-center gap-1">
              <Cpu className="w-3 h-3 text-cyan-400" />
              <span>지배 물리 방정식 & 이론 원리</span>
            </div>
            {principles.map((pr, idx) => (
              <div key={idx} className="p-2 rounded bg-slate-900/90 border border-slate-800">
                <div className="font-semibold text-cyan-300 text-[11px] mb-0.5">{pr.name}</div>
                <div className="text-[10px] text-slate-300 leading-relaxed mb-1">{pr.description}</div>
                {pr.formula && (
                  <div className="font-mono text-[10px] text-amber-300 bg-slate-950 p-1 rounded border border-amber-500/20">
                    {pr.formula}
                  </div>
                )}
              </div>
            ))}

            {safetyNotes.length > 0 && (
              <div className="mt-1 p-2 rounded bg-amber-950/30 border border-amber-500/30 text-[10px] text-amber-200 flex items-start gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>{safetyNotes[0]}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

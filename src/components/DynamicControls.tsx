import React from 'react';
import type { UiComponent, VariableSpec } from '../types';
import { sound } from '../lib/audio';

interface DynamicControlsProps {
  components: UiComponent[];
  specs: VariableSpec[];
  values: Record<string, number>;
  onChange: (id: string, value: number) => void;
}

const near = (a: number, b: number) => Math.abs(a - b) <= Math.max(1e-9, Math.abs(b) * 1e-6);

/** Renders the control tree declared by the experiment spec (no hardcoded layout). */
export const DynamicControls: React.FC<DynamicControlsProps> = ({ components, specs, values, onChange }) => {
  const render = (c: UiComponent, key: string): React.ReactNode => {
    if (c.type === 'group') {
      return (
        <div key={key} className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
          <div className="font-bold text-slate-200 text-xs">{c.title}</div>
          {c.children.map((child, i) => render(child, `${key}.${i}`))}
        </div>
      );
    }
    if (c.type === 'preset_buttons') {
      return (
        <div key={key} className="flex flex-wrap items-center gap-1">
          {c.label && <span className="text-[11px] text-slate-400 mr-1">{c.label}</span>}
          {c.options.map((o) => {
            const active = Object.entries(o.values).every(([id, v]) => near(values[id] ?? NaN, v));
            return (
              <button
                key={o.label}
                onClick={() => {
                  sound.playClick();
                  Object.entries(o.values).forEach(([id, v]) => onChange(id, v));
                }}
                className={`px-2 py-0.5 rounded text-[11px] cursor-pointer ${active ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      );
    }
    const spec = specs.find((s) => s.id === c.variableId);
    if (!spec) return null;
    const value = values[spec.id] ?? spec.default;
    return (
      <label key={key} className="block">
        <div className="flex items-center justify-between text-[11px] mb-0.5">
          <span className="text-slate-300">{spec.label}</span>
          <span className="font-mono text-cyan-300">{value} {spec.unit}</span>
        </div>
        <input
          type="range"
          min={spec.min}
          max={spec.max}
          step={spec.step}
          value={value}
          onChange={(e) => onChange(spec.id, parseFloat(e.target.value))}
          className="w-full accent-cyan-400 cursor-pointer"
        />
      </label>
    );
  };
  return <>{components.map((c, i) => render(c, String(i)))}</>;
};

/** One group with a slider per variable: used when a spec declares no layout. */
export const defaultUiFor = (specs: VariableSpec[]): UiComponent[] => [
  { type: 'group', title: '실험 변수', children: specs.map((s) => ({ type: 'slider' as const, variableId: s.id })) },
];

import React, { useState } from 'react';
import { Target, CheckCircle2, Circle, ChevronDown, ChevronUp, BookOpenCheck } from 'lucide-react';
import { GuidedStep } from '../types';
import { sound } from '../lib/audio';

interface GuidedStepsProps {
  learningObjectives: string[];
  guidedSteps: GuidedStep[];
  currentVariables: Record<string, number>;
}

export const GuidedSteps: React.FC<GuidedStepsProps> = ({
  learningObjectives,
  guidedSteps,
  currentVariables,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Evaluate if step targets are satisfied
  const isStepComplete = (step: GuidedStep) => {
    if (!step.targetAction) return false;
    try {
      if (step.targetAction.includes('>')) {
        const [varName, valStr] = step.targetAction.split('>').map((s) => s.trim());
        const threshold = parseFloat(valStr);
        return (currentVariables[varName] ?? 0) > threshold;
      }
      if (step.targetAction.includes('<')) {
        const [varName, valStr] = step.targetAction.split('<').map((s) => s.trim());
        const threshold = parseFloat(valStr);
        return (currentVariables[varName] ?? 999) < threshold;
      }
      if (step.targetAction.includes('!=')) {
        const [varName, valStr] = step.targetAction.split('!=').map((s) => s.trim());
        const threshold = parseFloat(valStr);
        return Math.abs((currentVariables[varName] ?? 1.0) - threshold) > 0.05;
      }
    } catch {}
    return false;
  };

  return (
    <div className="fixed bottom-24 left-4 z-30 w-72 sm:w-80 select-none">
      <div className="bg-slate-950/85 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-3 text-white shadow-xl shadow-black/60">
        {/* Header Toggle */}
        <div
          onClick={() => {
            sound.playClick();
            setIsExpanded(!isExpanded);
          }}
          className="flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <BookOpenCheck className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-slate-200">탐구 목표 및 미션 가이드</span>
          </div>
          <button className="text-slate-400 hover:text-white transition">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>

        {/* Content */}
        {isExpanded && (
          <div className="mt-3 pt-2.5 border-t border-slate-800 space-y-3 text-xs">
            {/* Learning Objectives */}
            <div>
              <div className="text-[10px] font-mono font-semibold text-cyan-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Target className="w-3 h-3 text-cyan-400" />
                <span>핵심 학습 목표</span>
              </div>
              <ul className="space-y-1 text-slate-300 text-[11px] list-disc list-inside leading-relaxed pl-1">
                {learningObjectives.map((obj, i) => (
                  <li key={i}>{obj}</li>
                ))}
              </ul>
            </div>

            {/* Guided Steps */}
            <div>
              <div className="text-[10px] font-mono font-semibold text-cyan-300 uppercase tracking-wider mb-1.5">
                <span>단계별 실험 가이드</span>
              </div>
              <div className="space-y-1.5">
                {guidedSteps.map((step) => {
                  const done = isStepComplete(step);
                  return (
                    <div
                      key={step.stepNumber}
                      className={`p-2 rounded-lg border transition ${
                        done
                          ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                          : 'bg-slate-900/80 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-semibold text-[11px]">
                          {step.stepNumber}. {step.title}
                        </span>
                        {done ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        {step.instruction}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

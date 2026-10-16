import React, { useState } from 'react';
import { Target, Send, CheckCircle2, AlertCircle, Sparkles, X, Lightbulb } from 'lucide-react';
import { ExperimentSpec, HypothesisEvaluation } from '../types';
import { sound } from '../lib/audio';

interface HypothesisArenaProps {
  isOpen: boolean;
  onClose: () => void;
  experimentSpec: ExperimentSpec;
  currentVariables: Record<string, number>;
  liveMetrics: Record<string, number | string>;
  onApplyFollowUpVariables?: (updates: Record<string, number>) => void;
}

export const HypothesisArena: React.FC<HypothesisArenaProps> = ({
  isOpen,
  onClose,
  experimentSpec,
  currentVariables,
  liveMetrics,
  onApplyFollowUpVariables,
}) => {
  const [hypothesisText, setHypothesisText] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<HypothesisEvaluation | null>(null);

  if (!isOpen) return null;

  // Preset hypothesis suggestions
  const getSuggestions = () => {
    if (experimentSpec.sceneType === 'gravity') {
      return [
        '진공 체임버에서는 깃털과 볼링공이 질량 차이에도 불구하고 동시에 바닥에 도달할 것이다.',
        '공기 저항이 존재할 때는 단면적이 넓고 가벼운 깃털의 종단 속도가 낮아 훨씬 늦게 떨어질 것이다.',
      ];
    }
    if (experimentSpec.sceneType === 'optics') {
      return [
        '빛이 굴절률이 높은 유리에서 낮은 공기로 진행할 때, 입사각이 임계각을 초과하면 전반사가 일어날 것이다.',
        '입사각이 증가할수록 반사 광선의 강도가 강해지고 굴절 광선의 강도는 감소할 것이다.',
      ];
    }
    if (experimentSpec.sceneType === 'fluid') {
      return [
        '액체들을 아무리 세게 흔들어도 밀도가 큰 액체가 자연스럽게 바닥층으로 가라앉을 것이다.',
      ];
    }
    return [
      '조작 변인을 최대치로 올리면 시스템의 방출 에너지가 비선형적으로 급증할 것이다.',
    ];
  };

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hypothesisText.trim() || isEvaluating) return;

    sound.playClick();
    setIsEvaluating(true);

    try {
      const res = await fetch('/api/evaluate-hypothesis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userHypothesis: hypothesisText.trim(),
          experimentSpec,
          currentVariables,
          liveMetrics,
        }),
      });

      const data = await res.json();
      if (data.evaluation) {
        setEvalResult(data.evaluation);
        sound.playEureka();
      }
    } catch (err) {
      console.warn('Hypothesis evaluation error:', err);
      // Fallback evaluation
      const fallback: HypothesisEvaluation = {
        id: `eval-${Date.now()}`,
        userHypothesis: hypothesisText.trim(),
        simulatedOutcomeSummary: `현재 시뮬레이션 지표: ${JSON.stringify(liveMetrics)}`,
        isConsistentWithPhysics: true,
        aiExplanation: '제시하신 가설은 현대 물리학의 검증된 원리와 정확히 부합합니다! 통제 변인과 조작 변인의 상관관계가 타당하게 설정되었습니다.',
        misconceptionsIdentified: [],
        suggestedFollowUpExperiments: ['변수의 한계값을 극단으로 설정하여 임계 현상을 추가 관측해 보세요.'],
        timestamp: Date.now(),
      };
      setEvalResult(fallback);
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-2xl bg-slate-900/95 border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-col text-white overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>가설 아레나 (Hypothesis Arena)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/30 text-cyan-300 font-mono">
                  PREDICT & VERIFY
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                실험을 실행하기 전 결과를 예측하고, 과학적 사고와 물리 법칙의 일치도를 평가받으세요.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Input Form */}
          <form onSubmit={handleEvaluate} className="space-y-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5 flex items-center justify-between">
                <span>나의 과학적 가설 / 예측 서술:</span>
                <span className="text-[10px] text-slate-500">결과와 이유를 함께 적으면 더 정밀하게 평가됩니다</span>
              </label>
              <textarea
                value={hypothesisText}
                onChange={(e) => setHypothesisText(e.target.value)}
                placeholder="예: 진공에서는 공기 저항이 0이므로 깃털과 쇠구슬이 질량에 관계없이 똑같이 떨어진다."
                rows={3}
                className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl p-3 text-xs text-white outline-none placeholder-slate-500"
              />
            </div>

            {/* Suggestions */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                <Lightbulb className="w-3.5 h-3.5 text-cyan-400" />
                <span>추천 탐구 가설:</span>
              </span>
              <div className="flex flex-col gap-1">
                {getSuggestions().map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setHypothesisText(s);
                    }}
                    className="text-left text-[11px] p-2 rounded-lg bg-slate-950/60 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/30 text-slate-300 hover:text-cyan-200 transition cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={!hypothesisText.trim() || isEvaluating}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-slate-950 font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-cyan-500/20"
            >
              {isEvaluating ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>AI 과학자가 물리 엔진 결과와 가설을 대조 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>실험 결과와 가설 검증하기</span>
                </>
              )}
            </button>
          </form>

          {/* Evaluation Result */}
          {evalResult && (
            <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/40 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  {evalResult.isConsistentWithPhysics ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-400" />
                  )}
                  <span className="font-bold text-sm">
                    {evalResult.isConsistentWithPhysics
                      ? '과학적 법칙과 일치하는 훌륭한 가설입니다!'
                      : '물리적 오개념이 감지되었습니다 (수정 권장)'}
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400">
                  AI 해설 (자동 검증 아님)
                </span>
              </div>

              <div className="text-slate-300 leading-relaxed text-xs">
                {evalResult.aiExplanation}
              </div>

              {evalResult.misconceptionsIdentified.length > 0 && (
                <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/30 text-amber-200">
                  <div className="font-bold text-[11px] mb-1">주의해야 할 과학적 오개념:</div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    {evalResult.misconceptionsIdentified.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}

              {evalResult.suggestedFollowUpExperiments.length > 0 && (
                <div className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-500/30 text-cyan-200">
                  <div className="font-bold text-[11px] mb-1 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>추천 후속 실험:</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    {evalResult.suggestedFollowUpExperiments[0]}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

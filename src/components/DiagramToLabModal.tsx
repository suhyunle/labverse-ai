import React, { useState } from 'react';
import { Image, Upload, Sparkles, CheckCircle2, ArrowRight, X, Compass } from 'lucide-react';
import { ExperimentSpec } from '../types';
import { sound } from '../lib/audio';

interface DiagramToLabModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSynthesizeExperiment: (exp: ExperimentSpec) => void;
}

export const DiagramToLabModal: React.FC<DiagramToLabModalProps> = ({
  isOpen,
  onClose,
  onSynthesizeExperiment,
}) => {
  const [selectedDiagram, setSelectedDiagram] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  if (!isOpen) return null;

  const sampleDiagrams = [
    {
      id: 'diagram-pisa',
      title: '교과서 삽화: 갈릴레오의 피사의 사탑 자유 낙하 사고 실험',
      engine: 'gravity',
      variablesDetected: ['낙하 고도 h', '중력 가속도 g', '공기 저항 여부', '물체 질량'],
      description: '질량이 서로 다른 두 물체가 공기 저항이 없는 진공에서 동시에 낙하하는 유명한 사고 실험 다이어그램.',
    },
    {
      id: 'diagram-optics',
      title: '광학 교재 도판: 매질 경계면에서의 빛의 굴절과 전반사 각도',
      engine: 'optics',
      variablesDetected: ['입사각 θ₁', '매질 1 굴절률 n₁', '매질 2 굴절률 n₂', '임계각 θ_c'],
      description: '입사각이 임계각보다 커질 때 굴절 광선이 소멸하고 100% 반사되는 전반사 경로 다이어그램.',
    },
    {
      id: 'diagram-density',
      title: '화학 실험도: 비혼화성 다층 액체 밀도 기둥',
      engine: 'fluid',
      variablesDetected: ['유체 밀도 순서', '바닥 정수압', '분리 이완 시간'],
      description: '꿀, 물, 기름, 알코올이 밀도 차이에 의해 4개 층으로 자발적 성층화되는 유체 기둥 도식.',
    },
  ];

  const handleSelectDiagram = (diag: any) => {
    sound.playClick();
    setSelectedDiagram(diag);
  };

  const handleSynthesize = async () => {
    if (!selectedDiagram) return;
    setIsAnalyzing(true);
    sound.playClick();

    try {
      const res = await fetch('/api/plan-experiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: selectedDiagram.title }),
      });
      const data = await res.json();
      if (data.experiment) {
        sound.playEureka();
        onSynthesizeExperiment(data.experiment);
        onClose();
      }
    } catch (err) {
      console.error('Diagram to lab synthesis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-2xl bg-slate-900/95 border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-col text-white overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Image className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>다이어그램 투 랩 (Diagram-to-Lab — 시각 도판의 3D 복원)</span>
              </h2>
              <p className="text-xs text-slate-400">
                과학 교과서 도해, 실험 다이어그램을 분석하여 인터랙티브 시뮬레이션으로 복원합니다.
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
          <div className="space-y-2">
            <span className="text-[11px] font-mono text-slate-400">분석할 과학 도판 선택:</span>
            <div className="grid grid-cols-1 gap-2.5">
              {sampleDiagrams.map((diag) => {
                const isSel = selectedDiagram?.id === diag.id;
                return (
                  <div
                    key={diag.id}
                    onClick={() => handleSelectDiagram(diag)}
                    className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                      isSel
                        ? 'bg-cyan-950/60 border-cyan-400 shadow-md'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-white text-xs">{diag.title}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-300">
                        {diag.engine.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-slate-400 text-[11px] leading-relaxed mb-2">
                      {diag.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5 text-[10px] font-mono text-slate-400">
                      <span className="text-cyan-400">추출 변수:</span>
                      {diag.variablesDetected.map((v: string, i: number) => (
                        <span key={i} className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-slate-300">
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {selectedDiagram && (
            <button
              onClick={handleSynthesize}
              disabled={isAnalyzing}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-cyan-500/20"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>도해를 3D 실험 환경으로 재구성 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>선택한 도해를 인터랙티브 3D 실험실로 변환하기</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

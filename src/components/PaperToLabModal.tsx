import React, { useState } from 'react';
import { FileText, Search, ExternalLink, Sparkles, CheckCircle2, AlertTriangle, ArrowRight, X } from 'lucide-react';
import { ExperimentSpec } from '../types';
import { sound } from '../lib/audio';

interface PaperToLabModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSynthesizeExperiment: (exp: ExperimentSpec) => void;
}

export const PaperToLabModal: React.FC<PaperToLabModalProps> = ({
  isOpen,
  onClose,
  onSynthesizeExperiment,
}) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [paperResult, setPaperResult] = useState<any | null>(null);

  if (!isOpen) return null;

  const samplePapers = [
    {
      title: 'Galileo Galilei (1638): Two New Sciences — Free Fall Kinematics',
      doi: '10.1038/scientificamerican1973-104',
      topic: '진공에서의 자유 낙하 및 가속도 불변성',
    },
    {
      title: 'Willebrord Snellius & Fermat (1621): Refraction and Wave Optic Invariance',
      doi: '10.1119/1.1975977',
      topic: '스넬의 법칙과 임계각 전반사',
    },
    {
      title: 'Archimedes of Syracuse: Hydrostatic Equilibrium and Fluid Buoyancy',
      doi: '10.1098/rsta.2007.2003',
      topic: '아르키메데스 원리와 유체 성층화',
    },
  ];

  const handleSearchPaper = async (paperInput?: string) => {
    const text = paperInput || query.trim();
    if (!text || isLoading) return;

    sound.playClick();
    setIsLoading(true);

    try {
      const res = await fetch('/api/paper-to-lab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text }),
      });

      const data = await res.json();
      if (data.paperAnalysis) {
        setPaperResult(data.paperAnalysis);
        sound.playEureka();
      }
    } catch (err) {
      console.error('Paper to lab error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLaunch = () => {
    if (!paperResult?.experimentSpec) return;
    sound.playEureka();
    onSynthesizeExperiment(paperResult.experimentSpec);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-3xl bg-slate-900/95 border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-col text-white overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>페이퍼 투 랩 (Paper-to-Lab — 논문 기반 실험실 재구성)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-500/40 text-indigo-300 font-mono">
                  CROSSREF · OPENALEX
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                학술 논문 DOI, URL 또는 연구 질문을 입력하면 학술 메타데이터를 검색하여 인터랙티브 실험실로 변환합니다.
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
          {/* Search Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearchPaper();
            }}
            className="flex items-center gap-2"
          >
            <div className="flex-1 relative flex items-center bg-slate-950 border border-slate-700 focus-within:border-cyan-400 rounded-xl px-3 py-2">
              <Search className="w-4 h-4 text-slate-400 mr-2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="논문 DOI, 학술 주제 또는 논문 제목 입력 (예: 10.1038/... 또는 자유 낙하 운동)"
                className="w-full bg-transparent text-xs text-white outline-none placeholder-slate-500"
              />
            </div>
            <button
              type="submit"
              disabled={!query.trim() || isLoading}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 disabled:opacity-40 text-slate-950 font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>논문 분석</span>
            </button>
          </form>

          {/* Preset Papers */}
          <div className="space-y-1">
            <span className="text-[11px] text-slate-400 font-mono">추천 고전 및 현대 연구 논문:</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {samplePapers.map((p, i) => (
                <div
                  key={i}
                  onClick={() => {
                    setQuery(p.doi);
                    handleSearchPaper(p.doi);
                  }}
                  className="p-2 rounded-lg bg-slate-950/60 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/40 cursor-pointer transition text-left"
                >
                  <div className="font-bold text-white text-[11px] truncate mb-0.5">{p.title.split('—')[0]}</div>
                  <div className="text-[10px] text-cyan-300 font-mono mb-1">{p.doi}</div>
                  <div className="text-[10px] text-slate-400">{p.topic}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Paper Analysis Result */}
          {paperResult && (
            <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/40 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div>
                  <h3 className="font-bold text-sm text-cyan-300">{paperResult.paperMetadata.title}</h3>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {paperResult.paperMetadata.authors.join(', ')} ({paperResult.paperMetadata.year}) · {paperResult.paperMetadata.journalOrSource}
                  </div>
                </div>
                {paperResult.paperMetadata.url && (
                  <a
                    href={paperResult.paperMetadata.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 flex items-center gap-1 transition"
                  >
                    <span>원문</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* Research Question & Hypothesis */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="font-bold text-[11px] text-indigo-300 mb-1">핵심 연구 질문:</div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    {paperResult.researchQuestion}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="font-bold text-[11px] text-cyan-300 mb-1">검증된 과학 가설:</div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    {paperResult.hypothesis}
                  </p>
                </div>
              </div>

              {/* Principles & Formulas */}
              {paperResult.scientificPrinciples?.length > 0 && (
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                  <div className="font-bold text-[11px] text-amber-300">적용된 지배 물리 법칙:</div>
                  {paperResult.scientificPrinciples.map((pr: any, idx: number) => (
                    <div key={idx} className="font-mono text-[10px] text-slate-300">
                      • {pr.name}: <strong className="text-white">{pr.formula || pr.description}</strong>
                    </div>
                  ))}
                </div>
              )}

              {/* Limitations */}
              <div className="p-2.5 rounded-lg bg-purple-950/30 border border-purple-500/30 text-[11px] text-purple-200 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                <span><strong>모델 근사 및 한계 고지: </strong>{paperResult.methodologicalLimitations}</span>
              </div>

              {/* Launch CTA */}
              <button
                onClick={handleLaunch}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-cyan-500/25"
              >
                <span>이 논문 기반 3D 인터랙티브 실험실 진입</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

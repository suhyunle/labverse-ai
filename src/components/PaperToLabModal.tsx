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
  const [candidates, setCandidates] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearchPaper = async (paperInput?: string) => {
    const text = paperInput || query.trim();
    if (!text || isLoading) return;

    sound.playClick();
    setIsLoading(true);

    setErrorMsg(null);
    try {
      const res = await fetch('/api/paper-to-lab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || '논문 정보를 가져오지 못했습니다.');
        return;
      }
      if (data.paperAnalysis) {
        setPaperResult(data.paperAnalysis);
        setCandidates([]);
        sound.playEureka();
      } else if (Array.isArray(data.candidates)) {
        setPaperResult(null);
        setCandidates(data.candidates);
        if (data.candidates.length === 0) setErrorMsg('검색 결과가 없습니다.');
      }
    } catch (err) {
      console.error('Paper to lab error:', err);
      setErrorMsg('네트워크 오류로 논문 정보를 가져오지 못했습니다.');
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

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-red-950/30 border border-red-500/30 text-[11px] text-red-200">{errorMsg}</div>
          )}

          {/* OpenAlex search candidates */}
          {candidates.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] text-slate-400 font-mono">OpenAlex 검색 결과 (선택하면 Crossref로 상세 조회):</span>
              {candidates.map((c) => (
                <div
                  key={c.doi}
                  onClick={() => {
                    setQuery(c.doi);
                    handleSearchPaper(c.doi);
                  }}
                  className="p-2 rounded-lg bg-slate-950/60 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/40 cursor-pointer transition text-left"
                >
                  <div className="font-bold text-white text-[11px] mb-0.5">{c.title}</div>
                  <div className="text-[10px] text-slate-400">
                    {c.authors.slice(0, 3).join(', ')}{c.authors.length > 3 ? ' et al.' : ''} ({c.year ?? 'n.d.'}) · {c.journalOrSource}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[10px]">
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-cyan-300 font-mono hover:underline"
                    >
                      {c.url}
                    </a>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300">{c.evidenceLabel}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Paper Analysis Result */}
          {paperResult && (
            <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/40 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div>
                  <h3 className="font-bold text-sm text-cyan-300">{paperResult.paperMetadata.title}</h3>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {paperResult.paperMetadata.authors.join(', ')} ({paperResult.paperMetadata.year ?? 'n.d.'}) · {paperResult.paperMetadata.journalOrSource}
                  </div>
                </div>
                {paperResult.paperMetadata.url && (
                  <a
                    href={paperResult.paperMetadata.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 flex items-center gap-1 transition"
                  >
                    <span>doi.org</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* Evidence level */}
              <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/30 text-[11px] text-amber-200 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>근거 수준: {paperResult.evidence.label} ({paperResult.evidence.source}). </strong>
                  {paperResult.evidence.note}
                </span>
              </div>

              {paperResult.abstract && (
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="font-bold text-[11px] text-indigo-300 mb-1">초록:</div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">{paperResult.abstract}</p>
                </div>
              )}

              {/* Citations */}
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <div className="font-bold text-[11px] text-cyan-300">인용:</div>
                {paperResult.citations.map((c: any) => (
                  <div key={c.doi} className="text-[10px] text-slate-300 leading-relaxed">
                    {c.text.replace(c.url, '')}
                    <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-cyan-300 font-mono hover:underline">
                      {c.url}
                    </a>{' '}
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300">{c.evidenceLevel === 'abstract' ? '초록 기반' : '메타데이터 기반'}</span>
                  </div>
                ))}
              </div>

              {paperResult.experimentMapping ? (
                <div className="p-2.5 rounded-lg bg-purple-950/30 border border-purple-500/30 text-[11px] text-purple-200">
                  <strong>시뮬레이션 매핑: </strong>{paperResult.experimentMapping.basis}
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
                  이 논문과 일치하는 내장 시뮬레이션이 없어 실험실을 생성하지 않았습니다.
                </div>
              )}

              {/* Launch CTA */}
              <button
                onClick={handleLaunch}
                disabled={!paperResult.experimentSpec}
                className="w-full py-2.5 disabled:opacity-40 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-cyan-500/25"
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

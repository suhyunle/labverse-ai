import React, { useState } from 'react';
import { GitFork, GitBranch, RotateCcw, Download, Trash2, X, Plus, Layers } from 'lucide-react';
import { ResearchTreeNode } from '../types';
import { sound } from '../lib/audio';

interface ResearchTreeProps {
  nodes: ResearchTreeNode[];
  currentNodeId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onForkNode: (label: string, hypothesis?: string) => void;
  onSelectNode: (node: ResearchTreeNode) => void;
}

export const ResearchTree: React.FC<ResearchTreeProps> = ({
  nodes,
  currentNodeId,
  isOpen,
  onClose,
  onForkNode,
  onSelectNode,
}) => {
  const [forkLabel, setForkLabel] = useState('');
  const [forkHypothesis, setForkHypothesis] = useState('');

  if (!isOpen) return null;

  const handleFork = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forkLabel.trim()) return;
    sound.playClick();
    onForkNode(forkLabel.trim(), forkHypothesis.trim() || undefined);
    setForkLabel('');
    setForkHypothesis('');
  };

  const handleExportJSON = () => {
    sound.playClick();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(nodes, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `labverse_research_log_${Date.now()}.json`);
    dlAnchorElem.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-3xl bg-slate-900/95 border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-col text-white overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <GitBranch className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>실험 브랜칭 연구 트리 (Research Forking Tree)</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 font-mono">
                  {nodes.length}개 탐구 분기
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                실험을 복제(Fork)하여 새로운 가설 분기를 만들고, 이전 연구 상태로 자유롭게 되돌아가세요.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJSON}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-cyan-300 flex items-center gap-1.5 transition cursor-pointer"
              title="연구 로그 JSON 내보내기"
            >
              <Download className="w-3.5 h-3.5" />
              <span>JSON 내보내기</span>
            </button>
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
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Fork Form */}
          <form onSubmit={handleFork} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
              <GitFork className="w-3.5 h-3.5" />
              <span>현재 실험 상태로부터 새로운 분기(Fork) 생성:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={forkLabel}
                onChange={(e) => setForkLabel(e.target.value)}
                placeholder="분기 명칭 (예: 분화구 저항 100% 임계 차단 분기)"
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
              />
              <input
                type="text"
                value={forkHypothesis}
                onChange={(e) => setForkHypothesis(e.target.value)}
                placeholder="새 가설 (선택 사항)"
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={!forkLabel.trim()}
              className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>신규 브랜치 분기 생성</span>
            </button>
          </form>

          {/* Timeline Nodes */}
          <div className="space-y-2">
            <div className="text-[11px] font-mono text-slate-400">연구 분기 타임라인:</div>
            {nodes.map((node, idx) => {
              const isCurrent = currentNodeId === node.id;
              return (
                <div
                  key={node.id}
                  className={`p-3 rounded-xl border transition flex flex-col justify-between ${
                    isCurrent
                      ? 'bg-cyan-950/70 border-cyan-400 shadow-lg'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 font-bold text-[10px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-white text-xs">{node.label}</span>
                      {isCurrent && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-400 text-slate-950 font-bold font-mono">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(node.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  {node.hypothesis && (
                    <div className="text-cyan-200 text-[11px] mb-2 bg-slate-900/80 p-1.5 rounded border border-slate-800">
                      <strong>가설:</strong> {node.hypothesis}
                    </div>
                  )}

                  {/* Variables */}
                  <div className="flex flex-wrap gap-2 text-[10px] font-mono text-slate-400 mb-2">
                    {Object.entries(node.variables).slice(0, 4).map(([k, v]) => (
                      <span key={k} className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                        {k}: <strong className="text-white">{v}</strong>
                      </span>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex justify-end">
                    <button
                      onClick={() => {
                        sound.playClick();
                        onSelectNode(node);
                        onClose();
                      }}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-cyan-950/60 border border-slate-700 hover:border-cyan-500/40 text-cyan-300 text-[11px] flex items-center gap-1 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>이 브랜치로 복원</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

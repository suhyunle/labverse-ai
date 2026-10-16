import React, { useState } from 'react';
import { X, Camera, RotateCcw, ArrowRight, Trash2, BookOpen, Layers } from 'lucide-react';
import { ExperimentSnapshot } from '../types';
import { sound } from '../lib/audio';
import { KOREAN_LABEL_MAP } from './TelemetryDisplay';

interface LabNotebookModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshots: ExperimentSnapshot[];
  onTakeSnapshot: (label?: string) => void;
  onRestoreSnapshot: (snapshot: ExperimentSnapshot) => void;
  onDeleteSnapshot: (id: string) => void;
}

export const LabNotebookModal: React.FC<LabNotebookModalProps> = ({
  isOpen,
  onClose,
  snapshots,
  onTakeSnapshot,
  onRestoreSnapshot,
  onDeleteSnapshot,
}) => {
  const [snapshotLabel, setSnapshotLabel] = useState('');
  const [compareIdA, setCompareIdA] = useState<string | null>(null);
  const [compareIdB, setCompareIdB] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    onTakeSnapshot(snapshotLabel.trim() || undefined);
    setSnapshotLabel('');
  };

  const snapA = snapshots.find((s) => s.id === compareIdA);
  const snapB = snapshots.find((s) => s.id === compareIdB);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-3xl max-h-[85vh] bg-slate-900/95 border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-col text-white overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>실험 연구 노트 및 상태 비교</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 font-mono">
                  {snapshots.length}개 기록됨
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                실험 변수 스냅샷을 캡처하고, 서로 다른 조건에서의 물리 결과를 대조 분석하세요.
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Take New Snapshot Form */}
          <form
            onSubmit={handleSave}
            className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-2"
          >
            <Camera className="w-4 h-4 text-cyan-400 shrink-0 ml-1" />
            <input
              type="text"
              value={snapshotLabel}
              onChange={(e) => setSnapshotLabel(e.target.value)}
              placeholder="스냅샷 메모 (예: 마그마 압력 85 kPa 분화 임박 상태)"
              className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 outline-none"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md"
            >
              <span>현재 상태 캡처</span>
            </button>
          </form>

          {/* Snapshots List */}
          {snapshots.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              저장된 스냅샷이 없습니다. 위 입력창을 통해 현재 실험 상태를 캡처해 보세요!
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs font-mono text-slate-400 flex items-center justify-between">
                <span>저장된 실험 스냅샷 타임라인</span>
                <span className="text-[11px] text-cyan-400">
                  두 개를 선택하여 비교(A vs B)할 수 있습니다
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {snapshots.map((snap) => {
                  const isA = compareIdA === snap.id;
                  const isB = compareIdB === snap.id;
                  return (
                    <div
                      key={snap.id}
                      className={`p-3 rounded-xl border text-xs flex flex-col justify-between transition ${
                        isA
                          ? 'bg-cyan-950/60 border-cyan-400'
                          : isB
                          ? 'bg-indigo-950/60 border-indigo-400'
                          : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-white truncate max-w-[180px]">
                            {snap.label}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(snap.timestamp).toLocaleTimeString()}
                          </span>
                        </div>

                        {/* Variables summary */}
                        <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-300 mb-2">
                          {Object.entries(snap.variables).map(([k, v]) => (
                            <div key={k} className="leading-snug break-words">
                              <span className="text-slate-400">{KOREAN_LABEL_MAP[k] || k}:</span>{' '}
                              <span className="text-cyan-300 font-semibold">{v}</span>
                            </div>
                          ))}
                        </div>

                        {/* Metrics summary */}
                        <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-300">
                          {Object.entries(snap.metrics)
                            .slice(0, 3)
                            .map(([k, v]) => (
                              <div key={k} className="leading-snug break-words">
                                <span className="text-slate-400">{KOREAN_LABEL_MAP[k] || k}:</span>{' '}
                                <span className="text-amber-300 font-semibold">{v}</span>
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              sound.playClick();
                              setCompareIdA(isA ? null : snap.id);
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                              isA ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-cyan-300'
                            }`}
                          >
                            비교 A {isA ? '✓' : ''}
                          </button>
                          <button
                            onClick={() => {
                              sound.playClick();
                              setCompareIdB(isB ? null : snap.id);
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                              isB ? 'bg-indigo-400 text-slate-950' : 'bg-slate-800 text-indigo-300'
                            }`}
                          >
                            비교 B {isB ? '✓' : ''}
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              sound.playClick();
                              onRestoreSnapshot(snap);
                              onClose();
                            }}
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] flex items-center gap-1 transition cursor-pointer"
                            title="이 시점으로 시뮬레이션 복원"
                          >
                            <RotateCcw className="w-3 h-3 text-cyan-400" />
                            <span>복원</span>
                          </button>
                          <button
                            onClick={() => {
                              sound.playClick();
                              onDeleteSnapshot(snap.id);
                            }}
                            className="p-1 rounded hover:bg-rose-950 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                            title="스냅샷 삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Comparative Analysis Panel (When A and B are selected) */}
          {snapA && snapB && (
            <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/40 text-xs">
              <div className="font-bold text-cyan-400 text-sm mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                <span>스냅샷 대조 분석 (Comparative Analysis)</span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-500/30">
                  <div className="font-bold text-cyan-300 mb-1">[스냅샷 A] {snapA.label}</div>
                  <div className="space-y-1 text-[11px] text-slate-300">
                    {Object.entries(snapA.variables).map(([k, v]) => (
                      <div key={k}>
                        <span className="text-slate-400">{KOREAN_LABEL_MAP[k] || k}:</span>{' '}
                        <span className="text-white font-semibold">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-500/30">
                  <div className="font-bold text-indigo-300 mb-1">[스냅샷 B] {snapB.label}</div>
                  <div className="space-y-1 text-[11px] text-slate-300">
                    {Object.entries(snapB.variables).map(([k, v]) => (
                      <div key={k}>
                        <span className="text-slate-400">{KOREAN_LABEL_MAP[k] || k}:</span>{' '}
                        <span className="text-white font-semibold">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Diff Readout */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] leading-relaxed text-slate-300">
                <span className="font-bold text-amber-300">🔬 물리적 분석 결론: </span>
                변수 변화에 따라 측정 지표가 유의미하게 변동되었습니다. 조건 A에서 조건 B로 이행하면서 에너지 전달량 및 평형 상태가 재구성되었음을 확인할 수 있습니다.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
